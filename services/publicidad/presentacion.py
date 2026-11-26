"""API de Publicidad: planes públicos, solicitudes del negocio y panel administrativo."""
from typing import Optional
from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from services.compartido.sesion import VerificadorSesion
from .aplicacion import FOTO_MAX_BYTES, Publicidad
from .dominio import NIVELES, REQUISITOS, RUBROS, NoEncontrada, ReglaPublicidad

SESION = {'detail': 'Inicia sesión para continuar.', 'requiere_sesion': True}
SOLO_ADMIN = {'detail': 'Solo administración puede hacer esto.'}


def plan_json(p):
    return {'id': p.id, 'nombre': p.nombre, 'descripcion': p.descripcion, 'precio': str(p.precio), 'moneda': p.moneda,
            'duracion_dias': p.duracion_dias, 'destacado': p.destacado, 'activo': p.activo,
            'gratuidad_inicial': p.gratuidad_inicial, 'nivel': p.nivel, 'nivel_nombre': NIVELES[p.nivel].nombre}


def nivel_json(n):
    return {'id': n.id, 'nombre': n.nombre, 'lema': n.lema, 'beneficios': n.beneficios(),
            'limites': {'fotos': n.fotos, 'videos': n.videos, 'ofertas': n.ofertas, 'descripcion': n.descripcion,
                        'contacto': n.contacto, 'completo': n.completo, 'carta': n.carta, 'testimonios': n.testimonios,
                        'servicios': n.servicios, 'capacidad': n.capacidad}}


def extras_json(s, nivel, con_contacto):
    """Campos que dependen del nivel del plan. WhatsApp solo con sesión."""
    data = {'fotos': s.fotos[:nivel.fotos], 'videos': s.videos[:nivel.videos]}
    if nivel.contacto:
        data['whatsapp'] = s.whatsapp if con_contacto else None
    if nivel.completo:
        data['horario'] = s.horario
    if nivel.carta:
        data['carta'] = [oferta_json(o) for o in s.carta]
    if nivel.servicios:
        data['servicios'] = s.servicios
    if nivel.capacidad:
        data.update({'habitaciones': s.habitaciones, 'capacidad': s.capacidad})
    if nivel.testimonios:
        data['testimonios'] = s.testimonios
    return data


def solicitud_json(s, pub, admin=False):
    data = {'id': s.id, 'negocio': s.negocio, 'rubro': s.rubro, 'rubro_nombre': RUBROS[s.rubro],
            'descripcion': s.descripcion, 'contacto': s.contacto, 'enlace': s.enlace, 'lugar_slug': s.lugar_slug,
            'direccion': s.direccion, 'lat': s.lat, 'lon': s.lon, 'ofertas': [oferta_json(o) for o in s.ofertas],
            'plan': plan_json(pub.plan_de(s)), 'estado': s.estado, 'pago': s.pago, 'monto': str(s.monto),
            'requisitos': s.requisitos, 'motivo': s.motivo, 'creada_en': s.creada_en.isoformat(),
            'inicio': s.inicio.isoformat() if s.inicio else None, 'fin': s.fin.isoformat() if s.fin else None,
            'fotos': s.fotos, 'videos': s.videos, 'whatsapp': s.whatsapp, 'horario': s.horario,
            'carta': [oferta_json(o) for o in s.carta], 'servicios': s.servicios, 'habitaciones': s.habitaciones,
            'capacidad': s.capacidad, 'testimonios': s.testimonios, 'nivel': pub.nivel(s)}
    if admin:
        data.update({'solicitante': s.solicitante, 'usuario_id': s.usuario_id, 'referencia_pago': s.referencia_pago})
    return data


def oferta_json(o):
    return {'nombre': o['nombre'], 'precio_desde': str(o['precio_desde']) if o['precio_desde'] is not None else None,
            'detalle': o['detalle']}


def negocio_json(s, pub, con_sesion):
    """Ficha pública según el nivel del plan. El contacto (Plus y Premium) se muestra solo con sesión (SDD)."""
    nivel = NIVELES[pub.nivel(s)]
    contacto = con_sesion and nivel.contacto
    return {'id': s.id, 'negocio': s.negocio, 'rubro': s.rubro, 'rubro_nombre': RUBROS[s.rubro],
            'descripcion': s.descripcion, 'direccion': s.direccion, 'lat': s.lat, 'lon': s.lon,
            'ofertas': [oferta_json(o) for o in s.ofertas[:nivel.ofertas]], 'lugar_slug': s.lugar_slug,
            'patrocinado': s.vigente(pub.reloj()), 'verificado': True, 'nivel': nivel.id, 'nivel_nombre': nivel.nombre,
            'contacto': s.contacto if contacto and nivel.completo else None,
            'enlace': s.enlace if contacto and nivel.completo else None,
            'requiere_sesion': nivel.contacto and not con_sesion, **extras_json(s, nivel, contacto)}


def anuncio_json(s, pub):
    nivel = pub.nivel(s)
    n = NIVELES[nivel]
    data = {'id': s.id, 'negocio': s.negocio, 'rubro': RUBROS[s.rubro], 'descripcion': s.descripcion,
            'contacto': s.contacto if n.completo else None, 'enlace': s.enlace if n.completo else None,
            'whatsapp': s.whatsapp if n.contacto else None, 'lugar_slug': s.lugar_slug,
            'foto': s.fotos[0] if s.fotos else None,
            'destacado': nivel == 'premium', 'nivel': nivel, 'verificado': True}
    if nivel != 'basico':   # más detalle cuanto mayor es el plan
        data.update({'direccion': s.direccion, 'ofertas': [oferta_json(o) for o in s.ofertas]})
    if nivel == 'premium':
        data.update({'lat': s.lat, 'lon': s.lon})
    return data


class SolicitudEntrada(BaseModel):
    negocio: str = Field(max_length=150)
    rubro: str = Field(max_length=20)
    descripcion: str = Field(max_length=1200)
    contacto: str = Field(max_length=150)
    plan_id: str = Field(max_length=40)
    enlace: str = Field(default='', max_length=220)
    lugar_slug: Optional[str] = Field(default=None, max_length=80)
    direccion: str = Field(default='', max_length=200)
    lat: Optional[float] = None
    lon: Optional[float] = None
    ofertas: list = Field(default_factory=list, max_length=20)
    fotos: list = Field(default_factory=list, max_length=10)
    videos: list = Field(default_factory=list, max_length=3)
    whatsapp: str = Field(default='', max_length=20)
    horario: str = Field(default='', max_length=140)
    carta: list = Field(default_factory=list, max_length=40)
    servicios: list = Field(default_factory=list, max_length=20)
    habitaciones: Optional[int] = None
    capacidad: Optional[int] = None
    testimonios: list = Field(default_factory=list, max_length=6)


class PlanEntrada(BaseModel):
    nombre: str = Field(max_length=80)
    descripcion: str = Field(default='', max_length=320)
    precio: str = Field(max_length=12)
    duracion_dias: int = Field(ge=1, le=365)
    destacado: bool = False
    nivel: Optional[str] = Field(default=None, max_length=10)
    moneda: str = Field(default='PEN', max_length=3)


class PlanCambio(BaseModel):
    activo: Optional[bool] = None
    precio: Optional[str] = Field(default=None, max_length=12)
    moneda: Optional[str] = Field(default=None, max_length=3)
    duracion_dias: Optional[int] = Field(default=None, ge=1, le=365)
    nombre: Optional[str] = Field(default=None, max_length=80)
    descripcion: Optional[str] = Field(default=None, max_length=320)


class RequisitoEntrada(BaseModel):
    requisito: str = Field(max_length=120)
    cumple: bool


class PagoEntrada(BaseModel):
    referencia: str = Field(max_length=100)


class DecisionEntrada(BaseModel):
    aprobar: bool
    motivo: str = Field(default='', max_length=320)


def crear_router(pub: Publicidad, verificar: VerificadorSesion) -> APIRouter:
    router = APIRouter(prefix='/api/v1/publicidad')

    def error(e):
        if isinstance(e, NoEncontrada):
            return JSONResponse({'detail': 'No encontramos ese registro.'}, status_code=404)
        return JSONResponse({'detail': str(e)}, status_code=422)

    async def admin(request):
        u = await verificar(request)
        if u is None:
            return None, JSONResponse(SESION, status_code=401)
        if not u.admin:
            return None, JSONResponse(SOLO_ADMIN, status_code=403)
        return u, None

    @router.get('/rubros')
    def rubros():
        return {'rubros': [{'id': k, 'nombre': v, 'requisitos': list(REQUISITOS[k])} for k, v in RUBROS.items()]}

    @router.get('/planes')
    def planes():
        return {'planes': [plan_json(p) for p in pub.planes()], 'niveles': [nivel_json(n) for n in NIVELES.values()]}

    @router.post('/fotos')
    async def subir_foto(request: Request, foto: UploadFile = File(...)):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        try:
            url = pub.subir_foto(u.id, await foto.read(FOTO_MAX_BYTES + 1))
        except ReglaPublicidad as ex:
            return error(ex)
        return JSONResponse({'url': url}, status_code=201)

    @router.get('/fotos/{nombre}')
    def ver_foto(nombre: str):
        r = pub.foto(nombre[:60])
        if r is None:
            return JSONResponse({'detail': 'Foto no disponible.'}, status_code=404)
        return Response(r[0], media_type=r[1], headers={'Cache-Control': 'public, max-age=86400'})

    @router.get('/anuncios')
    def anuncios():
        return {'anuncios': [anuncio_json(s, pub) for s in pub.anuncios()]}

    @router.get('/directorio')
    async def directorio(request: Request, rubro: Optional[str] = None):
        u = await verificar(request)
        try:
            items = pub.directorio(rubro)
        except ReglaPublicidad as ex:
            return error(ex)
        return JSONResponse({'items': [negocio_json(s, pub, u is not None) for s in items]},
                            headers={'Cache-Control': 'private, no-store', 'Vary': 'Cookie'})

    @router.post('/solicitudes')
    async def solicitar(request: Request, e: SolicitudEntrada):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        try:
            s = pub.solicitar(u.id, u.nombre, e.negocio, e.rubro, e.descripcion, e.contacto, e.plan_id, e.enlace,
                              e.lugar_slug, e.direccion, e.lat, e.lon, e.ofertas, e.fotos, e.videos, e.whatsapp,
                              e.horario, e.carta, e.servicios, e.habitaciones, e.capacidad, e.testimonios)
        except (ReglaPublicidad, NoEncontrada) as ex:
            return error(ex)
        return JSONResponse(solicitud_json(s, pub), status_code=201)

    @router.get('/mis-solicitudes')
    async def mias(request: Request):
        u = await verificar(request)
        if u is None:
            return JSONResponse(SESION, status_code=401)
        return {'items': [solicitud_json(s, pub) for s in pub.mis_solicitudes(u.id)]}

    # --- administración --------------------------------------------------
    @router.get('/admin/solicitudes')
    async def todas(request: Request, estado: Optional[str] = None):
        _, r = await admin(request)
        if r:
            return r
        return {'items': [solicitud_json(s, pub, admin=True) for s in pub.solicitudes(estado)],
                'planes': [plan_json(p) for p in pub.planes(solo_activos=False)]}

    @router.post('/admin/planes')
    async def nuevo_plan(request: Request, e: PlanEntrada):
        _, r = await admin(request)
        if r:
            return r
        try:
            return JSONResponse(plan_json(pub.crear_plan(e.nombre, e.descripcion, e.precio, e.duracion_dias, e.destacado, nivel=e.nivel, moneda=e.moneda)), status_code=201)
        except ReglaPublicidad as ex:
            return error(ex)

    @router.put('/admin/planes/{pid}')
    async def activar(pid: str, request: Request, e: PlanCambio):
        _, r = await admin(request)
        if r:
            return r
        try:
            return plan_json(pub.editar_plan(pid[:40], **e.model_dump()))
        except (NoEncontrada, ReglaPublicidad) as ex:
            return error(ex)

    @router.put('/admin/solicitudes/{sid}/requisitos')
    async def requisito(sid: str, request: Request, e: RequisitoEntrada):
        _, r = await admin(request)
        if r:
            return r
        try:
            return solicitud_json(pub.marcar_requisito(sid[:40], e.requisito, e.cumple), pub, admin=True)
        except (ReglaPublicidad, NoEncontrada) as ex:
            return error(ex)

    @router.post('/admin/solicitudes/{sid}/pago')
    async def pago(sid: str, request: Request, e: PagoEntrada):
        _, r = await admin(request)
        if r:
            return r
        try:
            return solicitud_json(pub.registrar_pago(sid[:40], e.referencia), pub, admin=True)
        except (ReglaPublicidad, NoEncontrada) as ex:
            return error(ex)

    @router.post('/admin/solicitudes/{sid}/decision')
    async def decision(sid: str, request: Request, e: DecisionEntrada):
        _, r = await admin(request)
        if r:
            return r
        try:
            return solicitud_json(pub.decidir(sid[:40], e.aprobar, e.motivo), pub, admin=True)
        except (ReglaPublicidad, NoEncontrada) as ex:
            return error(ex)

    return router
