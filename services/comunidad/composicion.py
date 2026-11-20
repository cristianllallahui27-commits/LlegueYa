import os
from pathlib import Path
from fastapi import FastAPI
from services.compartido.seguridad import aplicar_seguridad
from services.compartido.sesion import VerificadorHttp, sin_sesion
from .aplicacion import Comunidad
from .infraestructura import AlmacenLocal, RepositorioMemoria, RepositorioPostgres
from .presentacion import crear_router

ROOT = Path(__file__).resolve().parents[2]


def crear_comunidad() -> Comunidad:
    dsn = os.getenv('DB_COMUNIDAD_DSN', '')
    repo = RepositorioPostgres(dsn) if dsn else RepositorioMemoria()
    almacen = AlmacenLocal(os.getenv('COMUNIDAD_FOTOS_DIR', str(ROOT / 'data' / 'fotos')))
    # Moderación previa por defecto (SDD). Solo en desarrollo local se puede autopublicar.
    autopublicar = os.getenv('COMUNIDAD_AUTOPUBLICAR', 'false').lower() == 'true'
    return Comunidad(repo, almacen, autopublicar=autopublicar)


def crear_app():
    origin = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000').rstrip('/')
    identidad = os.getenv('IDENTIDAD_URL', '')
    app = FastAPI(title='LlegueYa · Comunidad', docs_url=None, redoc_url=None, openapi_url=None)
    aplicar_seguridad(app, origin)
    app.include_router(crear_router(crear_comunidad(), VerificadorHttp(identidad) if identidad else sin_sesion))
    return app
