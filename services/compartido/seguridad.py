"""Cabeceras y protección comunes a todos los servicios HTTP de LlegueYa.

Cada servicio las aplica a su propia app; así un servicio desplegado por separado
mantiene las mismas reglas que la composición local.
"""
import hmac
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

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


def aplicar_seguridad(app: FastAPI, origin: str) -> None:
    @app.middleware('http')
    async def proteger(request: Request, call_next):
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
        response.headers['Content-Security-Policy'] = CSP
        return response
