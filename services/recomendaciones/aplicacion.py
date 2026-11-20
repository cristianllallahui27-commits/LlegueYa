"""Recomendaciones: planes de viaje que Willaq Uma propone y el viajero acepta.

El plan llega del navegador, así que se revalida contra el Catálogo: solo
se guardan lugares publicados y con límites de tamaño.
"""
import uuid
from datetime import datetime, timezone
from typing import Callable, Optional, Protocol

from .dominio import PlanInvalido, Viaje


class RepositorioViajes(Protocol):
    """Puerto: dónde se guardan los viajes aceptados."""
    def guardar(self, viaje: Viaje) -> None: ...
    def de(self, usuario_id: str) -> list: ...
    def eliminar(self, usuario_id: str, viaje_id: str) -> bool: ...



class Viajes:
    def __init__(self, repo, lugar: Callable[[str], Optional[object]], reloj=lambda: datetime.now(timezone.utc)):
        self.repo, self.lugar, self.reloj = repo, lugar, reloj

    def aceptar(self, usuario_id: str, plan: dict) -> Viaje:
        if not isinstance(plan, dict) or not isinstance(plan.get('dias'), list) or not 1 <= len(plan['dias']) <= 5:
            raise PlanInvalido('El plan debe tener entre 1 y 5 días.')
        dias = []
        for n, d in enumerate(plan['dias'], start=1):
            slugs = [l.get('slug') for l in d.get('lugares', []) if isinstance(l, dict)] if isinstance(d, dict) else None
            if slugs is None or len(slugs) > 3:
                raise PlanInvalido('Cada día admite hasta 3 lugares.')
            lugares = []
            for slug in slugs:
                l = self.lugar(slug) if isinstance(slug, str) else None
                if l is None:
                    raise PlanInvalido('El plan incluye un lugar que no está publicado.')
                lugares.append({'slug': l.slug, 'nombre': l.nombre, 'resumen': l.resumen})
            titulo = (lugares and f'{l.destino}') or 'Día libre'
            dias.append({'numero': n, 'titulo': str(d.get('titulo') or titulo)[:80], 'lugares': lugares})
        v = Viaje(str(uuid.uuid4()), usuario_id, str(plan.get('titulo') or 'Mi viaje')[:80], dias, self.reloj())
        self.repo.guardar(v)
        return v

    def mis_viajes(self, usuario_id: str) -> list:
        return self.repo.de(usuario_id)

    def eliminar(self, usuario_id: str, viaje_id: str) -> bool:
        return self.repo.eliminar(usuario_id, viaje_id)
