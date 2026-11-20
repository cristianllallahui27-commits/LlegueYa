from dataclasses import asdict
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from services.compartido.limite import LimiteSimple
from services.compartido.sesion import VerificadorSesion
from services.compartido.seguridad import ip_cliente
from .aplicacion import WillaqUma


class Mensaje(BaseModel):
    texto: str = Field(min_length=1, max_length=500)


def crear_router(asistente: WillaqUma, verificar: VerificadorSesion, limite=None) -> APIRouter:
    router = APIRouter(prefix='/api/v1/asistente')
    limite = limite or LimiteSimple()

    @router.get('/presentacion')
    def presentacion():
        return {'asistente': 'Willaq Uma', **asdict(asistente.presentacion())}

    @router.post('/mensajes')
    async def mensaje(request: Request, entrada: Mensaje):
        ip = ip_cliente(request)
        if not limite.permitir(ip):
            return JSONResponse({'detail': 'Vas muy rápido. Espera un minuto y vuelve a preguntar.'}, status_code=429)
        u = await verificar(request)
        if u is None:
            # Conversar con Willaq Uma es una función de la cuenta, como comentar o publicar.
            return JSONResponse({'detail': 'Inicia sesión para conversar con Willaq Uma.', 'requiere_sesion': True}, status_code=401)
        r = asistente.responder(entrada.texto, autenticado=True, nombre=u.nombre)
        return {'asistente': 'Willaq Uma', **asdict(r)}

    return router
