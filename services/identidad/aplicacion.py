import base64
import hashlib
import secrets
import time
from typing import Protocol
from .dominio import (CLAVE_INCORRECTA, CODIGO_BLOQUEADO, CUENTA_BLOQUEADA, CUENTA_SUSPENDIDA, AuthError, Credencial, Usuario, validar_clave,
                      validar_codigo, validar_correo, validar_nombre)


class ProveedorIdentidad(Protocol):
    def autorizar(self, challenge: str) -> str: ...
    async def intercambiar(self, code: str, verifier: str) -> Credencial: ...
    async def usuario(self, token: str) -> Usuario: ...
    # Correo y clave (Supabase Auth). Devuelven Credencial o None si falta confirmar el correo.
    async def registrar(self, correo: str, clave: str, nombre: str, challenge: str): ...
    async def entrar_con_clave(self, correo: str, clave: str) -> Credencial: ...
    async def recuperar(self, correo: str, challenge: str) -> None: ...
    async def verificar_codigo(self, correo: str, codigo: str) -> Credencial: ...
    async def reenviar_codigo(self, correo: str) -> None: ...
    async def cambiar_clave(self, token: str, clave: str) -> None: ...
    async def refrescar(self, refresco: str) -> Credencial: ...


def par_pkce():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
    return verifier, challenge


DURACION_SESION = 7 * 24 * 3600   # con refresh token la sesión dura una semana; sin él, lo que dure el token (máx. 1 h)


class Acceso:
    """Casos de uso. Almacenamiento efímero para un único proceso local."""
    def __init__(self, proveedor: ProveedorIdentidad, reloj=time.time):
        self.proveedor = proveedor
        self.reloj = reloj
        self.flujos = {}
        self.sesiones = {}
        self.suspendidos = {}   # usuario_id -> motivo (decisión administrativa)
        self.conocidos = {}     # usuario_id -> Usuario (cuentas que ya entraron; para el panel admin)
        self.fallos_codigo = {}  # correo -> (fallos, hasta) de códigos de verificación
        self.fallos_clave = {}   # correo -> (fallos, hasta): bloqueo por cuenta contra adivinar claves

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
        self._guardar(session, credencial)
        return session

    def _guardar(self, session, credencial, expira=None):
        """sesiones[id] = (token, fin de la sesión, refresh token, vencimiento del token)."""
        ahora = self.reloj()
        if expira is None:
            expira = ahora + (DURACION_SESION if credencial.refresco else min(credencial.segundos, 3600))
        self.sesiones[session] = (credencial.token, expira, credencial.refresco, ahora + max(credencial.segundos - 60, 30))

    async def _renovar(self, session, item):
        """Pide un token nuevo con el refresh token. Devuelve el token o None si no se pudo."""
        refrescar = getattr(self.proveedor, 'refrescar', None)
        if len(item) < 3 or not item[2] or refrescar is None:
            return None
        try:
            credencial = await refrescar(item[2])
        except AuthError:
            return None
        if not credencial.refresco:
            credencial = type(credencial)(credencial.token, credencial.segundos, item[2])
        self._guardar(session, credencial, expira=item[1])
        return credencial.token

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

    async def verificar_correo(self, correo, codigo):
        """Activa la cuenta con el código que llegó al correo y abre la sesión.

        Supabase ya limita los intentos; además cortamos a los 5 fallos por correo durante 10 minutos.
        """
        correo, codigo = validar_correo(correo), validar_codigo(codigo)
        ahora = self.reloj()
        fallos, hasta = self.fallos_codigo.get(correo, (0, 0))
        if hasta <= ahora:
            fallos = 0
        if fallos >= 5:
            raise AuthError(CODIGO_BLOQUEADO)
        try:
            credencial = await self.proveedor.verificar_codigo(correo, codigo)
        except AuthError:
            self.fallos_codigo[correo] = (fallos + 1, ahora + 600)
            raise
        self.fallos_codigo.pop(correo, None)
        return await self._abrir(credencial)

    async def reenviar_codigo(self, correo):
        await self.proveedor.reenviar_codigo(validar_correo(correo))

    INTENTOS_CLAVE = 5
    BLOQUEO_CLAVE = 15 * 60

    async def entrar(self, correo, clave):
        """Correo y clave. Tras 5 claves incorrectas la cuenta se bloquea 15 minutos (aunque cambie la IP)."""
        correo = validar_correo(correo)
        ahora = self.reloj()
        fallos, hasta = self.fallos_clave.get(correo, (0, 0))
        if hasta <= ahora:
            fallos = 0
        if fallos >= self.INTENTOS_CLAVE:
            raise AuthError(CUENTA_BLOQUEADA)
        if not isinstance(clave, str) or not clave or len(clave) > 72:
            raise AuthError(CLAVE_INCORRECTA)
        try:
            credencial = await self.proveedor.entrar_con_clave(correo, clave)
        except AuthError as ex:
            if ex.mensaje == CLAVE_INCORRECTA:
                fallos += 1
                self.fallos_clave[correo] = (fallos, ahora + self.BLOQUEO_CLAVE)
                if fallos >= self.INTENTOS_CLAVE:
                    raise AuthError(CUENTA_BLOQUEADA) from ex
            raise
        self.fallos_clave.pop(correo, None)
        return await self._abrir(credencial)

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
        token = item[0]
        if len(item) > 3 and self.reloj() >= item[3]:
            token = await self._renovar(session, item) or token   # el token de Supabase vence cada hora
        try:
            usuario = await self.proveedor.usuario(token)
        except AuthError:
            nuevo = await self._renovar(session, self.sesiones.get(session, item))
            if nuevo is None:
                self.salir(session)
                raise
            usuario = await self.proveedor.usuario(nuevo)
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
