"""Integración real con PostgreSQL: migraciones + RLS + repositorios.

Se ejecuta si existe TEST_DATABASE_URL (superusuario de una instancia DESECHABLE,
p. ej. el servicio postgres del CI). Crea una base nueva y la borra al terminar.
Nunca apuntar a Supabase de producción.
"""
import os
import uuid
from pathlib import Path
import pytest

URL = os.getenv('TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not URL, reason='TEST_DATABASE_URL no configurada')
ROOT = Path(__file__).resolve().parents[1]
ROLES = ['svc_identidad', 'svc_catalogo', 'svc_comunidad', 'svc_eventos', 'svc_publicidad',
         'svc_recomendaciones', 'svc_asistente']


@pytest.fixture(scope='module')
def dsn():
    import psycopg
    from psycopg.conninfo import make_conninfo, conninfo_to_dict
    base = 'llegueya_prueba_' + uuid.uuid4().hex[:8]
    admin = psycopg.connect(URL, autocommit=True)

    def limpiar_roles():
        for r in ['prueba_catalogo', 'prueba_comunidad'] + ROLES:
            if admin.execute('select 1 from pg_roles where rolname=%s', (r,)).fetchone():
                for db in admin.execute("select datname from pg_database where datname like 'llegueya_prueba_%'").fetchall():
                    pass
                admin.execute(f'drop role {r}')
    admin.execute(f'create database {base}')
    params = conninfo_to_dict(URL)
    params['dbname'] = base
    con = psycopg.connect(make_conninfo(**params), autocommit=True)
    for r in ['anon', 'authenticated', 'service_role']:
        if not con.execute('select 1 from pg_roles where rolname=%s', (r,)).fetchone():
            con.execute(f'create role {r} nologin')
    for f in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
        con.execute(f.read_text(encoding='utf-8'))
    con.execute((ROOT / 'supabase/seed/catalogo-demostracion.sql').read_text(encoding='utf-8'))
    for svc in ('catalogo', 'comunidad'):
        con.execute(f"create role prueba_{svc} login password 'clave-solo-prueba' noinherit")
        con.execute(f'grant svc_{svc} to prueba_{svc}')
    con.close()
    dsns = {}
    for svc in ('catalogo', 'comunidad'):
        p = dict(params, user=f'prueba_{svc}', password='clave-solo-prueba')
        dsns[svc] = make_conninfo(**p)
    yield dsns
    admin.execute(f'drop database {base} with (force)')
    for r in ['prueba_catalogo', 'prueba_comunidad'] + ROLES:
        admin.execute(f'drop role if exists {r}')
    admin.close()


def test_catalogo_lee_solo_publicados_con_fotos(dsn):
    from services.catalogo.infraestructura import RepositorioPostgres, FavoritosPostgres
    from services.catalogo.aplicacion import Catalogo
    repo = RepositorioPostgres(dsn['catalogo'])
    lugares = repo.listar()
    assert len(lugares) == 8
    wari = repo.obtener('complejo-arqueologico-wari')
    assert wari.portada.licencia == 'CC0 1.0' and wari.zona.startswith('A 22 km')
    assert repo.obtener('aguas-turquesas-de-millpu').lat is None
    cat = Catalogo(repo, FavoritosPostgres(dsn['catalogo']))
    u1, u2 = str(uuid.uuid4()), str(uuid.uuid4())
    cat.marcar_favorito(u1, 'vilcashuaman', True)
    cat.marcar_favorito(u1, 'vilcashuaman', True)   # idempotente
    assert [l.slug for l in cat.mis_favoritos(u1)] == ['vilcashuaman']
    assert cat.mis_favoritos(u2) == []               # RLS: no ve favoritos ajenos
    cat.marcar_favorito(u1, 'vilcashuaman', False)
    assert cat.mis_favoritos(u1) == []


def test_login_de_servicio_no_lee_otros_esquemas(dsn):
    import psycopg
    with psycopg.connect(dsn['catalogo']) as c:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute('select * from catalogo.lugar')      # sin set role no hay permisos
    with psycopg.connect(dsn['catalogo']) as c:
        c.execute('set local role svc_catalogo')
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute('select * from comunidad.publicacion')


def test_comunidad_flujo_completo_con_rls(dsn, tmp_path):
    from services.comunidad.aplicacion import Comunidad
    from services.comunidad.dominio import Autor, NoEncontrado, ReglaVulnerada
    from services.comunidad.infraestructura import AlmacenLocal, RepositorioPostgres
    repo = RepositorioPostgres(dsn['comunidad'])
    ana, beto = Autor(str(uuid.uuid4()), 'Ana'), Autor(str(uuid.uuid4()), 'Beto')
    moderada = Comunidad(repo, AlmacenLocal(tmp_path))
    pendiente = moderada.publicar(ana, 'Llegué a Wari temprano', 'complejo-arqueologico-wari')
    assert pendiente.publicacion.estado == 'en_revision'
    assert [v.publicacion.id for v in moderada.muro(ana.id)] == [pendiente.publicacion.id]
    assert moderada.muro(beto.id) == []                # beto no ve lo que está en revisión
    with pytest.raises(NoEncontrado):
        moderada.like(beto.id, 'publicacion', pendiente.publicacion.id, True)

    abierta = Comunidad(repo, AlmacenLocal(tmp_path), autopublicar=True)
    jpg = b'\xff\xd8\xff' + b'0' * 100
    v = abierta.publicar(ana, 'Atardecer en la Plaza', 'plaza-mayor-huamanga', jpg)
    pid = v.publicacion.id
    assert abierta.foto(v.publicacion.foto_id, None)[0] == jpg
    assert abierta.like(beto.id, 'publicacion', pid, True) == 1
    assert abierta.like(beto.id, 'publicacion', pid, True) == 1      # sin duplicar
    assert abierta.like(ana.id, 'publicacion', pid, True) == 2
    assert abierta.like(beto.id, 'publicacion', pid, False) == 1
    c1 = abierta.comentar(beto, pid, '¡Qué foto!')
    r1 = abierta.comentar(ana, pid, 'Gracias', c1.comentario.id)
    assert r1.comentario.raiz_id == c1.comentario.id and r1.comentario.profundidad == 1
    otra = abierta.publicar(beto, 'Otra publicación')
    with pytest.raises(ReglaVulnerada):
        abierta.comentar(ana, otra.publicacion.id, 'Cruce de hilos', c1.comentario.id)
    assert len(abierta.hilo(pid, None)) == 2
    abierta.guardar(beto.id, pid, True)
    assert [x.publicacion.id for x in abierta.guardadas(beto.id)] == [pid]
    assert abierta.guardadas(ana.id) == []
    muro = abierta.muro(None)
    assert {x.publicacion.id for x in muro} == {pid, otra.publicacion.id}
    vista = next(x for x in abierta.muro(beto.id) if x.publicacion.id == pid)
    assert vista.likes == 1 and vista.comentarios == 2 and vista.guardada and not vista.me_gusta


def test_rls_impide_escribir_como_otro_usuario(dsn):
    import psycopg
    ana, beto = str(uuid.uuid4()), str(uuid.uuid4())
    with psycopg.connect(dsn['comunidad']) as c:
        c.execute('set local role svc_comunidad')
        c.execute("select set_config('app.usuario_id', %s, true)", (ana,))
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            c.execute("insert into comunidad.like(usuario_id, objetivo_tipo, objetivo_id) values (%s,'publicacion',%s)",
                      (beto, str(uuid.uuid4())))


def test_moderacion_administrativa_con_rls(dsn, tmp_path):
    import psycopg
    from services.comunidad.aplicacion import Comunidad
    from services.comunidad.dominio import Autor
    from services.comunidad.infraestructura import AlmacenLocal, RepositorioPostgres
    repo = RepositorioPostgres(dsn['comunidad'])
    c = Comunidad(repo, AlmacenLocal(tmp_path))
    ana, falsa = Autor(str(uuid.uuid4()), 'Ana Mod'), Autor(str(uuid.uuid4()), 'Falsa')
    p = c.publicar(ana, 'Pendiente de revisión').publicacion
    q = c.publicar(falsa, 'Spam').publicacion
    pendientes = {x.id for x in c.pendientes()['publicaciones']}
    assert {p.id, q.id} <= pendientes
    assert c.decidir('publicacion', p.id, True) == 'publicado'
    assert p.id in {v.publicacion.id for v in c.muro(None, limite=30)}
    k = c.comentar(falsa, p.id, 'comentario falso').comentario
    assert k.id in {x.id for x in c.pendientes()['comentarios']}
    assert c.decidir('comentario', k.id, True) == 'publicado'
    assert c.retirar_de_autor(falsa.id) == 2
    assert c.hilo(p.id, None) == []
    assert ('Falsa', 1) in {(a.nombre, n) for a, n in c.autores()}
    assert not repo.cambiar_estado('publicacion', str(uuid.uuid4()), 'publicado', p.creado_en)
    # Sin el contexto de administración, el servicio no puede cambiar estados.
    with psycopg.connect(dsn['comunidad']) as con:
        con.execute('set local role svc_comunidad')
        cur = con.execute("update comunidad.publicacion set estado='publicado' where id=%s", (q.id,))
        assert cur.rowcount == 0


def test_catalogo_admin_con_rls(dsn):
    import psycopg
    from datetime import date
    from services.catalogo.aplicacion import Catalogo
    from services.catalogo.infraestructura import FavoritosPostgres, RepositorioPostgres
    from tests.test_administracion import LUGAR_NUEVO
    repo = RepositorioPostgres(dsn['catalogo'])
    cat = Catalogo(repo, FavoritosPostgres(dsn['catalogo']))
    l = cat.guardar_lugar({**LUGAR_NUEVO, 'destino': 'Carmen Alto'}, hoy=date(2026, 11, 18))
    nuevo = repo.obtener(l.slug)
    assert nuevo.destino == 'Carmen Alto' and nuevo.fotos[0].autor == 'Ana' and nuevo.recomendaciones == ('Ve al atardecer',)
    cat.guardar_lugar({**LUGAR_NUEVO, 'fotos': [], 'resumen': 'Resumen editado del mirador.'}, l.slug)
    assert repo.obtener(l.slug).fotos == () and repo.obtener(l.slug).resumen == 'Resumen editado del mirador.'
    cat.cambiar_estado_lugar(l.slug, False)
    assert repo.obtener(l.slug) is None and len(repo.listar()) == 8
    assert (l.slug, 'retirado') in {(x.slug, e) for x, e in repo.listar_admin()}
    cat.cambiar_estado_lugar(l.slug, True)
    assert repo.obtener(l.slug) is not None
    # Sin app.es_admin el servicio no puede escribir en el catálogo.
    with psycopg.connect(dsn['catalogo']) as con:
        con.execute('set local role svc_catalogo')
        assert con.execute("update catalogo.lugar set nombre='x' where slug=%s", (l.slug,)).rowcount == 0
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            con.execute("insert into catalogo.destino(nombre, zona, estado) values ('Falso', 'Ayacucho', 'publicado')")
