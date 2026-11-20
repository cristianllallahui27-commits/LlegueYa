import os
from pathlib import Path
from urllib.parse import urlparse
from dotenv import load_dotenv
from .aplicacion import Acceso
from .infraestructura import Supabase
from .presentacion import crear_api

ROOT = Path(__file__).resolve().parents[2]


def leer_configuracion():
    """Valida APP_ORIGIN y Supabase; devuelve (origin, acceso | None)."""
    load_dotenv(ROOT / '.env', override=False)
    origin = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000').rstrip('/')
    parsed = urlparse(origin)
    if parsed.path or parsed.query or parsed.fragment or parsed.username or not parsed.hostname:
        raise ValueError('APP_ORIGIN debe ser un origen sin rutas ni credenciales.')
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', 'localhost')):
        raise ValueError('HTTP solo se permite en localhost.')
    url = os.getenv('SUPABASE_PROJECT_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    acceso = None
    if url and key:
        host = urlparse(url)
        if host.scheme != 'https' or not host.hostname or not host.hostname.endswith('.supabase.co') or host.path or host.query or host.fragment or host.username:
            raise ValueError('Usa la URL HTTPS de tu proyecto Supabase.')
        if not key.startswith('sb_publishable_'):
            raise ValueError('Usa una clave publishable de Supabase, nunca service_role o secret.')
        acceso = Acceso(Supabase(url, key, origin))
    return origin, acceso


def crear_app():
    origin, acceso = leer_configuracion()
    return crear_api(acceso, origin, ROOT / 'apps' / 'web')
