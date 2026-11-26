"""Terminales y paraderos de autos y buses (parte del Catálogo).

Dominio y casos de uso: administración los crea, corrige o elimina; los viajeros los ven en
Terminales, en el Mapa y en «Cómo llegar» de cada lugar. Son solo REFERENCIA para viajar por
cuenta propia: LlegueYa no vende pasajes ni presta el servicio.
"""
import re
from dataclasses import dataclass, field
from typing import Optional, Protocol
from .dominio import LIMITES_AYACUCHO, crear_slug

TIPOS_TERMINAL = {'terminal': 'Terminal de buses', 'paradero': 'Paradero de autos y combis'}
MAX_DESTINOS = 12
MAX_FUENTES = 4


class TerminalInvalido(ValueError):
    """Mensaje apto para mostrar a administración."""


class TerminalNoEncontrado(LookupError):
    pass


@dataclass
class Terminal:
    id: str
    nombre: str
    tipo: str                      # terminal | paradero
    referencia: str                # cómo ubicarlo («Av. Pérez de Cuéllar s/n…»)
    lat: float
    lon: float
    mapa: str = ''                 # texto que entiende Google Maps
    horario: str = ''              # «24 h», «05:30 – 15:00»
    frecuencia: str = ''           # «Cada 15 min»
    pasaje: str = ''               # resumen corto: «S/ 20 – 25»
    descripcion: str = ''
    foto_url: str = ''             # opcional; si falta se usa la foto del primer destino
    destinos: list = field(default_factory=list)   # [{slug, tiempo, tarifa, nota}]
    fuentes: list = field(default_factory=list)    # [{nombre, url}]

    @property
    def tipo_nombre(self) -> str:
        return TIPOS_TERMINAL[self.tipo]


def _texto(datos, clave, minimo, maximo, nombre):
    v = str(datos.get(clave) or '').strip()
    if len(v) < minimo:
        raise TerminalInvalido(f'Completa {nombre}.' if minimo else f'{nombre} no es válido.')
    if len(v) > maximo:
        raise TerminalInvalido(f'{nombre[0].upper() + nombre[1:]} admite hasta {maximo} caracteres.')
    return v


def _https(valor, nombre, propias=False):
    v = str(valor or '').strip()
    if v and not (v.startswith('https://') or (propias and v.startswith('/api/v1/catalogo/fotos/'))):
        raise TerminalInvalido(f'{nombre} debe ser un enlace https://')
    if len(v) > 500 or ' ' in v:
        raise TerminalInvalido(f'{nombre} no es válido.')
    return v


def construir_terminal(datos: dict, id_: str) -> Terminal:
    tipo = str(datos.get('tipo') or '')
    if tipo not in TIPOS_TERMINAL:
        raise TerminalInvalido('Elige si es terminal de buses o paradero de autos y combis.')
    try:
        lat, lon = round(float(datos.get('lat')), 6), round(float(datos.get('lon')), 6)
    except (TypeError, ValueError):
        raise TerminalInvalido('Marca el terminal en el mapa.')
    s, n, o, e = LIMITES_AYACUCHO
    if not (s <= lat <= n and o <= lon <= e):
        raise TerminalInvalido('La ubicación está fuera de Ayacucho. Revisa el punto en el mapa.')
    nombre = _texto(datos, 'nombre', 3, 120, 'el nombre')
    destinos = []
    for d in (datos.get('destinos') or [])[:MAX_DESTINOS + 1]:
        if not isinstance(d, dict) or not re.fullmatch(r'[a-z0-9-]{1,80}', str(d.get('slug') or '')):
            raise TerminalInvalido('Elige los lugares a los que lleva desde la lista.')
        destinos.append({'slug': d['slug'], 'tiempo': _texto(d, 'tiempo', 0, 80, 'el tiempo'),
                         'tarifa': _texto(d, 'tarifa', 0, 160, 'el pasaje'), 'nota': _texto(d, 'nota', 0, 200, 'la nota')})
    if len(destinos) > MAX_DESTINOS:
        raise TerminalInvalido(f'Hasta {MAX_DESTINOS} destinos por terminal.')
    if len({d['slug'] for d in destinos}) != len(destinos):
        raise TerminalInvalido('Hay un destino repetido.')
    fuentes = []
    for f in (datos.get('fuentes') or [])[:MAX_FUENTES]:
        if isinstance(f, dict) and f.get('url'):
            fuentes.append({'nombre': _texto(f, 'nombre', 1, 80, 'el nombre de la fuente'), 'url': _https(f.get('url'), 'La fuente')})
    return Terminal(
        id=id_, nombre=nombre, tipo=tipo, referencia=_texto(datos, 'referencia', 3, 200, 'la referencia'),
        lat=lat, lon=lon, mapa=_texto(datos, 'mapa', 0, 200, 'el texto para Google Maps') or f'{nombre}, Ayacucho',
        horario=_texto(datos, 'horario', 0, 40, 'el horario'), frecuencia=_texto(datos, 'frecuencia', 0, 40, 'la frecuencia'),
        pasaje=_texto(datos, 'pasaje', 0, 60, 'el pasaje'), descripcion=_texto(datos, 'descripcion', 0, 240, 'la descripción'),
        foto_url=_https(datos.get('foto_url'), 'La foto', propias=True), destinos=destinos, fuentes=fuentes)


class RepositorioTerminales(Protocol):
    def listar(self) -> list: ...
    def guardar(self, terminal: Terminal) -> None: ...
    def eliminar(self, terminal_id: str) -> None: ...


class Terminales:
    """Casos de uso de terminales y paraderos."""

    def __init__(self, repo: RepositorioTerminales):
        self.repo = repo

    def listar(self) -> list:
        return sorted(self.repo.listar(), key=lambda t: (t.tipo != 'terminal', t.nombre.lower()))

    def obtener(self, terminal_id: str) -> Terminal:
        for t in self.repo.listar():
            if t.id == terminal_id:
                return t
        raise TerminalNoEncontrado(terminal_id)

    def guardar(self, datos: dict, terminal_id: Optional[str] = None) -> Terminal:
        existentes = {t.id for t in self.repo.listar()}
        if terminal_id is not None:
            if terminal_id not in existentes:
                raise TerminalNoEncontrado(terminal_id)
            id_ = terminal_id                       # el enlace «Ver en el mapa» no cambia al editar
        else:
            try:
                base = crear_slug(str(datos.get('nombre') or ''))
            except ValueError:
                raise TerminalInvalido('Completa el nombre.')
            id_, n = base, 2
            while id_ in existentes:
                id_, n = f'{base}-{n}', n + 1
        terminal = construir_terminal(datos, id_)
        self.repo.guardar(terminal)
        return terminal

    def eliminar(self, terminal_id: str) -> str:
        t = self.obtener(terminal_id)
        self.repo.eliminar(t.id)
        return t.nombre

    def por_lugar(self) -> dict:
        """Vista por destino (la usan «Cómo llegar» y Willaq Uma): paraderos, pasaje, tiempo y fuentes."""
        salida = {}
        for t in self.listar():
            paradero = {'id': t.id, 'tipo': t.tipo_nombre, 'nombre': t.nombre, 'referencia': t.referencia,
                        'mapa': t.mapa, 'lat': t.lat, 'lon': t.lon}
            for d in t.destinos:
                item = salida.setdefault(d['slug'], {'paraderos': [], 'tarifa': d['tarifa'], 'tiempo': d['tiempo'],
                                                     'nota': d['nota'], 'fuentes': []})
                item['paraderos'].append(paradero)
                for f in t.fuentes:
                    if f not in item['fuentes']:
                        item['fuentes'].append(f)
        return salida
