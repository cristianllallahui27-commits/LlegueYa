"""Cabeceras y protección comunes a todos los servicios HTTP de LlegueYa.

Cada servicio las aplica a su propia app; así un servicio desplegado por separado
mantiene las mismas reglas que la composición local.
"""
import hmac
import os
from urllib.parse import urlparse

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse

# Fotos externas con licencia libre (Wikimedia Commons) y teselas OSM del mapa.
# Capas del mapa: OSM, CARTO (callejero), Esri (satélite y referencias) y OpenTopoMap (relieve).
IMAGENES_EXTERNAS = ('https://commons.wikimedia.org https://upload.wikimedia.org https://thumb.wikimedia.org '
                     'https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com '
                     'https://server.arcgisonline.com https://*.tile.opentopomap.org https://lh3.googleusercontent.com')

CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; "
    f"img-src 'self' data: blob: {IMAGENES_EXTERNAS}; connect-src 'self'; "
    "frame-ancestors 'none'; base-uri 'none'; "
    "form-action 'self' https://*.supabase.co https://accounts.google.com"
)


def clave_borde() -> str:
    """Secreto compartido con el Worker de Cloudflare (infra/cloudflare). Vacío en local."""
    return os.getenv('BORDE_CLAVE', '')


def ip_cliente(request: Request) -> str:
    """IP del visitante. Detrás del Worker, la conexión llega desde Cloudflare y la IP
    real viene en CF-Connecting-IP; solo se confía en ella si el candado de origen está
    activo, porque entonces nadie puede llegar al backend saltándose Cloudflare."""
    if clave_borde() and request.headers.get('cf-connecting-ip'):
        return request.headers['cf-connecting-ip'][:64]
    return request.client.host if request.client else 'desconocido'


LOCALES = {'localhost', '127.0.0.1', '[::1]', '::1'}


def aplicar_seguridad(app: FastAPI, origin: str) -> None:
    oficial = urlparse(origin)

    @app.middleware('http')
    async def proteger(request: Request, call_next):
        # En local, «localhost» y «127.0.0.1» son sitios distintos para el navegador (cookies aparte):
        # si alguien abre el otro alias, lo llevamos a la dirección oficial antes de que intente entrar.
        host = (request.url.hostname or '').lower()
        if request.method in ('GET', 'HEAD') and not request.url.path.startswith('/api/') \
                and host in LOCALES and oficial.hostname in LOCALES and host != oficial.hostname:
            destino = origin + request.url.path + (('?' + request.url.query) if request.url.query else '')
            return RedirectResponse(destino, status_code=307)
        # Candado de origen: con BORDE_CLAVE, la API solo atiende lo que pasa por el Worker.
        clave = clave_borde()
        if clave and request.url.path.startswith('/api/') and request.url.path != '/api/v1/health' \
                and not hmac.compare_digest(request.headers.get('x-llegueya-borde', ''), clave):
            return JSONResponse({'detail': 'Acceso directo no permitido: entra por el dominio de LlegueYa.'}, status_code=403)
        # CSRF: toda escritura debe venir del mismo origen configurado.
        if request.method not in ('GET', 'HEAD', 'OPTIONS') and request.headers.get('origin') != origin:
            return JSONResponse({'detail': 'Origen no permitido.'}, status_code=403)
        response = await call_next(request)
        ruta = request.url.path
        if 'cache-control' not in response.headers:
            # La API es privada por defecto; los recursos estáticos se pueden cachear poco tiempo.
            response.headers['Cache-Control'] = 'no-store' if ruta.startswith('/api/') else 'public, max-age=300'
        response.headers['Referrer-Policy'] = 'no-referrer' if ruta.endswith('/callback') else 'strict-origin-when-cross-origin'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        # Nadie puede meter LlegueYa dentro de otra página ni abrirla desde otra ventana para espiarla.
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        response.headers['X-Permitted-Cross-Domain-Policies'] = 'none'
        if origin.startswith('https://'):
            # Con dominio propio (Cloudflare): el navegador solo usará HTTPS durante un año.
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = CSP
        # Solo esta página puede pedir la ubicación del dispositivo (el navegador siempre pide permiso a la persona).
        response.headers['Permissions-Policy'] = 'geolocation=(self)'
        return response
