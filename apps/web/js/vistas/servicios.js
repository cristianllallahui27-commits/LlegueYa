// Servicios y artesanía: negocios turísticos verificados por LlegueYa, con su ubicación
// en el mapa y lo que ofrecen. El mapa muestra negocios, nunca la ubicación del viajero.
import { api } from '../api.js';
import { error, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { estado, pedirAcceso } from '../estado.js';
import { enlaceComoLlegar, precioSoles } from '../util.js';
import { crearMapa, marcarNegocio } from './mapa.js';

const ORDEN = ['artesania', 'operador', 'transporte', 'hospedaje', 'restaurante', 'otro'];

function precio(o) {
  return o.precio_desde === null ? 'Consultar' : `desde ${precioSoles(o.precio_desde)}`;
}

function contacto(n) {
  if (n.requiere_sesion) {
    return el('button', { class: 'boton boton-texto', type: 'button', onclick: () => pedirAcceso('Inicia sesión para ver el contacto de los negocios.') },
      icono('candado'), 'Inicia sesión para ver el contacto');
  }
  return el('p', { class: 'negocio-contacto' }, el('strong', {}, 'Contacto: '), n.contacto,
    n.enlace ? [' · ', el('a', { href: n.enlace, target: '_blank', rel: 'noopener noreferrer' }, 'Página del negocio')] : null);
}

export function fichaNegocio(n, alUbicar) {
  return el('article', { class: 'tarjeta negocio', id: `negocio-${n.id}` },
    el('header', { class: 'negocio-cabecera' },
      el('span', { class: 'negocio-icono', 'aria-hidden': 'true' }, icono('tienda')),
      el('div', { class: 'crece' }, el('h2', {}, n.negocio),
        el('span', { class: 'post-meta' }, n.rubro_nombre, n.direccion ? ` · ${n.direccion}` : '')),
      el('span', { class: 'etiqueta-estado verificado', title: 'LlegueYa revisó sus requisitos' }, icono('escudo'), 'Verificado')),
    el('p', {}, n.descripcion),
    n.ofertas.length ? el('ul', { class: 'ofertas' }, n.ofertas.map(o => el('li', {},
      el('span', {}, el('strong', {}, o.nombre), o.detalle ? el('small', {}, o.detalle) : null),
      el('span', { class: 'oferta-precio' }, precio(o))))) : null,
    el('div', { class: 'negocio-pie' }, contacto(n),
      n.lat !== null && alUbicar ? el('button', { class: 'boton boton-borde', type: 'button', onclick: () => alUbicar(n) }, icono('pin'), 'Ver en el mapa') : null,
      n.lat !== null ? el('a', { class: 'boton boton-texto', href: enlaceComoLlegar(n.lat, n.lon), target: '_blank', rel: 'noopener noreferrer' }, 'Cómo llegar') : null,
      n.lugar_slug ? el('a', { class: 'boton boton-texto', href: `#/lugar/${n.lugar_slug}` }, 'Lugar cercano') : null));
}

export async function render(vista, ruta) {
  let rubros = [];
  try { rubros = (await api.rubros()).rubros; } catch { /* filtros mínimos */ }
  const actual = rubros.some(r => r.id === ruta.filtros.rubro) ? ruta.filtros.rubro : '';
  rubros.sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id));

  const nodoMapa = el('div', { class: 'mapa-servicios', role: 'region', 'aria-label': 'Mapa de negocios' });
  const lista = el('div', { class: 'lista-negocios' }, el('p', { class: 'cargando' }, 'Cargando negocios…'));
  vaciar(vista, el('section', { class: 'ancho' },
    el('h1', { class: 'titulo-vista' }, 'Servicios y artesanía'),
    el('p', { class: 'bajada' }, 'Talleres de retablos, tejidos y piedra de Huamanga, movilidad, agencias, hospedajes y restaurantes. Solo aparecen negocios que el equipo de LlegueYa verificó.'),
    el('nav', { class: 'chips', 'aria-label': 'Filtrar por rubro' },
      el('a', { class: 'chip', href: '#/servicios', 'aria-current': actual ? null : 'page' }, 'Todos'),
      rubros.map(r => el('a', { class: 'chip', href: `#/servicios?rubro=${r.id}`, 'aria-current': r.id === actual ? 'page' : null }, r.nombre))),
    el('div', { class: 'servicios-cuerpo' }, nodoMapa, lista),
    el('aside', { class: 'tarjeta invitacion-negocio' },
      el('div', {}, el('strong', {}, '¿Tienes un taller o un negocio turístico?'),
        el('p', { class: 'nota' }, 'Regístralo con su ubicación y lo que ofreces. Lo verificamos y aparece aquí.')),
      el('a', { class: 'boton boton-secundario', href: '#/mi-espacio?pestana=negocio',
        onclick: ev => { if (!estado.usuario) { ev.preventDefault(); pedirAcceso('Inicia sesión para registrar tu negocio.'); } } }, 'Registrar mi negocio'))));

  let items;
  try { items = (await api.directorio(actual)).items; }
  catch (e) { vaciar(lista, error(e.message, () => render(vista, ruta))); nodoMapa.remove(); return; }

  const conUbicacion = items.filter(n => n.lat !== null && n.lon !== null);
  const mapa = conUbicacion.length ? crearMapa(nodoMapa, [-13.16, -74.22], 13) : null;
  if (!mapa) nodoMapa.hidden = true;
  const marcadores = new Map();
  const verFicha = n => document.getElementById(`negocio-${n.id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
  for (const n of conUbicacion) {
    if (!mapa) break;
    marcadores.set(n.id, marcarNegocio(mapa, n, verFicha));
  }
  if (mapa) {
    if (conUbicacion.length > 1) mapa.fitBounds(conUbicacion.map(n => [n.lat, n.lon]), { padding: [30, 30], maxZoom: 15 });
    else mapa.setView([conUbicacion[0].lat, conUbicacion[0].lon], 15);
  }
  const ubicar = n => {
    nodoMapa.scrollIntoView({ behavior: 'smooth', block: 'center' });
    mapa.setView([n.lat, n.lon], 16);
    marcadores.get(n.id).openPopup();
  };
  vaciar(lista, items.length ? items.map(n => fichaNegocio(n, mapa ? ubicar : null))
    : vacio(actual ? 'Aún no hay negocios en este rubro' : 'Aún no hay negocios verificados',
      'Cuando el equipo apruebe un negocio, aparecerá aquí con su ubicación.'));
}
