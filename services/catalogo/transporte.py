"""Cómo llegar por cuenta propia: terminales y paraderos de autos y buses, pasaje y tiempo aproximados.

Son datos REFERENCIALES tomados de guías de viaje publicadas (cada terminal trae sus fuentes). Los
paraderos y precios cambian: la pantalla siempre pide confirmar al subir. Administración los
corrige, agrega o elimina desde el panel; aquí solo están los terminales con los que arranca la
plataforma (coordenadas verificadas en Google Maps y OpenStreetMap el 23/11/2026).
"""
from typing import Optional
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from services.compartido.sesion import VerificadorSesion
from .infraestructura import TerminalesMemoria
from .terminales import Terminal, TerminalInvalido, TerminalNoEncontrado, Terminales

AVISO = 'Datos referenciales de guías de viaje. Los paraderos y precios cambian: confirma con el cobrador antes de subir.'
POR_TU_CUENTA = 'El viaje o servicio que vayas a tomar es por tu cuenta. Aquí solo te damos una referencia.'

_COMERCIO = {'nombre': 'El Comercio (Vamos)', 'url': 'https://elcomercio.pe/vamos/peru/ayacucho-10-atractivos-turisticos-que-no-puedes-dejar-de-conocer-fotos-noticia/'}
_SYGIC = {'nombre': 'Guía Sygic Travel', 'url': 'https://guides.travel.sygic.com/production/en/Ayacucho'}
_123 = {'nombre': '123 Perú', 'url': 'https://es.123peru.com/destinos/ayacucho/pampa-de-la-quinua-un-gigantesco-obelisco/'}
_MICROS = {'nombre': 'Directorio de micros (2026)', 'url': 'https://www.directoriodemicros.com/2026/05/visitando-por-tu-cuenta-la-pampa-de-ayacucho.html'}
_MARVELOUS = {'nombre': 'Marvelous Peru', 'url': 'https://www.marvelousperu.com/blog/vilcashuaman-templo-del-sol-y-la-luna/'}

_QUINUA = {'slug': 'pueblo-de-quinua', 'tiempo': 'Cerca de 1 hora', 'tarifa': 'Entre S/ 5 y S/ 10 por persona (combi o colectivo).',
           'nota': 'Los colectivos salen desde temprano. Ya en Quinua, el mototaxi a los puntos del pueblo cuesta pocos soles.'}
_PAMPA = {'slug': 'santuario-pampa-de-ayacucho', 'tiempo': 'Cerca de 1 hora hasta Quinua, más unos 10 min hasta la pampa',
          'tarifa': 'Entre S/ 5 y S/ 10 por persona hasta Quinua; de ahí, unos S/ 5 a S/ 8 en taxi o mototaxi hasta la pampa.',
          'nota': 'La vía Libertadores puede tener tramos en mal estado: pregunta por el estado de la pista antes de salir.'}

TERMINALES_INICIALES = (
    Terminal(id='terminal-libertadores', nombre='Terminal Terrestre Los Libertadores de América', tipo='terminal',
             referencia='Av. Pérez de Cuéllar s/n (Asoc. Los Artesanos), Ayacucho',
             mapa='Terminal Terrestre Los Libertadores de América, Ayacucho', lat=-13.134179, lon=-74.230085,
             pasaje='S/ 20 – 25', descripcion='Buses y colectivos a Vilcashuamán y a otras provincias.',
             destinos=[{'slug': 'vilcashuaman', 'tiempo': 'Entre 1 h 40 min y 2 h 30 min (unos 100 km)',
                        'tarifa': 'Entre S/ 20 y S/ 25 por persona, por tramo (bus o colectivo).',
                        'nota': 'En el pueblo, el mototaxi te acerca a los complejos arqueológicos. Las pistas pueden demorar el viaje.'}],
             fuentes=[_MARVELOUS]),
    Terminal(id='paradero-caceres', nombre='Paradero de colectivos en la Av. Mariscal Cáceres', tipo='paradero',
             referencia='A la altura del Óvalo del Dios Wari, inicio de la carretera a Huanta',
             mapa='Óvalo del Dios Wari, Ayacucho', lat=-13.158674, lon=-74.218836, horario='Desde temprano',
             pasaje='S/ 2 – 10', descripcion='Colectivos y combis hacia el Complejo Wari, Quinua y la Pampa de Ayacucho.',
             destinos=[{'slug': 'complejo-arqueologico-wari', 'tiempo': 'Entre 30 y 45 min',
                        'tarifa': 'Unos pocos soles por persona (una guía de viajeros lo ubica en S/ 2).',
                        'nota': 'Regresa temprano: pasada la tarde hay menos colectivos.'}, _QUINUA, _PAMPA],
             fuentes=[_COMERCIO, _SYGIC, _123, _MICROS]),
    Terminal(id='paradero-cavero', nombre='Paradero de colectivos Jr. Salvador Cavero con Jr. Ciro Alegría', tipo='paradero',
             referencia='Zona este de la ciudad (Urb. Santa Bertha)',
             mapa='Jr. Salvador Cavero con Jr. Ciro Alegría, Ayacucho', lat=-13.157200, lon=-74.215900, horario='Desde temprano',
             pasaje='S/ 5 – 10', descripcion='Combis hacia Quinua y la Pampa de Ayacucho.',
             destinos=[_QUINUA, _PAMPA], fuentes=[_123, _MICROS]),
)

# Vista por destino con los datos iniciales (compatibilidad: Willaq Uma en pruebas, scripts).
TRANSPORTE = Terminales(TerminalesMemoria(TERMINALES_INICIALES)).por_lugar()


def terminal_json(t: Terminal) -> dict:
    return {'id': t.id, 'nombre': t.nombre, 'tipo': t.tipo, 'tipo_nombre': t.tipo_nombre, 'referencia': t.referencia,
            'mapa': t.mapa, 'lat': t.lat, 'lon': t.lon, 'horario': t.horario, 'frecuencia': t.frecuencia,
            'pasaje': t.pasaje, 'descripcion': t.descripcion, 'foto_url': t.foto_url,
            'destinos': t.destinos, 'fuentes': t.fuentes}


class DestinoEntrada(BaseModel):
    slug: str = Field(max_length=80)
    tiempo: str = Field('', max_length=80)
    tarifa: str = Field('', max_length=160)
    nota: str = Field('', max_length=200)


class FuenteEntrada(BaseModel):
    nombre: str = Field('', max_length=80)
    url: str = Field('', max_length=500)


class TerminalEntrada(BaseModel):
    nombre: str = Field(max_length=120)
    tipo: str = Field(max_length=10)
    referencia: str = Field(max_length=200)
    lat: Optional[float] = None
    lon: Optional[float] = None
    mapa: str = Field('', max_length=200)
    horario: str = Field('', max_length=40)
    frecuencia: str = Field('', max_length=40)
    pasaje: str = Field('', max_length=60)
    descripcion: str = Field('', max_length=240)
    foto_url: str = Field('', max_length=500)
    destinos: list[DestinoEntrada] = Field(default_factory=list, max_length=12)
    fuentes: list[FuenteEntrada] = Field(default_factory=list, max_length=4)


def crear_router_transporte(terminales: Optional[Terminales] = None, verificar: Optional[VerificadorSesion] = None) -> APIRouter:
    terminales = terminales or Terminales(TerminalesMemoria(TERMINALES_INICIALES))
    router = APIRouter()

    @router.get('/transporte')
    def transporte():
        return {'aviso': AVISO, 'por_tu_cuenta': POR_TU_CUENTA, 'items': terminales.por_lugar()}

    @router.get('/terminales')
    def lista():
        return {'aviso': AVISO, 'por_tu_cuenta': POR_TU_CUENTA, 'items': [terminal_json(t) for t in terminales.listar()]}

    async def solo_admin(request):
        u = await verificar(request) if verificar else None
        if u is None:
            return JSONResponse({'detail': 'Inicia sesión.', 'requiere_sesion': True}, status_code=401)
        if not u.admin:
            return JSONResponse({'detail': 'Solo administración puede gestionar terminales.'}, status_code=403)
        return None

    def guardar(entrada, terminal_id=None, codigo=200):
        try:
            t = terminales.guardar(entrada.model_dump(), terminal_id)
        except TerminalInvalido as e:
            return JSONResponse({'detail': str(e)}, status_code=422)
        except TerminalNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese terminal.'}, status_code=404)
        return JSONResponse(terminal_json(t), status_code=codigo)

    @router.post('/admin/terminales')
    async def crear(request: Request, entrada: TerminalEntrada):
        return await solo_admin(request) or guardar(entrada, None, 201)

    @router.put('/admin/terminales/{tid}')
    async def editar(tid: str, request: Request, entrada: TerminalEntrada):
        return await solo_admin(request) or guardar(entrada, tid[:80])

    @router.delete('/admin/terminales/{tid}')
    async def eliminar(tid: str, request: Request):
        r = await solo_admin(request)
        if r:
            return r
        try:
            return {'id': tid, 'eliminado': terminales.eliminar(tid[:80])}
        except TerminalNoEncontrado:
            return JSONResponse({'detail': 'No encontramos ese terminal.'}, status_code=404)

    return router
