// Mapa de LlegueYa: capas tipo Google Maps (callejero, satélite con calles, relieve),
// pines por tipo de lugar y «Cómo llegar». Sin geolocalización: nunca mostramos al usuario (SDD RF63).
import { api } from '../api.js';
import { error, foto } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { enlaceComoLlegar, etiquetaTipo } from '../util.js';

const CENTRO = [-13.25, -74.15];
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

// Cada capa con su atribución obligatoria. Todas son de uso libre para proyectos no comerciales.
function capasBase(L) {
  const callejero = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 20,
    attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
  });
  const satelite = L.layerGroup([
    L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics',
    }),
    // Encima de la foto satelital: carreteras y nombres de lugares, como el modo «Satélite» de Google.
    L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19 }),
  ]);
  const relieve = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    subdomains: 'abc', maxZoom: 17,
    attribution: '© OpenStreetMap · © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  });
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  return { 'Mapa': callejero, 'Satélite': satelite, 'Relieve': relieve, 'OpenStreetMap': osm };
}

export function crearMapa(nodo, centro = CENTRO, zoom = 9, { capas = true } = {}) {
  const L = window.L;
  if (!L) return null;
  const mapa = L.map(nodo, { scrollWheelZoom: false, zoomControl: true }).setView(centro, zoom);
  const base = capasBase(L);
  base['Mapa'].addTo(mapa);
  // Si el callejero no responde (red bloqueada), pasamos solos a OpenStreetMap.
  let fallos = 0;
  base['Mapa'].on('tileerror', () => {
    if (++fallos === 4 && mapa.hasLayer(base['Mapa'])) { mapa.removeLayer(base['Mapa']); base['OpenStreetMap'].addTo(mapa); }
  });
  if (capas) mapa.control = L.control.layers(base, {}, { position: 'topright', collapsed: true }).addTo(mapa);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapa);
  // La rueda del ratón solo hace zoom después de hacer clic en el mapa (no secuestra el scroll de la página).
  mapa.on('click', () => mapa.scrollWheelZoom.enable());
  mapa.on('mouseout', () => mapa.scrollWheelZoom.disable());
  return mapa;
}

// Pin con el color del tipo de lugar (o de servicio), dibujado en SVG.
export function pin(clase) {
  return window.L.divIcon({
    className: `pin pin-${clase}`, iconSize: [30, 40], iconAnchor: [15, 39], popupAnchor: [0, -34],
    html: '<svg viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39C15 39 2 23.5 2 14a13 13 0 0 1 26 0c0 9.5-13 25-13 25z"/><circle cx="15" cy="14" r="5.2"/></svg>',
  });
}

function botonesRuta(lat, lon) {
  return el('div', { class: 'popup-acciones' },
    el('a', { href: enlaceComoLlegar(lat, lon), target: '_blank', rel: 'noopener noreferrer' }, icono('flecha', 'ico ico-giro'), 'Cómo llegar'));
}

export function marcar(mapa, m) {
  const contenido = el('div', { class: 'popup-lugar' },
    m.portada ? foto(m.portada, m.tipo, { alt: '', ancho: 400 }) : null,
    el('span', { class: `popup-tipo tipo-${m.tipo}` }, etiquetaTipo(m.tipo)),
    el('strong', {}, m.nombre), m.zona ? el('span', {}, m.zona) : null,
    m.slug ? el('a', { href: `#/lugar/${m.slug}` }, 'Ver ficha') : null,
    botonesRuta(m.lat, m.lon));
  return window.L.marker([m.lat, m.lon], { title: m.nombre, alt: m.nombre, icon: pin(m.tipo) }).addTo(mapa).bindPopup(contenido);
}

export function marcarNegocio(mapa, n, alVerFicha) {
  const contenido = el('div', { class: 'popup-lugar' },
    el('span', { class: 'popup-tipo tipo-servicio' }, n.rubro_nombre),
    el('strong', {}, n.negocio), n.direccion ? el('span', {}, n.direccion) : null,
    alVerFicha ? el('a', { href: '#/servicios', onclick: ev => { ev.preventDefault(); alVerFicha(n); } }, 'Ver ficha')
      : el('a', { href: `#/servicios?rubro=${n.rubro}` }, 'Ver en Servicios'),
    botonesRuta(n.lat, n.lon));
  return window.L.marker([n.lat, n.lon], { title: n.negocio, alt: n.negocio, icon: pin('servicio') }).addTo(mapa).bindPopup(contenido);
}

// Selector de ubicación para formularios: se marca un punto tocando el mapa (no se usa el GPS).
export function selectorUbicacion({ lat = null, lon = null, centro = [-13.1588, -74.2239], ayuda = 'Toca el mapa donde está el lugar. Puedes arrastrar el pin.' } = {}) {
  const inLat = el('input', { type: 'hidden', name: 'lat' });
  const inLon = el('input', { type: 'hidden', name: 'lon' });
  const nota = el('p', { class: 'nota' }, ayuda);
  const nodo = el('div', { class: 'mapa-selector', role: 'application', 'aria-label': 'Mapa para marcar la ubicación' });
  const quitar = el('button', { class: 'boton boton-texto', type: 'button', hidden: true }, 'Quitar ubicación');
  let mapa = null, marca = null;
  const poner = ({ lat: a, lng: b }) => {
    inLat.value = a.toFixed(6); inLon.value = b.toFixed(6);
    if (marca) marca.setLatLng([a, b]);
    else marca = window.L.marker([a, b], { draggable: true, title: 'Ubicación elegida', icon: pin('elegido') }).addTo(mapa).on('dragend', ev => poner(ev.target.getLatLng()));
    nota.textContent = `Ubicación marcada: ${inLat.value}, ${inLon.value}`;
    quitar.hidden = false;
  };
  quitar.addEventListener('click', () => {
    if (marca) { marca.remove(); marca = null; }
    inLat.value = ''; inLon.value = ''; quitar.hidden = true; nota.textContent = ayuda;
  });
  // Leaflet necesita el nodo ya en el documento para medirlo.
  requestAnimationFrame(() => {
    mapa = crearMapa(nodo, lat !== null ? [lat, lon] : centro, lat !== null ? 15 : 14);
    if (!mapa) { nodo.replaceWith(el('p', { class: 'nota' }, 'El mapa no cargó; puedes guardar sin ubicación.')); return; }
    mapa.scrollWheelZoom.enable();
    mapa.on('click', ev => poner(ev.latlng));
    if (lat !== null) poner({ lat, lng: lon });
  });
  return [nodo, nota, quitar, inLat, inLon];
}

function leyenda() {
  const tipos = ['arqueologico', 'natural', 'cultural', 'aventura', 'servicio'];
  return el('ul', { class: 'leyenda-mapa', 'aria-label': 'Leyenda' }, tipos.map(t =>
    el('li', {}, el('span', { class: `punto tipo-${t}`, 'aria-hidden': 'true' }), t === 'servicio' ? 'Servicios y artesanía' : etiquetaTipo(t))));
}

export async function render(vista) {
  const nodoMapa = el('div', { class: 'mapa-grande', role: 'region', 'aria-label': 'Mapa de lugares' });
  const lista = el('ul', { class: 'lista-mapa' });
  vaciar(vista, el('section', { class: 'ancho' },
    el('h1', { class: 'titulo-vista' }, 'Mapa de Ayacucho'),
    el('p', { class: 'bajada' }, 'Cambia entre Mapa, Satélite y Relieve con el botón de capas. Toca un pin para ver la ficha o abrir la ruta en Google Maps. No pedimos tu ubicación.'),
    nodoMapa, leyenda(), el('h2', { class: 'titulo-bloque' }, 'Los mismos lugares en lista'), lista));
  try {
    const [{ marcadores }, negocios] = await Promise.all([api.mapa(), api.directorio().catch(() => ({ items: [] }))]);
    const mapa = crearMapa(nodoMapa);
    if (!mapa) nodoMapa.replaceWith(error('El mapa no pudo cargarse. Usa la lista de abajo.'));
    const puntos = [];
    if (mapa) {
      const capaLugares = window.L.layerGroup().addTo(mapa);
      const capaServicios = window.L.layerGroup().addTo(mapa);
      for (const m of marcadores) { marcar(capaLugares, m); puntos.push([m.lat, m.lon]); }
      for (const n of negocios.items.filter(x => x.lat !== null)) marcarNegocio(capaServicios, n);
      mapa.control.addOverlay(capaLugares, 'Lugares turísticos');
      mapa.control.addOverlay(capaServicios, 'Servicios y artesanía');
      if (puntos.length) mapa.fitBounds(puntos, { padding: [30, 30] });
    }
    for (const m of marcadores) {
      lista.append(el('li', {}, el('a', { href: `#/lugar/${m.slug}` }, foto(m.portada, m.tipo, { alt: '', ancho: 160 }),
        el('span', {}, el('strong', {}, m.nombre), el('br'), m.zona))));
    }
  } catch (e) { vaciar(lista, error(e.message, () => render(vista))); }
}
