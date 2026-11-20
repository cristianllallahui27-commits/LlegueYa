import base64
import hashlib
import secrets
import time
from typing import Protocol
from .dominio import CLAVE_INCORRECTA, CUENTA_SUSPENDIDA, AuthError, Credencial, Usuario, validar_clave, validar_correo, validar_nombre


class ProveedorIdentidad(Protocol):
    def autorizar(self, challenge: str) -> str: ...
    async def intercambiar(self, code: str, verifier: str) -> Credencial: ...
    async def usuario(self, token: str) -> Usuario: ...
    # Correo y clave (Supabase Auth). Devuelven Credencial o None si falta confirmar el correo.
    async def registrar(self, correo: str, clave: str, nombre: str, challenge: str): ...
    async def entrar_con_clave(self, correo: str, clave: str) -> Credencial: ...
    async def recuperar(self, correo: str, challenge: str) -> None: ...
    async def cambiar_clave(self, token: str, clave: str) -> None: ...


def par_pkce():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    return verifier, challenge


class Acceso:
    """Casos de uso. Almacenamiento efímero para un único proceso local."""
    def __init__(self, proveedor: ProveedorIdentidad, reloj=time.time):
        self.proveedor = proveedor
        self.reloj = reloj
        self.flujos = {}
        self.sesiones = {}
        self.suspendidos = {}   # usuario_id -> motivo (decisión administrativa)
        self.conocidos = {}     # usuario_id -> Usuario (cuentas que ya entraron; para el panel admin)

    def limpiar(self):
        now = self.reloj()
        self.flujos = {k: v for k, v in self.flujos.items() if v[1] > now}
        self.sesiones = {k: v for k, v in self.sesiones.items() if v[1] > now}

    def _nuevo_flujo(self, vigencia=600):
        self.limpiar()
        if len(self.flujos) >= 1000:
            raise AuthError()
        verifier, challenge = par_pkce()
        flow = secrets.token_urlsafe(32)
        self.flujos[flow] = (verifier, self.reloj() + vigencia)
        return flow, challenge

    def iniciar(self):
        flow, challenge = self._nuevo_flujo()
        return flow, self.proveedor.autorizar(challenge)

    async def completar(self, flow, code):
        self.limpiar()
        item = self.flujos.pop(flow, None)
        if not item or not code or len(code) > 2048:
            raise AuthError()
        credencial = await self.proveedor.intercambiar(code, item[0])
        return await self._abrir(credencial)

    async def _abrir(self, credencial):
        usuario = await self.proveedor.usuario(credencial.token)
        self.conocidos[usuario.id] = usuario
        if usuario.id in self.suspendidos:
            raise AuthError(CUENTA_SUSPENDIDA)
        if credencial.segundos <= 0 or len(self.sesiones) >= 1000:
            raise AuthError()
        session = secrets.token_urlsafe(32)
        self.sesiones[session] = (credencial.token, self.reloj() + min(credencial.segundos, 3600))
        return session

    # --- correo y clave ----------------------------------------------------
    async def registrar(self, correo, clave, nombre):
        """Crea la cuenta. Devuelve ('sesion', id) o ('confirmar', flujo) si Supabase pide confirmar el correo."""
        correo, clave, nombre = validar_correo(correo), validar_clave(clave), validar_nombre(nombre)
        flow, challenge = self._nuevo_flujo(vigencia=24 * 3600)
        credencial = await self.proveedor.registrar(correo, clave, nombre, challenge)
        if credencial is None:
            return 'confirmar', flow
        self.flujos.pop(flow, None)
        return 'sesion', await self._abrir(credencial)

    async def entrar(self, correo, clave):
        correo = validar_correo(correo)
        if not isinstance(clave, str) or not clave or len(clave) > 72:
            raise AuthError(CLAVE_INCORRECTA)
        return await self._abrir(await self.proveedor.entrar_con_clave(correo, clave))

    async def recuperar(self, correo):
        """Envía el enlace para crear una clave nueva. Responde igual exista o no la cuenta."""
        correo = validar_correo(correo)
        flow, challenge = self._nuevo_flujo(vigencia=3600)
        await self.proveedor.recuperar(correo, challenge)
        return flow

    async def cambiar_clave(self, session, clave):
        clave = validar_clave(clave)
        await self.actual(session)
        await self.proveedor.cambiar_clave(self.sesiones[session][0], clave)

    async def actual(self, session):
        self.limpiar()
        item = self.sesiones.get(session)
        if not item:
            raise AuthError()
        try:
            usuario = await self.proveedor.usuario(item[0])
        except AuthError:
            self.salir(session)
            raise
        if usuario.id in self.suspendidos:
            self.salir(session)
            raise AuthError()
        return usuario

    def suspender(self, usuario_id: str, motivo: str = '') -> None:
        """Bloquea nuevos ingresos; las sesiones abiertas caen en su siguiente consulta."""
        self.suspendidos[usuario_id] = motivo[:300]

    def reactivar(self, usuario_id: str) -> None:
        self.suspendidos.pop(usuario_id, None)

    def salir(self, session):
        self.sesiones.pop(session, None)
