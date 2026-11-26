"""Casos de uso de Comunidad.

Toda escritura recibe un usuario ya verificado por Identidad; nunca un id
enviado por el navegador. Los contadores salen de likes reales.
"""
import hashlib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional, Protocol
from .dominio import (nivel_de_confianza, COMENTARIO_MAXIMO, MOTIVOS_REPORTE, OBJETIVOS_LIKE, PROFUNDIDAD_MAXIMA, TEXTO_MAXIMO, Autor,
                      Comentario, NoEncontrado, Publicacion, ReglaVulnerada, Reporte, limpiar_texto, tipo_de_imagen)


class RepositorioComunidad(Protocol):
    def guardar_autor(self, autor: Autor) -> None: ...
    def crear_publicacion(self, p: Publicacion) -> None: ...
    def publicacion(self, id: str, viewer: Optional[str]) -> Optional[Publicacion]: ...
    def likes_por_autor(self, autor_ids=None) -> dict: ...
    def autor_de(self, autor_id: str): ...
    def publicaciones(self, viewer: Optional[str], desde: int, limite: int,
                      lugar: Optional[str] = None, autor: Optional[str] = None) -> list: ...
    def crear_comentario(self, c: Comentario) -> None: ...
    def comentario(self, id: str, viewer: Optional[str]) -> Optional[Comentario]: ...
    def comentarios(self, publicacion_id: str, viewer: Optional[str]) -> list: ...
    def contar_comentarios(self, ids: list, viewer: Optional[str]) -> dict: ...
    def dar_like(self, usuario: str, tipo: str, objetivo: str) -> None: ...
    def quitar_like(self, usuario: str, tipo: str, objetivo: str) -> None: ...
    def contar_likes(self, tipo: str, ids: list) -> dict: ...
    def likes_de(self, usuario: str, tipo: str, ids: list) -> set: ...
    def marcar_guardado(self, usuario: str, publicacion: str, activo: bool) -> None: ...
    def guardados(self, usuario: str) -> list: ...
    def registrar_foto(self, id: str, propietario: str, clave: str, mime: str, bytes_: int, sha: str) -> None: ...
    def foto(self, id: str, viewer: Optional[str]) -> Optional[tuple]: ...


class AlmacenFotos(Protocol):
    def guardar(self, datos: bytes) -> str: ...
    def leer(self, clave: str) -> bytes: ...


@dataclass(frozen=True)
class VistaPublicacion:
    publicacion: Publicacion
    likes: int
    me_gusta: bool
    comentarios: int
    guardada: bool
    autor_likes: int = 0


@dataclass(frozen=True)
class VistaComentario:
    comentario: Comentario
    likes: int
    me_gusta: bool


def ahora():
    return datetime.now(timezone.utc)


class Comunidad:
    LIMITE_MAXIMO = 30

    def __init__(self, repo: RepositorioComunidad, almacen: AlmacenFotos, autopublicar: bool = False,
                 reloj=ahora, nuevo_id=lambda: str(uuid.uuid4())):
        self.repo, self.almacen = repo, almacen
        self.autopublicar = autopublicar
        self.reloj, self.nuevo_id = reloj, nuevo_id

    # --- lectura ---------------------------------------------------------
    def muro(self, viewer: Optional[str], desde=0, limite=10, lugar=None, autor=None, con_foto=False) -> list:
        limite = min(max(1, limite), self.LIMITE_MAXIMO)
        pubs = self.repo.publicaciones(viewer, max(0, desde), limite, lugar, autor, con_foto)
        return self._vistas(pubs, viewer)

    def guardadas(self, usuario: str) -> list:
        pubs = [p for p in (self.repo.publicacion(i, usuario) for i in self.repo.guardados(usuario)) if p]
        return self._vistas(pubs, usuario)

    def hilo(self, publicacion_id: str, viewer: Optional[str]) -> list:
        self._visible(publicacion_id, viewer)
        coms = self.repo.comentarios(publicacion_id, viewer)
        ids = [c.id for c in coms]
        likes = self.repo.contar_likes('comentario', ids)
        mios = self.repo.likes_de(viewer, 'comentario', ids) if viewer else set()
        return [VistaComentario(c, likes.get(c.id, 0), c.id in mios) for c in coms]

    def foto(self, foto_id: str, viewer: Optional[str]):
        meta = self.repo.foto(foto_id, viewer)
        if meta is None:
            raise NoEncontrado(foto_id)
        clave, mime = meta
        return self.almacen.leer(clave), mime

    # --- escritura (siempre con sesión) ----------------------------------
    def publicar(self, autor: Autor, texto: str, lugar_slug: Optional[str] = None,
                 foto: Optional[bytes] = None) -> VistaPublicacion:
        texto = limpiar_texto(texto, TEXTO_MAXIMO, obligatorio=not foto)
        if lugar_slug is not None and (len(lugar_slug) > 80 or not lugar_slug.replace('-', '').isalnum()):
            raise ReglaVulnerada('El lugar indicado no es válido.')
        self.repo.guardar_autor(autor)
        foto_id = None
        if foto:
            mime = tipo_de_imagen(foto)
            clave = self.almacen.guardar(foto)
            foto_id = self.nuevo_id()
            self.repo.registrar_foto(foto_id, autor.id, clave, mime, len(foto), hashlib.sha256(foto).hexdigest())
        estado = 'publicado' if self.autopublicar else 'en_revision'
        pub = Publicacion(self.nuevo_id(), autor, texto, lugar_slug, foto_id, estado, self.reloj())
        self.repo.crear_publicacion(pub)
        return VistaPublicacion(pub, 0, False, 0, False)

    def comentar(self, autor: Autor, publicacion_id: str, texto: str, padre_id: Optional[str] = None) -> VistaComentario:
        texto = limpiar_texto(texto, COMENTARIO_MAXIMO)
        self._visible(publicacion_id, autor.id)
        raiz, profundidad = None, 0
        if padre_id:
            padre = self.repo.comentario(padre_id, autor.id)
            # Una respuesta no puede apuntar a otro hilo ni pasar la profundidad máxima.
            if padre is None or padre.publicacion_id != publicacion_id:
                raise ReglaVulnerada('El comentario al que respondes no pertenece a esta publicación.')
            if padre.profundidad + 1 > PROFUNDIDAD_MAXIMA:
                raise ReglaVulnerada('Esta conversación ya es muy profunda; responde más arriba.')
            raiz, profundidad = (padre.raiz_id or padre.id), padre.profundidad + 1
        self.repo.guardar_autor(autor)
        estado = 'publicado' if self.autopublicar else 'en_revision'
        c = Comentario(self.nuevo_id(), publicacion_id, autor, texto, padre_id, raiz, profundidad, estado, self.reloj())
        self.repo.crear_comentario(c)
        return VistaComentario(c, 0, False)

    def like(self, usuario: str, tipo: str, objetivo_id: str, activo: bool) -> int:
        """Idempotente: dar un like dos veces deja uno; quitar uno ausente deja cero."""
        if tipo not in OBJETIVOS_LIKE:
            raise ReglaVulnerada('No se puede dar like a ese contenido.')
        if tipo == 'publicacion':
            self._visible(objetivo_id, usuario)
        elif self.repo.comentario(objetivo_id, usuario) is None:
            raise NoEncontrado(objetivo_id)
        if activo:
            self.repo.dar_like(usuario, tipo, objetivo_id)
        else:
            self.repo.quitar_like(usuario, tipo, objetivo_id)
        return self.repo.contar_likes(tipo, [objetivo_id]).get(objetivo_id, 0)

    def guardar(self, usuario: str, publicacion_id: str, activo: bool) -> None:
        self._visible(publicacion_id, usuario)
        self.repo.marcar_guardado(usuario, publicacion_id, activo)

    def reportar(self, usuario_id: str, publicacion_id: str, motivo: str, detalle: str = '') -> Reporte:
        """Cualquier usuario con sesión puede avisar a administración de una falta."""
        if motivo not in MOTIVOS_REPORTE:
            raise ReglaVulnerada('Elige un motivo de la lista.')
        detalle = limpiar_texto(detalle, 500, obligatorio=False)
        pub = self._visible(publicacion_id, usuario_id)
        if pub.autor.id == usuario_id:
            raise ReglaVulnerada('No puedes reportar tu propia publicación.')
        if any(r.autor_id == usuario_id and r.publicacion_id == publicacion_id for r in self.repo.reportes('pendiente')):
            raise ReglaVulnerada('Ya reportaste esta publicación; administración la está revisando.')
        r = Reporte(self.nuevo_id(), usuario_id, publicacion_id, motivo, detalle, 'pendiente', self.reloj())
        self.repo.crear_reporte(r)
        return r

    # --- administración ----------------------------------------------------
    def reportes(self, estado='pendiente') -> list:
        """Reportes con la publicación reportada (aunque ya no sea pública)."""
        return [(r, self.repo.publicacion_admin(r.publicacion_id)) for r in self.repo.reportes(estado)]

    def resolver_reporte(self, reporte_id: str, retirar: bool, decision: str = '') -> Reporte:
        r = next((x for x in self.repo.reportes('pendiente') if x.id == reporte_id), None)
        if r is None:
            raise NoEncontrado(reporte_id)
        if retirar:
            self.repo.cambiar_estado('publicacion', r.publicacion_id, 'retirado', self.reloj())
        texto = limpiar_texto(decision, 300, obligatorio=False) or ('Contenido retirado' if retirar else 'Sin falta')
        # Un mismo contenido puede tener varios reportes: se resuelven juntos.
        for otro in self.repo.reportes('pendiente'):
            if otro.publicacion_id == r.publicacion_id:
                self.repo.resolver_reporte(otro.id, 'resuelto' if retirar else 'desestimado', texto)
        return r

    def publicadas(self, limite=30) -> list:
        return sorted(self.repo.por_estado('publicacion', 'publicado'), key=lambda p: p.creado_en, reverse=True)[:limite]

    def retirar(self, publicacion_id: str) -> None:
        if not self.repo.cambiar_estado('publicacion', publicacion_id, 'retirado', self.reloj()):
            raise NoEncontrado(publicacion_id)

    def quitar_foto(self, publicacion_id: str) -> None:
        """Elimina la foto de una publicación (la publicación sigue con su texto)."""
        clave = self.repo.quitar_foto(publicacion_id)
        if clave is None:
            raise NoEncontrado(publicacion_id)
        try:
            self.almacen.eliminar(clave)
        except FileNotFoundError:
            pass

    # La capa HTTP solo llega aquí con un usuario administrador verificado.
    def pendientes(self) -> dict:
        return {'publicaciones': self.repo.por_estado('publicacion', 'en_revision'),
                'comentarios': self.repo.por_estado('comentario', 'en_revision')}

    def decidir(self, tipo: str, id: str, aprobar: bool) -> str:
        if tipo not in ('publicacion', 'comentario'):
            raise ReglaVulnerada('Solo se moderan publicaciones y comentarios.')
        estado = 'publicado' if aprobar else 'rechazado'
        if not self.repo.cambiar_estado(tipo, id, estado, self.reloj()):
            raise NoEncontrado(id)
        return estado

    def retirar_de_autor(self, autor_id: str) -> int:
        """Oculta todo lo publicado por una cuenta suspendida."""
        return self.repo.retirar_de_autor(autor_id)

    def autores(self) -> list:
        return self.repo.autores()

    # --- apoyo -----------------------------------------------------------
    def _visible(self, publicacion_id, viewer) -> Publicacion:
        p = self.repo.publicacion(publicacion_id, viewer)
        if p is None or not p.visible_para(viewer):
            raise NoEncontrado(publicacion_id)
        return p

    def _vistas(self, pubs, viewer):
        ids = [p.id for p in pubs]
        likes = self.repo.contar_likes('publicacion', ids)
        mios = self.repo.likes_de(viewer, 'publicacion', ids) if viewer else set()
        coms = self.repo.contar_comentarios(ids, viewer)
        guardadas = set(self.repo.guardados(viewer)) if viewer else set()
        reputacion = self.repo.likes_por_autor(sorted({p.autor.id for p in pubs})) if pubs else {}
        return [VistaPublicacion(p, likes.get(p.id, 0), p.id in mios, coms.get(p.id, 0), p.id in guardadas,
                                 reputacion.get(p.autor.id, 0))
                for p in pubs]

    def reputacion(self, autor_id: str) -> int:
        return self.repo.likes_por_autor([autor_id]).get(autor_id, 0)

    def destacados(self, limite=6) -> list:
        """Viajeros con más me gusta recibidos (solo quienes ya alcanzaron el nivel confiable)."""
        ranking = sorted(self.repo.likes_por_autor().items(), key=lambda kv: -kv[1])
        salida = []
        for autor_id, total in ranking:
            if nivel_de_confianza(total) is None:
                break
            autor = self.repo.autor_de(autor_id)
            if autor is not None:
                salida.append((autor, total))
            if len(salida) >= limite:
                break
        return salida
