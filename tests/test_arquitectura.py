"""Pruebas de arquitectura (EQ-07 Mantenibilidad): la regla de dependencias de Clean Architecture se
comprueba en cada cambio, no solo se documenta.

- Dominio y Aplicación no importan frameworks ni tecnologías (FastAPI, Pydantic, psycopg, httpx…).
- El Dominio no importa ninguna otra capa.
- Aplicación no conoce Infraestructura ni Presentación (las recibe por puertos).
- Ningún servicio importa el código interno de otro servicio (solo `services.compartido`); la única
  pieza que los une es la composición del gateway.
"""
import ast
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parents[1] / 'services'
SERVICIOS = ['identidad', 'catalogo', 'comunidad', 'eventos', 'publicidad', 'recomendaciones', 'asistente']
TECNOLOGIA = {'fastapi', 'starlette', 'pydantic', 'psycopg', 'psycopg2', 'httpx', 'requests', 'uvicorn', 'sqlalchemy'}


def importaciones(archivo: Path) -> set:
    arbol = ast.parse(archivo.read_text(encoding='utf-8'))
    nombres = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            nombres |= {a.name for a in nodo.names}
        elif isinstance(nodo, ast.ImportFrom):
            base = '.' * nodo.level + (nodo.module or '')
            nombres.add(base)
    return nombres


def capas():
    for s in SERVICIOS:
        for capa in ('dominio', 'aplicacion'):
            archivo = RAIZ / s / f'{capa}.py'
            if archivo.exists():
                yield s, capa, archivo


@pytest.mark.parametrize('servicio,capa,archivo', list(capas()), ids=lambda v: v if isinstance(v, str) else '')
def test_dominio_y_aplicacion_no_dependen_de_tecnologia(servicio, capa, archivo):
    prohibidas = {i for i in importaciones(archivo) if i.split('.')[0] in TECNOLOGIA}
    assert not prohibidas, f'{servicio}/{capa}.py importa tecnología: {prohibidas}'


@pytest.mark.parametrize('servicio', [s for s in SERVICIOS if (RAIZ / s / 'dominio.py').exists()])
def test_dominio_no_importa_otras_capas(servicio):
    hacia_afuera = {i for i in importaciones(RAIZ / servicio / 'dominio.py')
                    if i.startswith('.') or i.startswith('services.')}
    assert not hacia_afuera, f'{servicio}/dominio.py depende de {hacia_afuera}'


@pytest.mark.parametrize('servicio', SERVICIOS)
def test_servicios_no_se_importan_entre_si(servicio):
    ajenos = set(SERVICIOS) - {servicio}
    for archivo in (RAIZ / servicio).glob('*.py'):
        usadas = {i.split('.')[1] for i in importaciones(archivo) if i.startswith('services.')}
        assert not (usadas & ajenos), f'{archivo.relative_to(RAIZ)} importa otro servicio: {usadas & ajenos}'


@pytest.mark.parametrize('servicio', SERVICIOS)
def test_aplicacion_no_conoce_infraestructura_ni_presentacion(servicio):
    usadas = importaciones(RAIZ / servicio / 'aplicacion.py')
    assert not {'.infraestructura', '.presentacion', '.composicion'} & usadas, \
        f'{servicio}/aplicacion.py depende de una capa exterior'


@pytest.mark.parametrize('servicio', SERVICIOS)
def test_cada_servicio_tiene_dominio_aplicacion_y_presentacion(servicio):
    presentes = {p.stem for p in (RAIZ / servicio).glob('*.py')}
    assert {'dominio', 'aplicacion', 'presentacion'} <= presentes, f'{servicio} no separa sus capas: {presentes}'
