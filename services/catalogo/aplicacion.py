"""Casos de uso del Catálogo: explorar vistas previas, ver ficha y mapa.

La regla de acceso del SDD vive aquí: sin sesión solo hay vista previa;
el detalle (galería completa, cómo llegar, recomendaciones) exige sesión.
"""
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import date
from typing import Optional, Protocol
from .dominio import LIMITES_AYACUCHO, TIPOS, DatosLugarInvalidos, Foto, Lugar, LugarNoEncontrado, crear_slug


class RepositorioLugares(Protocol):
    def listar(self) -> list: ...
    def obtener(self, slug: str) -> Optional[Lugar]: ...
    # Solo administración:
    def listar_admin(self) -> list: ...                      # [(Lugar, estado)] incluidos los retirados
    def guardar(self, lugar: Lugar) -> None: ...              # crea o reemplaza (publicado)
    def cambiar_estado(self, lugar_id: str, estado: str) -> None: ...
    def eliminar(self, lugar_id: str) -> None: ...            # baja definitiva


@dataclass(frozen=True)
class Pagina:
    items: list
    total: int
    desde: int
    limite: int


@dataclass(frozen=True)
class Ficha:
    lugar: Lugar
    completa: bool


class RepositorioFavoritos(Protocol):
    def marcar(self, usuario: str, lugar_id: str, activo: bool) -> None: ...
    def de(self, usuario: str) -> list: ...


class Catalogo:
    LIMITE_MAXIMO = 48

    def __init__(self, repositorio: RepositorioLugares, favoritos: Optional[RepositorioFavoritos] = None):
        self.repositorio = repositorio
        self.favoritos = favoritos

    def marcar_favorito(self, usuario: str, slug: str, activo: bool) -> bool:
        lugar = self.repositorio.obtener(slug)
        if lugar is None:
            raise LugarNoEncontrado(slug)
        self.favoritos.marcar(usuario, lugar.id, activo)
        return activo

    def mis_favoritos(self, usuario: str) -> list:
        ids = self.favoritos.de(usuario)
        por_id = {l.id: l for l in self.repositorio.listar()}
        # Si un lugar se retira, deja de mostrarse aunque siga guardado (RF61).
        return [por_id[i] for i in ids if i in por_id]

    def explorar(self, tipo: Optional[str] = None, texto: str = '', destino: Optional[str] = None,
                 desde: int = 0, limite: int = 24) -> Pagina:
        if tipo is not None and tipo not in TIPOS:
            raise ValueError('Tipo no válido.')
        desde = max(0, desde)
        limite = min(max(1, limite), self.LIMITE_MAXIMO)
        lugares = [l for l in self.repositorio.listar()
                   if (tipo is None or l.tipo == tipo)
                   and (destino is None or l.destino == destino)
                   and l.coincide(texto[:80])]
        return Pagina(lugares[desde:desde + limite], len(lugares), desde, limite)

    def ver(self, slug: str, autenticado: bool) -> Ficha:
        lugar = self.repositorio.obtener(slug)
        if lugar is None:
            raise LugarNoEncontrado(slug)
        return Ficha(lugar, completa=autenticado)

    def mapa(self) -> list:
        return [l for l in self.repositorio.listar() if l.tiene_coordenadas]

    def destinos(self) -> list:
        """Destinos con su portada, para la barra de historias."""
        def norma(t):
            return unicodedata.normalize('NFD', (t or '').lower()).encode('ascii', 'ignore').decode()

        vistos, propia = {}, set()
        for l in self.repositorio.listar():
            if l.destino not in vistos:
                vistos[l.destino] = {'nombre': l.destino, 'portada': l.portada, 'lugares': 0}
            d = vistos[l.destino]
            d['lugares'] += 1
            # Manda la foto del lugar que lleva el nombre del destino («Pueblo de Quinua» para Quinua);
            # si no hay, la del primer lugar con foto.
            if l.portada and l.destino not in propia and norma(l.destino) in norma(l.nombre):
                d['portada'] = l.portada
                propia.add(l.destino)
            elif d['portada'] is None:
                d['portada'] = l.portada
        return list(vistos.values())

    # ------------------------------------------------------------ Administración del catálogo
    def lugares_admin(self) -> list:
        return self.repositorio.listar_admin()

    def guardar_lugar(self, datos: dict, slug_actual: Optional[str] = None, hoy: Optional[date] = None) -> Lugar:
        """Crea un lugar (slug_actual=None) o edita uno existente. Queda publicado."""
        existentes = {l.slug: (l, e) for l, e in self.repositorio.listar_admin()}
        if slug_actual is not None:
            if slug_actual not in existentes:
                raise LugarNoEncontrado(slug_actual)
            previo = existentes[slug_actual][0]
            id_, slug = previo.id, previo.slug          # el enlace del lugar no cambia al editar
        else:
            id_, slug = str(uuid.uuid4()), crear_slug(_texto(datos, 'nombre', 3, 120))
            base, n = slug, 2
            while slug in existentes:
                slug, n = f'{base}-{n}', n + 1
        lugar = construir_lugar(datos, id_, slug, hoy or date.today())
        self.repositorio.guardar(lugar)
        return lugar

    def cambiar_estado_lugar(self, slug: str, publicado: bool) -> str:
        for l, _ in self.repositorio.listar_admin():
            if l.slug == slug:
                estado = 'publicado' if publicado else 'retirado'
                self.repositorio.cambiar_estado(l.id, estado)
                return estado
        raise LugarNoEncontrado(slug)

    def eliminar_lugar(self, slug: str) -> str:
        """Baja definitiva (a diferencia de retirar, no se puede volver a publicar)."""
        for l, _ in self.repositorio.listar_admin():
            if l.slug == slug:
                self.repositorio.eliminar(l.id)
                return l.nombre
        raise LugarNoEncontrado(slug)

    def eliminar_demostracion(self) -> int:
        """Borra todos los lugares marcados como datos de demostración. Devuelve cuántos."""
        demo = [l for l, _ in self.repositorio.listar_admin() if l.demostracion]
        for l in demo:
            self.repositorio.eliminar(l.id)
        return len(demo)


MAX_FOTOS = 8
PREFIJO_FOTOS_PROPIAS = '/api/v1/catalogo/fotos/'

MAX_RECOMENDACIONES = 8


def _texto(datos, clave, minimo, maximo, nombre=None):
    valor = str(datos.get(clave) or '').strip()
    etiqueta = nombre or clave.replace('_', ' ')
    if len(valor) < minimo:
        raise DatosLugarInvalidos(f'Completa {etiqueta} (mínimo {minimo} caracteres).' if minimo else f'Revisa {etiqueta}.')
    if len(valor) > maximo:
        raise DatosLugarInvalidos(f'{etiqueta.capitalize()} admite como máximo {maximo} caracteres.')
    return valor


def _url(valor, etiqueta):
    v = str(valor or '').strip()
    if v and (not (v.startswith('https://') or v.startswith(PREFIJO_FOTOS_PROPIAS)) or len(v) > 500 or ' ' in v):
        raise DatosLugarInvalidos(f'{etiqueta} debe ser un enlace https://')
    return v


COMPRA_ENTRADA = ('', 'lugar', 'web', 'ambos')


def entrada_valida(datos: dict):
    """Costo de ingreso y dónde comprarlo. Si se compra por web, hace falta el enlace https."""
    costo = str(datos.get('entrada_costo') or '').strip()
    if len(costo) > 160:
        raise DatosLugarInvalidos('El costo de la entrada admite hasta 160 caracteres.')
    compra = str(datos.get('entrada_compra') or '').strip()
    if compra not in COMPRA_ENTRADA:
        raise DatosLugarInvalidos('Elige dónde se compra la entrada.')
    url = _url(datos.get('entrada_url'), 'El enlace de compra de entradas')
    if compra in ('web', 'ambos') and not url:
        raise DatosLugarInvalidos('Pega el enlace de la página donde se compran las entradas.')
    if url and url.startswith(PREFIJO_FOTOS_PROPIAS):
        raise DatosLugarInvalidos('El enlace de compra debe ser una página web (https://).')
    return costo, compra, (url if compra in ('web', 'ambos') else '')


def construir_lugar(datos: dict, id_: str, slug: str, hoy: date) -> Lugar:
    tipo = str(datos.get('tipo') or '')
    if tipo not in TIPOS:
        raise DatosLugarInvalidos('Elige un tipo de lugar válido.')
    lat, lon = datos.get('lat'), datos.get('lon')
    if (lat is None) != (lon is None):
        raise DatosLugarInvalidos('Marca el lugar en el mapa (latitud y longitud van juntas).')
    if lat is not None:
        try:
            lat, lon = round(float(lat), 6), round(float(lon), 6)
        except (TypeError, ValueError):
            raise DatosLugarInvalidos('Coordenadas no válidas.')
        s, n, o, e = LIMITES_AYACUCHO
        if not (s <= lat <= n and o <= lon <= e):
            raise DatosLugarInvalidos('La ubicación está fuera de Ayacucho. Revisa el punto en el mapa.')
    altitud = datos.get('altitud_m')
    if altitud in ('', None):
        altitud = None
    else:
        try:
            altitud = int(altitud)
        except (TypeError, ValueError):
            raise DatosLugarInvalidos('La altitud debe ser un número.')
        if not 0 <= altitud <= 7000:
            raise DatosLugarInvalidos('La altitud debe estar entre 0 y 7000 m.')
    recomendaciones = [str(r).strip() for r in (datos.get('recomendaciones') or []) if str(r).strip()]
    if len(recomendaciones) > MAX_RECOMENDACIONES or any(len(r) > 200 for r in recomendaciones):
        raise DatosLugarInvalidos(f'Hasta {MAX_RECOMENDACIONES} recomendaciones de 200 caracteres.')
    fotos = []
    for i, f in enumerate(datos.get('fotos') or [], 1):
        if not isinstance(f, dict):
            raise DatosLugarInvalidos('Formato de foto no válido.')
        url = _url(f.get('url'), f'La foto {i}')
        if not url:
            continue
        propia = url.startswith(PREFIJO_FOTOS_PROPIAS)
        autor = str(f.get('autor') or '').strip()[:120] or ('LlegueYa' if propia else '')
        licencia = str(f.get('licencia') or '').strip()[:80] or ('Foto propia' if propia else '')
        if not autor or not licencia:
            raise DatosLugarInvalidos(f'La foto {i} es de otra web: indica autor y licencia para citar la fuente.')
        fotos.append(Foto(url=url, autor=autor, licencia=licencia,
                          fuente_url=_url(f.get('fuente_url'), f'La fuente de la foto {i}') or url,
                          descripcion=str(f.get('descripcion') or '').strip()[:200]))
    if len(fotos) > MAX_FOTOS:
        raise DatosLugarInvalidos(f'Hasta {MAX_FOTOS} fotos por lugar.')
    costo, compra, url_entrada = entrada_valida(datos)
    return Lugar(
        id=id_, slug=slug, nombre=_texto(datos, 'nombre', 3, 120), tipo=tipo,
        destino=_texto(datos, 'destino', 2, 120), zona=_texto(datos, 'zona', 0, 120) or _texto(datos, 'destino', 2, 120),
        resumen=_texto(datos, 'resumen', 10, 280), descripcion=_texto(datos, 'descripcion', 20, 4000, 'la descripción'),
        lat=lat, lon=lon, fotos=tuple(fotos), como_llegar=_texto(datos, 'como_llegar', 0, 1000, 'cómo llegar'),
        recomendaciones=tuple(recomendaciones), altitud_m=altitud,
        fuente='Registrado por administración de LlegueYa', fuente_url=_url(datos.get('fuente_url'), 'La fuente'),
        revisado_en=hoy, demostracion=False,
        entrada_costo=costo, entrada_compra=compra, entrada_url=url_entrada)
