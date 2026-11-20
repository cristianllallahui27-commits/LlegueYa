from typing import Optional
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.compartido.sesion import VerificadorSesion
from .aplicacion import Calendario


def evento_json(e, suscrito=False):
    return {'id': e.id, 'titulo': e.titulo, 'descripcion': e.descripcion, 'lugar': e.lugar_texto,
            'lugar_slug': e.lugar_slug, 'inicio': e.inicio.isoformat(), 'fin': e.fin.isoformat(),
            'estado': e.estado, 'fecha_referencial': e.fecha_referencial, 'fuente': e.fuente,
            'fuente_url': e.fuente_url, 'suscrito': suscrito}


class SuscripcionEntrada(BaseModel):
    activa: bool


def crear_router(calendario: Calendario, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/eventos')

    @router.get('')
    async def proximos(request: Request, mes: Optional[str] = Query(None, pattern=r'^\d{4}-(0[1-9]|1[0-2])$')):
        u = await verificar(request)
        subs = calendario.mis_suscripciones(u.id) if u else set()
        return {'items': [evento_json(e, e.id in subs) for e in calendario.proximos(mes)]}

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
