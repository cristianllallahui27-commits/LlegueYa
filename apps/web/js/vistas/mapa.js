// Mapa de LlegueYa: capas tipo Google Maps, pines por tipo de lugar, «Cómo llegar»,
// y «Mi ubicación» opcional (solo si la persona la pulsa; nunca se envía a nuestro servidor).
import { api } from '../api.js';
import { error, foto } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { enlaceComoLlegar, etiquetaTipo } from '../util.js';
import { ubicacion, ubicacionVigente } from '../ubicacion.js';

const CENTRO = [-13.25, -74.15];
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

// Cada capa con su atribución obligatoria. Todas son de uso libre para proyectos no comerciales.
function capasBase(L) {
  // CARTO exige clave desde 2026 (mostraba «API KEY REQUIRED»); el callejero base es OpenStreetMap, gratuito y sin clave.
  const callejero = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
  const calles = L.tileLayer(`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom: 19, attribution: 'Mapa © Esri, HERE, Garmin, OpenStreetMap',
  });
  return { 'Mapa': callejero, 'Calles (Esri)': calles, 'Satélite': satelite, 'Relieve': relieve };
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
    if (++fallos === 4 && mapa.hasLayer(base['Mapa'])) { mapa.removeLayer(base['Mapa']); base['Calles (Esri)'].addTo(mapa); }
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

function botonesRuta(lat, lon, nombre = '') {
  return el('div', { class: 'popup-acciones' },
    el('a', { href: enlaceComoLlegar(lat, lon, nombre), target: '_blank', rel: 'noopener noreferrer' }, icono('flecha', 'ico ico-giro'), 'Cómo llegar'));
}

export function marcar(mapa, m) {
  const contenido = el('div', { class: 'popup-lugar' },
    m.portada ? foto(m.portada, m.tipo, { alt: '', ancho: 400 }) : null,
    el('span', { class: `popup-tipo tipo-${m.tipo}` }, etiquetaTipo(m.tipo)),
    el('strong', {}, m.nombre), m.zona ? el('span', {}, m.zona) : null,
    m.slug ? el('a', { href: `#/lugar/${m.slug}` }, 'Ver ficha') : null,
    botonesRuta(m.lat, m.lon, m.nombre));
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
  const tipos = ['arqueologico', 'natural', 'cultural', 'aventura', 'servicio', 'terminal'];
  const nombre = { servicio: 'Servicios y artesanía', terminal: 'Terminales de autos y buses' };
  return el('ul', { class: 'leyenda-mapa', 'aria-label': 'Leyenda' }, tipos.map(t =>
    el('li', {}, el('span', { class: `punto tipo-${t}`, 'aria-hidden': 'true' }), nombre[t] || etiquetaTipo(t))));
}

const fmtDist = m => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
const fmtTiempo = s => s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`;
function enLinea(a, b) { // distancia en línea recta (haversine), respaldo si no hay servicio de rutas
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

// Control de ubicación: GPS opcional con círculo de precisión, o punto manual / sitio buscado.
function controlUbicacion(mapa, marcadores, estado) {
  const L = window.L;
  const aviso = el('p', { class: 'nota', role: 'status' }, 'Pulsa «Mi ubicación»: tu dispositivo te pedirá permiso y, si aceptas, usaremos tu posición real para calcular rutas y distancias. Tu posición se queda en tu navegador; nunca la enviamos a nuestro servidor.');
  const btnGps = el('button', { class: 'boton', type: 'button' }, icono('pin', 'ico'), 'Mi ubicación');
  const btnQuitar = el('button', { class: 'boton boton-texto', type: 'button', hidden: true }, 'Quitar mi punto');
  const entrada = el('input', { type: 'search', placeholder: 'Buscar sitio de referencia (plaza, hotel, terminal…)', 'aria-label': 'Buscar sitio de referencia', maxlength: '80' });
  const sugerencias = el('ul', { class: 'sugerencias', hidden: true });
  let punto = null, circulo = null, idVigilancia = null, chkManual = null;

  const fijar = (lat, lon, precision, texto, gps = false) => {
    estado.origen = [lat, lon];
    estado.origenGps = gps;
    if (!punto) punto = L.marker([lat, lon], { title: 'Mi punto', icon: L.divIcon({ className: 'mi-punto', iconSize: [18, 18], html: '<span></span>' }) }).addTo(mapa);
    else punto.setLatLng([lat, lon]);
    if (circulo) { circulo.remove(); circulo = null; }
    if (precision) circulo = L.circle([lat, lon], { radius: precision, className: 'circulo-precision', weight: 1 }).addTo(mapa);
    btnQuitar.hidden = false;
    aviso.textContent = texto;
    estado.alCambiar?.();
  };
  const detener = () => { if (idVigilancia !== null) navigator.geolocation.clearWatch(idVigilancia); idVigilancia = null; };
  // Si el GPS no se puede usar, pasamos solos al modo «tocar el mapa» para que la persona no se quede sin opción.
  const alternativa = texto => {
    estado.modoManual = true; chkManual.querySelector('input').checked = true; nodoMapaCursor(mapa, true);
    aviso.textContent = `${texto} Ya activé «Marcar mi punto tocando el mapa»: toca el mapa donde estás.`;
  };
  const buscarUbicacion = async (automatico = false) => {
    if (!navigator.geolocation) { if (!automatico) alternativa('Tu navegador no ofrece ubicación.'); return; }
    try {
      const permiso = await navigator.permissions?.query({ name: 'geolocation' });
      if (permiso && permiso.state === 'denied') {
        alternativa('El permiso de ubicación está bloqueado para este sitio. Para activarlo: toca el candado junto a la dirección → Ubicación → Permitir, y vuelve a pulsar «Mi ubicación».');
        return;
      }
    } catch { /* Permissions API no disponible: seguimos */ }
    detener(); aviso.textContent = automatico ? 'Buscando tu ubicación (ya diste permiso antes)…' : 'Buscando tu ubicación… elige «Permitir» cuando tu dispositivo o navegador te pregunte.';
    let primero = true, fallas = 0;
    const alError = err => {
      if (err.code === 1) alternativa('No diste permiso de ubicación.');
      else if (err.code === 3) alternativa('Tardó demasiado en encontrarte.');
      else alternativa('Tu dispositivo no pudo darnos la ubicación (en computadoras sin GPS suele pasar si la ubicación de Windows o macOS está apagada).');
    };
    const alPosicion = pos => {
      const { latitude: la, longitude: lo, accuracy } = pos.coords;
      if (estado.modoManual) { estado.modoManual = false; chkManual.querySelector('input').checked = false; nodoMapaCursor(mapa, false); }
      Object.assign(ubicacion, { posicion: [la, lo], precision: accuracy, hora: Date.now() });   // la usa también Terminales
      fijar(la, lo, accuracy, accuracy > 500
        ? `Ubicación aproximada (±${fmtDist(accuracy)}). En computadora suele ser imprecisa: toca el mapa para marcar tu punto exacto.`
        : `Ubicación con precisión de ±${fmtDist(accuracy)}.`, true);
      if (primero && !estado.enfoque) { primero = false; mapa.fitBounds(circulo ? circulo.getBounds() : [[la, lo]], { maxZoom: 16, padding: [30, 30] }); }
      if (accuracy <= 100) detener(); // ya es suficientemente precisa; ahorra batería
    };
    // Las laptops no tienen GPS: Windows ubica por Wi-Fi y puede tardar. Primero aceptamos una lectura
    // reciente o aproximada (rápida) y luego la afinamos; solo nos rendimos si fallan las dos.
    const fallo = err => {
      if (err.code === 1) { detener(); alError(err); return; }
      if (++fallas >= 2 && primero) { detener(); alError(err); }
    };
    navigator.geolocation.getCurrentPosition(alPosicion, fallo, { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 });
    idVigilancia = navigator.geolocation.watchPosition(alPosicion, fallo, { enableHighAccuracy: true, timeout: 45000, maximumAge: 30000 });
  };
  btnGps.addEventListener('click', () => buscarUbicacion(false));
  // Si la persona ya dio permiso en otra visita, mostramos su punto sin que tenga que volver a pulsar.
  navigator.permissions?.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted') buscarUbicacion(true); }).catch(() => {});
  btnQuitar.addEventListener('click', () => {
    detener(); punto?.remove(); punto = null; circulo?.remove(); circulo = null; estado.origen = null; btnQuitar.hidden = true;
    aviso.textContent = 'Quitaste tu punto.'; estado.alCambiar?.();
  });
  // Doble clic/toque largo no hace falta: un clic en una zona vacía del mapa marca el punto manual.
  mapa.on('click', ev => { if (estado.modoManual) { detener(); fijar(ev.latlng.lat, ev.latlng.lng, 0, 'Punto marcado a mano.'); } });
  chkManual = el('label', { class: 'check-manual' }, el('input', { type: 'checkbox', onchange: ev => { estado.modoManual = ev.target.checked; nodoMapaCursor(mapa, ev.target.checked); } }), ' Marcar mi punto tocando el mapa');
  // Antes de buscar un sitio, la ubicación actual debe estar activa: si no lo está, la volvemos a pedir.
  let ultimoPedido = 0;
  const exigirUbicacion = () => {
    if (estado.origenGps && ubicacionVigente()) return;
    if (Date.now() - ultimoPedido < 20000) return;      // no insistir en cada tecla
    ultimoPedido = Date.now();
    buscarUbicacion(false);
    aviso.textContent = 'Primero activa tu ubicación para saber desde dónde partes. Si tu navegador pregunta, elige «Permitir».';
    aviso.classList.add('aviso-importante');
    setTimeout(() => aviso.classList.remove('aviso-importante'), 6000);
  };
  entrada.addEventListener('focus', exigirUbicacion);
  let temporizador = null;
  entrada.addEventListener('input', () => {
    exigirUbicacion();
    clearTimeout(temporizador);
    const q = entrada.value.trim();
    if (q.length < 3) { sugerencias.hidden = true; return; }
    temporizador = setTimeout(async () => {
      try {
        const { items } = await api.geoBuscar(q);
        vaciar(sugerencias, items.length ? items.map(it => el('li', {}, el('button', { type: 'button', onclick: () => {
          detener(); fijar(it.lat, it.lon, 0, `Punto: ${it.nombre}.`); mapa.setView([it.lat, it.lon], 15); sugerencias.hidden = true; entrada.value = it.nombre;
        } }, el('strong', {}, it.nombre), it.detalle ? el('span', {}, ` ${it.detalle}`) : null))) : [el('li', { class: 'nota' }, 'Sin resultados.')]);
        sugerencias.hidden = false;
      } catch (e) { vaciar(sugerencias, [el('li', { class: 'nota' }, e.message)]); sugerencias.hidden = false; }
    }, 400);
  });
  return el('div', { class: 'barra-ubicacion' }, el('div', { class: 'barra-fila' }, btnGps, btnQuitar, chkManual),
    el('div', { class: 'buscador-sitio' }, entrada, sugerencias), aviso);
}
function nodoMapaCursor(mapa, activo) { mapa.getContainer().style.cursor = activo ? 'crosshair' : ''; }

// Etiqueta sobre el mapa: ícono + nombre (el nombre se inserta como texto, nunca como HTML).
function etiqueta(clase, iconoNombre, texto) {
  const nodo = el('span', { class: `pin-etiqueta ${clase}` }, icono(iconoNombre, 'ico'), el('span', { class: 'pin-etiqueta-texto' }, texto));
  return window.L.divIcon({ className: 'pin-etiqueta-caja', html: nodo, iconSize: null, iconAnchor: [14, 14] });
}

export async function render(vista, ruta = { filtros: {} }, ctx = {}) {
  const nodoMapa = el('div', { class: 'mapa-grande', role: 'region', 'aria-label': 'Mapa de lugares' });
  const tarjeta = el('aside', { class: 'mapa-tarjeta', hidden: true, 'aria-live': 'polite' });
  const pestanas = el('div', { class: 'mapa-pestanas', role: 'tablist', 'aria-label': 'Qué ver en el mapa' });
  const lienzo = el('div', { class: 'mapa-lienzo' }, nodoMapa, pestanas, tarjeta);
  const lista = el('ul', { class: 'lista-mapa' });
  const estado = { origen: null, origenGps: false, modoManual: false, alCambiar: null };
  const barra = el('div', { class: 'barra-slot' });
  const infoRuta = el('p', { class: 'info-ruta', role: 'status', hidden: true });
  vaciar(vista, el('section', { class: 'ancho' },
    el('h1', { class: 'titulo-vista' }, 'Mapa de Ayacucho'),
    el('p', { class: 'bajada' }, 'Elige qué ver: lugares, terminales o negocios. Toca una etiqueta para ver su ficha y cómo llegar. Tu ubicación es opcional y solo se usa en tu navegador.'),
    barra, infoRuta, lienzo, leyenda(), el('h2', { class: 'titulo-bloque' }, 'Los mismos lugares en lista'), lista));
  try {
    const [{ marcadores }, negocios, terminalesDatos] = await Promise.all([api.mapa(), api.directorio().catch(() => ({ items: [] })),
      api.terminales().catch(() => null)]);
    const mapa = crearMapa(nodoMapa);
    if (!mapa) { nodoMapa.replaceWith(error('El mapa no pudo cargarse. Usa la lista de abajo.')); }
    const distancias = () => estado.origen;
    const pintarLista = () => {
      vaciar(lista, [...marcadores].sort((a, b) => estado.origen ? enLinea(estado.origen, [a.lat, a.lon]) - enLinea(estado.origen, [b.lat, b.lon]) : 0).map(m =>
        el('li', {}, el('a', { href: `#/lugar/${m.slug}` }, foto(m.portada, m.tipo, { alt: '', ancho: 160 }),
          el('span', {}, el('strong', {}, m.nombre), el('br'), m.zona,
            estado.origen ? el('span', { class: 'dist-linea' }, ` · a ${fmtDist(enLinea(estado.origen, [m.lat, m.lon]))} en línea recta`) : null)))));
    };
    pintarLista();
    if (!mapa) { barra.remove(); return; }
    mapa.zoomControl.setPosition('bottomright');

    let trazo = null;
    const rutaDesdeAqui = async (lat, lon, modo) => {
      if (!estado.origen) { infoRuta.hidden = false; infoRuta.textContent = 'Para calcular la ruta necesito saber dónde estás: pulsa «Mi ubicación» y permite el acceso.'; return; }
      infoRuta.hidden = false; infoRuta.textContent = 'Calculando ruta…';
      trazo?.remove(); trazo = null;
      try {
        const r = await api.geoRuta(estado.origen, [lat, lon], modo);
        trazo = window.L.polyline(r.trazo, { className: 'trazo-ruta', weight: 5 }).addTo(mapa);
        mapa.fitBounds(trazo.getBounds(), { padding: [60, 60] });
        infoRuta.textContent = `${modo === 'foot' ? 'A pie' : 'En auto'}: ${fmtDist(r.distancia_m)} · ${fmtTiempo(r.duracion_s)} (referencial).`;
      } catch (e) { infoRuta.textContent = `${e.message} En línea recta estás a ${fmtDist(enLinea(estado.origen, [lat, lon]))}.`; }
    };
    // Distancia y tiempo a pie aproximados desde tu punto (solo si activaste tu ubicación).
    const cercania = (lat, lon) => {
      if (!distancias()) return null;
      const m = enLinea(estado.origen, [lat, lon]);
      return m <= 5000 ? `${fmtTiempo(m / 1.33)} a pie` : `a ${fmtDist(m)} en línea recta`;
    };
    const cerrar = el('button', { class: 'boton-icono mapa-tarjeta-cerrar', type: 'button', 'aria-label': 'Cerrar', onclick: () => { tarjeta.hidden = true; } }, icono('cerrar'));
    const mostrarTarjeta = ({ imagen, titulo, linea, extra, acciones }) => {
      vaciar(tarjeta, cerrar, imagen ? el('div', { class: 'mapa-tarjeta-foto' }, imagen) : null,
        el('div', { class: 'mapa-tarjeta-datos' }, el('h3', {}, titulo), linea ? el('p', { class: 'mapa-tarjeta-linea' }, linea) : null,
          extra || null, el('div', { class: 'mapa-tarjeta-acciones' }, acciones)));
      tarjeta.hidden = false;
    };

    // --- Lugares
    const capaLugares = window.L.layerGroup();
    const fichaLugar = m => {
      const cerca = cercania(m.lat, m.lon);
      const lejos = estado.origen && enLinea(estado.origen, [m.lat, m.lon]) > 5000;
      mostrarTarjeta({
        imagen: foto(m.portada, m.tipo, { alt: '', ancho: 400 }), titulo: m.nombre,
        linea: [cerca, m.zona].filter(Boolean).join(' · '),
        acciones: [el('a', { class: 'enlace-flecha', href: `#/lugar/${m.slug}` }, 'Abrir ficha ', icono('siguiente', 'ico ico-mini')),
          estado.origen ? el('button', { class: 'btn-ruta', type: 'button', onclick: () => rutaDesdeAqui(m.lat, m.lon, 'driving') }, 'Ruta en auto') : null,
          estado.origen && !lejos ? el('button', { class: 'btn-ruta', type: 'button', onclick: () => rutaDesdeAqui(m.lat, m.lon, 'foot') }, 'Ruta a pie') : null,
          el('a', { class: 'btn-ruta', href: enlaceComoLlegar(m.lat, m.lon, m.nombre), target: '_blank', rel: 'noopener noreferrer' }, 'Google Maps'),
          estado.origen ? null : el('span', { class: 'ruta-pista' }, 'Activa «Mi ubicación» para ver la ruta desde donde estás.')],
      });
    };
    const puntos = [];
    for (const m of marcadores) {
      puntos.push([m.lat, m.lon]);
      window.L.marker([m.lat, m.lon], { title: m.nombre, alt: m.nombre, icon: etiqueta(`tipo-${m.tipo}`, `tipo-${m.tipo in { arqueologico: 1, natural: 1, cultural: 1, gastronomia: 1, artesania: 1, camping: 1, aventura: 1 } ? m.tipo : 'otro'}`, m.nombre) })
        .on('click', () => fichaLugar(m)).addTo(capaLugares);
    }

    // --- Terminales
    const capaTerminales = window.L.layerGroup();
    const terminales = new Map();
    const lugarPorSlug = new Map(marcadores.map(m => [m.slug, m]));
    const fichaTerminal = t => {
      const destinos = t.destinos.map(d => lugarPorSlug.get(d.slug) || (ctx.lugares && ctx.lugares.get(d.slug)) || { nombre: d.slug, slug: d.slug });
      const portada = t.foto_url ? { url: t.foto_url } : (destinos.find(d => d.portada) || {}).portada;
      mostrarTarjeta({
        imagen: portada ? foto(portada, 'otro', { alt: '', ancho: 400 }) : null, titulo: t.nombre,
        linea: [t.tipo_nombre, t.horario, cercania(t.lat, t.lon)].filter(Boolean).join(' · '),
        extra: el('div', {},
          t.pasaje ? el('p', { class: 'mapa-tarjeta-pasaje' }, `Pasaje ref. ${t.pasaje}`) : null,
          destinos.length ? el('p', { class: 'popup-destinos' }, 'Lleva a: ', destinos.map((d, i) => [i ? ', ' : '', el('a', { href: `#/lugar/${d.slug}` }, d.nombre)])) : null,
          el('p', { class: 'ruta-pista' }, terminalesDatos.por_tu_cuenta)),
        acciones: [el('a', { class: 'btn-ruta', href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(t.mapa)}`, target: '_blank', rel: 'noopener noreferrer' }, 'Cómo llegar'),
          el('a', { class: 'enlace-flecha', href: '#/terminales' }, 'Ver terminales ', icono('siguiente', 'ico ico-mini'))],
      });
    };
    for (const t of (terminalesDatos ? terminalesDatos.items : [])) {
      const marca = window.L.marker([t.lat, t.lon], { title: t.nombre, alt: t.nombre, icon: etiqueta('tipo-terminal', 'bus', t.tipo === 'terminal' ? 'Terminal' : etiquetaCorta(t.nombre)) })
        .on('click', () => fichaTerminal(t)).addTo(capaTerminales);
      terminales.set(t.id, { t, marca });
    }

    // --- Negocios verificados
    const capaNegocios = window.L.layerGroup();
    for (const n of negocios.items.filter(x => x.lat !== null)) {
      window.L.marker([n.lat, n.lon], { title: n.negocio, alt: n.negocio, icon: etiqueta('tipo-servicio', 'tienda', n.negocio) })
        .on('click', () => mostrarTarjeta({
          imagen: n.fotos && n.fotos[0] ? foto({ url: n.fotos[0] }, 'otro', { alt: '', ancho: 400 }) : null, titulo: n.negocio,
          linea: [n.rubro_nombre, cercania(n.lat, n.lon)].filter(Boolean).join(' · '),
          extra: n.direccion ? el('p', { class: 'nota' }, n.direccion) : null,
          acciones: [el('a', { class: 'enlace-flecha', href: `#/servicios?rubro=${n.rubro}` }, 'Ver en Servicios ', icono('siguiente', 'ico ico-mini')),
            el('a', { class: 'btn-ruta', href: enlaceComoLlegar(n.lat, n.lon), target: '_blank', rel: 'noopener noreferrer' }, 'Cómo llegar')],
        })).addTo(capaNegocios);
    }

    // Pestañas: Lugares / Terminales / Negocios (una a la vez, como en la referencia).
    const capas = { lugares: [capaLugares, 'Lugares'], terminales: [capaTerminales, 'Terminales'], negocios: [capaNegocios, 'Negocios'] };
    const elegir = clave => {
      for (const [k, [capa]] of Object.entries(capas)) { if (k === clave) capa.addTo(mapa); else capa.remove(); }
      [...pestanas.children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.capa === clave)));
      tarjeta.hidden = true;
    };
    for (const [k, [, nombre]] of Object.entries(capas)) {
      pestanas.append(el('button', { type: 'button', role: 'tab', dataset: { capa: k }, onclick: () => elegir(k) }, nombre));
    }
    // Nombres solo cuando hay zoom suficiente, para que no se amontonen.
    const ajustarEtiquetas = () => nodoMapa.classList.toggle('zoom-lejos', mapa.getZoom() < 12);
    mapa.on('zoomend', ajustarEtiquetas);
    mapa.on('click', () => { if (!estado.modoManual) tarjeta.hidden = true; });

    const enfocado = terminales.get(ruta.filtros && ruta.filtros.terminal);
    if (enfocado) {
      estado.enfoque = true; elegir('terminales');
      mapa.setView([enfocado.t.lat, enfocado.t.lon], 16); fichaTerminal(enfocado.t);
      lienzo.scrollIntoView({ block: 'center' });
    } else {
      elegir(ruta.filtros && capas[ruta.filtros.capa] ? ruta.filtros.capa : 'lugares');
      if (puntos.length) mapa.fitBounds(puntos, { padding: [40, 40] });
    }
    ajustarEtiquetas();
    estado.alCambiar = pintarLista;
    barra.replaceWith(controlUbicacion(mapa, marcadores, estado));
  } catch (e) { vaciar(lista, error(e.message, () => render(vista, ruta, ctx))); }
}

// «Paradero de colectivos Jr. Salvador Cavero con Jr. Ciro Alegría» → «Paradero Salvador Cavero».
function etiquetaCorta(nombre) {
  const sin = nombre.replace(/^Paradero de (colectivos|autos|combis)\s*(en la |en el )?/i, '').replace(/^(Av\.|Avenida|Jr\.|Jirón|Calle)\s*/i, '');
  return `Paradero ${sin.split(/\s+con\s+/i)[0]}`.slice(0, 32);
}
