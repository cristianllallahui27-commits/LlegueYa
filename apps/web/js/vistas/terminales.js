// Terminales y paraderos de autos y buses para viajar por cuenta propia a los lugares de fuera de la ciudad.
// Solo referencia: LlegueYa no vende pasajes ni presta el servicio. Administración los corrige desde su panel.
import { api } from '../api.js';
import { error, foto, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { pedirUbicacion, ubicacion, ubicacionVigente } from '../ubicacion.js';

const q = encodeURIComponent;

function distancia(a, b) {   // metros en línea recta
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
const fmt = m => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`);

function enlaceTerminal(t) {
  // Google toma tu ubicación actual como partida; si la activaste aquí, se la pasamos para mayor precisión.
  const origen = ubicacionVigente() ? `&origin=${ubicacion.posicion.map(v => v.toFixed(6)).join(',')}` : '';
  return `https://www.google.com/maps/dir/?api=1${origen}&destination=${q(t.mapa)}`;
}

export async function render(vista, ruta, ctx) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Cargando terminales…'));
  let datos;
  try { datos = await api.terminales(); } catch (e) { vaciar(vista, error(e.message, () => render(vista, ruta, ctx))); return; }
  const lugar = slug => ctx.lugares.get(slug);
  const portadaDe = t => (t.foto_url ? { url: t.foto_url } : (t.destinos.map(d => lugar(d.slug)).find(l => l && l.portada) || {}).portada);

  const rejilla = el('div', { class: 'terminales-rejilla' });
  const estadoCercano = el('p', { class: 'nota terminales-estado', role: 'status', 'aria-live': 'polite' });
  let cercano = null;

  const tarjeta = t => {
    const portada = portadaDe(t);
    const lejos = ubicacionVigente() ? fmt(distancia(ubicacion.posicion, [t.lat, t.lon])) : null;
    return el('article', { class: `terminal-tarjeta${cercano === t.id ? ' es-cercano' : ''}`, id: `terminal-${t.id}` },
      el('div', { class: 'terminal-foto' },
        portada ? foto(portada, 'otro', { alt: '', ancho: 640, carga: 'eager' }) : el('div', { class: 'sin-foto' }, icono('bus')),
        el('span', { class: 'terminal-insignia' }, cercano === t.id ? `Más cercano · ${lejos}` : (t.horario || t.frecuencia || t.tipo_nombre)),
        t.pasaje ? el('span', { class: 'terminal-pasaje' }, `Pasaje ref. ${t.pasaje}`) : null),
      el('div', { class: 'terminal-cuerpo-tarjeta' },
        el('span', { class: 'terminal-tipo' }, t.tipo_nombre, lejos && cercano !== t.id ? ` · a ${lejos}` : ''),
        el('h2', {}, t.nombre),
        el('p', { class: 'terminal-desc' }, t.descripcion || t.referencia),
        t.destinos.length ? el('details', { class: 'terminal-mas' },
          el('summary', {}, `Destinos, tiempos y pasajes (${t.destinos.length})`),
          el('ul', {}, t.destinos.map(d => {
            const l = lugar(d.slug);
            return el('li', {},
              el('a', { class: 'terminal-mas-foto', href: `#/lugar/${d.slug}` }, l && l.portada ? foto(l.portada, l.tipo, { alt: '', ancho: 200 }) : el('div', { class: 'sin-foto' }, icono('foto'))),
              el('div', {}, el('a', { href: `#/lugar/${d.slug}` }, el('strong', {}, l ? l.nombre : d.slug)),
                d.tiempo ? el('span', {}, icono('reloj', 'ico ico-mini'), d.tiempo) : null,
                d.tarifa ? el('span', {}, icono('tienda', 'ico ico-mini'), d.tarifa) : null,
                d.nota ? el('small', {}, d.nota) : null));
          })),
          el('p', { class: 'nota' }, 'Referencia: ', t.referencia)) : null,
        el('div', { class: 'terminal-botones' },
          el('a', { class: 'boton boton-terminal', href: enlaceTerminal(t), target: '_blank', rel: 'noopener noreferrer' }, icono('mapa'), 'Cómo llegar'),
          el('a', { class: 'boton-icono', href: `#/mapa?terminal=${t.id}`, 'aria-label': `Ver ${t.nombre} en el mapa`, title: 'Ver en el mapa' }, icono('pin')))));
  };
  const pintar = () => {
    const items = [...datos.items];
    if (cercano) items.sort((a, b) => (a.id === cercano ? -1 : b.id === cercano ? 1 : 0));
    vaciar(rejilla, items.length ? items.map(tarjeta) : vacio('Aún no hay terminales registrados', 'Administración puede agregarlos desde su panel.'));
  };

  // «Ubicar paradero cercano»: pide permiso al dispositivo y resalta el más cercano.
  const botonCercano = el('button', { class: 'boton boton-terminal', type: 'button' }, icono('pin'), 'Ubicar paradero cercano');
  botonCercano.addEventListener('click', async () => {
    botonCercano.disabled = true; estadoCercano.textContent = 'Buscando tu ubicación… si tu navegador pregunta, elige «Permitir».';
    try {
      await pedirUbicacion();
      const ordenados = [...datos.items].sort((a, b) => distancia(ubicacion.posicion, [a.lat, a.lon]) - distancia(ubicacion.posicion, [b.lat, b.lon]));
      if (ordenados.length) {
        cercano = ordenados[0].id;
        estadoCercano.textContent = `El más cercano es «${ordenados[0].nombre}», a ${fmt(distancia(ubicacion.posicion, [ordenados[0].lat, ordenados[0].lon]))} en línea recta.`;
      }
      pintar();
      document.getElementById(`terminal-${cercano}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { estadoCercano.textContent = e.message; }
    finally { botonCercano.disabled = false; }
  });

  vaciar(vista, el('section', { class: 'ancho terminales-vista' },
    el('header', { class: 'terminales-cabecera' },
      el('div', {}, el('h1', { class: 'titulo-vista' }, '¿Desde dónde sales hoy?'),
        el('p', { class: 'bajada' }, 'Elige tu paradero o terminal en Ayacucho para ver horarios, pasajes referenciales y ruta directa.')),
      botonCercano),
    estadoCercano,
    el('p', { class: 'aviso-terminales' }, icono('escudo', 'ico ico-mini'), ` ${datos.por_tu_cuenta}`),
    rejilla,
    el('p', { class: 'nota' }, datos.aviso)));
  pintar();
}
