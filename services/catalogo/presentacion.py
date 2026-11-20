"""API HTTP del Catálogo (adaptador de entrada)."""
import hashlib
import json
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from services.compartido.sesion import VerificadorSesion
from .aplicacion import Catalogo
from .dominio import DatosLugarInvalidos, LugarNoEncontrado, TIPOS

# Respuestas públicas: el navegador guarda 60 s y el CDN (Cloudflare) 5 min.
CACHE_PUBLICA = 'public, max-age=60, s-maxage=300, stale-while-revalidate=60'


def foto_json(f):
    return None if f is None else {'url': f.url, 'autor': f.autor, 'licencia': f.licencia,
                                   'fuente_url': f.fuente_url, 'descripcion': f.descripcion}


def vista_previa(l):
    return {
        'id': l.id, 'slug': l.slug, 'nombre': l.nombre, 'tipo': l.tipo, 'destino': l.destino,
        'zona': l.zona, 'resumen': l.resumen, 'portada': foto_json(l.portada),
        'fotos_total': len(l.fotos), 'lat': l.lat, 'lon': l.lon, 'demostracion': l.demostracion,
    }


def detalle(l):
    data = vista_previa(l)
    data.update({
        'descripcion': l.descripcion, 'fotos': [foto_json(f) for f in l.fotos],
        'como_llegar': l.como_llegar, 'recomendaciones': list(l.recomendaciones),
        'altitud_m': l.altitud_m, 'fuente': l.fuente, 'fuente_url': l.fuente_url,
        'revisado_en': l.revisado_en.isoformat() if l.revisado_en else None,
    })
    return data


def respuesta_publica(request: Request, data) -> Response:
    """JSON con ETag: el cliente o el CDN reciben 304 si nada cambió."""
    cuerpo = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()
    etag = '"' + hashlib.sha256(cuerpo).hexdigest()[:32] + '"'
    headers = {'Cache-Control': CACHE_PUBLICA, 'ETag': etag}
    if request.headers.get('if-none-match') == etag:
        return Response(status_code=304, headers=headers)
    return Response(cuerpo, media_type='application/json', headers=headers)


class FavoritoEntrada(BaseModel):
    activo: bool


class FotoEntrada(BaseModel):
    url: str = Field(max_length=500)
    autor: str = Field('', max_length=120)
    licencia: str = Field('', max_length=80)
    fuente_url: str = Field('', max_length=500)
    descripcion: str = Field('', max_length=200)


class LugarEntrada(BaseModel):
    nombre: str = Field(max_length=120)
    tipo: str = Field(max_length=20)
    destino: str = Field(max_length=120)
    zona: str = Field('', max_length=120)
    resumen: str = Field(max_length=280)
    descripcion: str = Field(max_length=4000)
    lat: Optional[float] = None
    lon: Optional[float] = None
    altitud_m: Optional[int] = None
    como_llegar: str = Field('', max_length=1000)
    recomendaciones: list[str] = Field(default_factory=list, max_length=8)
    fuente_url: str = Field('', max_length=500)
    fotos: list[FotoEntrada] = Field(default_factory=list, max_length=8)


class EstadoEntrada(BaseModel):
    publicado: bool


def crear_router(catalogo: Catalogo, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/catalogo')

    @router.get('/lugares')
    def lugares(request: Request, tipo: Optional[str] = None, q: str = Query('', max_length=80),
                destino: Optional[str] = Query(None, max_length=120),
                desde: int = Query(0, ge=0), limite: int = Query(24, ge=1, le=48)):
        if tipo is not None and tipo not in TIPOS:
            return JSONResponse({'detail': 'Tipo no válido.'}, status_code=422)
        p = catalogo.explorar(tipo, q, destino, desde, limite)
        return respuesta_publica(request, {'items': [vista_previa(l) for l in p.items], 'total': p.total,
                                           'desde': p.desde, 'limite': p.limite})

    @router.get('/lugares/{slug}')
    async def lugar(slug: str, request: Request):
        usuario = await verificar(request)
        try:
            ficha = catalogo.ver(slug[:80], autenticado=usuario is not None)
        except LugarNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese lugar.'}, status_code=404)
        if ficha.completa:
            # Detalle personal: nunca debe quedar en una caché compartida.
            return JSONResponse({**detalle(ficha.lugar), 'requiere_sesion': False},
                                headers={'Cache-Control': 'private, no-store', 'Vary': 'Cookie'})
        return JSONResponse({**vista_previa(ficha.lugar), 'requiere_sesion': True},
                            headers={'Cache-Control': 'private, no-store', 'Vary': 'Cookie'})

    @router.get('/mapa')
    def mapa(request: Request):
        return respuesta_publica(request, {'marcadores': [
            {'slug': l.slug, 'nombre': l.nombre, 'tipo': l.tipo, 'lat': l.lat, 'lon': l.lon,
             'zona': l.zona, 'portada': foto_json(l.portada)} for l in catalogo.mapa()]})

    @router.get('/destinos')
    def destinos(request: Request):
        return respuesta_publica(request, {'destinos': [
            {'nombre': d['nombre'], 'lugares': d['lugares'], 'portada': foto_json(d['portada'])}
            for d in catalogo.destinos()]})

    @router.put('/favoritos/{slug}')
    async def marcar(slug: str, request: Request, entrada: FavoritoEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión para guardar lugares.', 'requiere_sesion': True}, status_code=401)
        try:
            catalogo.marcar_favorito(u.id, slug[:80], entrada.activo)
        except LugarNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese lugar.'}, status_code=404)
        return {'slug': slug, 'guardado': entrada.activo}

    @router.get('/favoritos')
    async def favoritos(request: Request):
        u = await verificar(request)
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión para ver tus lugares guardados.', 'requiere_sesion': True}, status_code=401)
        return {'items': [vista_previa(l) for l in catalogo.mis_favoritos(u.id)]}

    # ------------------------------------------------------------ Administración
    async def solo_admin(request):
        u = await verificar(request)
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión.', 'requiere_sesion': True}, status_code=401)
        if not u.admin:
            return JSONResponse({'detail': 'Solo administración puede gestionar lugares.'}, status_code=403)
        return None

    def guardar(entrada, slug=None, codigo=200):
        try:
            l = catalogo.guardar_lugar(entrada.model_dump(), slug)
        except DatosLugarInvalidos as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)
        except LugarNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese lugar.'}, status_code=404)
        return JSONResponse({**detalle(l), 'estado': 'publicado'}, status_code=codigo)

    @router.get('/admin/lugares')
    async def admin_lugares(request: Request):
        r = await solo_admin(request)
        if r:
            return r
        return JSONResponse({'items': [{**detalle(l), 'estado': e} for l, e in catalogo.lugares_admin()]},
                            headers={'Cache-Control': 'no-store'})

    @router.post('/admin/lugares')
    async def admin_crear(request: Request, entrada: LugarEntrada):
        return await solo_admin(request) or guardar(entrada, codigo=201)

    @router.put('/admin/lugares/{slug}')
    async def admin_editar(slug: str, request: Request, entrada: LugarEntrada):
        return await solo_admin(request) or guardar(entrada, slug[:80])

    @router.post('/admin/lugares/{slug}/estado')
    async def admin_estado(slug: str, request: Request, entrada: EstadoEntrada):
        r = await solo_admin(request)
        if r:
            return r
        try:
            return {'slug': slug, 'estado': catalogo.cambiar_estado_lugar(slug[:80], entrada.publicado)}
        except LugarNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese lugar.'}, status_code=404)

    return router
