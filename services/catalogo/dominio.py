"""Entidades del Catálogo. Sin frameworks ni SQL."""
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

TIPOS = ('arqueologico', 'natural', 'cultural', 'camping', 'aventura', 'otro')


class LugarNoEncontrado(Exception):
    """El lugar no existe o no está publicado."""


class DatosLugarInvalidos(ValueError):
    """Lo que envió administración no cumple las reglas del catálogo."""


# Región de Ayacucho con margen: un lugar fuera de aquí es casi seguro un error de tipeo.
LIMITES_AYACUCHO = (-15.7, -12.0, -75.3, -73.0)
ESTADOS_ADMIN = ('publicado', 'retirado')


def crear_slug(nombre: str) -> str:
    """«Mirador de Acuchimay» → «mirador-de-acuchimay» (sin tildes, solo a-z, 0-9 y guiones)."""
    base = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode().lower()
    slug = re.sub(r'[^a-z0-9]+', '-', base).strip('-')[:70].strip('-')
    if not slug:
        raise DatosLugarInvalidos('El nombre necesita letras o números.')
    return slug


@dataclass(frozen=True)
class Foto:
    url: str
    autor: str
    licencia: str
    fuente_url: str
    descripcion: str = ''


@dataclass(frozen=True)
class Lugar:
    id: str
    slug: str
    nombre: str
    tipo: str
    destino: str
    zona: str
    resumen: str
    descripcion: str
    lat: Optional[float]
    lon: Optional[float]
    fotos: tuple = ()
    como_llegar: str = ''
    recomendaciones: tuple = ()
    altitud_m: Optional[int] = None
    fuente: str = ''
    fuente_url: str = ''
    revisado_en: Optional[date] = None
    demostracion: bool = True

    def __post_init__(self):
        if self.tipo not in TIPOS:
            raise ValueError(f'Tipo de lugar no válido: {self.tipo}')
        if (self.lat is None) != (self.lon is None):
            raise ValueError('Latitud y longitud van juntas.')
        if self.lat is not None and not (-90 <= self.lat <= 90 and -180 <= self.lon <= 180):
            raise ValueError('Coordenadas fuera de rango.')

    @property
    def portada(self) -> Optional[Foto]:
        return self.fotos[0] if self.fotos else None

    @property
    def tiene_coordenadas(self) -> bool:
        return self.lat is not None

    def coincide(self, texto: str) -> bool:
        t = texto.strip().lower()
        return not t or any(t in campo.lower() for campo in (self.nombre, self.zona, self.destino, self.resumen))
