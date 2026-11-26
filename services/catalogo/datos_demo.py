"""Datos de DEMOSTRACIÓN identificados (prompt 03: no inventar acreditaciones).

Información turística resumida de fuentes públicas: Guía del viajero Ayacucho
(PROMPERÚ, gob.pe), BCRP «Ayacucho: principales recursos turísticos» y Wikipedia.
Fotos de Wikimedia Commons enlazadas con su página de origen, autor y licencia
cuando se conocen. No incluye estrellas oficiales, precios ni reseñas.
"""
from datetime import date
from urllib.parse import quote
from .dominio import Foto, Lugar

GUIA = 'https://cdn.www.gob.pe/uploads/document/file/5534841/4924195-guia-del-viajero-ayacucho-espanol.pdf'
BCRP = 'https://www.bcrp.gob.pe/docs/Sucursales/Huancayo/Ayacucho-Atractivos.pdf'
REVISADO = date(2026, 11, 17)
VER_COMMONS = 'Ver autor en Wikimedia Commons'
LICENCIA_COMMONS = 'Licencia libre (ver página del archivo)'


def commons(archivo, autor=VER_COMMONS, licencia=LICENCIA_COMMONS, descripcion='', ancho=1280):
    nombre = archivo.replace(' ', '_')
    return Foto(
        url=f'https://commons.wikimedia.org/wiki/Special:FilePath/{quote(nombre)}?width={ancho}',
        autor=autor, licencia=licencia,
        fuente_url=f'https://commons.wikimedia.org/wiki/File:{quote(nombre)}', descripcion=descripcion)


LUGARES = (
    Lugar(
        id='c1a1e0de-0001-4000-8000-000000000001', slug='plaza-mayor-huamanga',
        nombre='Plaza Mayor de Huamanga', tipo='cultural', destino='Huamanga', zona='Centro histórico de Ayacucho',
        resumen='El corazón de la ciudad: portales de piedra, casonas de los siglos XVI y XVII y la Catedral a un costado.',
        descripcion=('También la llaman Parque Sucre por el monumento al mariscal Antonio José de Sucre que está al centro. '
                     'La rodean los portales Municipal, Constitución e Independencia, con arquerías de piedra en el primer '
                     'nivel. Aquí se cruzan la vida universitaria, las procesiones de Semana Santa y las tardes de paseo.'),
        lat=-13.158800, lon=-74.223800,
        fotos=(commons('Plaza de Armas - Ayacucho.JPG', descripcion='Plaza Mayor de Ayacucho'),
               commons('Portal Municipal Ayacucho.JPG', descripcion='Portal Municipal'),
               commons('Ciudad de Ayacucho.jpg', descripcion='Vista de la ciudad de Ayacucho')),
        como_llegar='Está en pleno centro. Desde cualquier hospedaje del centro histórico se llega caminando.',
        recomendaciones=('Recorre los portales al atardecer, cuando se encienden las luces.',
                         'Desde aquí salen a pie las visitas a la Catedral y a la Iglesia de Santo Domingo, a una cuadra.'),
        altitud_m=2761, fuente='BCRP · Ayacucho: principales recursos turísticos', fuente_url=BCRP, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0002-4000-8000-000000000002', slug='catedral-de-ayacucho',
        nombre='Catedral Basílica de Ayacucho', tipo='cultural', destino='Huamanga', zona='Plaza Mayor, Ayacucho',
        resumen='Templo del siglo XVII que mezcla elementos renacentistas y barrocos, frente a la Plaza Mayor.',
        descripcion=('Construida en el siglo XVII, combina rasgos renacentistas y barrocos en un estilo mestizo. Fue declarada '
                     'Patrimonio Cultural de la Nación en 1972. Es una de las iglesias que dan fama a Ayacucho como '
                     'la ciudad de las 33 iglesias.'),
        lat=-13.159300, lon=-74.224300,
        fotos=(commons('Catedral de Ayacucho.jpg', descripcion='Fachada de la Catedral'),),
        como_llegar='En el lado oriental de la Plaza Mayor.',
        recomendaciones=('Consulta los horarios de visita: el ingreso puede cerrarse durante las misas.',
                         'En Semana Santa es punto de partida de varias procesiones.'),
        altitud_m=2761, fuente='BCRP · Ayacucho: principales recursos turísticos', fuente_url=BCRP, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0003-4000-8000-000000000003', slug='arco-del-triunfo',
        nombre='Arco del Triunfo', tipo='cultural', destino='Huamanga', zona='Jirón 28 de Julio, Ayacucho',
        resumen='Arco conmemorativo de la independencia, a pocas cuadras de la Plaza Mayor. Foto obligada del centro.',
        descripcion=('Monumento que recuerda la independencia del Perú, sellada en la Pampa de Ayacucho. Marca el '
                     'inicio de una de las calles más caminadas del centro histórico.'),
        lat=-13.161200, lon=-74.224500,
        fotos=(commons('Ayacucho arco2.jpg', autor='Qwertymith', descripcion='Arco del Triunfo de Ayacucho'),),
        como_llegar='Camina unas cuadras al sur de la Plaza Mayor por el jirón 28 de Julio.',
        recomendaciones=('Combínalo con el recorrido por las iglesias del centro.',),
        altitud_m=2761, fuente='Wikipedia · Ayacucho', fuente_url='https://es.wikipedia.org/wiki/Ayacucho', revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0004-4000-8000-000000000004', slug='complejo-arqueologico-wari',
        nombre='Complejo Arqueológico Wari', tipo='arqueologico', destino='Quinua', zona='A 22 km al noreste de Huamanga',
        resumen='Lo que queda de la capital del imperio Wari, la primera gran organización expansiva de los Andes.',
        descripcion=('Wari fue la capital de una civilización que dominó gran parte de la sierra y la costa entre los '
                     'años 500 y 1000. El complejo se extiende entre los 2600 y 2900 m s. n. m. e incluye recintos, '
                     'galerías y tumbas de piedra como las de Monqachayoq y Cheqo Wasi.'),
        lat=-13.060560, lon=-74.198890,
        fotos=(commons('Tomb at Wari ruins near Ayacucho.jpg', autor='Dominio público', licencia='CC0 1.0',
                       descripcion='Tumba en el complejo Wari'),),
        como_llegar='Los colectivos y combis hacia Quinua pasan por el complejo. Salen del centro de Huamanga; consulta tarifa y horario vigentes.',
        recomendaciones=('Lleva bloqueador y agua: el recorrido es al aire libre.',
                         'Puedes seguir el mismo día hacia Quinua y la Pampa de Ayacucho.'),
        altitud_m=2770, fuente='Guía del viajero Ayacucho · PROMPERÚ', fuente_url=GUIA, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0005-4000-8000-000000000005', slug='santuario-pampa-de-ayacucho',
        nombre='Santuario Histórico Pampa de Ayacucho', tipo='cultural', destino='Quinua', zona='Quinua, provincia de Huamanga',
        resumen='Escenario de la Batalla de Ayacucho de 1824. Un obelisco de 44 metros domina la pampa.',
        descripcion=('Aquí se libró el 9 de diciembre de 1824 la batalla que selló la independencia sudamericana. El '
                     'santuario histórico existe desde 1980 y protege tanto el paisaje como su memoria. El obelisco, '
                     'tallado en mármol blanco, mide más de 44 metros.'),
        lat=-13.042410, lon=-74.131410,
        fotos=(commons('Obelisco de la Pampa de la Quinua.jpg', autor='Mythbuster', licencia='CC BY-SA 3.0',
                       descripcion='Obelisco de la Pampa de Ayacucho'),
               commons('Obelisk Battle of Ayacucho and Sucre MC.jpg', autor='Christian Mehlführer', licencia='CC BY-SA',
                       descripcion='Estatua de Sucre y obelisco'),
               commons('Monument to the Battle of Ayacucho where Peru won its inependence (7271029082).jpg',
                       descripcion='Monumento a la Batalla de Ayacucho')),
        como_llegar='A unos 37 km de Huamanga. Se llega en colectivo hasta Quinua y desde el pueblo se sube a la pampa.',
        recomendaciones=('Cada 9 de diciembre se celebra el aniversario de la batalla.',
                         'Por la altura, el sol y el viento son fuertes: lleva abrigo ligero.'),
        altitud_m=3300, fuente='Guía del viajero Ayacucho · PROMPERÚ', fuente_url=GUIA, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0006-4000-8000-000000000006', slug='pueblo-de-quinua',
        nombre='Pueblo artesanal de Quinua', tipo='cultural', destino='Quinua', zona='Quinua, a unos 37 km de Huamanga',
        resumen='Pueblo de ceramistas: las iglesitas de barro que coronan los techos ayacuchanos nacen aquí.',
        descripcion=('Quinua se presenta como la capital de la artesanía ayacuchana. En sus talleres puedes ver cómo se '
                     'modela y pinta la cerámica tradicional. Está muy cerca de la Pampa de Ayacucho, así que se visitan juntas.'),
        lat=-13.050000, lon=-74.139000,
        fotos=(commons('Quinua.JPG', descripcion='Vista del pueblo de Quinua'),),
        como_llegar='Colectivos desde el centro de Huamanga; el viaje toma alrededor de una hora.',
        recomendaciones=('Pregunta en los talleres si puedes ver el proceso de modelado.',),
        altitud_m=3300, fuente='Guía del viajero Ayacucho · PROMPERÚ', fuente_url=GUIA, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0007-4000-8000-000000000007', slug='vilcashuaman',
        nombre='Vilcashuamán', tipo='arqueologico', destino='Vilcashuamán', zona='Provincia de Vilcashuamán',
        resumen='Centro inca con un ushnu de cinco plataformas y un Templo del Sol sobre el que se levantó una iglesia colonial.',
        descripcion=('Fue un importante centro administrativo inca. Destacan el ushnu, una pirámide ceremonial de cinco '
                     'plataformas, y el Templo del Sol, sobre cuyas bases se construyó la iglesia colonial. A finales de '
                     'julio se celebra el Vilcas Raymi.'),
        lat=-13.653300, lon=-73.953600,
        fotos=(commons('Vilcashuamán - Ayacucho - Perú.jpg', licencia='CC BY-SA 4.0', descripcion='Vilcashuamán'),
               commons('Willkawaman cathedral.jpg', descripcion='Iglesia sobre el Templo del Sol')),
        como_llegar='Viaje por carretera desde Huamanga hacia el sur. Confirma salidas en los terminales autorizados.',
        recomendaciones=('Si coincides con el Vilcas Raymi (28 y 29 de julio), reserva hospedaje con tiempo.',),
        altitud_m=3470, fuente='Guía del viajero Ayacucho · PROMPERÚ', fuente_url=GUIA, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0008-4000-8000-000000000008', slug='aguas-turquesas-de-millpu',
        nombre='Aguas Turquesas de Millpu', tipo='natural', destino='Víctor Fajardo', zona='Circamarca, Huancaraylla',
        resumen='Una veintena de pozas turquesas escalonadas dentro de un cañón. Mejor época: mayo a noviembre.',
        descripcion=('Las pozas se formaron en el cauce del río Millpu, sobre roca caliza que tiñe el agua de turquesa. '
                     'Se recorren por el borde del cañón en una caminata de 30 a 45 minutos. Bañarse daña el lugar: '
                     'disfrútalo desde los miradores.'),
        lat=None, lon=None, fotos=(),
        como_llegar='Viaje de unas cuatro horas desde Huamanga hasta Circamarca y luego caminata corta. Muchos visitantes van con agencia.',
        recomendaciones=('Evita la temporada de lluvias (enero a marzo): el agua pierde su color.',
                         'Lleva calzado de trekking y sal temprano.'),
        altitud_m=3600, fuente='Guía del viajero Ayacucho · PROMPERÚ', fuente_url=GUIA, revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-0009-4000-8000-000000000009', slug='picanterias-de-huamanga',
        nombre='Picanterías de Huamanga', tipo='gastronomia', destino='Huamanga', zona='Centro y barrios tradicionales',
        resumen='Donde se prueba la cocina ayacuchana: puca picante, mondongo, patachi y chicharrón con mote.',
        descripcion=('Las picanterías son locales familiares de comida criolla y andina, famosas por sus guisos '
                     'picantes y sus sopas contundentes. Suelen abrir al mediodía y cerrar temprano, porque la '
                     'cocina se prepara cada día. Pregunta por el plato del día y por la chicha de jora.'),
        lat=None, lon=None, fotos=(),
        como_llegar='Pregunta en tu hospedaje por las picanterías más cercanas y llega temprano al almuerzo.',
        recomendaciones=('Prueba el puca picante y el mondongo.', 'Lleva efectivo: no todos los locales aceptan tarjeta.'),
        altitud_m=2761, fuente='Referencia general de gastronomía ayacuchana (sin local verificado)', fuente_url='', revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-000a-4000-8000-00000000000a', slug='mercado-central-huamanga',
        nombre='Mercados de Huamanga', tipo='gastronomia', destino='Huamanga', zona='Centro de Huamanga',
        resumen='Desayunos con jugo y pan, frutas, quesos y tamales: la forma más barata y rápida de comer como local.',
        descripcion=('Los mercados de la ciudad concentran puestos de desayuno, jugos, queso fresco, tamales y comida '
                     'del día a precios populares. Es un buen lugar para conocer los productos de la zona.'),
        lat=None, lon=None, fotos=(),
        como_llegar='Están en el centro de la ciudad; se llega caminando desde la Plaza Mayor.',
        recomendaciones=('Ve temprano: lo mejor se acaba antes del mediodía.',),
        altitud_m=2761, fuente='Referencia general (sin local verificado)', fuente_url='', revisado_en=REVISADO),
    Lugar(
        id='c1a1e0de-000b-4000-8000-00000000000b', slug='barrio-de-artesanos-santa-ana',
        nombre='Barrio de artesanos de Santa Ana', tipo='artesania', destino='Huamanga', zona='Barrio de Santa Ana',
        resumen='Talleres de retablos, tejidos y piedra de Huamanga, donde se ve cómo se hace cada pieza.',
        descripcion=('Santa Ana es conocido por sus talleres de artesanos. Puedes ver retablos ayacuchanos, tejidos '
                     'y trabajos en piedra de Huamanga, y conversar con quienes los elaboran.'),
        lat=None, lon=None, fotos=(),
        como_llegar='Está a pocas cuadras del centro; consulta la ruta en tu hospedaje.',
        recomendaciones=('Compra directo al artesano y pregunta el nombre de la técnica.',),
        altitud_m=2761, fuente='Referencia general (sin local verificado)', fuente_url='', revisado_en=REVISADO),
)


# Entrada (referencial, consultada el 23/11/2026; siempre se pide confirmar antes de viajar).
# Fuentes: SERNANP (tarifa del Santuario Pampa de Ayacucho), Whichmuseum (Museo de sitio Wari),
# operadores turísticos Nomades/Denomades (Vilcashuamán y Millpu). Los espacios públicos son de ingreso libre.
ENTRADAS = {
    'plaza-mayor-huamanga': ('Libre: es un espacio público.', ''),
    'catedral-de-ayacucho': ('Libre. Respeta los horarios de misa.', ''),
    'arco-del-triunfo': ('Libre: está en la vía pública.', ''),
    'complejo-arqueologico-wari': ('Con boleto (incluye el museo de sitio). Referencia: S/ 6 adultos · S/ 3 universitarios · escolares gratis.', 'lugar'),
    'santuario-pampa-de-ayacucho': ('Con boleto (SERNANP). Referencia: S/ 5 nacionales · S/ 3 pobladores de Ayacucho · S/ 8 extranjeros.', 'lugar'),
    'pueblo-de-quinua': ('Libre para recorrer el pueblo; algunos talleres o museos pueden cobrar aparte.', ''),
    'vilcashuaman': ('Con boleto. Referencia: S/ 5 residentes en el Perú · S/ 7 no residentes.', 'lugar'),
    'aguas-turquesas-de-millpu': ('Con boleto (lo cobra la comunidad). Referencia: S/ 10 peruanos · S/ 15 extranjeros.', 'lugar'),
    'picanterias-de-huamanga': ('Libre: pagas solo lo que consumes.', ''),
    'mercado-central-huamanga': ('Libre: pagas solo lo que compras.', ''),
    'barrio-de-artesanos-santa-ana': ('Libre: los talleres se visitan sin costo; pagas lo que compras.', ''),
}

from dataclasses import replace as _reemplazar  # noqa: E402
LUGARES = tuple(_reemplazar(l, entrada_costo=ENTRADAS[l.slug][0], entrada_compra=ENTRADAS[l.slug][1])
                if l.slug in ENTRADAS else l for l in LUGARES)
