"""Ensamblado del Catálogo: elige repositorio según configuración."""
import os
from fastapi import FastAPI
from services.compartido.seguridad import aplicar_seguridad
from services.compartido.sesion import VerificadorHttp, sin_sesion
from .aplicacion import Catalogo
from .datos_demo import LUGARES
from .infraestructura import (FavoritosMemoria, FavoritosPostgres, RepositorioEnCache, RepositorioMemoria, RepositorioPostgres,
                              TerminalesMemoria, TerminalesPostgres)
from .terminales import Terminales
from .transporte import TERMINALES_INICIALES
from .presentacion import crear_router


def crear_catalogo(dsn: str = '', ttl: float = 60) -> Catalogo:
    if dsn:
        return Catalogo(RepositorioEnCache(RepositorioPostgres(dsn), ttl), FavoritosPostgres(dsn))
    return Catalogo(RepositorioEnCache(RepositorioMemoria(LUGARES), ttl), FavoritosMemoria())


def crear_terminales(dsn: str = '') -> Terminales:
    """Terminales en PostgreSQL si hay base; si no, en memoria con los iniciales."""
    return Terminales(TerminalesPostgres(dsn) if dsn else TerminalesMemoria(TERMINALES_INICIALES))


def crear_app():
    """Catálogo desplegado como servicio independiente (ver compose.yaml)."""
    origin = os.getenv('APP_ORIGIN', 'http://127.0.0.1:8000').rstrip('/')
    identidad = os.getenv('IDENTIDAD_URL', '')
    app = FastAPI(title='LlegueYa · Catálogo', docs_url=None, redoc_url=None, openapi_url=None)
    aplicar_seguridad(app, origin)
    dsn = os.getenv('DB_CATALOGO_DSN', '')
    app.include_router(crear_router(crear_catalogo(dsn), VerificadorHttp(identidad) if identidad else sin_sesion,
                                    crear_terminales(dsn)))
    return app
