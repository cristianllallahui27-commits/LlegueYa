"""Publicidad y verificación de negocios turísticos.

Un negocio pide promocionarse; LlegueYa verifica sus requisitos, registra el
pago (manual mientras no exista pasarela) y recién entonces se publica como
«Patrocinado». Pagar no garantiza aprobación (SDD).
"""
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

RUBROS = {
    'hospedaje': 'Hospedaje',
    'restaurante': 'Restaurante',
    'transporte': 'Movilidad y transporte turístico',
    'operador': 'Agencia y paquetes turísticos',
    'artesania': 'Artesanía',
    'otro': 'Otro servicio turístico',
}

# Lista de verificación por rubro. Es configurable y debe revisarse con la
# normativa vigente (DIRCETUR Ayacucho, MTC, municipalidad); no reemplaza la norma.
REQUISITOS = {
    'hospedaje': ('RUC activo', 'Licencia municipal de funcionamiento',
                  'Registro o clasificación ante DIRCETUR', 'Fotos reales del establecimiento'),
    'restaurante': ('RUC activo', 'Licencia municipal de funcionamiento',
                    'Condiciones sanitarias vigentes', 'Fotos reales del local'),
    'transporte': ('RUC activo', 'Autorización de transporte turístico', 'SOAT vigente',
                   'Revisión técnica vigente'),
    'operador': ('RUC activo', 'Registro de agencia de viajes ante DIRCETUR',
                 'Guías de turismo identificados', 'Paquetes descritos con precio y qué incluyen'),
    'artesania': ('RUC o RUS', 'Fotos de productos propios', 'Dirección del taller o punto de venta'),
    'otro': ('RUC activo', 'Descripción verificable del servicio'),
}


# Región de Ayacucho (aprox.): evita ubicaciones fuera de la zona por error.
LIMITES_AYACUCHO = (-15.7, -12.0, -75.3, -73.0)
MONEDAS = {'PEN': 'S/', 'USD': 'US$'}
MAX_OFERTAS = 20   # tope absoluto; cada nivel tiene el suyo


@dataclass(frozen=True)
class Nivel:
    """Lo que un negocio puede mostrar según su plan (como los planes Gratis/Plus/Pro de un servicio en línea)."""
    id: str
    nombre: str
    lema: str
    fotos: int
    videos: int
    ofertas: int
    descripcion: int          # caracteres
    contacto: bool            # botón de WhatsApp visible al viajero (Plus y Premium)
    completo: bool            # además teléfono, horario y página web (solo Premium)
    carta: int                # platos o productos de la carta / tarifario
    testimonios: int          # experiencias de clientes
    servicios: int            # servicios incluidos (wifi, desayuno, guía bilingüe…)
    capacidad: bool           # habitaciones y aforo
    prioridad: int            # orden en Inicio y Servicios

    def beneficios(self) -> list:
        b = [f'Hasta {self.fotos} fotos del local', 'Dirección y ubicación en el mapa', 'Sello «Verificado por LlegueYa»',
             f'Hasta {self.ofertas} productos o servicios con precio']
        if self.contacto:
            b.append('Botón de WhatsApp para que te escriban')
        if self.completo:
            b.append('Teléfono, horario de atención y página o red social')
        if self.videos:
            b.append(f'{self.videos} video' + ('s' if self.videos > 1 else '') + ' (YouTube, Facebook, TikTok o Instagram)')
        if self.carta:
            b.append(f'Carta o tarifario completo (hasta {self.carta} ítems)')
        if self.servicios:
            b.append('Servicios que incluyes (wifi, desayuno, guía, estacionamiento…)')
        if self.capacidad:
            b.append('Habitaciones y aforo')
        if self.testimonios:
            b.append(f'Hasta {self.testimonios} experiencias de clientes')
        b.append({0: 'Patrocinado en Inicio el primer mes', 1: 'Patrocinado en Inicio mientras dure el plan',
                  2: 'Destacado arriba de todos en Inicio y Servicios'}[self.prioridad])
        b.append({0: 'Willaq Uma te menciona con tu dirección', 1: 'Willaq Uma te recomienda antes y comparte tu WhatsApp',
                  2: 'Willaq Uma te recomienda primero y con todo tu detalle'}[self.prioridad])
        return b


NIVELES = {
    'basico': Nivel('basico', 'Básico', 'Para empezar: tu negocio verificado en el directorio.',
                    fotos=2, videos=0, ofertas=3, descripcion=300, contacto=False, completo=False,
                    carta=0, testimonios=0, servicios=0, capacidad=False, prioridad=0),
    'plus': Nivel('plus', 'Plus', 'Más fotos, un video y que te escriban por WhatsApp.',
                  fotos=4, videos=1, ofertas=8, descripcion=800, contacto=True, completo=False,
                  carta=0, testimonios=0, servicios=0, capacidad=False, prioridad=1),
    'premium': Nivel('premium', 'Premium', 'Tu vitrina completa: carta, servicios, capacidad y experiencias de clientes.',
                     fotos=10, videos=3, ofertas=20, descripcion=2000, contacto=True, completo=True,
                     carta=40, testimonios=6, servicios=20, capacidad=True, prioridad=2),
}

# Planes con los que arranca la plataforma (administración puede crear otros o desactivarlos).
# (nombre, descripción, precio, moneda, días, nivel, gratuidad inicial)
PLANES_INICIALES = (
    ('Básico', 'Gratis. Tu negocio verificado con dirección, mapa y 2 fotos.', '0', 'PEN', 30, 'basico', True),
    ('Plus', 'Mensual. Más fotos, un video, tu WhatsApp y presencia en Inicio.', '20', 'PEN', 30, 'plus', False),
    ('Premium', 'Anual. Todo completo: teléfono, horario, web, carta, servicios, habitaciones y experiencias de clientes.', '59', 'PEN', 365, 'premium', False),
)


class ReglaPublicidad(ValueError):
    """Mensaje apto para mostrar al usuario."""


class NoEncontrada(LookupError):
    pass


@dataclass
class Plan:
    id: str
    nombre: str
    descripcion: str
    precio: Decimal          # en la moneda del plan; 0 = gratuito
    duracion_dias: int
    destacado: bool = False
    activo: bool = True
    gratuidad_inicial: bool = False   # solo una vez por usuario
    nivel: str = 'basico'             # basico | plus | premium (ver NIVELES)
    moneda: str = 'PEN'               # PEN (soles) o USD (dólares)

    def __post_init__(self):
        if self.nivel not in NIVELES:
            raise ReglaPublicidad('Nivel de plan no válido.')
        if self.moneda not in MONEDAS:
            raise ReglaPublicidad('La moneda debe ser soles (PEN) o dólares (USD).')
        if self.precio < 0:
            raise ReglaPublicidad('El precio no puede ser negativo.')
        if not 1 <= self.duracion_dias <= 365:
            raise ReglaPublicidad('La duración va de 1 a 365 días.')


@dataclass
class Solicitud:
    id: str
    usuario_id: str
    solicitante: str
    negocio: str
    rubro: str
    descripcion: str
    contacto: str
    plan_id: str
    creada_en: datetime
    enlace: str = ''
    lugar_slug: Optional[str] = None
    estado: str = 'pendiente'               # pendiente | aprobada | rechazada
    requisitos: dict = field(default_factory=dict)
    pago: str = 'pendiente'                 # no_requerido | pendiente | registrado
    referencia_pago: str = ''
    monto: Decimal = Decimal('0')
    motivo: str = ''
    inicio: Optional[datetime] = None
    fin: Optional[datetime] = None
    direccion: str = ''
    lat: Optional[float] = None
    lon: Optional[float] = None
    ofertas: list = field(default_factory=list)   # [{nombre, precio_desde, detalle}] productos o servicios
    # Lo siguiente depende del nivel del plan (ver NIVELES)
    fotos: list = field(default_factory=list)        # rutas de fotos subidas por el mismo negocio
    videos: list = field(default_factory=list)       # enlaces https a YouTube, Facebook, TikTok o Instagram
    whatsapp: str = ''                               # 51 + 9 dígitos
    horario: str = ''
    carta: list = field(default_factory=list)        # [{nombre, precio_desde, detalle}]
    servicios: list = field(default_factory=list)    # ['Wifi', 'Desayuno', …]
    habitaciones: Optional[int] = None
    capacidad: Optional[int] = None                  # aforo o personas
    testimonios: list = field(default_factory=list)  # [{autor, texto}] contados por el negocio y revisados por admin
    nivel: str = 'basico'                            # nivel del plan al pedirlo (lo usa Willaq Uma)

    @property
    def requisitos_completos(self) -> bool:
        return bool(self.requisitos) and all(self.requisitos.values())

    def vigente(self, ahora: datetime) -> bool:
        return self.estado == 'aprobada' and self.inicio is not None and self.inicio <= ahora < self.fin
