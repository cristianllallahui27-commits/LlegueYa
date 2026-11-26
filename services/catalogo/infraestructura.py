"""Adaptadores del Catálogo: memoria (demostración), PostgreSQL/Supabase y caché."""
import time
from datetime import date
from typing import Optional
from .terminales import Terminal
from .dominio import Foto, Lugar


class RepositorioMemoria:
    def __init__(self, lugares):
        self._lugares = {l.id: l for l in lugares}      # orden de inserción = orden de la lista
        self._estados = {i: 'publicado' for i in self._lugares}

    def listar(self):
        return [l for i, l in self._lugares.items() if self._estados[i] == 'publicado']

    def obtener(self, slug):
        return next((l for l in self.listar() if l.slug == slug), None)

    def listar_admin(self):
        return [(l, self._estados[i]) for i, l in self._lugares.items()]

    def guardar(self, lugar):
        self._lugares[lugar.id] = lugar
        self._estados[lugar.id] = 'publicado'

    def cambiar_estado(self, lugar_id, estado):
        self._estados[lugar_id] = estado

    def eliminar(self, lugar_id):
        self._lugares.pop(lugar_id, None)
        self._estados.pop(lugar_id, None)


class FavoritosMemoria:
    def __init__(self):
        self._datos = {}

    def marcar(self, usuario, lugar_id, activo):
        lista = self._datos.setdefault(usuario, [])
        if activo and lugar_id not in lista:
            lista.insert(0, lugar_id)
        elif not activo and lugar_id in lista:
            lista.remove(lugar_id)

    def de(self, usuario):
        return list(self._datos.get(usuario, []))


class FavoritosPostgres:
    """catalogo.favorito con unicidad (usuario, tipo, objetivo) y RLS por usuario."""

    def __init__(self, dsn, conectar=None):
        self.dsn = dsn
        if conectar is None:
            import psycopg
            conectar = psycopg.connect
        self.conectar = conectar

    def _con(self, usuario, fn):
        with self.conectar(self.dsn) as conn, conn.cursor() as cur:
            cur.execute('set local role svc_catalogo')
            cur.execute("select set_config('app.usuario_id', %s, true)", (usuario,))
            return fn(cur)

    def marcar(self, usuario, lugar_id, activo):
        sql = ("""insert into catalogo.favorito(usuario_id, objetivo_tipo, objetivo_id) values (%s,'lugar',%s)
                  on conflict (usuario_id, objetivo_tipo, objetivo_id) do nothing""" if activo else
               "delete from catalogo.favorito where usuario_id=%s and objetivo_tipo='lugar' and objetivo_id=%s")
        self._con(usuario, lambda c: c.execute(sql, (usuario, lugar_id)))

    def de(self, usuario):
        def q(c):
            c.execute("""select objetivo_id::text from catalogo.favorito where usuario_id=%s and objetivo_tipo='lugar'
                         order by creado_en desc""", (usuario,))
            return [f[0] for f in c.fetchall()]
        return self._con(usuario, q)


class RepositorioEnCache:
    """Decorador (patrón Proxy) con caché TTL en memoria.

    El catálogo cambia poco y se lee mucho: evita ir a PostgreSQL en cada
    visita. El TTL corto mantiene la ficha razonablemente fresca tras una
    aprobación administrativa.
    """

    def __init__(self, repositorio, ttl_segundos: float = 60, reloj=time.monotonic):
        self.repositorio = repositorio
        self.ttl = ttl_segundos
        self.reloj = reloj
        self._lista = None
        self._vence = 0.0
        self.aciertos = 0
        self.fallos = 0

    def _vigente(self):
        if self._lista is not None and self.reloj() < self._vence:
            self.aciertos += 1
            return self._lista
        self.fallos += 1
        self._lista = self.repositorio.listar()
        self._vence = self.reloj() + self.ttl
        return self._lista

    def listar(self):
        return list(self._vigente())

    def obtener(self, slug):
        return next((l for l in self._vigente() if l.slug == slug), None)

    def invalidar(self):
        self._lista = None

    # Administración: siempre va al repositorio real y deja la caché vencida.
    def listar_admin(self):
        return self.repositorio.listar_admin()

    def guardar(self, lugar):
        self.repositorio.guardar(lugar)
        self.invalidar()

    def cambiar_estado(self, lugar_id, estado):
        self.repositorio.cambiar_estado(lugar_id, estado)
        self.invalidar()

    def eliminar(self, lugar_id):
        self.repositorio.eliminar(lugar_id)
        self.invalidar()


SQL_LUGARES = """
select l.id::text, l.slug, l.nombre, l.tipo, d.nombre as destino, coalesce(l.zona, d.zona), l.resumen, l.descripcion,
       l.lat::float, l.lon::float, l.como_llegar, l.recomendaciones, l.altitud_m, l.fuente_url, l.revisado_en,
       l.entrada_costo, l.entrada_compra, l.entrada_url,
       coalesce(json_agg(json_build_object('url', f.url, 'autor', f.autor, 'licencia', f.licencia,
                'fuente_url', f.fuente_url, 'descripcion', f.descripcion) order by f.orden)
                filter (where f.id is not null), '[]') as fotos
from catalogo.lugar l
join catalogo.destino d on d.id = l.destino_id
left join catalogo.foto_externa f on f.lugar_id = l.id
where l.estado = 'publicado' and d.estado = 'publicado' and l.slug is not null
group by l.id, d.nombre, d.zona
order by l.nombre
"""

# Para administración: todos los lugares con slug, incluidos los retirados, con su estado.
SQL_LUGARES_ADMIN = SQL_LUGARES.replace(
    "from catalogo.lugar l", ", l.estado from catalogo.lugar l", 1).replace(
    "where l.estado = 'publicado' and d.estado = 'publicado' and l.slug is not null",
    "where l.slug is not null").replace("group by l.id, d.nombre, d.zona", "group by l.id, d.nombre, d.zona, l.estado")


class RepositorioPostgres:
    """Lee lugares publicados con el rol svc_catalogo (RLS forzado).

    Se conecta con DB_CATALOGO_DSN: un login propio, miembro de svc_catalogo,
    nunca el usuario postgres.
    """

    def __init__(self, dsn: str, conectar=None):
        self.dsn = dsn
        if conectar is None:
            import psycopg
            conectar = psycopg.connect
        self.conectar = conectar

    def listar(self):
        with self.conectar(self.dsn) as conn, conn.cursor() as cur:
            cur.execute('set local role svc_catalogo')
            cur.execute(SQL_LUGARES)
            return [self._a_lugar(fila) for fila in cur.fetchall()]

    def obtener(self, slug):
        return next((l for l in self.listar() if l.slug == slug), None)

    def _admin(self, fn):
        """Escrituras de administración: las políticas RLS exigen app.es_admin='true'.
        El backend solo llega aquí después de verificar que la sesión es de un admin."""
        with self.conectar(self.dsn) as conn, conn.cursor() as cur:
            cur.execute('set local role svc_catalogo')
            cur.execute("select set_config('app.es_admin', 'true', true)")
            return fn(cur)

    def listar_admin(self):
        def q(cur):
            cur.execute(SQL_LUGARES_ADMIN)
            return [(self._a_lugar(f[:-1]), f[-1]) for f in cur.fetchall()]
        return self._admin(q)

    def guardar(self, l):
        def q(cur):
            cur.execute("""insert into catalogo.destino(nombre, zona, estado) values (%s, 'Ayacucho', 'publicado')
                           on conflict (nombre, zona) do update set estado = 'publicado', actualizado_en = now()
                           returning id""", (l.destino,))
            destino_id = cur.fetchone()[0]
            cur.execute("""insert into catalogo.lugar(id, destino_id, tipo, nombre, descripcion, lat, lon, estado, fuente_url,
                               revisado_en, slug, zona, resumen, como_llegar, recomendaciones, altitud_m,
                               entrada_costo, entrada_compra, entrada_url)
                           values (%s,%s,%s,%s,%s,%s,%s,'publicado',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                           on conflict (id) do update set destino_id = excluded.destino_id, tipo = excluded.tipo,
                               nombre = excluded.nombre, descripcion = excluded.descripcion, lat = excluded.lat,
                               lon = excluded.lon, estado = 'publicado', fuente_url = excluded.fuente_url,
                               revisado_en = excluded.revisado_en, zona = excluded.zona, resumen = excluded.resumen,
                               como_llegar = excluded.como_llegar, recomendaciones = excluded.recomendaciones,
                               altitud_m = excluded.altitud_m, entrada_costo = excluded.entrada_costo,
                               entrada_compra = excluded.entrada_compra, entrada_url = excluded.entrada_url, actualizado_en = now(), version = catalogo.lugar.version + 1""",
                        (l.id, destino_id, l.tipo, l.nombre, l.descripcion, l.lat, l.lon, l.fuente_url or None,
                         l.revisado_en, l.slug, l.zona, l.resumen, l.como_llegar, list(l.recomendaciones), l.altitud_m,
                         l.entrada_costo, l.entrada_compra, l.entrada_url))
            cur.execute('delete from catalogo.foto_externa where lugar_id = %s', (l.id,))
            for i, f in enumerate(l.fotos):
                cur.execute("""insert into catalogo.foto_externa(lugar_id, orden, url, autor, licencia, fuente_url, descripcion)
                               values (%s,%s,%s,%s,%s,%s,%s)""", (l.id, i, f.url, f.autor, f.licencia, f.fuente_url, f.descripcion))
        self._admin(q)

    def cambiar_estado(self, lugar_id, estado):
        self._admin(lambda cur: cur.execute(
            'update catalogo.lugar set estado = %s, actualizado_en = now() where id = %s', (estado, lugar_id)))

    def eliminar(self, lugar_id):
        def q(cur):
            cur.execute('delete from catalogo.foto_externa where lugar_id = %s', (lugar_id,))
            cur.execute("delete from catalogo.favorito where objetivo_tipo = 'lugar' and objetivo_id = %s", (lugar_id,))
            cur.execute('delete from catalogo.lugar where id = %s', (lugar_id,))
        self._admin(q)

    @staticmethod
    def _a_lugar(f) -> Lugar:
        (id_, slug, nombre, tipo, destino, zona, resumen, descripcion, lat, lon,
         como_llegar, recomendaciones, altitud, fuente_url, revisado, entrada_costo, entrada_compra, entrada_url, fotos) = f
        return Lugar(
            id=id_, slug=slug, nombre=nombre, tipo=tipo, destino=destino, zona=zona,
            resumen=resumen or '', descripcion=descripcion, lat=lat, lon=lon,
            fotos=tuple(Foto(**x) for x in fotos), como_llegar=como_llegar or '',
            recomendaciones=tuple(recomendaciones or ()), altitud_m=altitud,
            fuente='Fuentes públicas citadas en la ficha', fuente_url=fuente_url or '',
            revisado_en=revisado.date() if hasattr(revisado, 'date') else revisado,
            demostracion=False, entrada_costo=entrada_costo or '', entrada_compra=entrada_compra or '',
            entrada_url=entrada_url or '',
        )


# ------------------------------------------------------------------ Terminales y paraderos
class TerminalesMemoria:
    def __init__(self, iniciales=()):
        self._datos = {t.id: t for t in iniciales}

    def listar(self):
        return list(self._datos.values())

    def guardar(self, terminal):
        self._datos[terminal.id] = terminal

    def eliminar(self, terminal_id):
        self._datos.pop(terminal_id, None)


class TerminalesPostgres:
    """Tabla catalogo.terminal (una fila por terminal; el detalle en jsonb). Escribir exige app.es_admin."""

    def __init__(self, dsn, conectar=None):
        self.dsn = dsn
        if conectar is None:
            import psycopg
            conectar = psycopg.connect
        self.conectar = conectar

    def _con(self, fn, admin=False):
        with self.conectar(self.dsn) as conn, conn.cursor() as cur:
            cur.execute('set local role svc_catalogo')
            if admin:
                cur.execute("select set_config('app.es_admin', 'true', true)")
            return fn(cur)

    def listar(self):
        def q(cur):
            cur.execute('select id, datos from catalogo.terminal order by nombre')
            return [Terminal(id=i, **d) for i, d in cur.fetchall()]
        return self._con(q)

    def guardar(self, t):
        import json
        datos = {k: v for k, v in t.__dict__.items() if k != 'id'}
        self._con(lambda cur: cur.execute(
            """insert into catalogo.terminal(id, nombre, datos) values (%s, %s, %s::jsonb)
               on conflict (id) do update set nombre = excluded.nombre, datos = excluded.datos, actualizado_en = now()""",
            (t.id, t.nombre, json.dumps(datos, ensure_ascii=False))), admin=True)

    def eliminar(self, terminal_id):
        self._con(lambda cur: cur.execute('delete from catalogo.terminal where id = %s', (terminal_id,)), admin=True)
