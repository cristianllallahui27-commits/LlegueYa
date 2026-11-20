"""Adaptadores de Comunidad: memoria, PostgreSQL (Supabase) y almacén de fotos."""
import os
import secrets
from dataclasses import replace
import threading
from pathlib import Path
from typing import Optional
from .dominio import Autor, Comentario, Publicacion, Reporte


class RepositorioMemoria:
    """Útil para pruebas y para ejecutar sin base configurada. Un solo proceso."""

    def __init__(self):
        self._lock = threading.Lock()
        self._autores, self.pubs, self.coms, self.fotos = {}, {}, {}, {}
        self.likes, self.guardas = set(), {}
        self._reportes = {}

    def guardar_autor(self, autor):
        self._autores[autor.id] = autor

    def crear_publicacion(self, p):
        self.pubs[p.id] = p

    def publicacion(self, id, viewer):
        p = self.pubs.get(id)
        return p if p and p.visible_para(viewer) else None

    def publicaciones(self, viewer, desde, limite, lugar=None, autor=None):
        items = [p for p in self.pubs.values() if p.visible_para(viewer)
                 and (lugar is None or p.lugar_slug == lugar) and (autor is None or p.autor.id == autor)]
        items.sort(key=lambda p: p.creado_en, reverse=True)
        return items[desde:desde + limite]

    def crear_comentario(self, c):
        self.coms[c.id] = c

    def comentario(self, id, viewer):
        c = self.coms.get(id)
        return c if c and c.visible_para(viewer) else None

    def comentarios(self, publicacion_id, viewer):
        items = [c for c in self.coms.values() if c.publicacion_id == publicacion_id and c.visible_para(viewer)]
        visibles = {c.id for c in items}
        # Si el padre no es visible, sus respuestas tampoco (RF59).
        items = [c for c in items if c.padre_id is None or c.padre_id in visibles]
        return sorted(items, key=lambda c: c.creado_en)

    def contar_comentarios(self, ids, viewer):
        return {i: len(self.comentarios(i, viewer)) for i in ids}

    def dar_like(self, usuario, tipo, objetivo):
        with self._lock:
            self.likes.add((usuario, tipo, objetivo))

    def quitar_like(self, usuario, tipo, objetivo):
        with self._lock:
            self.likes.discard((usuario, tipo, objetivo))

    def contar_likes(self, tipo, ids):
        r = {}
        for u, t, o in self.likes:
            if t == tipo and o in ids:
                r[o] = r.get(o, 0) + 1
        return r

    def likes_de(self, usuario, tipo, ids):
        return {o for u, t, o in self.likes if u == usuario and t == tipo and o in ids}

    def marcar_guardado(self, usuario, publicacion, activo):
        s = self.guardas.setdefault(usuario, [])
        if activo and publicacion not in s:
            s.insert(0, publicacion)
        elif not activo and publicacion in s:
            s.remove(publicacion)

    def guardados(self, usuario):
        return list(self.guardas.get(usuario, []))

    def registrar_foto(self, id, propietario, clave, mime, bytes_, sha):
        self.fotos[id] = (propietario, clave, mime)

    def foto(self, id, viewer):
        meta = self.fotos.get(id)
        if not meta:
            return None
        pub = next((p for p in self.pubs.values() if p.foto_id == id), None)
        if pub is None or not pub.visible_para(viewer):
            return None
        return meta[1], meta[2]


    # --- administración
    def _coleccion(self, tipo):
        return self.pubs if tipo == 'publicacion' else self.coms

    def por_estado(self, tipo, estado):
        return sorted((x for x in self._coleccion(tipo).values() if x.estado == estado), key=lambda x: x.creado_en)

    def cambiar_estado(self, tipo, id, estado, instante):
        col = self._coleccion(tipo)
        if id not in col:
            return False
        col[id] = replace(col[id], estado=estado)
        return True

    def retirar_de_autor(self, autor_id):
        n = 0
        for col in (self.pubs, self.coms):
            for k, x in list(col.items()):
                if x.autor.id == autor_id and x.estado != 'retirado':
                    col[k] = replace(x, estado='retirado')
                    n += 1
        return n

    def publicacion_admin(self, id):
        return self.pubs.get(id)

    def crear_reporte(self, r):
        self._reportes[r.id] = r

    def reportes(self, estado):
        return sorted((r for r in self._reportes.values() if r.estado == estado), key=lambda r: r.creado_en)

    def resolver_reporte(self, id, estado, decision):
        self._reportes[id] = replace(self._reportes[id], estado=estado, decision=decision)

    def quitar_foto(self, publicacion_id):
        p = self.pubs.get(publicacion_id)
        if p is None or not p.foto_id:
            return None
        self.pubs[publicacion_id] = replace(p, foto_id=None)
        return self.fotos.pop(p.foto_id)[1]

    def autores(self):
        cuenta = {}
        for p in self.pubs.values():
            cuenta[p.autor.id] = cuenta.get(p.autor.id, 0) + 1
        return [(a, cuenta.get(a.id, 0)) for a in self._autores.values()]


class AlmacenLocal:
    """Guarda fotos en disco con nombre aleatorio. Sustituible por Supabase Storage."""

    def __init__(self, carpeta):
        self.carpeta = Path(carpeta)
        self.carpeta.mkdir(parents=True, exist_ok=True)

    def guardar(self, datos):
        clave = secrets.token_urlsafe(24)
        (self.carpeta / clave).write_bytes(datos)
        return clave

    def _ruta(self, clave):
        if not clave or '/' in clave or '\\' in clave or clave.startswith('.'):
            raise FileNotFoundError(clave)
        return self.carpeta / clave

    def leer(self, clave):
        return self._ruta(clave).read_bytes()

    def eliminar(self, clave):
        self._ruta(clave).unlink()


class RepositorioPostgres:
    """Comunidad sobre el esquema `comunidad` con el rol svc_comunidad y RLS.

    Cada operación abre una transacción, adopta el rol del servicio y fija
    app.usuario_id con el usuario validado por Identidad. Las políticas de la
    migración 20261117000100 deciden qué filas son visibles o modificables.
    """

    def __init__(self, dsn, conectar=None):
        self.dsn = dsn
        if conectar is None:
            import psycopg
            conectar = psycopg.connect
        self.conectar = conectar

    def _tx(self, viewer):
        conn = self.conectar(self.dsn)
        cur = conn.cursor()
        cur.execute('set local role svc_comunidad')
        cur.execute("select set_config('app.usuario_id', %s, true)", (viewer or '',))
        return conn, cur

    def _run(self, viewer, fn):
        conn, cur = self._tx(viewer)
        try:
            r = fn(cur)
            conn.commit()
            return r
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def guardar_autor(self, a):
        self._run(a.id, lambda c: c.execute(
            """insert into comunidad.autor(usuario_id, nombre_visible, avatar_url) values (%s,%s,%s)
               on conflict (usuario_id) do update set nombre_visible=excluded.nombre_visible,
               avatar_url=excluded.avatar_url""", (a.id, a.nombre, a.avatar)))

    def crear_publicacion(self, p):
        self._run(p.autor.id, lambda c: c.execute(
            """insert into comunidad.publicacion(id, autor_id, objetivo_tipo, objetivo_id, texto, estado, publicado_en,
               creado_en, lugar_slug, foto_id) values (%s,%s,null,null,%s,%s,%s,%s,%s,%s)""",
            (p.id, p.autor.id, p.texto, p.estado, p.creado_en if p.estado == 'publicado' else None,
             p.creado_en, p.lugar_slug, p.foto_id)))

    SELECT_PUB = """select p.id::text, p.autor_id::text, coalesce(a.nombre_visible,'Viajero'), a.avatar_url, p.texto,
                    p.lugar_slug, p.foto_id::text, p.estado, p.creado_en
                    from comunidad.publicacion p left join comunidad.autor a on a.usuario_id=p.autor_id"""

    @staticmethod
    def _pub(f):
        return Publicacion(f[0], Autor(f[1], f[2], f[3]), f[4], f[5], f[6], f[7], f[8])

    def publicacion(self, id, viewer):
        def q(c):
            c.execute(self.SELECT_PUB + ' where p.id=%s', (id,))
            f = c.fetchone()
            return self._pub(f) if f else None
        return self._run(viewer, q)

    def publicaciones(self, viewer, desde, limite, lugar=None, autor=None):
        def q(c):
            c.execute(self.SELECT_PUB + """ where (%s::text is null or p.lugar_slug=%s) and (%s::uuid is null or p.autor_id=%s::uuid)
                      and p.estado in ('publicado','en_revision') order by p.creado_en desc offset %s limit %s""",
                      (lugar, lugar, autor, autor, desde, limite))
            return [self._pub(f) for f in c.fetchall()]
        return self._run(viewer, q)

    def crear_comentario(self, k):
        self._run(k.autor.id, lambda c: c.execute(
            """insert into comunidad.comentario(id, autor_id, objetivo_tipo, objetivo_id, padre_id, raiz_id, profundidad,
               texto, estado, creado_en) values (%s,%s,'publicacion',%s,%s,%s,%s,%s,%s,%s)""",
            (k.id, k.autor.id, k.publicacion_id, k.padre_id, k.raiz_id, k.profundidad, k.texto, k.estado, k.creado_en)))

    SELECT_COM = """select k.id::text, k.objetivo_id::text, k.autor_id::text, coalesce(a.nombre_visible,'Viajero'), a.avatar_url,
                    k.texto, k.padre_id::text, k.raiz_id::text, k.profundidad, k.estado, k.creado_en
                    from comunidad.comentario k left join comunidad.autor a on a.usuario_id=k.autor_id"""

    @staticmethod
    def _com(f):
        return Comentario(f[0], f[1], Autor(f[2], f[3], f[4]), f[5], f[6], f[7], f[8], f[9], f[10])

    def comentario(self, id, viewer):
        def q(c):
            c.execute(self.SELECT_COM + " where k.id=%s and k.objetivo_tipo='publicacion'", (id,))
            f = c.fetchone()
            return self._com(f) if f else None
        return self._run(viewer, q)

    def comentarios(self, publicacion_id, viewer):
        def q(c):
            c.execute(self.SELECT_COM + """ where k.objetivo_tipo='publicacion' and k.objetivo_id=%s
                      and (k.padre_id is null or exists(select 1 from comunidad.comentario p where p.id=k.padre_id))
                      order by k.creado_en""", (publicacion_id,))
            return [self._com(f) for f in c.fetchall()]
        return self._run(viewer, q)

    def contar_comentarios(self, ids, viewer):
        if not ids:
            return {}
        def q(c):
            c.execute("""select objetivo_id::text, count(*)::int from comunidad.comentario
                         where objetivo_tipo='publicacion' and objetivo_id = any(%s::uuid[]) group by objetivo_id""", (ids,))
            return dict(c.fetchall())
        return self._run(viewer, q)

    def dar_like(self, usuario, tipo, objetivo):
        # La restricción única + on conflict hacen el like idempotente incluso en concurrencia.
        self._run(usuario, lambda c: c.execute(
            """insert into comunidad.like(usuario_id, objetivo_tipo, objetivo_id) values (%s,%s,%s)
               on conflict (usuario_id, objetivo_tipo, objetivo_id) do nothing""", (usuario, tipo, objetivo)))

    def quitar_like(self, usuario, tipo, objetivo):
        self._run(usuario, lambda c: c.execute(
            'delete from comunidad.like where usuario_id=%s and objetivo_tipo=%s and objetivo_id=%s',
            (usuario, tipo, objetivo)))

    def contar_likes(self, tipo, ids):
        if not ids:
            return {}
        def q(c):
            c.execute("""select objetivo_id::text, count(*)::int from comunidad.like
                         where objetivo_tipo=%s and objetivo_id = any(%s::uuid[]) group by objetivo_id""", (tipo, ids))
            return dict(c.fetchall())
        return self._run(None, q)

    def likes_de(self, usuario, tipo, ids):
        if not ids:
            return set()
        def q(c):
            c.execute("""select objetivo_id::text from comunidad.like where usuario_id=%s and objetivo_tipo=%s
                         and objetivo_id = any(%s::uuid[])""", (usuario, tipo, ids))
            return {f[0] for f in c.fetchall()}
        return self._run(usuario, q)

    def _coleccion(self, c, usuario):
        c.execute("select id from comunidad.coleccion where propietario_id=%s and nombre='Guardados'", (usuario,))
        f = c.fetchone()
        if f:
            return f[0]
        c.execute("insert into comunidad.coleccion(propietario_id, nombre) values (%s,'Guardados') returning id", (usuario,))
        return c.fetchone()[0]

    def marcar_guardado(self, usuario, publicacion, activo):
        def q(c):
            col = self._coleccion(c, usuario)
            if activo:
                c.execute("""insert into comunidad.elemento_coleccion(coleccion_id, objetivo_tipo, objetivo_id)
                             values (%s,'publicacion',%s) on conflict do nothing""", (col, publicacion))
            else:
                c.execute("""delete from comunidad.elemento_coleccion where coleccion_id=%s and objetivo_tipo='publicacion'
                             and objetivo_id=%s""", (col, publicacion))
        self._run(usuario, q)

    def guardados(self, usuario):
        def q(c):
            c.execute("""select e.objetivo_id::text from comunidad.elemento_coleccion e
                         join comunidad.coleccion k on k.id=e.coleccion_id
                         where k.propietario_id=%s and k.nombre='Guardados' and e.objetivo_tipo='publicacion'
                         order by e.agregado_en desc""", (usuario,))
            return [f[0] for f in c.fetchall()]
        return self._run(usuario, q)

    def registrar_foto(self, id, propietario, clave, mime, bytes_, sha):
        self._run(propietario, lambda c: c.execute(
            """insert into comunidad.objeto(id, propietario_id, bucket, clave_aleatoria, mime_validado, bytes,
               hash_integridad, estado, visibilidad, padre_tipo, padre_id)
               values (%s,%s,'local',%s,%s,%s,%s,'validado','privada','publicacion',%s)""",
            (id, propietario, clave, mime, bytes_, sha, id)))

    # --- administración: app.es_admin habilita las políticas de moderación
    def _admin(self, fn):
        conn, cur = self._tx(None)
        try:
            cur.execute("select set_config('app.es_admin', 'true', true)")
            r = fn(cur)
            conn.commit()
            return r
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def por_estado(self, tipo, estado):
        def q(c):
            if tipo == 'publicacion':
                c.execute(self.SELECT_PUB + ' where p.estado=%s order by p.creado_en', (estado,))
                return [self._pub(f) for f in c.fetchall()]
            c.execute(self.SELECT_COM + " where k.estado=%s and k.objetivo_tipo='publicacion' order by k.creado_en", (estado,))
            return [self._com(f) for f in c.fetchall()]
        return self._admin(q)

    def cambiar_estado(self, tipo, id, estado, instante):
        tabla = 'publicacion' if tipo == 'publicacion' else 'comentario'
        def q(c):
            if tabla == 'publicacion':
                c.execute("""update comunidad.publicacion set estado=%s,
                             publicado_en=case when %s='publicado' then coalesce(publicado_en, %s) else publicado_en end
                             where id=%s""", (estado, estado, instante, id))
            else:
                c.execute('update comunidad.comentario set estado=%s where id=%s', (estado, id))
            return c.rowcount == 1
        return self._admin(q)

    def retirar_de_autor(self, autor_id):
        def q(c):
            c.execute("update comunidad.publicacion set estado='retirado' where autor_id=%s and estado<>'retirado'", (autor_id,))
            n = c.rowcount
            c.execute("update comunidad.comentario set estado='retirado' where autor_id=%s and estado<>'retirado'", (autor_id,))
            return n + c.rowcount
        return self._admin(q)

    def publicacion_admin(self, id):
        def q(c):
            c.execute(self.SELECT_PUB + ' where p.id=%s', (id,))
            f = c.fetchone()
            return self._pub(f) if f else None
        return self._admin(q)

    def crear_reporte(self, r):
        self._run(r.autor_id, lambda c: c.execute(
            """insert into comunidad.reporte(id, autor_id, objetivo_tipo, objetivo_id, motivo, estado, creado_en)
               values (%s,%s,'publicacion',%s,%s,'pendiente',%s)""",
            (r.id, r.autor_id, r.publicacion_id, (r.motivo + (': ' + r.detalle if r.detalle else ''))[:1000], r.creado_en)))

    def reportes(self, estado):
        def q(c):
            c.execute("""select id::text, autor_id::text, objetivo_id::text, motivo, estado, creado_en,
                         coalesce(decision_administrativa,'') from comunidad.reporte
                         where estado=%s and objetivo_tipo='publicacion' order by creado_en""", (estado,))
            salida = []
            for f in c.fetchall():
                motivo, _, detalle = f[3].partition(': ')
                salida.append(Reporte(f[0], f[1], f[2], motivo, detalle, f[4], f[5], f[6]))
            return salida
        return self._admin(q)

    def resolver_reporte(self, id, estado, decision):
        self._admin(lambda c: c.execute(
            'update comunidad.reporte set estado=%s, decision_administrativa=%s, actualizado_en=now() where id=%s',
            (estado, decision, id)))

    def quitar_foto(self, publicacion_id):
        def q(c):
            c.execute("""select o.clave_aleatoria, o.id from comunidad.publicacion p join comunidad.objeto o on o.id=p.foto_id
                         where p.id=%s""", (publicacion_id,))
            f = c.fetchone()
            if not f:
                return None
            c.execute('update comunidad.publicacion set foto_id=null where id=%s', (publicacion_id,))
            c.execute("update comunidad.objeto set estado='retirado' where id=%s", (f[1],))
            return f[0]
        return self._admin(q)

    def autores(self):
        def q(c):
            c.execute("""select a.usuario_id::text, a.nombre_visible, a.avatar_url, count(p.id)::int
                         from comunidad.autor a left join comunidad.publicacion p on p.autor_id=a.usuario_id
                         group by a.usuario_id order by a.nombre_visible""")
            return [(Autor(f[0], f[1], f[2]), f[3]) for f in c.fetchall()]
        return self._admin(q)

    def foto(self, id, viewer):
        def q(c):
            c.execute("""select o.clave_aleatoria, o.mime_validado from comunidad.objeto o
                         join comunidad.publicacion p on p.foto_id=o.id where o.id=%s and o.estado='validado'""", (id,))
            f = c.fetchone()
            return (f[0], f[1]) if f else None
        return self._run(viewer, q)
