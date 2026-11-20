"""API HTTP de Comunidad."""
from typing import Optional
from fastapi import APIRouter, File, Form, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from services.compartido.sesion import VerificadorSesion
from .aplicacion import Comunidad
from .dominio import FOTO_BYTES_MAXIMO, MOTIVOS_REPORTE, Autor, NoEncontrado, ReglaVulnerada

SESION_REQUERIDA = {'detail': 'Inicia sesión para participar.', 'requiere_sesion': True}


def autor_json(a):
    return {'id': a.id, 'nombre': a.nombre, 'avatar': a.avatar}


def pub_json(v):
    p = v.publicacion
    return {'id': p.id, 'autor': autor_json(p.autor), 'texto': p.texto, 'lugar_slug': p.lugar_slug,
            'foto_url': f'/api/v1/comunidad/fotos/{p.foto_id}' if p.foto_id else None,
            'estado': p.estado, 'creado_en': p.creado_en.isoformat(), 'likes': v.likes,
            'me_gusta': v.me_gusta, 'comentarios': v.comentarios, 'guardada': v.guardada}


def com_json(v):
    c = v.comentario
    return {'id': c.id, 'autor': autor_json(c.autor), 'texto': c.texto, 'padre_id': c.padre_id,
            'profundidad': c.profundidad, 'estado': c.estado, 'creado_en': c.creado_en.isoformat(),
            'likes': v.likes, 'me_gusta': v.me_gusta}


class LikeEntrada(BaseModel):
    tipo: str = Field(max_length=20)
    id: str = Field(max_length=40)
    activo: bool


class ComentarioEntrada(BaseModel):
    texto: str = Field(max_length=1200)
    padre_id: Optional[str] = Field(default=None, max_length=40)


class ReporteEntrada(BaseModel):
    motivo: str = Field(max_length=80)
    detalle: str = Field(default='', max_length=600)


class GuardadoEntrada(BaseModel):
    activo: bool


def crear_router(comunidad: Comunidad, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/comunidad')

    def error(e):
        if isinstance(e, NoEncontrado):
            return JSONResponse({'detail': 'Ese contenido no está disponible.'}, status_code=404)
        return JSONResponse({'detail': str(e)}, status_code=422)

    @router.get('/muro')
    async def muro(request: Request, desde: int = Query(0, ge=0), limite: int = Query(10, ge=1, le=30),
                   lugar: Optional[str] = Query(None, max_length=80)):
        u = await verificar(request)
        vistas = comunidad.muro(u.id if u else None, desde, limite, lugar)
        return {'items': [pub_json(v) for v in vistas], 'desde': desde, 'limite': limite,
                'siguiente': desde + limite if len(vistas) == limite else None}

    @router.post('/publicaciones')
    async def publicar(request: Request, texto: str = Form('', max_length=2400),
                       lugar: Optional[str] = Form(None, max_length=80), foto: Optional[UploadFile] = File(None)):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        datos = None
        if foto is not None and foto.filename:
            datos = await foto.read(FOTO_BYTES_MAXIMO + 1)
        try:
            v = comunidad.publicar(Autor(u.id, u.nombre, u.avatar), texto, lugar or None, datos)
        except (ReglaVulnerada, NoEncontrado) as e:
            return error(e)
        return JSONResponse(pub_json(v), status_code=201)

    @router.post('/likes')
    async def like(request: Request, entrada: LikeEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        try:
            total = comunidad.like(u.id, entrada.tipo, entrada.id, entrada.activo)
        except (ReglaVulnerada, NoEncontrado) as e:
            return error(e)
        return {'id': entrada.id, 'tipo': entrada.tipo, 'activo': entrada.activo, 'likes': total}

    @router.get('/publicaciones/{pid}/comentarios')
    async def hilo(pid: str, request: Request):
        u = await verificar(request)
        try:
            return {'items': [com_json(v) for v in comunidad.hilo(pid[:40], u.id if u else None)]}
        except NoEncontrado as e:
            return error(e)

    @router.post('/publicaciones/{pid}/comentarios')
    async def comentar(pid: str, request: Request, entrada: ComentarioEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        try:
            v = comunidad.comentar(Autor(u.id, u.nombre, u.avatar), pid[:40], entrada.texto, entrada.padre_id)
        except (ReglaVulnerada, NoEncontrado) as e:
            return error(e)
        return JSONResponse(com_json(v), status_code=201)

    @router.put('/guardados/{pid}')
    async def guardar(pid: str, request: Request, entrada: GuardadoEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        try:
            comunidad.guardar(u.id, pid[:40], entrada.activo)
        except NoEncontrado as e:
            return error(e)
        return {'id': pid, 'guardada': entrada.activo}

    @router.get('/motivos-reporte')
    def motivos():
        return {'motivos': list(MOTIVOS_REPORTE)}

    @router.post('/publicaciones/{pid}/reportes')
    async def reportar(pid: str, request: Request, entrada: ReporteEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        try:
            comunidad.reportar(u.id, pid[:40], entrada.motivo, entrada.detalle)
        except (ReglaVulnerada, NoEncontrado) as e:
            return error(e)
        return JSONResponse({'detail': 'Gracias. Administración revisará esta publicación.'}, status_code=201)

    @router.get('/yo')
    async def yo(request: Request):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION_REQUERIDA, status_code=401)
        return {'publicaciones': [pub_json(v) for v in comunidad.muro(u.id, 0, 30, autor=u.id)],
                'guardadas': [pub_json(v) for v in comunidad.guardadas(u.id)]}

    @router.get('/fotos/{fid}')
    async def foto(fid: str, request: Request):
        u = await verificar(request)
        try:
            datos, mime = comunidad.foto(fid[:40], u.id if u else None)
        except (NoEncontrado, FileNotFoundError):
            return JSONResponse({'detail': 'Foto no disponible.'}, status_code=404)
        return Response(datos, media_type=mime, headers={'Cache-Control': 'private, max-age=300'})

    return router
