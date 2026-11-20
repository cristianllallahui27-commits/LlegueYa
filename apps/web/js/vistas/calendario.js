import { api } from '../api.js';
import { error, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { conSesion } from '../estado.js';
import { agruparPorMes, partesFecha, rangoFechas } from '../util.js';

export function tarjetaEvento(e) {
  const p = partesFecha(e.inicio);
  const recordar = el('button', { class: 'boton boton-borde', type: 'button', 'aria-pressed': String(e.suscrito) },
    icono('campana'), e.suscrito ? 'Te avisaremos' : 'Avísame');
  recordar.addEventListener('click', conSesion('Inicia sesión para recibir avisos de este evento.', async () => {
    const activa = recordar.getAttribute('aria-pressed') !== 'true';
    try {
      await api.suscribir(e.id, activa);
      recordar.setAttribute('aria-pressed', String(activa));
      recordar.lastChild.textContent = activa ? 'Te avisaremos' : 'Avísame';
      avisar(activa ? 'Te avisaremos en tu bandeja' : 'Aviso desactivado');
    } catch (err) { avisar(err.message); }
  }));
  return el('article', { class: 'evento tarjeta' },
    el('div', { class: 'evento-fecha', 'aria-hidden': 'true' }, el('b', {}, p.dia), el('span', {}, p.mesCorto)),
    el('div', {},
      el('h3', {}, e.titulo),
      el('p', {}, rangoFechas(e.inicio, e.fin), ' · ', e.lugar_slug ? el('a', { href: `#/lugar/${e.lugar_slug}` }, e.lugar) : e.lugar),
      el('p', {}, e.descripcion),
      el('div', { class: 'post-pie' },
        e.fecha_referencial ? el('span', { class: 'etiqueta-estado revision', title: 'Fecha tradicional; confírmala con el organizador' }, 'Fecha referencial') : null,
        e.estado === 'cancelado' ? el('span', { class: 'etiqueta-estado demo' }, 'Cancelado') : null,
        el('a', { class: 'nota', href: e.fuente_url, target: '_blank', rel: 'noopener' }, `Fuente: ${e.fuente}`)),
      el('p', {}, recordar)));
}

export async function render(vista) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Cargando calendario…'));
  try {
    const { items } = await api.eventos();
    const contenido = items.length ? agruparPorMes(items).map(g =>
      [el('h2', { class: 'mes' }, g.mes), ...g.eventos.map(tarjetaEvento)]) :
      [vacio('No hay eventos próximos', 'Cuando se publiquen fiestas y actividades, aparecerán aquí.')];
    vaciar(vista, el('section', {},
      el('h1', { class: 'titulo-vista' }, 'Calendario de fiestas'),
      el('p', { class: 'bajada' }, 'Fiestas y fechas importantes de Ayacucho. LlegueYa no vende entradas: te orientamos para que llegues a tiempo.'),
      el('div', { class: 'eventos' }, contenido)));
  } catch (e) { vaciar(vista, error(e.message, () => render(vista))); }
}
