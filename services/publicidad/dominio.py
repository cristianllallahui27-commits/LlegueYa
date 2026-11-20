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
MAX_OFERTAS = 8


class ReglaPublicidad(ValueError):
    """Mensaje apto para mostrar al usuario."""


class NoEncontrada(LookupError):
    pass


@dataclass
class Plan:
    id: str
    nombre: str
    descripcion: str
    precio: Decimal          # soles (PEN); 0 = gratuito
    duracion_dias: int
    destacado: bool = False
    activo: bool = True
    gratuidad_inicial: bool = False   # solo una vez por usuario

    def __post_init__(self):
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

    @property
    def requisitos_completos(self) -> bool:
        return bool(self.requisitos) and all(self.requisitos.values())

    def vigente(self, ahora: datetime) -> bool:
        return self.estado == 'aprobada' and self.inicio is not None and self.inicio <= ahora < self.fin
