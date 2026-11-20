"""Dominio del Asistente Willaq Uma: entidades y conocimiento del lenguaje.

Aquí vive lo que no depende de cómo se conversa ni de dónde salen los datos:
el vocabulario que entiende el guía (temas, gustos, tipos de lugar), cómo se
normaliza una pregunta y la forma de una respuesta. Sin frameworks ni E/S.
"""
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

VACIAS = set('''a al algo como con cual cuales cuando de del donde el ella en entre es esta este esto hay la las lo los
me mas mi muy no o para pero por que quiero quisiera recomiendas sabes se si sobre su sus te tienes tu un una unos y ya yo
puedo puedes ir visitar conocer lugar lugares favor dime cuentame hola buenas'''.split())

EXTRAS = {
    # Conocimiento general, solo cuando el catálogo no cubre el tema. Se marca como tal.
    'comida': ('Todavía no tenemos restaurantes verificados en LlegueYa, pero te dejo lo que suele recomendarse '
               'en Ayacucho: la puca picante, el qapchi con papas, el mondongo por las mañanas y, de postre, '
               'un muyuchi en los portales de la Plaza Mayor.'),
    'altura': ('Huamanga está alrededor de los 2760 m de altura y lugares como la Pampa de Ayacucho superan los '
               '3000 m. El primer día camina sin apuro, toma bastante agua y deja las caminatas largas para después.'),
    'clima': ('En los Andes de Ayacucho la temporada seca va más o menos de mayo a octubre; de enero a marzo '
              'llueve más y algunos caminos se complican. Lleva siempre una casaca: las noches son frías.'),
}

TEMAS = {
    'evento': ('fiesta', 'fiestas', 'evento', 'eventos', 'festividad', 'calendario', 'raymi', 'semana santa',
               'aniversario', 'celebra', 'carnaval'),
    'llegar': ('llegar', 'llego', 'transporte', 'bus', 'colectivo', 'combi', 'como voy', 'movilidad', 'terminal'),
    'comida': ('comer', 'comida', 'plato', 'platos', 'gastronomia', 'restaurante', 'almorzar', 'probar'),
    'altura': ('altura', 'soroche', 'altitud', 'mal de altura'),
    'clima': ('clima', 'lluvia', 'llueve', 'temporada', 'epoca', 'frio', 'cuando ir', 'mejor mes'),
    'saludo': ('hola', 'allillanchu', 'buenas', 'buenos dias', 'buenas tardes', 'que tal'),
    'gracias': ('gracias', 'sulpayki', 'genial', 'perfecto'),
    'recomendar': ('recomienda', 'recomiendas', 'recomiendame', 'recomendacion', 'recomendaciones', 'sugiere',
                   'sugieres', 'sugerencia', 'que hago', 'que visito', 'que visitar', 'a donde voy', 'adonde voy',
                   'aconsejas', 'aconseja', 'plan', 'no se que hacer', 'que me gusta', 'segun lo que me gusta'),
    'viaje': ('arma mi viaje', 'armar mi viaje', 'armame', 'organiza mi viaje', 'organizar mi viaje', 'organizame',
              'itinerario', 'plan de viaje', 'planifica', 'planificar', 'arma un plan', 'otro plan', 'dias en ayacucho'),
    'quien': ('quien eres', 'que eres', 'que haces', 'presentate', 'como me ayudas', 'quien es willaq'),
}

TIPO_POR_PALABRA = {
    'naturaleza': 'natural', 'natural': 'natural', 'agua': 'natural', 'cascada': 'natural', 'pozas': 'natural',
    'arqueologia': 'arqueologico', 'arqueologico': 'arqueologico', 'ruinas': 'arqueologico', 'inca': 'arqueologico',
    'wari': 'arqueologico', 'historia': 'cultural', 'iglesia': 'cultural', 'iglesias': 'cultural',
    'cultura': 'cultural', 'artesania': 'cultural', 'aventura': 'aventura', 'camping': 'camping',
}


def normalizar(texto: str) -> str:
    t = unicodedata.normalize('NFKD', texto.lower())
    return ''.join(c for c in t if not unicodedata.combining(c))


def palabras(texto: str) -> list:
    return [w for w in re.findall(r'[a-z0-9]+', normalizar(texto)) if len(w) > 2 and w not in VACIAS]


def raiz(w: str) -> str:
    return w[:5]


PRESENTACION = (
    '¡Bienvenido! Soy Willaq Uma, el sabio guía de LlegueYa.',
    'Mi nombre viene del Willaq Umu, el consejero sabio del mundo inca. Mi tarea es que vivas Ayacucho cómodo y '
    'a tu manera: puedo armarte un plan de viaje por días y tú decides si lo aceptas, lo cambias o lo dejas.',
    'Para aconsejarte me baso en lo que hay en esta aplicación: los lugares del catálogo, las fiestas del '
    'calendario y las experiencias que comparten otros viajeros. Si algo no está publicado, te lo diré con honestidad.',
    'Cuéntame qué te gusta o cuántos días tienes, y empezamos.',
)
DIAS_EN_TEXTO = {'un': 1, 'una': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5}

GUSTOS = {
    # palabra que dice el usuario → (cómo lo nombramos, filtro sobre el lugar)
    'historia': ('la historia', lambda l: l.tipo == 'cultural'),
    'cultura': ('la cultura', lambda l: l.tipo == 'cultural'),
    'iglesia': ('las iglesias y el arte colonial', lambda l: l.destino == 'Huamanga'),
    'iglesias': ('las iglesias y el arte colonial', lambda l: l.destino == 'Huamanga'),
    'colonial': ('lo colonial', lambda l: l.destino == 'Huamanga'),
    'artesania': ('la artesanía', lambda l: 'artesan' in normalizar(l.nombre + l.resumen + l.descripcion)),
    'naturaleza': ('la naturaleza', lambda l: l.tipo in ('natural', 'aventura', 'camping')),
    'paisaje': ('los paisajes', lambda l: l.tipo in ('natural', 'aventura', 'camping')),
    'paisajes': ('los paisajes', lambda l: l.tipo in ('natural', 'aventura', 'camping')),
    'aventura': ('la aventura', lambda l: l.tipo in ('natural', 'aventura', 'camping')),
    'caminata': ('caminar', lambda l: l.tipo in ('natural', 'aventura', 'camping')),
    'arqueologia': ('la arqueología', lambda l: l.tipo == 'arqueologico'),
    'ruinas': ('las ruinas', lambda l: l.tipo == 'arqueologico'),
    'incas': ('el mundo inca', lambda l: l.tipo == 'arqueologico'),
    'familia': ('viajar en familia', lambda l: l.destino == 'Huamanga'),
    'ninos': ('viajar con niños', lambda l: l.destino == 'Huamanga'),
    'tranquilo': ('algo tranquilo', lambda l: l.destino == 'Huamanga'),
}
NOTA_FAMILIA = ('Aún no tengo datos verificados de accesibilidad para niños, así que te propongo lo que está '
                'dentro de la ciudad, sin viajes largos.')


@dataclass(frozen=True)
class Experiencia:
    """Publicación aprobada de un viajero (lo que la Comunidad deja ver a todos)."""
    publicacion_id: str
    autor: str
    texto: str
    lugar_slug: Optional[str]


@dataclass
class Respuesta:
    parrafos: list
    lugares: list = field(default_factory=list)      # [{slug, nombre}]
    eventos: list = field(default_factory=list)      # [{id, titulo, inicio}]
    fuentes: list = field(default_factory=list)      # [{nombre, url}]
    sugerencias: list = field(default_factory=list)  # preguntas rápidas
    experiencias: list = field(default_factory=list) # [{autor, texto, lugar_slug}] reales de la comunidad
    plan: Optional[dict] = None                      # propuesta de viaje que el usuario puede aceptar
    dato_general: bool = False
    requiere_sesion: bool = False
