import { api } from '../api.js';
import { bloqueTransporte, error, etiquetaCategoria, galeria, postViajero, tarjetaPaquete, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { conSesion, estado, pedirAcceso } from '../estado.js';
import { TIPOS, enlaceComoLlegar, sinRepetir } from '../util.js';
import { compartir } from '../compartir.js';
import { crearMapa, marcar } from './mapa.js';
import { registrarInteres } from '../preferencias.js';

// Solo datos que aportan: nada que ya diga el nombre del lugar (p. ej. «Destino: Vilcashuamán» bajo «Vilcashuamán»).
function datosClave(l) {
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const repetido = t => !t || norm(l.nombre).includes(norm(t)) || norm(t).includes(norm(l.nombre));
  const datos = [];
  if (l.altitud_m) datos.push(metrica('Altitud', `${l.altitud_m.toLocaleString('es-PE')} m`));
  datos.push(metrica('Tipo', TIPOS[l.tipo] || 'Lugar'));
  if (!repetido(l.zona)) datos.push(metrica('Zona', l.zona));
  else if (!repetido(l.destino) && l.destino !== l.zona) datos.push(metrica('Destino', l.destino));
  return datos;
}

function metrica(nombre, valor) {
  return el('div', {}, el('dd', {}, valor), el('dt', {}, nombre));
}

// Historia: primera frase como entrada destacada y el resto en párrafos cortos, sin repetir el resumen.
function historia(l) {
  const frases = sinRepetir(l.descripcion, l.resumen);
  if (!frases.length) return null;
  const [entrada, ...resto] = frases;
  const primero = resto.slice(0, 2).join(' ');
  const mas = resto.slice(2).join(' ');
  return el('section', { class: 'ficha-seccion relato' },
    el('h2', {}, 'Su historia'),
    el('p', { class: 'historia-entrada' }, entrada),
    primero ? el('p', { class: 'historia-texto' }, primero) : null,
    mas ? el('details', { class: 'historia-mas' }, el('summary', {}, 'Leer la historia completa'), el('p', { class: 'historia-texto' }, mas)) : null);
}

// Cuadro de entrada: si es libre o se paga, cuánto y dónde comprarla (con enlace si se vende por internet).
function cuadroEntrada(e) {
  if (!e || !e.costo) return null;
  const libre = /^libre/i.test(e.costo);
  const donde = { lugar: 'Se paga en el mismo lugar, al ingresar.', web: 'Se compra por internet.', ambos: 'Se paga en el lugar o se compra por internet.' }[e.compra];
  return el('section', { class: `cuadro-entrada ${libre ? 'entrada-libre' : 'entrada-pagada'}`, 'aria-label': 'Entrada' },
    el('span', { class: 'cuadro-entrada-icono', 'aria-hidden': 'true' }, icono(libre ? 'check' : 'tienda')),
    el('div', { class: 'crece' },
      el('h2', {}, libre ? 'Entrada libre' : 'Entrada con boleto'),
      el('p', { class: 'cuadro-entrada-costo' }, e.costo),
      donde ? el('p', {}, donde) : null,
      e.url ? el('a', { class: 'boton boton-secundario', href: e.url, target: '_blank', rel: 'noopener noreferrer' }, icono('compartir'), 'Comprar entradas con anticipación') : null,
      libre ? null : el('p', { class: 'nota' }, 'Precio referencial: confirma antes de ir, puede cambiar.')));
}

function consejos(l) {
  if (!l.recomendaciones || !l.recomendaciones.length) return null;
  return el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Antes de ir'),
    el('ul', { class: 'consejos-tarjetas' }, l.recomendaciones.map(r => el('li', {}, icono('escudo', 'ico'), el('span', {}, r)))));
}

export async function render(vista, ruta, ctx) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Abriendo la ficha…'));
  let l, muro, transporte = null, directorio = { items: [] };
  try {
    [l, muro, transporte, directorio] = await Promise.all([api.lugar(ruta.parametro), api.muro({ lugar: ruta.parametro, limite: 10 }),
      api.transporte().catch(() => null), api.directorio().catch(() => ({ items: [] }))]);
  } catch (e) {
    vaciar(vista, e.estado === 404
      ? vacio('Este lugar no está disponible', 'Puede que se haya retirado del catálogo.', el('a', { class: 'boton boton-secundario', href: '#/explorar' }, 'Explorar otros lugares'))
      : error(e.message, () => render(vista, ruta, ctx)));
    return;
  }
  registrarInteres({ lugar: l.slug, tipo: l.tipo, destino: l.destino }, 3);   // solo en este navegador
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
    : [historia(l), consejos(l)];

  const mapa = l.lat !== null ? el('div', { class: 'miniatura-mapa', role: 'region', 'aria-label': `Ubicación de ${l.nombre}` }) : null;
  const creditos = fotos.filter(Boolean).length ? el('details', { class: 'ficha-seccion creditos-plegables' }, el('summary', {}, 'Fotos y fuentes'),
    el('ul', { class: 'creditos' },
      fotos.filter(Boolean).map(f => el('li', {}, el('a', { href: f.fuente_url, target: '_blank', rel: 'noopener' }, f.descripcion || 'Foto'), ` — ${f.autor}, ${f.licencia}`)),
      l.fuente_url ? el('li', {}, 'Información: ', el('a', { href: l.fuente_url, target: '_blank', rel: 'noopener' }, l.fuente),
        l.revisado_en ? ` (revisado el ${new Date(l.revisado_en + 'T12:00').toLocaleDateString('es-PE')})` : '') : null)) : null;

  // «Cómo llegar» en un único bloque: terminales (abren Maps), pasaje y ruta desde donde estás.
  const t = transporte && transporte.items[l.slug];
  const tieneCoord = l.lat !== null && l.lat !== undefined;
  const opcion = (abierta, icn, titulo, sub, ...cuerpo) => el('details', { class: 'opcion-llegar', open: abierta || null },
    el('summary', {}, el('span', { class: 'opcion-icono', 'aria-hidden': 'true' }, icono(icn)),
      el('span', { class: 'crece' }, el('strong', {}, titulo), el('small', {}, sub)), icono('siguiente', 'ico opcion-flecha')),
    el('div', { class: 'opcion-cuerpo' }, ...cuerpo));
  const comoLlegar = el('section', { class: 'ficha-seccion', id: 'como-llegar' },
    el('h2', {}, 'Cómo llegar'),
    tieneCoord ? opcion(!t, 'pin', 'En auto, taxi o caminando (GPS)', 'Ruta desde donde estás con Google Maps',
      l.como_llegar && !t ? el('p', {}, l.como_llegar) : null,
      mapa,
      el('a', { class: 'boton boton-secundario', href: enlaceComoLlegar(l.lat, l.lon, l.nombre), target: '_blank', rel: 'noopener noreferrer' },
        icono('pin'), 'Abrir la ruta en Google Maps')) : (l.como_llegar && !t ? el('p', {}, l.como_llegar) : null),
    t ? opcion(true, 'bus', 'En transporte público (por tu cuenta)', 'Desde dónde salen los autos y buses, pasaje y tiempo',
      bloqueTransporte(t, transporte.aviso, l, transporte.por_tu_cuenta)) : null);

  // Paquetes y agencias: solo negocios verificados que están publicados en LlegueYa.
  const ofrecen = directorio.items.filter(n => ['operador', 'transporte'].includes(n.rubro) && (n.lugar_slug === l.slug || !n.lugar_slug));
  const paquetes = el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Paquetes y agencias'),
    ofrecen.length ? el('div', { class: 'paquetes' }, ofrecen.map(tarjetaPaquete))
      : el('p', { class: 'nota' }, 'Aún no hay agencias ni paquetes verificados para este lugar. ',
          el('a', { href: '#/servicios' }, 'Ver servicios verificados')));

  const experiencias = el('section', { class: 'ficha-seccion' }, el('h2', {}, 'Experiencias de viajeros'),
    muro.items.length
      ? el('div', { class: 'muro' }, muro.items.map(p => postViajero(p, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares })))
      : vacio('Aún nadie compartió su visita', '¿Ya estuviste aquí? Cuéntale a la comunidad cómo te fue.',
          el('button', { class: 'boton boton-principal', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('ly:crear', { detail: { lugar: l.slug } })) }, 'Compartir mi experiencia')));

  vaciar(vista, el('article', {},
    el('a', { class: 'volver', href: '#/explorar' }, icono('flecha'), 'Explorar'),
    galeria(fotos, l.tipo, l.nombre, 'ficha-portada'),
    el('div', { class: 'post-pie' }, etiquetaCategoria(l.tipo),
      l.demostracion ? el('span', { class: 'etiqueta-estado demo' }, 'Datos de demostración') : null),
    el('h1', { class: 'ficha-titulo' }, l.nombre),
    el('dl', { class: 'metricas' }, datosClave(l)),
    el('p', { class: 'bajada' }, l.resumen),
    cuadroEntrada(l.entrada),
    el('div', { class: 'ficha-acciones barra-pulgar' },
      el('button', { class: 'boton boton-principal', type: 'button',
        onclick: () => document.dispatchEvent(new CustomEvent('ly:crear', { detail: { lugar: l.slug } })) }, icono('foto'), 'Sube tu foto'),
      guardar,
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => compartir({ tipo: 'lugar', ref: l.slug, etiqueta: l.nombre }) }, icono('compartir'), 'Compartir'),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: `¿Cómo llego a ${l.nombre}?` })) },
        icono('chat'), 'Preguntar a Willaq Uma')),
    detalle, comoLlegar, paquetes, experiencias, creditos));

  // El mapa está dentro de un desplegable: se dibuja cuando se ve (Leaflet necesita medir el contenedor).
  if (mapa) {
    let m = null;
    const dibujar = () => {
      if (!mapa.offsetParent) return;
      if (!m) { m = crearMapa(mapa, [l.lat, l.lon], 14); if (m) marcar(m, { ...l, portada: null }).openPopup(); }
      else m.invalidateSize();
    };
    mapa.closest('details')?.addEventListener('toggle', dibujar);
    requestAnimationFrame(dibujar);
  }
  if (!estado.usuario) return;
}
