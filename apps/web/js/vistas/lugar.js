import { api } from '../api.js';
import { error, galeria, postViajero, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { conSesion, estado, pedirAcceso } from '../estado.js';
import { enlaceComoLlegar, etiquetaTipo } from '../util.js';
import { crearMapa, marcar } from './mapa.js';

export async function render(vista, ruta, ctx) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Abriendo la ficha…'));
  let l, muro;
  try {
    [l, muro] = await Promise.all([api.lugar(ruta.parametro), api.muro({ lugar: ruta.parametro, limite: 10 })]);
  } catch (e) {
    vaciar(vista, e.estado === 404
      ? vacio('Este lugar no está disponible', 'Puede que se haya retirado del catálogo.', el('a', { class: 'boton boton-secundario', href: '#/explorar' }, 'Explorar otros lugares'))
      : error(e.message, () => render(vista, ruta, ctx)));
    return;
  }
  const fotos = l.fotos || (l.portada ? [l.portada] : []);
  const guardado = ctx.favoritos.has(l.slug);
  const guardar = el('button', { class: 'boton boton-secundario', type: 'button', 'aria-pressed': String(guardado) },
    icono('guardar'), guardado ? 'Guardado' : 'Guardar lugar');
  guardar.addEventListener('click', conSesion('Inicia sesión para guardar lugares.', async () => {
    const activo = guardar.getAttribute('aria-pressed') !== 'true';
    try {
      await api.favorito(l.slug, activo);
      activo ? ctx.favoritos.add(l.slug) : ctx.favoritos.delete(l.slug);
      guardar.setAttribute('aria-pressed', String(activo));
      guardar.lastChild.textContent = activo ? 'Guardado' : 'Guardar lugar';
    } catch (e) { avisar(e.message); }
  }));

  const detalle = l.requiere_sesion
    ? el('section', { class: 'bloqueo' }, icono('candado'),
        el('div', {}, el('h2', {}, 'Cómo llegar y consejos de viaje'),
          el('p', {}, 'Inicia sesión para ver la ficha completa, la galería y las recomendaciones para visitar este lugar.'),
          el('button', { class: 'boton boton-principal', type: 'button', onclick: () => pedirAcceso('Inicia sesión para ver la ficha completa de este lugar.') }, 'Iniciar sesión')))
    : [
        el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Sobre este lugar'), el('p', {}, l.descripcion)),
        l.como_llegar ? el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Cómo llegar'), el('p', {}, l.como_llegar)) : null,
        l.recomendaciones && l.recomendaciones.length ? el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Consejos'),
          el('ul', { class: 'consejos' }, l.recomendaciones.map(r => el('li', {}, r)))) : null,
      ];

  const mapa = l.lat !== null ? el('div', { class: 'miniatura-mapa', role: 'region', 'aria-label': `Ubicación de ${l.nombre}` }) : null;
  const creditos = fotos.filter(Boolean).length ? el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Fotos y fuentes'),
    el('ul', { class: 'creditos' },
      fotos.filter(Boolean).map(f => el('li', {}, el('a', { href: f.fuente_url, target: '_blank', rel: 'noopener' }, f.descripcion || 'Foto'), ` — ${f.autor}, ${f.licencia}`)),
      l.fuente_url ? el('li', {}, 'Información: ', el('a', { href: l.fuente_url, target: '_blank', rel: 'noopener' }, l.fuente),
        l.revisado_en ? ` (revisado el ${new Date(l.revisado_en + 'T12:00').toLocaleDateString('es-PE')})` : '') : null)) : null;

  const experiencias = el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Experiencias de viajeros'),
    muro.items.length
      ? el('div', { class: 'muro' }, muro.items.map(p => postViajero(p, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares })))
      : vacio('Aún nadie compartió su visita', '¿Ya estuviste aquí? Cuéntale a la comunidad cómo te fue.',
          el('button', { class: 'boton boton-principal', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('ly:crear', { detail: { lugar: l.slug } })) }, 'Compartir mi experiencia')));

  vaciar(vista, el('article', {},
    el('a', { class: 'volver', href: '#/explorar' }, icono('flecha'), 'Explorar'),
    galeria(fotos, l.tipo, l.nombre, 'ficha-portada'),
    el('div', { class: 'post-pie' }, el('span', { class: 'etiqueta-estado' }, etiquetaTipo(l.tipo)),
      l.demostracion ? el('span', { class: 'etiqueta-estado demo' }, 'Datos de demostración') : null),
    el('h1', { class: 'ficha-titulo' }, l.nombre),
    el('div', { class: 'ficha-datos' },
      el('span', {}, icono('pin'), l.zona),
      l.altitud_m ? el('span', {}, `${l.altitud_m.toLocaleString('es-PE')} m s. n. m.`) : null,
      l.fotos_total ? el('span', {}, `${l.fotos_total} ${l.fotos_total === 1 ? 'foto' : 'fotos'}`) : null),
    el('p', { class: 'bajada' }, l.resumen),
    el('div', { class: 'ficha-acciones' }, guardar,
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: `¿Cómo llego a ${l.nombre}?` })) },
        icono('chat'), 'Preguntar a Willaq Uma'),
      l.lat !== null && l.lat !== undefined ? el('a', { class: 'boton boton-borde', href: enlaceComoLlegar(l.lat, l.lon), target: '_blank', rel: 'noopener noreferrer' },
        icono('pin'), 'Cómo llegar (Google Maps)') : null),
    detalle, mapa, creditos, experiencias));

  if (mapa) {
    const m = crearMapa(mapa, [l.lat, l.lon], 14);
    if (m) marcar(m, { ...l, portada: null }).openPopup();
  }
  if (!estado.usuario) return;
}
