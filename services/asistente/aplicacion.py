"""Willaq Uma, el sabio guía de LlegueYa.

Su nombre recuerda al Willaq Umu, el sabio consejero del mundo inca. No
gestiona ni decide el viaje del usuario: lo orienta para que viaje cómodo.
Recomienda SOLO con lo publicado en la plataforma (lugares del Catálogo,
fiestas del Calendario y experiencias aprobadas de la Comunidad). Si algo no
está publicado lo dice; los pocos datos generales que agrega van marcados.
No inventa lugares, precios, horarios ni opiniones de viajeros.

Aplica la misma regla de acceso que la web: sin sesión da la vista previa;
el «cómo llegar» y los consejos completos requieren iniciar sesión.
"""
import hashlib
import re
from typing import Callable, Optional

from .dominio import (  # noqa: F401  (se reexportan para quien importe desde aplicacion)
    DIAS_EN_TEXTO,
    EXTRAS,
    GUSTOS,
    NOTA_FAMILIA,
    PRESENTACION,
    TEMAS,
    TIPO_POR_PALABRA,
    VACIAS,
    Experiencia,
    Respuesta,
    normalizar,
    palabras,
    raiz,
)

class WillaqUma:
    MAX_PREGUNTA = 500

    def __init__(self, lugares: Callable[[], list], eventos: Callable[[], list],
                 experiencias: Callable[[], list] = lambda: []):
        self.lugares, self.eventos, self.experiencias = lugares, eventos, experiencias

    def presentacion(self) -> Respuesta:
        return Respuesta(list(PRESENTACION), sugerencias=[
            'Arma mi viaje de 2 días', 'Recomiéndame según lo que me gusta', 'Me gusta la historia', '¿Qué fiestas se vienen?'])

    # -------------------------------------------------------------------
    def responder(self, pregunta: str, autenticado: bool, nombre: Optional[str] = None) -> Respuesta:
        pregunta = (pregunta or '').strip()[:self.MAX_PREGUNTA]
        texto = normalizar(pregunta)
        temas = {t for t, claves in TEMAS.items() if any(re.search(r'\b' + re.escape(c) + r'\b', texto) for c in claves)}
        elegir = self._elegidor(pregunta)

        cortesia = {normalizar(c) for t in ('saludo', 'gracias') for frase in TEMAS[t] for c in frase.split()}
        cortesia |= {'gusta', 'gustan', 'encanta', 'interesa', 'segun', 'recomiendame', 'recomienda'}
        contenido = [w for w in palabras(pregunta) if w not in cortesia]
        if not contenido and temas & {'saludo', 'gracias'}:
            return self._cortesia(temas, nombre, elegir)

        if 'quien' in temas:
            return self.presentacion()

        if 'viaje' in temas or re.search(r'\b(\d|un|una|dos|tres|cuatro|cinco)\s+dias?\b', texto):
            return self._armar_viaje(texto, [g for g in GUSTOS if g in contenido], elegir)

        if 'evento' in temas:
            return self._eventos(texto, elegir)

        encontrados, por_nombre = self._buscar(pregunta)
        gustos = [g for g in GUSTOS if g in contenido]
        if encontrados and por_nombre:
            return self._sobre_lugares(encontrados, temas, autenticado, elegir)
        if gustos or 'recomendar' in temas:
            return self._recomendar(gustos, elegir)
        if encontrados:
            return self._sobre_lugares(encontrados, temas, autenticado, elegir)

        for tema in ('comida', 'altura', 'clima'):
            if tema in temas:
                return Respuesta(
                    [elegir(['Buena pregunta.', 'Te cuento.', 'Claro.']), EXTRAS[tema]],
                    dato_general=True, sugerencias=self._sugerencias())
        return Respuesta(
            ['No encontré eso entre los lugares y eventos publicados en LlegueYa todavía.',
             'Prueba preguntándome por un lugar (Wari, Quinua, Vilcashuamán, Millpu), por un tipo de viaje '
             '(naturaleza, historia, arqueología) o por las fiestas que se vienen.'],
            sugerencias=self._sugerencias())

    # -------------------------------------------------------------------
    @staticmethod
    def _elegidor(pregunta):
        semilla = int(hashlib.sha256(pregunta.encode()).hexdigest(), 16)
        return lambda opciones: opciones[semilla % len(opciones)]

    def _sugerencias(self):
        return ['¿Qué hago en un día en Huamanga?', '¿Qué fiestas se vienen?', 'Quiero ver ruinas', '¿Cómo llego a Wari?']

    def _cortesia(self, temas, nombre, elegir):
        quien = f', {nombre.split()[0]}' if nombre else ''
        if 'gracias' in temas:
            return Respuesta([elegir([f'¡Con gusto{quien}!', f'¡Sulpayki a ti{quien}!', f'Para eso estoy{quien}.']),
                              'Si quieres, guarda los lugares que te gustaron para armar tu viaje.'],
                             sugerencias=self._sugerencias())
        return Respuesta([f'¡Allillanchu{quien}! Soy Willaq Uma, tu guía en LlegueYa.',
                          'Te oriento con los lugares, fiestas y experiencias que la comunidad ha publicado. '
                          '¿Qué te provoca: historia, naturaleza o una fiesta?'],
                         sugerencias=['Recomiéndame según lo que me gusta', 'Me gusta la historia',
                                      'Me gusta la naturaleza', '¿Qué fiestas se vienen?'])

    def _buscar(self, pregunta) -> list:
        ws = palabras(pregunta)
        tipos = {TIPO_POR_PALABRA[w] for w in ws if w in TIPO_POR_PALABRA}
        raices = {raiz(w) for w in ws}
        puntuados = []
        for l in self.lugares():
            nombre = {raiz(w) for w in palabras(l.nombre)}
            lugar = {raiz(w) for w in palabras(f'{l.destino} {l.zona}')}
            cuerpo = {raiz(w) for w in palabras(f'{l.resumen} {l.descripcion}')}
            puntos = 5 * len(raices & nombre) + 3 * len(raices & lugar) + len(raices & cuerpo)
            if l.tipo in tipos:
                puntos += 4
            if puntos >= 3:
                # «Me gusta la historia» no debe tomarse como el nombre «Santuario Histórico».
                propias = {raiz(w) for w in ws if w not in GUSTOS}
                puntuados.append((puntos, l, bool(propias & nombre)))
        puntuados.sort(key=lambda x: -x[0])
        if puntuados and puntuados[0][0] >= 8:
            # Si un lugar destaca claramente, nos centramos en él.
            mejor = puntuados[0][0]
            puntuados = [p for p in puntuados if p[0] >= mejor - 2]
        por_nombre = bool(puntuados) and puntuados[0][2]
        return [l for _, l, _ in puntuados[:3]], por_nombre

    def _experiencias_de(self, slugs) -> list:
        return [e for e in self.experiencias() if e.lugar_slug in slugs and e.texto]

    @staticmethod
    def _cita(e) -> dict:
        texto = e.texto if len(e.texto) <= 160 else e.texto[:157].rsplit(' ', 1)[0] + '…'
        return {'autor': e.autor.split()[0] if e.autor else 'Un viajero', 'texto': texto,
                'lugar_slug': e.lugar_slug, 'publicacion_id': e.publicacion_id}

    def _recomendar(self, gustos, elegir):
        if not gustos:
            return Respuesta(
                ['Con gusto te recomiendo. Para no darte algo al azar, cuéntame qué disfrutas más cuando viajas.'],
                sugerencias=['Me gusta la historia', 'Me gusta la naturaleza', 'Quiero ver ruinas', 'Viajo en familia'])
        nombres = []
        for g in gustos:
            if GUSTOS[g][0] not in nombres:
                nombres.append(GUSTOS[g][0])
        candidatos = [l for l in self.lugares() if any(GUSTOS[g][1](l) for g in gustos)]
        if not candidatos:
            return Respuesta([f'Todavía no hay lugares publicados que encajen con {nombres[0]}.',
                              'Apenas la comunidad o el catálogo los agreguen, te los recomendaré.'],
                             sugerencias=self._sugerencias())
        # Primero los lugares con más experiencias reales de viajeros; luego el orden del catálogo.
        conteo = {}
        for e in self.experiencias():
            conteo[e.lugar_slug] = conteo.get(e.lugar_slug, 0) + 1
        orden = {l.slug: i for i, l in enumerate(self.lugares())}
        elegidos = sorted(candidatos, key=lambda l: (-conteo.get(l.slug, 0), orden[l.slug]))[:3]
        parrafos = [elegir([f'Como te gusta {" y ".join(nombres)}, esto es lo que te propongo:',
                            f'Pensando en {" y ".join(nombres)}, te recomiendo empezar por aquí:'])]
        if any(g in ('familia', 'ninos', 'tranquilo') for g in gustos):
            parrafos.append(NOTA_FAMILIA)
        parrafos += [f'{l.nombre}: {l.resumen}' for l in elegidos]
        citas = [self._cita(e) for e in self._experiencias_de({l.slug for l in elegidos})][:2]
        if citas:
            parrafos.append('Esto contaron viajeros que ya fueron:')
        parrafos.append('¿Quieres que te cuente cómo llegar a alguno?')
        return Respuesta(parrafos, lugares=[{'slug': l.slug, 'nombre': l.nombre} for l in elegidos],
                         fuentes=[{'nombre': 'Catálogo de LlegueYa', 'url': '#/explorar'}],
                         experiencias=citas,
                         sugerencias=[f'¿Cómo llego a {elegidos[0].nombre}?', '¿Qué fiestas se vienen?'])

    def _sobre_lugares(self, lugares, temas, autenticado, elegir):
        principal = lugares[0]
        parrafos = [elegir([f'¡{principal.nombre}! Buena elección.',
                            f'Te cuento lo que tenemos sobre {principal.nombre}.',
                            f'Sobre {principal.nombre}, esto es lo que hay publicado en LlegueYa.']),
                    principal.resumen]
        requiere = False
        if autenticado:
            if 'llegar' in temas and principal.como_llegar:
                parrafos.append('Para llegar: ' + principal.como_llegar)
            elif principal.recomendaciones:
                parrafos.append('Un consejo: ' + principal.recomendaciones[0][0].lower() + principal.recomendaciones[0][1:])
        else:
            requiere = True
            parrafos.append('Si inicias sesión con Google te cuento cómo llegar y los consejos completos.')
        otros = lugares[1:]
        if otros:
            parrafos.append('También te puede interesar: ' + ', '.join(o.nombre for o in otros) + '.')
        citas = [self._cita(e) for e in self._experiencias_de({principal.slug})][:2]
        if citas:
            parrafos.append('Esto contaron viajeros que ya fueron:')
        extra = False
        if 'altura' in temas and principal.altitud_m:
            parrafos.append(f'Está a unos {principal.altitud_m} m de altura; tómalo con calma el primer día.')
        elif 'clima' in temas:
            parrafos.append(EXTRAS['clima'])
            extra = True
        return Respuesta(parrafos,
                         lugares=[{'slug': l.slug, 'nombre': l.nombre} for l in lugares],
                         fuentes=[{'nombre': principal.fuente, 'url': principal.fuente_url}] if principal.fuente_url else [],
                         dato_general=extra, requiere_sesion=requiere, experiencias=citas,
                         sugerencias=[f'¿Cómo llego a {principal.nombre}?', '¿Qué fiestas se vienen?'])

    def _armar_viaje(self, texto, gustos, elegir):
        m = re.search(r'\b(\d+|un|una|uno|dos|tres|cuatro|cinco)\s+dias?\b', texto)
        dias = 2
        if m:
            dias = int(m.group(1)) if m.group(1).isdigit() else DIAS_EN_TEXTO[m.group(1)]
        dias = max(1, min(dias, 5))
        lugares = list(self.lugares())
        if not lugares:
            return Respuesta(['Todavía no hay lugares publicados para armarte un plan.'], sugerencias=self._sugerencias())
        # Un destino por día, empezando por Huamanga (base del viaje). Si hay gustos,
        # primero los destinos que tienen lugares que encajan; los que más experiencias tienen, antes.
        conteo = {}
        for e in self.experiencias():
            conteo[e.lugar_slug] = conteo.get(e.lugar_slug, 0) + 1
        destinos = {}
        for i, l in enumerate(lugares):
            destinos.setdefault(l.destino, []).append(l)
        def peso(nombre):
            ls = destinos[nombre]
            afinidad = sum(1 for l in ls for g in gustos if GUSTOS[g][1](l))
            return (nombre != 'Huamanga', -afinidad, -sum(conteo.get(l.slug, 0) for l in ls), -len(ls))
        orden = sorted(destinos, key=peso)
        plan = []
        for n in range(dias):
            if n < len(orden):
                nombre = orden[n]
                ls = sorted(destinos[nombre], key=lambda l: -conteo.get(l.slug, 0))[:3]
                titulo = f'{nombre}: ' + ('la ciudad a pie' if nombre == 'Huamanga' else 'salida de día completo')
                plan.append({'numero': n + 1, 'titulo': titulo, 'destino': nombre,
                             'lugares': [{'slug': l.slug, 'nombre': l.nombre, 'resumen': l.resumen} for l in ls]})
            else:
                plan.append({'numero': n + 1, 'titulo': 'Día libre', 'destino': None, 'lugares': [],
                             'nota': 'Vuelve a tus lugares favoritos o revisa el calendario por si hay alguna fiesta.'})
        gusto = ' y '.join(dict.fromkeys(GUSTOS[g][0] for g in gustos)) if gustos else None
        parrafos = [elegir([f'Te propongo este plan de {dias} {"día" if dias == 1 else "días"}' + (f', pensando en {gusto}.' if gusto else '.'),
                            f'Aquí tienes un plan de {dias} {"día" if dias == 1 else "días"}' + (f' para quien disfruta {gusto}.' if gusto else '.')]),
                    'Lo armé solo con lugares publicados en LlegueYa. Tú decides: acéptalo y quedará en Mi espacio, o pídeme otro.']
        if len(orden) < dias:
            parrafos.append('Todavía no hay suficientes destinos publicados para llenar todos los días, por eso dejé días libres.')
        citas = [self._cita(e) for e in self._experiencias_de({l['slug'] for d in plan for l in d['lugares']})][:2]
        if citas:
            parrafos.append('Esto contaron viajeros que ya fueron:')
        return Respuesta(parrafos, plan={'titulo': f'Ayacucho en {dias} {"día" if dias == 1 else "días"}', 'dias': plan},
                         experiencias=citas, fuentes=[{'nombre': 'Catálogo de LlegueYa', 'url': '#/explorar'}],
                         sugerencias=['Arma otro plan de 3 días', 'Me gusta la naturaleza', '¿Qué fiestas se vienen?'])

    def _eventos(self, texto, elegir):
        eventos = list(self.eventos())
        filtrados = [e for e in eventos if any(raiz(w) in normalizar(e.titulo + ' ' + e.lugar_texto)
                                               for w in palabras(texto) if w not in ('fiesta', 'fiestas', 'evento', 'eventos'))]
        lista = (filtrados or eventos)[:3]
        if not lista:
            return Respuesta(['Por ahora no hay eventos publicados en el calendario.'], sugerencias=self._sugerencias())
        meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
                 'octubre', 'noviembre', 'diciembre']
        lineas = []
        for e in lista:
            if e.fin == e.inicio:
                fecha = f'{e.inicio.day} de {meses[e.inicio.month - 1]}'
            elif e.fin.month == e.inicio.month:
                fecha = f'{e.inicio.day} al {e.fin.day} de {meses[e.inicio.month - 1]}'
            else:
                fecha = f'{e.inicio.day} de {meses[e.inicio.month - 1]} al {e.fin.day} de {meses[e.fin.month - 1]}'
            lineas.append(f'{e.titulo}: {fecha} de {e.inicio.year}, en {e.lugar_texto}.')
        parrafos = [elegir(['Esto se viene en Ayacucho:', 'Anota estas fechas:', 'Mira lo que hay en el calendario:'])] + lineas
        if any(e.fecha_referencial for e in lista):
            parrafos.append('Son fechas tradicionales; confírmalas con el organizador antes de viajar.')
        return Respuesta(parrafos,
                         eventos=[{'id': e.id, 'titulo': e.titulo, 'inicio': e.inicio.isoformat()} for e in lista],
                         fuentes=[{'nombre': lista[0].fuente, 'url': lista[0].fuente_url}],
                         sugerencias=['¿Cómo llego a la Pampa de Ayacucho?', 'Quiero ver ruinas'])
