"""Composición local de LlegueYa (un proceso, como «gateway» de desarrollo).

Reúne Identidad, Catálogo, Comunidad, Eventos, Publicidad, Recomendaciones, Willaq Uma y el panel de administración detrás de un
mismo origen y sirve la web. Cada servicio conserva su propio paquete y su
propio `crear_app()` para desplegarse por separado (ver compose.yaml y
infra/nginx). Aquí la sesión se verifica en proceso.
"""
import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from services.asistente.aplicacion import Experiencia, WillaqUma
from services.asistente.presentacion import crear_router as router_asistente
from services.catalogo.composicion import crear_catalogo
from services.catalogo.presentacion import crear_router as router_catalogo
from services.compartido.documentacion import publicar_documentacion
from services.compartido.seguridad import aplicar_seguridad
from services.comunidad.composicion import crear_comunidad
from services.comunidad.presentacion import crear_router as router_comunidad
from services.eventos.aplicacion import Calendario
from services.eventos.infraestructura import RepositorioMemoria as EventosMemoria
from services.eventos.presentacion import crear_router as router_eventos
from services.identidad.composicion import ROOT, leer_configuracion
from services.identidad.presentacion import crear_router as router_identidad, verificador_local
from services.compartido.sesion import lista_admin
from services.publicidad.aplicacion import Publicidad
from services.publicidad.infraestructura import RepositorioMemoria as PublicidadMemoria
from services.publicidad.presentacion import crear_router as router_publicidad
from services.recomendaciones.aplicacion import Viajes
from services.recomendaciones.infraestructura import RepositorioMemoria as ViajesMemoria
from services.recomendaciones.presentacion import crear_router as router_recomendaciones
from .administracion import crear_router as router_admin


def crear_app(configuracion=None):
    """`configuracion` = (origin, acceso); las pruebas E2E inyectan un proveedor de identidad doble."""
    origin, acceso = configuracion or leer_configuracion()
    es_admin = lista_admin(os.getenv('ADMIN_CORREOS', ''))
    verificar = verificador_local(acceso, es_admin)
    catalogo = crear_catalogo(os.getenv('DB_CATALOGO_DSN', ''), float(os.getenv('CATALOGO_CACHE_TTL', '60')))
    calendario = Calendario(EventosMemoria())
    comunidad = crear_comunidad()

    def experiencias():
        # Solo lo que cualquiera puede ver en el muro: publicaciones aprobadas.
        return [Experiencia(v.publicacion.id, v.publicacion.autor.nombre, v.publicacion.texto, v.publicacion.lugar_slug)
                for v in comunidad.muro(None, 0, 30) if v.publicacion.estado == 'publicado']

    asistente = WillaqUma(lambda: catalogo.repositorio.listar(), lambda: calendario.proximos(), experiencias)

    app = FastAPI(title='LlegueYa', docs_url=None, redoc_url=None, openapi_url=None)
    aplicar_seguridad(app, origin)
    publicidad = Publicidad(PublicidadMemoria())
    viajes = Viajes(ViajesMemoria(), lambda slug: catalogo.repositorio.obtener(slug))
    google_activo = os.getenv('SUPABASE_GOOGLE_ACTIVO', 'false').lower() == 'true'
    app.include_router(router_identidad(acceso, origin, es_admin, google_activo), tags=['Identidad'])
    app.include_router(router_catalogo(catalogo, verificar), tags=['Catálogo'])
    app.include_router(router_comunidad(comunidad, verificar), tags=['Comunidad'])
    app.include_router(router_eventos(calendario, verificar), tags=['Eventos'])
    app.include_router(router_asistente(asistente, verificar), tags=['Asistente'])
    app.include_router(router_publicidad(publicidad, verificar), tags=['Publicidad'])
    app.include_router(router_recomendaciones(viajes, verificar), tags=['Recomendaciones'])
    app.include_router(router_admin(acceso, comunidad, publicidad, verificar), tags=['Administración'])
    publicar_documentacion(app)
    app.mount('/', StaticFiles(directory=ROOT / 'apps' / 'web', html=True), name='web')
    return app
