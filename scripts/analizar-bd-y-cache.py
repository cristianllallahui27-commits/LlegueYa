"""Análisis del comportamiento de la base de datos y de la caché (Sprint 2, actividad 5).

Crea una base PostgreSQL desechable con las migraciones reales, carga volumen (20 000 publicaciones,
60 000 me gusta, 10 000 comentarios) y mide con los repositorios reales del backend:

  1. Catálogo: PostgreSQL directo vs RepositorioEnCache (acierto en memoria).
  2. Muro de Comunidad con RLS: latencia p50/p95 con 20 000 publicaciones.
  3. Planes de ejecución (EXPLAIN ANALYZE) del muro y del conteo de me gusta, con y sin índice.
  4. RLS: lo que ve cada rol (anónimo, autor, administración).

    TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres python scripts/analizar-bd-y-cache.py

Escribe docs/07-sprint2/evidencias/bd-y-cache.json. No toca Supabase.
"""
import json
import os
import statistics
import sys
import time
import uuid
from pathlib import Path

import psycopg
from psycopg.conninfo import conninfo_to_dict, make_conninfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from services.catalogo.infraestructura import RepositorioEnCache, RepositorioPostgres as CatalogoPostgres  # noqa: E402
from services.comunidad.aplicacion import Comunidad  # noqa: E402
from services.comunidad.infraestructura import AlmacenLocal, RepositorioPostgres as ComunidadPostgres  # noqa: E402

URL = os.environ['TEST_DATABASE_URL']
SALIDA = ROOT / 'docs' / '07-sprint2' / 'evidencias' / 'bd-y-cache.json'
ROLES = ['svc_identidad', 'svc_catalogo', 'svc_comunidad', 'svc_eventos', 'svc_publicidad', 'svc_recomendaciones', 'svc_asistente']


def medir(fn, n=200):
    tiempos = []
    for _ in range(n):
        t = time.perf_counter()
        fn()
        tiempos.append((time.perf_counter() - t) * 1000)
    tiempos.sort()
    return {'p50_ms': round(statistics.median(tiempos), 4), 'p95_ms': round(tiempos[int(n * 0.95) - 1], 4),
            'promedio_ms': round(statistics.mean(tiempos), 4), 'muestras': n}


def plan(con, sql, rol='svc_comunidad'):
    with con.transaction():
        con.execute(f'set local role {rol}')
        filas = con.execute('explain (analyze, buffers, format text) ' + sql).fetchall()
    texto = '\n'.join(f[0] for f in filas)
    tiempo = next((float(l.split(':')[1].split()[0]) for l in texto.splitlines() if 'Execution Time' in l), None)
    return {'plan': texto, 'ejecucion_ms': tiempo, 'usa_indice': 'Index' in texto}


def main():
    base = 'llegueya_analisis_' + uuid.uuid4().hex[:6]
    admin = psycopg.connect(URL, autocommit=True)
    for r in ROLES:
        if admin.execute('select 1 from pg_roles where rolname=%s', (r,)).fetchone():
            sys.exit(f'El rol {r} ya existe en este servidor: usa un PostgreSQL desechable.')
    admin.execute(f'create database {base}')
    params = conninfo_to_dict(URL)
    params['dbname'] = base
    con = psycopg.connect(make_conninfo(**params), autocommit=True)
    resultado = {'volumen': {}, 'catalogo': {}, 'muro': {}, 'planes': {}, 'rls': {}}
    try:
        for r in ['anon', 'authenticated', 'service_role']:
            if not con.execute('select 1 from pg_roles where rolname=%s', (r,)).fetchone():
                con.execute(f'create role {r} nologin')
        for f in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
            con.execute(f.read_text(encoding='utf-8'))
        con.execute((ROOT / 'supabase/seed/catalogo-demostracion.sql').read_text(encoding='utf-8'))
        for svc in ('catalogo', 'comunidad'):
            con.execute(f"create role analisis_{svc} login password 'solo-analisis' noinherit")
            con.execute(f'grant svc_{svc} to analisis_{svc}')

        # ---------- volumen de prueba
        con.execute("""insert into comunidad.autor(usuario_id, nombre_visible)
                       select gen_random_uuid(), 'Viajero ' || g from generate_series(1, 500) g""")
        con.execute("""insert into comunidad.publicacion(autor_id, texto, estado, publicado_en, creado_en)
                       select (select usuario_id from comunidad.autor order by random() limit 1 offset (g % 500)),
                              'Experiencia número ' || g,
                              case when g % 10 = 0 then 'en_revision' when g % 25 = 0 then 'retirado' else 'publicado' end,
                              case when g % 10 = 0 or g % 25 = 0 then null else now() - (g || ' minutes')::interval end,
                              now() - (g || ' minutes')::interval
                       from generate_series(1, 20000) g""")
        con.execute("""insert into comunidad.like(usuario_id, objetivo_tipo, objetivo_id)
                       select a.usuario_id, 'publicacion', p.id
                       from (select id, row_number() over () n from comunidad.publicacion limit 6000) p
                       join (select usuario_id, row_number() over () m from comunidad.autor limit 10) a on true""")
        con.execute("""insert into comunidad.comentario(autor_id, objetivo_tipo, objetivo_id, texto, estado)
                       select p.autor_id, 'publicacion', p.id, 'Buen dato', 'publicado'
                       from comunidad.publicacion p where p.estado = 'publicado' limit 10000""")
        con.execute('analyze')
        for t in ('publicacion', 'like', 'comentario', 'autor'):
            resultado['volumen'][t] = con.execute(f'select count(*) from comunidad.{t}').fetchone()[0]
        resultado['volumen']['lugar'] = con.execute('select count(*) from catalogo.lugar').fetchone()[0]

        dsn = {s: make_conninfo(**dict(params, user=f'analisis_{s}', password='solo-analisis')) for s in ('catalogo', 'comunidad')}

        # ---------- 1. Catálogo: base de datos vs caché
        directo = CatalogoPostgres(dsn['catalogo'])
        cache = RepositorioEnCache(directo, 60)
        resultado['catalogo']['postgres_directo'] = medir(directo.listar, 100)
        cache.listar()
        resultado['catalogo']['cache_en_memoria'] = medir(cache.listar, 1000)
        resultado['catalogo']['cache_aciertos'] = cache.aciertos
        resultado['catalogo']['cache_fallos'] = cache.fallos

        # ---------- 2. Muro con RLS (anónimo): caso de uso real (publicaciones + me gusta + comentarios)
        comunidad = Comunidad(ComunidadPostgres(dsn['comunidad']), AlmacenLocal(ROOT / 'tmp' / 'analisis-fotos'))
        resultado['muro']['primera_pagina'] = medir(lambda: comunidad.muro(None, 0, 10), 100)
        resultado['muro']['pagina_profunda_desde_5000'] = medir(lambda: comunidad.muro(None, 5000, 10), 50)

        # ---------- 3. Planes de ejecución con y sin índice
        sql_muro = ("select id, texto from comunidad.publicacion where estado = 'publicado' "
                    "order by creado_en desc limit 10")
        sql_likes = ("select objetivo_id, count(*) from comunidad.like where objetivo_tipo = 'publicacion' "
                     "and objetivo_id = any(array(select id from comunidad.publicacion order by creado_en desc limit 10)) "
                     "group by objetivo_id")
        resultado['planes']['muro_con_indice'] = plan(con, sql_muro)
        resultado['planes']['likes_con_indice'] = plan(con, sql_likes)
        con.execute('drop index comunidad.publicacion_muro')
        con.execute('drop index comunidad.like_objetivo')
        con.execute('analyze comunidad.publicacion')
        con.execute('analyze comunidad.like')
        resultado['planes']['muro_sin_indice'] = plan(con, sql_muro)
        resultado['planes']['likes_sin_indice'] = plan(con, sql_likes)

        # ---------- 4. RLS: qué ve cada rol
        autor = con.execute("select autor_id::text from comunidad.publicacion where estado = 'en_revision' limit 1").fetchone()[0]
        with psycopg.connect(dsn['comunidad']) as c:
            def contar(usuario='', es_admin='false'):
                with c.transaction():
                    c.execute('set local role svc_comunidad')
                    c.execute("select set_config('app.usuario_id', %s, true), set_config('app.es_admin', %s, true)", (usuario, es_admin))
                    return c.execute('select count(*) from comunidad.publicacion').fetchone()[0]
            resultado['rls'] = {'anonimo_ve': contar(), 'autor_ve': contar(autor), 'administracion_ve': contar('', 'true'),
                                'publicadas_reales': con.execute("select count(*) from comunidad.publicacion where estado='publicado'").fetchone()[0]}
    finally:
        con.close()
        admin.execute(f'drop database {base} with (force)')
        for r in ['analisis_catalogo', 'analisis_comunidad'] + ROLES:
            admin.execute(f'drop role if exists {r}')
        admin.close()

    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    resumen = {k: v for k, v in resultado.items() if k != 'planes'}
    resumen['planes'] = {k: {'ejecucion_ms': v['ejecucion_ms'], 'usa_indice': v['usa_indice']} for k, v in resultado['planes'].items()}
    print(json.dumps(resumen, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
