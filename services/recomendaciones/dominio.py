"""Dominio de Recomendaciones: el viaje que un viajero acepta y la regla que lo invalida."""
from dataclasses import dataclass
from datetime import datetime


class PlanInvalido(ValueError):
    pass


@dataclass
class Viaje:
    id: str
    usuario_id: str
    titulo: str
    dias: list
    aceptado_en: datetime
