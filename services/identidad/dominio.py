from dataclasses import dataclass
from typing import Optional


import re

MENSAJE_GENERICO = 'No pudimos completar el acceso. Vuelve a intentarlo.'


CLAVE_INCORRECTA = 'Correo o clave incorrectos.'
CORREO_REGISTRADO = 'Ese correo ya tiene una cuenta. Inicia sesión o recupera tu clave.'
CUENTA_SUSPENDIDA = 'Esta cuenta está suspendida. Escribe a administración si crees que es un error.'
CODIGO_INVALIDO = 'El código no es correcto o ya venció. Revísalo o pide uno nuevo.'
CODIGO_BLOQUEADO = 'Demasiados códigos incorrectos. Pide uno nuevo en unos minutos.'
CUENTA_BLOQUEADA = 'Por seguridad bloqueamos esta cuenta 15 minutos tras varios intentos fallidos. Si olvidaste tu clave, usa «¿Olvidaste tu clave?».'
CORREO_SIN_CONFIRMAR = 'Primero confirma tu correo: revisa tu bandeja de entrada o spam.'


def validar_codigo(codigo) -> str:
    codigo = re.sub(r'\s', '', codigo) if isinstance(codigo, str) else ''
    if not re.fullmatch(r'\d{6,10}', codigo):
        raise DatosInvalidos('Escribe el código de 6 dígitos que te llegó al correo.')
    return codigo

# Código HTTP de cada fallo conocido (REST): 401 credenciales, 403 cuenta no habilitada,
# 409 conflicto con una cuenta existente, 429 límite del proveedor. El resto, 400.
ESTADOS_HTTP = {
    CLAVE_INCORRECTA: 401,
    CORREO_REGISTRADO: 409,
    CUENTA_SUSPENDIDA: 403,
    'Primero confirma tu correo: revisa tu bandeja de entrada o spam.': 403,
    'Se enviaron muchos correos seguidos. Espera unos minutos y vuelve a intentarlo.': 429,
    'Demasiados intentos. Espera unos minutos.': 429,
    CODIGO_INVALIDO: 401,
    CODIGO_BLOQUEADO: 429,
    CUENTA_BLOQUEADA: 429,
}


class AuthError(Exception):
    """El proveedor no pudo confirmar la identidad. `mensaje` es apto para el usuario."""

    def __init__(self, mensaje: str = MENSAJE_GENERICO):
        super().__init__(mensaje)
        self.mensaje = mensaje

    @property
    def estado_http(self) -> int:
        return ESTADOS_HTTP.get(self.mensaje, 400)


class DatosInvalidos(ValueError):
    """Datos de registro o acceso que no cumplen las reglas."""


CORREO = re.compile(r'^[^@\s<>"]{1,64}@[A-Za-z0-9.-]{1,185}\.[A-Za-z]{2,24}$')


def validar_correo(correo) -> str:
    correo = (correo or '').strip().lower() if isinstance(correo, str) else ''
    if not CORREO.match(correo):
        raise DatosInvalidos('Escribe un correo válido (personal o institucional).')
    return correo


def validar_clave(clave) -> str:
    if not isinstance(clave, str) or not 8 <= len(clave) <= 72:
        raise DatosInvalidos('La clave debe tener entre 8 y 72 caracteres.')
    if not re.search(r'[A-Za-zÁÉÍÓÚáéíóúÑñ]', clave) or not re.search(r'\d', clave):
        raise DatosInvalidos('La clave debe combinar letras y números.')
    return clave


def validar_nombre(nombre) -> str:
    nombre = (nombre or '').strip() if isinstance(nombre, str) else ''
    if not 2 <= len(nombre) <= 100:
        raise DatosInvalidos('Escribe tu nombre (2 a 100 caracteres).')
    return nombre


@dataclass(frozen=True)
class Usuario:
    id: str
    nombre: str
    avatar: Optional[str] = None
    correo: Optional[str] = None


@dataclass(frozen=True)
class Credencial:
    token: str
    segundos: int
    refresco: Optional[str] = None   # refresh token: renueva la sesión sin volver a pedir la clave
