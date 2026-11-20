"""Calendario: próximos eventos y suscripciones (avisos solo con sesión)."""
from datetime import date
from typing import Optional, Protocol


class RepositorioEventos(Protocol):
    def listar(self) -> list: ...
    def suscripciones(self, usuario: str) -> set: ...
    def suscribir(self, usuario: str, evento_id: str, activa: bool) -> None: ...


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
