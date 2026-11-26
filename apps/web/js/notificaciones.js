// Campanita de notificaciones: avisos de los eventos que la persona pidió seguir con «Avísame».
// Panel que se abre y se cierra como en las apps modernas: ventana junto a la campana en escritorio,
// hoja desde abajo en móvil; se cierra con Esc, tocando fuera o con la «x».
import { api } from './api.js';
import { avisar, el, icono, vaciar } from './dom.js';
import { estado, pedirAcceso } from './estado.js';
import { partesFecha, rangoFechas } from './util.js';

const LLAVE = 'ly:notif-leidas';
const leidas = () => { try { return new Set(JSON.parse(localStorage.getItem(LLAVE) || '[]')); } catch { return new Set(); } };
const guardarLeidas = s => { try { localStorage.setItem(LLAVE, JSON.stringify([...s].slice(-200))); } catch { /* sin almacenamiento */ } };

function diasHasta(iso) {
  const p = partesFecha(iso);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(p.anio, p.mes, p.dia) - hoy) / 86400000);
}

function aviso(e) {
  const d = diasHasta(e.inicio);
  const cuando = d < 0 ? 'En curso o ya pasó' : d === 0 ? '¡Es hoy!' : d === 1 ? 'Es mañana' : d <= 7 ? `Faltan ${d} días` : `En ${d} días`;
  return { id: `ev:${e.id}:${e.inicio}`, titulo: e.titulo, detalle: `${cuando} · ${rangoFechas(e.inicio, e.fin)}`, urgente: d >= 0 && d <= 7, d, href: '#/calendario' };
}

export async function cargarAvisos() {
  if (!estado.usuario) return [];
  try {
    const { items } = await api.eventos();
    return items.filter(e => e.suscrito && e.estado !== 'cancelado').map(aviso).filter(a => a.d >= -1).sort((a, b) => a.d - b.d);
  } catch { return []; }
}

export function montarCampanita() {
  const botones = [...document.querySelectorAll('[data-campana]')];
  if (!botones.length) return;
  const lista = el('ul', { class: 'notif-lista' });
  const marcar = el('button', { class: 'boton boton-texto', type: 'button' }, 'Marcar todo como leído');
  const cerrar = el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Cerrar notificaciones' }, icono('cerrar'));
  const panel = el('section', { class: 'notif-panel', id: 'notif-panel', role: 'dialog', 'aria-label': 'Notificaciones', 'aria-modal': 'false', hidden: true },
    el('header', { class: 'notif-cab' }, el('h2', {}, 'Notificaciones'), cerrar), lista, el('footer', { class: 'notif-pie' }, marcar));
  const velo = el('div', { class: 'notif-velo', hidden: true });
  document.body.append(velo, panel);
  let avisos = [], abierto = false, origen = null;

  const pendientes = () => { const l = leidas(); return avisos.filter(a => !l.has(a.id)).length; };
  const pintarInsignia = () => {
    const n = pendientes();
    botones.forEach(b => {
      let i = b.querySelector('.insignia');
      if (!n) { i?.remove(); } else {
        if (!i) { i = el('span', { class: 'insignia', 'aria-hidden': 'true' }); b.append(i); }
        i.textContent = n > 9 ? '9+' : String(n);
      }
      b.setAttribute('aria-label', n ? `Notificaciones, ${n} sin leer` : 'Notificaciones');
    });
  };
  const pintarLista = () => {
    const l = leidas();
    marcar.hidden = !pendientes();
    if (!estado.usuario) {
      vaciar(lista, el('li', { class: 'notif-vacio' }, el('p', {}, 'Inicia sesión para recibir avisos de las fiestas que te interesan.'),
        el('button', { class: 'boton boton-principal', type: 'button', onclick: () => { cerrarPanel(); pedirAcceso('Inicia sesión para recibir avisos.'); } }, 'Iniciar sesión')));
      return;
    }
    if (!avisos.length) {
      vaciar(lista, el('li', { class: 'notif-vacio' }, icono('campana', 'ico ico-grande'), el('p', {}, 'Sin avisos por ahora.'),
        el('p', { class: 'nota' }, 'En el calendario toca «Avísame» en una fiesta y te lo recordaremos aquí.'),
        el('a', { class: 'boton boton-borde', href: '#/calendario', onclick: cerrarPanel }, 'Ver calendario')));
      return;
    }
    vaciar(lista, avisos.map(a => el('li', {},
      el('a', { class: `notif-item${l.has(a.id) ? '' : ' nueva'}${a.urgente ? ' urgente' : ''}`, href: a.href, onclick: () => { l.add(a.id); guardarLeidas(l); pintarInsignia(); cerrarPanel(); } },
        el('span', { class: 'notif-punto', 'aria-hidden': 'true' }),
        el('span', { class: 'notif-texto' }, el('strong', {}, a.titulo), el('span', {}, a.detalle))))));
  };
  const refrescar = async () => { avisos = await cargarAvisos(); pintarInsignia(); if (abierto) pintarLista(); };

  const abrirPanel = async ev => {
    origen = ev?.currentTarget || botones[0];
    abierto = true;
    panel.hidden = velo.hidden = false;
    requestAnimationFrame(() => { panel.classList.add('abierto'); velo.classList.add('abierto'); });
    botones.forEach(b => b.setAttribute('aria-expanded', 'true'));
    pintarLista();
    cerrar.focus({ preventScroll: true });
    await refrescar();
  };
  function cerrarPanel() {
    if (!abierto) return;
    abierto = false;
    panel.classList.remove('abierto'); velo.classList.remove('abierto');
    botones.forEach(b => b.setAttribute('aria-expanded', 'false'));
    setTimeout(() => { if (!abierto) panel.hidden = velo.hidden = true; }, 220);
    origen?.focus({ preventScroll: true });
  }
  botones.forEach(b => { b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'notif-panel'); b.addEventListener('click', ev => (abierto ? cerrarPanel() : abrirPanel(ev))); });
  cerrar.addEventListener('click', cerrarPanel);
  velo.addEventListener('click', cerrarPanel);
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && abierto) cerrarPanel(); });
  marcar.addEventListener('click', () => { const l = leidas(); avisos.forEach(a => l.add(a.id)); guardarLeidas(l); pintarInsignia(); pintarLista(); avisar('Todo marcado como leído'); });
  window.addEventListener('hashchange', cerrarPanel);
  document.addEventListener('ly:avisos', refrescar);
  return refrescar;
}
