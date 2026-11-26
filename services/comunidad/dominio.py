"""Entidades y reglas de Comunidad: publicaciones, comentarios en hilo y likes."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

TEXTO_MAXIMO = 2000
COMENTARIO_MAXIMO = 1000
PROFUNDIDAD_MAXIMA = 3          # el esquema admite 5; la lectura móvil se acota a 3
FOTO_BYTES_MAXIMO = 5 * 1024 * 1024
OBJETIVOS_LIKE = ('publicacion', 'comentario')

# Reputación: me gusta recibidos en publicaciones publicadas. Umbrales ajustables.
UMBRAL_CONFIABLE = 5
UMBRAL_EMBAJADOR = 20
NIVELES = {'confiable': 'Viajero confiable', 'embajador': 'Embajador de Ayacucho'}


def nivel_de_confianza(likes: int):
    if likes >= UMBRAL_EMBAJADOR:
        return 'embajador'
    if likes >= UMBRAL_CONFIABLE:
        return 'confiable'
    return None


class ReglaVulnerada(ValueError):
    """La solicitud no cumple una regla de negocio; el mensaje es apto para el usuario."""


class NoEncontrado(LookupError):
    """El objetivo no existe o no es visible para quien lo pide."""


@dataclass(frozen=True)
class Autor:
    id: str
    nombre: str
    avatar: Optional[str] = None


@dataclass(frozen=True)
class Publicacion:
    id: str
    autor: Autor
    texto: str
    lugar_slug: Optional[str]
    foto_id: Optional[str]
    estado: str
    creado_en: datetime

    def visible_para(self, usuario_id: Optional[str]) -> bool:
        return self.estado == 'publicado' or (usuario_id is not None and self.autor.id == usuario_id)


@dataclass(frozen=True)
class Comentario:
    id: str
    publicacion_id: str
    autor: Autor
    texto: str
    padre_id: Optional[str]
    raiz_id: Optional[str]
    profundidad: int
    estado: str
    creado_en: datetime

    def visible_para(self, usuario_id: Optional[str]) -> bool:
        return self.estado == 'publicado' or (usuario_id is not None and self.autor.id == usuario_id)


def limpiar_texto(texto, maximo: int, obligatorio: bool = True) -> str:
    if not isinstance(texto, str):
        raise ReglaVulnerada('El texto no es válido.')
    texto = texto.strip()
    if obligatorio and not texto:
        raise ReglaVulnerada('Escribe algo antes de publicar.')
    if len(texto) > maximo:
        raise ReglaVulnerada(f'El texto supera los {maximo} caracteres.')
    return texto


def tipo_de_imagen(datos: bytes) -> str:
    """Valida por contenido (firma), no por la extensión que manda el navegador."""
    if len(datos) > FOTO_BYTES_MAXIMO:
        raise ReglaVulnerada('La foto supera los 5 MB.')
    if datos.startswith(b'\xff\xd8\xff'):
        return 'image/jpeg'
    if datos.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'image/png'
    if len(datos) > 12 and datos[:4] == b'RIFF' and datos[8:12] == b'WEBP':
        return 'image/webp'
    raise ReglaVulnerada('Solo se aceptan fotos JPG, PNG o WebP.')


MOTIVOS_REPORTE = (
    'Cuenta falsa o suplantación',
    'Contenido ofensivo o violento',
    'Spam o publicidad engañosa',
    'Información falsa sobre un lugar',
    'Foto que no corresponde o no es propia',
    'Otro',
)


@dataclass(frozen=True)
class Reporte:
    id: str
    autor_id: str            # quien reporta
    publicacion_id: str
    motivo: str
    detalle: str
    estado: str              # pendiente | resuelto | desestimado
    creado_en: datetime
    decision: str = ''
