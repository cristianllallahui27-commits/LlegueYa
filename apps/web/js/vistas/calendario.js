// Calendario de fiestas: una hoja de calendario «de pared» del mes, el próximo evento destacado
// y el resto en tarjetas con foto. «Guardar fecha» activa el aviso en la campanita.
import { api } from '../api.js';
import { error, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { compartir } from '../compartir.js';
import { conSesion } from '../estado.js';
import { partesFecha, rangoFechas } from '../util.js';

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const corto = e => { const p = partesFecha(e.inicio); return `${String(p.dia).padStart(2, '0')} ${p.mesCorto.toUpperCase()}`; };

// Botón «Guardar fecha»: suscribe al aviso del evento (aparece en la campanita).
function guardarFecha(e, clase = 'boton-fecha') {
  const b = el('button', { class: `boton ${clase}`, type: 'button', 'aria-pressed': String(e.suscrito) },
    icono('guardar'), e.suscrito ? 'Fecha guardada' : 'Guardar fecha');
  b.addEventListener('click', conSesion('Inicia sesión para guardar fechas.', async () => {
    const activa = b.getAttribute('aria-pressed') !== 'true';
    try {
      await api.suscribir(e.id, activa);
      e.suscrito = activa;
      b.setAttribute('aria-pressed', String(activa));
      b.lastChild.textContent = activa ? 'Fecha guardada' : 'Guardar fecha';
      avisar(activa ? 'Fecha guardada: te avisaremos en la campanita' : 'Quitaste la fecha guardada');
      document.dispatchEvent(new CustomEvent('ly:avisos'));
    } catch (err) { avisar(err.message); }
  }));
  return b;
}

function lugarTexto(e) {
  return e.lugar_slug ? el('a', { href: `#/lugar/${e.lugar_slug}` }, e.lugar) : e.lugar;
}

function fotoEvento(e, portadas, ancho) {
  const src = e.foto_url || (portadas[e.lugar_slug] || '').replace(/width=\d+/, `width=${ancho}`);
  return src ? el('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : el('div', { class: 'sin-foto' }, icono('calendario'));
}

function destacado(e, portadas) {
  const p = partesFecha(e.inicio);
  return el('article', { class: 'evento-destacado', id: `evento-${e.id}` },
    el('div', { class: 'evento-destacado-foto' }, fotoEvento(e, portadas, 1000), el('span', { class: 'evento-insignia' }, `Destacado · ${corto(e)}`)),
    el('div', { class: 'evento-destacado-datos' },
      el('p', { class: 'evento-meta' }, `${String(p.dia).padStart(2, '0')} de ${p.mesLargo} · ${e.lugar.split(',').pop().trim()}`.toUpperCase()),
      el('h2', {}, e.titulo),
      el('p', {}, e.descripcion),
      el('p', { class: 'nota' }, rangoFechas(e.inicio, e.fin), ' · ', lugarTexto(e), e.fecha_referencial ? ' · fecha referencial: confírmala antes de viajar' : ''),
      el('div', { class: 'evento-botones' }, guardarFecha(e, 'boton-fecha-principal'),
        el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Compartir', onclick: () => compartir({ tipo: 'evento', ref: e.id, etiqueta: e.titulo }) }, icono('compartir')))));
}

function tarjeta(e, portadas) {
  return el('article', { class: `evento-tarjeta${e.estado === 'cancelado' ? ' cancelado' : ''}`, id: `evento-${e.id}` },
    el('div', { class: 'evento-tarjeta-foto' }, fotoEvento(e, portadas, 640), el('span', { class: 'evento-insignia' }, corto(e))),
    el('div', { class: 'evento-tarjeta-datos' },
      el('h3', {}, e.titulo),
      el('p', { class: 'evento-lugar' }, lugarTexto(e), ' · ', e.inicio === e.fin ? 'Un día' : rangoFechas(e.inicio, e.fin)),
      e.estado === 'cancelado' ? el('span', { class: 'etiqueta-estado demo' }, 'Cancelado') : null,
      el('div', { class: 'evento-botones' }, guardarFecha(e),
        el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Compartir', onclick: () => compartir({ tipo: 'evento', ref: e.id, etiqueta: e.titulo }) }, icono('compartir')))));
}

// Hoja de calendario de pared: anillos arriba, mes, días de la semana y los días con fiesta marcados.
function hojaCalendario(eventos, portadas) {
  const hoy = new Date();
  const primero = eventos.find(e => e.fin >= iso(hoy)) || eventos[0];
  let ver = primero ? new Date(partesFecha(primero.inicio).anio, partesFecha(primero.inicio).mes, 1) : new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const cuerpo = el('div', { class: 'hoja-cuerpo' });
  const titulo = el('h2', { class: 'hoja-mes' });
  const pintar = () => {
    const anio = ver.getFullYear(), mes = ver.getMonth();
    titulo.textContent = `${MESES[mes]} ${anio}`;
    const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;   // la semana empieza el lunes
    const total = new Date(anio, mes + 1, 0).getDate();
    const celdas = [];
    for (let i = 0; i < desfase; i++) celdas.push(el('span', { class: 'hoja-dia hoja-hueco', 'aria-hidden': 'true' }));
    for (let d = 1; d <= total; d++) {
      const dia = iso(new Date(anio, mes, d));
      const deHoy = eventos.filter(e => e.inicio <= dia && dia <= e.fin);
      const esHoy = dia === iso(hoy);
      if (!deHoy.length) { celdas.push(el('span', { class: `hoja-dia${esHoy ? ' hoy' : ''}` }, d)); continue; }
      const e = deHoy[0];
      celdas.push(el('button', { class: `hoja-dia con-evento${esHoy ? ' hoy' : ''}`, type: 'button', title: deHoy.map(x => x.titulo).join(' · '),
        'aria-label': `${d}: ${deHoy.map(x => x.titulo).join(', ')}`,
        onclick: () => document.getElementById(`evento-${e.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) },
        el('span', { class: 'hoja-num' }, d),
        el('span', { class: 'hoja-mini' }, fotoEvento(e, portadas, 120)),
        deHoy.length > 1 ? el('span', { class: 'hoja-mas' }, `+${deHoy.length - 1}`) : null));
    }
    const delMes = eventos.filter(e => e.inicio.slice(0, 7) <= iso(new Date(anio, mes, 1)).slice(0, 7) && e.fin.slice(0, 7) >= iso(new Date(anio, mes, 1)).slice(0, 7));
    vaciar(cuerpo, el('div', { class: 'hoja-semana' }, DIAS.map(d => el('span', {}, d))), el('div', { class: 'hoja-dias' }, celdas),
      el('p', { class: 'hoja-pie' }, delMes.length ? `${delMes.length} ${delMes.length === 1 ? 'fiesta' : 'fiestas'} este mes. Toca un día marcado para verla.` : 'Sin fiestas registradas este mes.'));
  };
  const mover = n => { ver = new Date(ver.getFullYear(), ver.getMonth() + n, 1); pintar(); };
  pintar();
  return el('section', { class: 'hoja-calendario', 'aria-label': 'Calendario del mes' },
    el('div', { class: 'hoja-anillos', 'aria-hidden': 'true' }, Array.from({ length: 8 }, () => el('i'))),
    el('header', { class: 'hoja-cabecera' },
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => mover(-1) }, icono('anterior')),
      titulo,
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Mes siguiente', onclick: () => mover(1) }, icono('siguiente'))),
    cuerpo);
}

export async function render(vista) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Cargando calendario…'));
  try {
    const [{ items }, lug] = await Promise.all([api.eventos(), api.lugares({ limite: 48 }).catch(() => ({ items: [] }))]);
    const portadas = Object.fromEntries(lug.items.filter(l => l.portada && l.portada.url).map(l => [l.slug, l.portada.url]));
    const eventos = [...items].sort((a, b) => a.inicio.localeCompare(b.inicio));
    if (!eventos.length) {
      vaciar(vista, el('section', { class: 'ancho' }, el('h1', { class: 'titulo-vista' }, 'Calendario de fiestas'),
        vacio('No hay eventos próximos', 'Cuando se publiquen fiestas y actividades, aparecerán aquí.')));
      return;
    }
    const hoy = iso(new Date());
    const proximo = eventos.find(e => e.fin >= hoy && e.estado !== 'cancelado') || eventos[0];
    const resto = eventos.filter(e => e !== proximo);
    vaciar(vista, el('section', { class: 'ancho calendario-vista' },
      el('h1', { class: 'titulo-vista' }, 'Calendario de fiestas'),
      el('p', { class: 'bajada' }, 'Fiestas y fechas importantes de Ayacucho. Guarda una fecha y te avisaremos en la campanita. LlegueYa no vende entradas.'),
      el('div', { class: 'calendario-arriba' }, hojaCalendario(eventos, portadas), destacado(proximo, portadas)),
      resto.length ? el('h2', { class: 'titulo-seccion' }, 'Más ', el('span', {}, 'fiestas y actividades')) : null,
      el('div', { class: 'eventos-rejilla' }, resto.map(e => tarjeta(e, portadas)))));
  } catch (e) { vaciar(vista, error(e.message, () => render(vista))); }
}
