from dataclasses import dataclass
from datetime import date
from typing import Optional


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

    def __post_init__(self):
        if self.fin < self.inicio:
            raise ValueError('El evento termina antes de empezar.')
        if self.estado not in ('confirmado', 'cancelado', 'finalizado'):
            raise ValueError('Estado de evento no válido.')
