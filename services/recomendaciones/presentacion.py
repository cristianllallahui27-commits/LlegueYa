from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from services.compartido.sesion import VerificadorSesion
from .aplicacion import PlanInvalido, Viajes

SESION = {'detail': 'Inicia sesión para guardar tu viaje.', 'requiere_sesion': True}


def viaje_json(v):
    return {'id': v.id, 'titulo': v.titulo, 'dias': v.dias, 'aceptado_en': v.aceptado_en.isoformat()}


class PlanEntrada(BaseModel):
    plan: dict


def crear_router(viajes: Viajes, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/recomendaciones')

    @router.get('/viajes')
    async def mis(request: Request):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        return {'items': [viaje_json(v) for v in viajes.mis_viajes(u.id)]}

    @router.post('/viajes')
    async def aceptar(request: Request, e: PlanEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        try:
            return JSONResponse(viaje_json(viajes.aceptar(u.id, e.plan)), status_code=201)
        except PlanInvalido as ex:
            return JSONResponse({'detail': str(ex)}, status_code=422)

    @router.delete('/viajes/{vid}')
    async def eliminar(vid: str, request: Request):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        if not viajes.eliminar(u.id, vid[:40]):
            return JSONResponse({'detail': 'No encontramos ese viaje.'}, status_code=404)
        return {'id': vid, 'eliminado': True}

    return router
