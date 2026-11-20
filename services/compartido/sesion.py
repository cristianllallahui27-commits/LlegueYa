"""Puerto común para que los servicios conozcan al usuario de la sesión.

Comunidad, Catálogo y Eventos no leen la tabla de Identidad: preguntan a
Identidad (en proceso o por HTTP) y reciben un usuario mínimo.
"""
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional
import httpx
from fastapi import Request


@dataclass(frozen=True)
class UsuarioSesion:
    id: str
    nombre: str
    avatar: Optional[str] = None
    admin: bool = False


VerificadorSesion = Callable[[Request], Awaitable[Optional[UsuarioSesion]]]


async def sin_sesion(request: Request) -> Optional[UsuarioSesion]:
    return None


class VerificadorHttp:
    """Adaptador para despliegue separado: consulta /api/v1/auth/me de Identidad."""

    def __init__(self, url_identidad: str, transport=None):
        self.url = url_identidad.rstrip('/') + '/api/v1/auth/me'
        self.transport = transport

    async def __call__(self, request: Request) -> Optional[UsuarioSesion]:
        cookie = request.cookies.get('ly_session')
        if not cookie:
            return None
        try:
            async with httpx.AsyncClient(timeout=5, transport=self.transport, follow_redirects=False) as client:
                r = await client.get(self.url, headers={'Cookie': f'ly_session={cookie}'})
            if r.status_code != 200:
                return None
            data = r.json()
            return UsuarioSesion(str(data['id']), str(data['nombre'])[:100], data.get('avatar'), data.get('admin') is True)
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return None


def lista_admin(valor: str):
    """ADMIN_CORREOS="a@x.com,b@y.com" → función que decide si un correo es administrador."""
    correos = {c.strip().lower() for c in (valor or '').split(',') if c.strip()}
    return lambda correo: bool(correo) and correo.lower() in correos
