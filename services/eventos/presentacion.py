from datetime import date
from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from services.compartido.sesion import VerificadorSesion
from .aplicacion import Calendario


def evento_json(e, suscrito=False):
    return {'id': e.id, 'titulo': e.titulo, 'descripcion': e.descripcion, 'lugar': e.lugar_texto,
            'lugar_slug': e.lugar_slug, 'inicio': e.inicio.isoformat(), 'fin': e.fin.isoformat(),
            'estado': e.estado, 'fecha_referencial': e.fecha_referencial, 'fuente': e.fuente,
            'fuente_url': e.fuente_url, 'foto_url': e.foto_url, 'suscrito': suscrito}


class EventoEntrada(BaseModel):
    titulo: str = Field(min_length=2, max_length=120)
    descripcion: str = Field(max_length=600)
    lugar_texto: str = Field(min_length=2, max_length=120)
    lugar_slug: Optional[str] = Field(default=None, max_length=80)
    inicio: date
    fin: date
    foto_url: Optional[str] = Field(default=None, max_length=300)


class SuscripcionEntrada(BaseModel):
    activa: bool


def crear_router(calendario: Calendario, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eventos')

    @router.get('')
    async def proximos(request: Request, mes: Optional[str] = Query(None, pattern=r'^\d{4}-(0[1-9]|1[0-2])$')):
        u = await verificar(request)
        subs = calendario.mis_suscripciones(u.id) if u else set()
        return {'items': [evento_json(e, e.id in subs) for e in calendario.proximos(mes)]}

    async def solo_admin(request):
        u = await verificar(request)
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión.', 'requiere_sesion': True}, status_code=401)
        if not u.admin:
            return JSONResponse({'detail': 'Solo administración puede gestionar eventos.'}, status_code=403)
        return None

    def datos_de(entrada):
        d = entrada.model_dump()
        d['lugar_slug'] = d['lugar_slug'] or None
        d['foto_url'] = d['foto_url'] or None
        return d

    @router.get('/admin')
    async def admin_listar(request: Request):
        return await solo_admin(request) or JSONResponse({'items': [evento_json(e) for e in calendario.todos()]}, headers={'Cache-Control': 'no-store'})

    @router.post('/admin')
    async def admin_crear(request: Request, entrada: EventoEntrada):
        if (r := await solo_admin(request)):
            return r
        try:
            return JSONResponse(evento_json(calendario.crear(datos_de(entrada))), status_code=201)
        except ValueError as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)

    @router.put('/admin/{eid}')
    async def admin_editar(eid: str, request: Request, entrada: EventoEntrada):
        if (r := await solo_admin(request)):
            return r
        try:
            return evento_json(calendario.editar(eid[:40], datos_de(entrada)))
        except LookupError:
            return JSONResponse({'detail': 'Ese evento no existe.'}, status_code=404)
        except ValueError as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)

    @router.delete('/admin/{eid}')
    async def admin_eliminar(eid: str, request: Request):
        if (r := await solo_admin(request)):
            return r
        try:
            return {'id': eid, 'eliminado': calendario.eliminar(eid[:40])}
        except LookupError:
            return JSONResponse({'detail': 'Ese evento no existe.'}, status_code=404)

    @router.put('/{eid}/suscripcion')
    async def suscribir(eid: str, request: Request, entrada: SuscripcionEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión para recibir avisos.', 'requiere_sesion': True}, status_code=401)
        try:
            calendario.suscribir(u.id, eid[:40], entrada.activa)
        except LookupError:
            return JSONResponse({'detail': 'Ese evento no existe.'}, status_code=404)
        return {'id': eid, 'suscrito': entrada.activa}

    return router
