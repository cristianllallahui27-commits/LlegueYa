import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

_FOTO = re.compile(r'^(/api/v1/catalogo/fotos/[0-9a-f]{32}\.(jpg|png|webp)|https://[^\s]{4,280})$')


@dataclass(frozen=True)
class Evento:
    id: str
    titulo: str
    descripcion: str
    lugar_texto: str
    lugar_slug: Optional[str]
    inicio: date
    fin: date
    estado: str              # confirmado | cancelado | finalizado
    fecha_referencial: bool  # True: fecha tradicional, falta confirmación del organizador
    fuente: str
    fuente_url: str
    foto_url: Optional[str] = None   # foto pequeña que sube la administración

    def __post_init__(self):
        if self.fin < self.inicio:
            raise ValueError('El evento termina antes de empezar.')
        if self.foto_url is not None and not _FOTO.match(self.foto_url):
            raise ValueError('La foto del evento no es válida: sube una foto o usa un enlace https.')
        if self.estado not in ('confirmado', 'cancelado', 'finalizado'):
            raise ValueError('Estado de evento no válido.')
