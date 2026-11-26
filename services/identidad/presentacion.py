from dataclasses import asdict
import os
from typing import Optional
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from services.compartido.limite import LimiteSimple
from services.compartido.seguridad import aplicar_seguridad, ip_cliente
from services.compartido.sesion import UsuarioSesion
from .dominio import AuthError, DatosInvalidos


class RegistroEntrada(BaseModel):
    nombre: str = Field(max_length=120)
    correo: str = Field(max_length=254)
    clave: str = Field(max_length=100)


class EntradaCorreo(BaseModel):
    correo: str = Field(max_length=254)
    clave: str = Field(max_length=100)


class RecuperarEntrada(BaseModel):
    correo: str = Field(max_length=254)


class ClaveEntrada(BaseModel):
    clave: str = Field(max_length=100)


class CodigoEntrada(BaseModel):
    correo: str = Field(max_length=254)
    codigo: str = Field(max_length=20)

# La cookie de sesión se envía a toda la API para que Comunidad, Catálogo y
# Eventos puedan pedir a Identidad quién es el usuario. Sigue siendo HttpOnly.
RUTA_COOKIE = '/api'


def crear_router(acceso, origin, es_admin=lambda correo: False, google_activo=True, limite=None):
    router = APIRouter()
    secure = origin.startswith('https://')
    # Contra fuerza bruta: pocos intentos de clave por IP y minuto.
    limite = limite or LimiteSimple(maximo=int(os.getenv('AUTH_LIMITE_MINUTO', '10')), ventana=60)

    def poner_sesion(response, session):
        response.set_cookie('ly_session', session, max_age=7 * 24 * 3600, httponly=True, secure=secure, samesite='lax', path=RUTA_COOKIE)

    def poner_flujo(response, flow, segundos):
        response.set_cookie('ly_flow', flow, max_age=segundos, httponly=True, secure=secure, samesite='lax', path='/api/v1/auth')

    def bloqueado(request):
        ip = ip_cliente(request)
        if not limite.permitir(ip):
            return JSONResponse({'detail': 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'}, status_code=429)
        if acceso is None:
            return JSONResponse({'detail': 'Las cuentas aún no están configuradas en este servidor.'}, status_code=503)
        return None

    def error(e):
        return JSONResponse({'detail': e.mensaje if isinstance(e, AuthError) else str(e)}, status_code=422 if isinstance(e, DatosInvalidos) else e.estado_http)

    @router.get('/api/v1/health')
    def health():
        return {'status': 'ok', 'google_configurado': acceso is not None and google_activo,
                'cuentas_configuradas': acceso is not None,
                'metodos': {'google': acceso is not None and google_activo, 'correo': acceso is not None},
                'etapa': 'plataforma-local'}

    @router.post('/api/v1/auth/registro')
    async def registro(request: Request, e: RegistroEntrada):
        r = bloqueado(request)
        if r:
            return r
        try:
            estado, valor = await acceso.registrar(e.correo, e.clave, e.nombre)
        except (AuthError, DatosInvalidos) as ex:
            return error(ex)
        if estado == 'sesion':
            response = JSONResponse({'estado': 'sesion'})
            poner_sesion(response, valor)
            return response
        response = JSONResponse({'estado': 'confirmar', 'detail': 'Te enviamos un código de verificación a tu correo. Escríbelo aquí para activar tu cuenta (revisa también spam).'})
        poner_flujo(response, valor, 24 * 3600)
        return response

    @router.post('/api/v1/auth/verificar')
    async def verificar(request: Request, e: CodigoEntrada):
        r = bloqueado(request)
        if r:
            return r
        try:
            session = await acceso.verificar_correo(e.correo, e.codigo)
        except (AuthError, DatosInvalidos) as ex:
            return error(ex)
        acceso.salir(request.cookies.get('ly_session'))
        response = JSONResponse({'estado': 'sesion'})
        poner_sesion(response, session)
        response.delete_cookie('ly_flow', path='/api/v1/auth')
        return response

    @router.post('/api/v1/auth/reenviar')
    async def reenviar(request: Request, e: RecuperarEntrada):
        r = bloqueado(request)
        if r:
            return r
        try:
            await acceso.reenviar_codigo(e.correo)
        except DatosInvalidos as ex:
            return error(ex)
        except AuthError as ex:
            # Límites de envío sí se informan; si la cuenta existe o no, no.
            if ex.mensaje != AuthError().mensaje:
                return error(ex)
        return {'detail': 'Si el correo está pendiente de confirmar, te llegará un código nuevo.'}

    @router.post('/api/v1/auth/entrar')
    async def entrar(request: Request, e: EntradaCorreo):
        r = bloqueado(request)
        if r:
            return r
        try:
            session = await acceso.entrar(e.correo, e.clave)
        except (AuthError, DatosInvalidos) as ex:
            return error(ex)
        acceso.salir(request.cookies.get('ly_session'))
        response = JSONResponse({'estado': 'sesion'})
        poner_sesion(response, session)
        return response

    @router.post('/api/v1/auth/recuperar')
    async def recuperar(request: Request, e: RecuperarEntrada):
        r = bloqueado(request)
        if r:
            return r
        try:
            flow = await acceso.recuperar(e.correo)
        except DatosInvalidos as ex:
            return error(ex)
        except AuthError as ex:
            # Errores de envío sí se informan (p. ej. límite de correos); la existencia de la cuenta no.
            if ex.mensaje != AuthError().mensaje:
                return error(ex)
            flow = None
        response = JSONResponse({'detail': 'Si el correo tiene una cuenta, te llegará un enlace para crear una clave nueva. Ábrelo en este mismo navegador.'})
        if flow:
            poner_flujo(response, flow, 3600)
        return response

    @router.get('/api/v1/auth/recuperacion')
    async def recuperacion(request: Request):
        response = RedirectResponse('/?estado=enlace-vencido', status_code=303)
        if acceso is not None:
            try:
                session = await acceso.completar(request.cookies.get('ly_flow'), request.query_params.get('code'))
                acceso.salir(request.cookies.get('ly_session'))
                response = RedirectResponse('/#/nueva-clave', status_code=303)
                poner_sesion(response, session)
            except AuthError:
                pass
        response.delete_cookie('ly_flow', path='/api/v1/auth')
        return response

    @router.post('/api/v1/auth/clave')
    async def clave(request: Request, e: ClaveEntrada):
        if acceso is None:
            return JSONResponse({'detail': 'Las cuentas aún no están configuradas.'}, status_code=503)
        try:
            await acceso.cambiar_clave(request.cookies.get('ly_session'), e.clave)
        except DatosInvalidos as ex:
            return error(ex)
        except AuthError as ex:
            return JSONResponse({'detail': ex.mensaje if ex.mensaje != AuthError().mensaje else 'Inicia sesión para cambiar tu clave.'}, status_code=401)
        return {'detail': 'Tu clave se actualizó.'}

    @router.post('/api/v1/auth/google')
    def google():
        if acceso is None or not google_activo:
            return RedirectResponse('/?estado=configuracion', status_code=303)
        try:
            flow, url = acceso.iniciar()
        except AuthError:
            return RedirectResponse('/?estado=error', status_code=303)
        response = RedirectResponse(url, status_code=303)
        response.set_cookie('ly_flow', flow, max_age=600, httponly=True, secure=secure, samesite='lax', path='/api/v1/auth')
        return response

    @router.get('/api/v1/auth/callback')
    async def callback(request: Request):
        response = RedirectResponse('/?estado=error', status_code=303)
        if acceso is not None:
            try:
                session = await acceso.completar(request.cookies.get('ly_flow'), request.query_params.get('code'))
                acceso.salir(request.cookies.get('ly_session'))
                response = RedirectResponse('/?estado=bienvenido', status_code=303)
                poner_sesion(response, session)
            except AuthError as ex:
                if 'suspendida' in ex.mensaje:
                    response = RedirectResponse('/?estado=suspendida', status_code=303)
        response.delete_cookie('ly_flow', path='/api/v1/auth')
        return response

    @router.get('/api/v1/auth/me')
    async def me(request: Request):
        try:
            if acceso is None:
                raise AuthError()
            usuario = await acceso.actual(request.cookies.get('ly_session'))
            return {**asdict(usuario), 'admin': es_admin(usuario.correo)}
        except AuthError:
            return JSONResponse({'detail': 'Inicia sesión para continuar.'}, status_code=401)

    @router.post('/api/v1/auth/logout')
    def logout(request: Request):
        if acceso is not None:
            acceso.salir(request.cookies.get('ly_session'))
        response = RedirectResponse('/', status_code=303)
        response.delete_cookie('ly_session', path=RUTA_COOKIE)
        return response

    return router


def verificador_local(acceso, es_admin=lambda correo: False):
    """Adaptador en proceso del puerto VerificadorSesion (composición de desarrollo)."""
    async def verificar(request: Request) -> Optional[UsuarioSesion]:
        if acceso is None:
            return None
        try:
            u = await acceso.actual(request.cookies.get('ly_session'))
        except AuthError:
            return None
        return UsuarioSesion(u.id, u.nombre, u.avatar, es_admin(u.correo))
    return verificar


def crear_api(acceso, origin, web):
    """Identidad desplegada sola (con la web estática para desarrollo)."""
    app = FastAPI(title='LlegueYa · Identidad', docs_url=None, redoc_url=None, openapi_url=None)
    aplicar_seguridad(app, origin)
    app.include_router(crear_router(acceso, origin))
    if web is not None:
        app.mount('/', StaticFiles(directory=web, html=True), name='web-local')
    return app
