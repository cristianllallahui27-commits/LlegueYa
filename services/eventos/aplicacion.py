"""Calendario: próximos eventos y suscripciones (avisos solo con sesión)."""
from datetime import date
import uuid
from dataclasses import replace
from typing import Optional, Protocol
from .dominio import Evento


class RepositorioEventos(Protocol):
    def listar(self) -> list: ...
    def suscripciones(self, usuario: str) -> set: ...
    def suscribir(self, usuario: str, evento_id: str, activa: bool) -> None: ...
    def guardar(self, evento) -> None: ...
    def eliminar(self, evento_id: str) -> None: ...


class Calendario:
    def __init__(self, repo: RepositorioEventos, hoy=date.today):
        self.repo, self.hoy = repo, hoy

    def proximos(self, mes: Optional[str] = None, limite: int = 20) -> list:
        hoy = self.hoy()
        eventos = [e for e in self.repo.listar() if e.fin >= hoy]
        if mes:
            anio, m = (int(x) for x in mes.split('-'))
            eventos = [e for e in eventos if (e.inicio.year, e.inicio.month) <= (anio, m) <= (e.fin.year, e.fin.month)]
        return sorted(eventos, key=lambda e: e.inicio)[:max(1, min(limite, 50))]

    def suscribir(self, usuario: str, evento_id: str, activa: bool) -> bool:
        if not any(e.id == evento_id for e in self.repo.listar()):
            raise LookupError(evento_id)
        self.repo.suscribir(usuario, evento_id, activa)
        return activa

    def mis_suscripciones(self, usuario: str) -> set:
        return self.repo.suscripciones(usuario)

    # --- administración ---------------------------------------------------
    def todos(self) -> list:
        return sorted(self.repo.listar(), key=lambda e: e.inicio)

    def crear(self, datos: dict) -> Evento:
        e = Evento(id=str(uuid.uuid4()), estado='confirmado', fecha_referencial=bool(datos.pop('fecha_referencial', False)),
                   fuente=datos.pop('fuente', None) or 'Publicado por LlegueYa', fuente_url=datos.pop('fuente_url', None) or '', **datos)
        self.repo.guardar(e)
        return e

    def editar(self, evento_id: str, datos: dict) -> Evento:
        actual = next((e for e in self.repo.listar() if e.id == evento_id), None)
        if actual is None:
            raise LookupError(evento_id)
        e = replace(actual, **datos)   # valida de nuevo en __post_init__
        self.repo.guardar(e)
        return e

    def eliminar(self, evento_id: str) -> str:
        actual = next((e for e in self.repo.listar() if e.id == evento_id), None)
        if actual is None:
            raise LookupError(evento_id)
        self.repo.eliminar(evento_id)
        return actual.titulo
