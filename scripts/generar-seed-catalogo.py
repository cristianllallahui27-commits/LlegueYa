"""Genera supabase/seed/catalogo-demostracion.sql desde services/catalogo/datos_demo.py.

Uso (desde la raíz):  python scripts/generar-seed-catalogo.py
Luego pegar el SQL en Supabase → SQL Editor. Es idempotente por slug.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from services.catalogo.datos_demo import LUGARES  # noqa: E402
from services.catalogo.transporte import TERMINALES_INICIALES  # noqa: E402
import json  # noqa: E402


def q(v):
    if v is None:
        return 'null'
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def arreglo(items):
    return 'array[' + ','.join(q(x) for x in items) + ']::text[]' if items else "'{}'::text[]"


def generar() -> str:
    out = ['-- Datos de DEMOSTRACIÓN del catálogo (identificados como tales en la web).',
           '-- Generado por scripts/generar-seed-catalogo.py. No contiene usuarios ni acreditaciones.',
           'begin;']
    for d in sorted({l.destino for l in LUGARES}):
        out.append(f"insert into catalogo.destino(nombre, zona, estado) values ({q(d)}, 'Ayacucho', 'publicado') "
                   "on conflict (nombre, zona) do nothing;")
    for l in LUGARES:
        out.append(
            'insert into catalogo.lugar(id, destino_id, tipo, nombre, descripcion, lat, lon, estado, fuente_url, revisado_en, '
            'slug, zona, resumen, como_llegar, recomendaciones, altitud_m) '
            f"select {q(l.id)}, d.id, {q(l.tipo)}, {q(l.nombre)}, {q(l.descripcion)}, {q(l.lat)}, {q(l.lon)}, 'publicado', "
            f"{q(l.fuente_url)}, {q(l.revisado_en.isoformat())}, {q(l.slug)}, {q(l.zona)}, {q(l.resumen)}, "
            f"{q(l.como_llegar)}, {arreglo(l.recomendaciones)}, {q(l.altitud_m)} "
            f"from catalogo.destino d where d.nombre={q(l.destino)} and d.zona='Ayacucho' "
            'on conflict (slug) do nothing;')
        # La entrada solo se completa si administración aún no la escribió (no pisa cambios hechos en la web).
        out.append(f"update catalogo.lugar set entrada_costo = {q(l.entrada_costo)}, entrada_compra = {q(l.entrada_compra)}, "
                   f"entrada_url = {q(l.entrada_url)} where slug = {q(l.slug)} and entrada_costo = '';")
        for i, f in enumerate(l.fotos):
            out.append('insert into catalogo.foto_externa(lugar_id, orden, url, autor, licencia, fuente_url, descripcion) '
                       f"values ({q(l.id)}, {i}, {q(f.url)}, {q(f.autor)}, {q(f.licencia)}, {q(f.fuente_url)}, {q(f.descripcion)}) "
                       'on conflict (lugar_id, orden) do nothing;')
    # Terminales y paraderos iniciales (administración puede corregirlos o eliminarlos después).
    for t in TERMINALES_INICIALES:
        datos = json.dumps({k: v for k, v in t.__dict__.items() if k != 'id'}, ensure_ascii=False)
        out.append(f"insert into catalogo.terminal(id, nombre, datos) values ({q(t.id)}, {q(t.nombre)}, {q(datos)}::jsonb) "
                   'on conflict (id) do nothing;')
    out.append('commit;')
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    destino = ROOT / 'supabase' / 'seed' / 'catalogo-demostracion.sql'
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(generar(), encoding='utf-8')
    print(f'Generado {destino.relative_to(ROOT)} con {len(LUGARES)} lugares.')
