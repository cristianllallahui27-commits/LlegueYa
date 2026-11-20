"""Servidor SOLO para pruebas E2E y de carga locales.

Usa la composición real (gateway) con un proveedor de identidad DOBLE que
simula el regreso de Google sin salir de la máquina. Nunca se usa en
producción: no está en el Dockerfile ni en el gateway.

    python -m uvicorn tests.servidor_e2e:app --port 8010
"""
import os
import uuid
from services.identidad.aplicacion import Acceso
from services.identidad.dominio import AuthError, Credencial, Usuario

os.environ.setdefault('COMUNIDAD_AUTOPUBLICAR', 'true')
os.environ.setdefault('COMUNIDAD_FOTOS_DIR', os.path.join(os.path.dirname(__file__), '..', 'tmp', 'fotos-e2e'))
from services.gateway.composicion import crear_app  # noqa: E402

ORIGIN = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8010')


os.environ.setdefault('ADMIN_CORREOS', 'admin@llegueya.test')
os.environ.setdefault('SUPABASE_GOOGLE_ACTIVO', 'true')

USUARIOS = {
    # Primer acceso: administradora. Segundo acceso (otro navegador): una cuenta cualquiera.
    'admin': Usuario('00000000-0000-4000-8000-0000000000e2', 'Viajera de Prueba', None, 'admin@llegueya.test'),
    'viajero': Usuario('00000000-0000-4000-8000-0000000000e3', 'Cuenta Sospechosa', None, 'otra@llegueya.test'),
}


class GoogleDoble:
    """Devuelve una URL de autorización que vuelve directo al callback.

    Alterna entre dos cuentas para poder probar la moderación y la suspensión.
    """

    def __init__(self):
        self.accesos = 0
        self.cuentas = {}
        self.enlaces = {}   # correo -> challenge del último enlace de recuperación

    def autorizar(self, challenge):
        self.accesos += 1
        return '/api/v1/auth/callback?code=' + ('admin' if self.accesos % 2 else 'viajero')

    async def intercambiar(self, code, verifier):
        return Credencial(code, 3600)

    # --- correo y clave (doble de Supabase Auth, sin enviar correos)
    async def registrar(self, correo, clave, nombre, challenge):
        if correo in self.cuentas:
            raise AuthError('Ese correo ya tiene una cuenta. Inicia sesión o recupera tu clave.')
        self.cuentas[correo] = [clave, nombre]
        return Credencial('correo:' + correo, 3600)

    async def entrar_con_clave(self, correo, clave):
        if self.cuentas.get(correo, [None])[0] != clave:
            raise AuthError('Correo o clave incorrectos.')
        return Credencial('correo:' + correo, 3600)

    async def recuperar(self, correo, challenge):
        if correo in self.cuentas:
            self.enlaces[correo] = challenge

    async def cambiar_clave(self, token, clave):
        self.cuentas[token.split(':', 1)[1]][0] = clave

    async def usuario(self, token):
        if token.startswith('correo:'):
            correo = token.split(':', 1)[1]
            return Usuario(str(uuid.uuid5(uuid.NAMESPACE_URL, correo)), self.cuentas[correo][1], None, correo)
        return USUARIOS[token]


app = crear_app((ORIGIN, Acceso(GoogleDoble())))
