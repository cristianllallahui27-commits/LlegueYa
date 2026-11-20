// Willaq Uma: sabio guía flotante. Se presenta formalmente, recomienda con lo
// publicado en LlegueYa (lugares, fiestas y experiencias) y nunca desaparece:
// al cerrar la conversación queda como burbuja que se puede arrastrar.
import { api } from './api.js';
import { avisar, el, icono, vaciar } from './dom.js';
import { alCambiarSesion, estado, pedirAcceso } from './estado.js';
import { colocarPanel, limitarPosicion, saludoPorHora, tipoDeSaludo } from './util.js';

const CLAVE_POSICION = 'ly_willaq_posicion';
const CLAVE_REGISTRO = 'ly_willaq_registro';
const panel = () => document.getElementById('willaq-panel');
const burbujaBoton = () => document.getElementById('willaq-boton');
let presentado = false;

// ---------------------------------------------------------------- Conversación
function lista() { return panel().querySelector('[data-willaq-mensajes]'); }

function mensaje(clase, ...hijos) {
  const b = el('div', { class: `burbuja ${clase}` }, ...hijos);
  lista().append(b);
  lista().scrollTop = lista().scrollHeight;
  return b;
}

function sugerencias(items) {
  vaciar(panel().querySelector('[data-willaq-sugerencias]'),
    (items || []).slice(0, 4).map(s => el('button', { class: 'chip', type: 'button', onclick: () => preguntar(s) }, s)));
}

function citas(experiencias) {
  if (!experiencias || !experiencias.length) return null;
  return el('div', { class: 'citas' }, experiencias.map(e => el('figure', { class: 'cita' },
    el('blockquote', {}, `«${e.texto}»`),
    el('figcaption', {}, `— ${e.autor}, viajero de la comunidad`, e.lugar_slug ? [' · ', el('a', { href: `#/lugar/${e.lugar_slug}` }, 'ver lugar')] : null))));
}

function tarjetaPlan(plan) {
  if (!plan) return null;
  const aceptar = el('button', { class: 'boton boton-principal', type: 'button' }, 'Aceptar este plan');
  aceptar.addEventListener('click', async () => {
    if (!estado.usuario) { pedirAcceso('Inicia sesión para guardar el plan que te armó Willaq Uma.'); return; }
    aceptar.disabled = true;
    try {
      await api.aceptarViaje(plan);
      aceptar.textContent = 'Plan aceptado';
      avisar('Tu viaje quedó guardado en Mi espacio');
      mensaje('bot', el('p', {}, '¡Listo! Guardé tu plan en Mi espacio. Cuando quieras lo cambiamos.'),
        el('div', { class: 'enlaces' }, el('a', { href: '#/mi-espacio?pestana=viaje' }, 'Ver mi viaje')));
    } catch (e) { aceptar.disabled = false; avisar(e.message); }
  });
  return el('div', { class: 'plan-viaje' },
    el('h4', {}, plan.titulo),
    el('ol', {}, plan.dias.map(d => el('li', {},
      el('strong', {}, `Día ${d.numero} · ${d.titulo}`),
      d.lugares.length
        ? el('ul', {}, d.lugares.map(l => el('li', {}, el('a', { href: `#/lugar/${l.slug}` }, l.nombre))))
        : el('p', {}, d.nota || 'Día libre')))),
    el('div', { class: 'plan-acciones' }, aceptar,
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => preguntar('Arma otro plan con más naturaleza') }, 'Pedir otro')));
}

function respuesta(r) {
  mensaje('bot',
    r.parrafos.map(p => el('p', {}, p)),
    tarjetaPlan(r.plan),
    citas(r.experiencias),
    r.lugares.length ? el('div', { class: 'enlaces' }, r.lugares.map(l => el('a', { href: `#/lugar/${l.slug}` }, l.nombre))) : null,
    r.eventos.length ? el('div', { class: 'enlaces' }, el('a', { href: '#/calendario' }, 'Ver calendario')) : null,
    r.requiere_sesion ? el('p', {}, el('button', { class: 'boton boton-texto', type: 'button', onclick: () => pedirAcceso('Inicia sesión para que Willaq Uma te dé la ficha completa.') }, 'Iniciar sesión')) : null,
    r.dato_general ? el('p', { class: 'dato-general' }, 'Dato general: todavía no está publicado en LlegueYa.') : null,
    r.fuentes.length ? el('p', { class: 'fuente' }, 'Fuente: ', r.fuentes.map(f => el('a', { href: f.url, ...(f.url.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {}) }, f.nombre))) : null);
  sugerencias(r.sugerencias);
}

function leerRegistro() {
  try { return JSON.parse(localStorage.getItem(CLAVE_REGISTRO)); } catch { return null; }
}

function anotarConversacion() {
  try {
    const r = leerRegistro() || { primera: Date.now() };
    localStorage.setItem(CLAVE_REGISTRO, JSON.stringify({ ...r, ultima: Date.now() }));
  } catch { /* sin almacenamiento: se presentará de nuevo, sin romper nada */ }
}

// Primera vez: presentación completa. Regreso: saludo según la hora. Charla seguida: nada.
async function saludar() {
  presentado = true;
  const ahora = new Date();
  const tipo = tipoDeSaludo(leerRegistro(), ahora);
  anotarConversacion();
  if (tipo === 'presentacion') return presentarse();
  if (tipo === 'regreso') {
    const nombre = estado.usuario ? `, ${estado.usuario.nombre.split(' ')[0]}` : '';
    mensaje('bot saludo', el('p', {}, `${saludoPorHora(ahora)}${nombre}. Qué gusto verte de nuevo.`),
      el('p', {}, '¿Seguimos con tu viaje o te recomiendo algo nuevo?'));
  }
  sugerencias(['Arma mi viaje de 2 días', 'Recomiéndame según lo que me gusta', '¿Qué fiestas se vienen?']);
}

async function presentarse() {
  let p;
  try { p = await api.presentacionWillaq(); } catch { p = null; }
  const parrafos = p ? p.parrafos : ['¡Bienvenido! Soy Willaq Uma, el sabio guía de LlegueYa.'];
  const saludo = `${saludoPorHora(new Date())}${estado.usuario ? `, ${estado.usuario.nombre.split(' ')[0]}` : ''}. Bienvenido.`;
  lista().append(el('article', { class: 'presentacion' },
    el('img', { src: 'img/asistente-inca.png', alt: 'Retrato de Willaq Uma', width: 96, height: 96 }),
    el('p', { class: 'presentacion-saludo' }, saludo),
    el('h3', {}, 'Soy Willaq Uma'),
    el('p', { class: 'presentacion-rol' }, 'Sabio guía de LlegueYa'),
    parrafos.slice(1).map(t => el('p', {}, t)),
    el('ul', { class: 'presentacion-bases', 'aria-label': 'En qué se basa' },
      el('li', {}, icono('pin', 'ico ico-mini'), 'Lugares del catálogo'),
      el('li', {}, icono('calendario', 'ico ico-mini'), 'Fiestas del calendario'),
      el('li', {}, icono('comentario', 'ico ico-mini'), 'Experiencias de viajeros'))));
  sugerencias(p ? p.sugerencias : ['Recomiéndame según lo que me gusta']);
}

// Conversar con Willaq Uma requiere cuenta, igual que comentar o publicar.
function actualizarAcceso() {
  const form = panel().querySelector('[data-willaq-form]');
  const input = form.elements.texto;
  const conCuenta = Boolean(estado.usuario);
  input.disabled = !conCuenta;
  form.querySelector('button[type="submit"]').disabled = !conCuenta;
  input.placeholder = conCuenta ? 'Cuéntame qué te gusta o qué buscas' : 'Inicia sesión para conversar';
  let aviso = panel().querySelector('[data-willaq-acceso]');
  if (conCuenta) { if (aviso) aviso.remove(); return; }
  if (!aviso) {
    aviso = el('div', { class: 'willaq-acceso', 'data-willaq-acceso': '' },
      el('p', {}, 'Para conversar conmigo y armar tu viaje, entra con tu cuenta. Así guardo tus planes y recomendaciones.'),
      el('button', { class: 'boton boton-principal', type: 'button', onclick: () => pedirAcceso('Inicia sesión para conversar con Willaq Uma.') }, 'Iniciar sesión'));
    form.before(aviso);
  }
}

export async function preguntar(texto) {
  abrir();
  texto = String(texto || '').trim().slice(0, 500);
  if (!texto) return;
  if (!estado.usuario) { pedirAcceso('Inicia sesión para conversar con Willaq Uma.'); return; }
  mensaje('yo', el('p', {}, texto));
  anotarConversacion();
  const pensando = mensaje('bot pensando', el('p', {}, 'Willaq Uma está pensando…'));
  try {
    const r = await api.preguntar(texto);
    pensando.remove();
    respuesta(r);
  } catch (e) {
    pensando.remove();
    mensaje('bot', el('p', {}, e.message));
  }
}

// ---------------------------------------------------------------- Burbuja arrastrable
function guardarPosicion(x, y) {
  try { localStorage.setItem(CLAVE_POSICION, JSON.stringify({ x, y })); } catch { /* sin almacenamiento */ }
}

function leerPosicion() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_POSICION));
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch { /* posición inválida */ }
  return null;
}

function ponerBurbuja(x, y) {
  const b = burbujaBoton();
  b.classList.remove('esquina');
  const r = b.getBoundingClientRect();
  const p = limitarPosicion(x, y, r.width || 64, r.height || 64, innerWidth, innerHeight, innerWidth < 720 ? 76 : 12);
  b.style.left = `${p.x}px`;
  b.style.top = `${p.y}px`;
  b.classList.toggle('a-la-izquierda', p.x + (r.width || 64) / 2 < innerWidth / 2);
  if (!panel().hidden) ubicarPanel();
  return p;
}

function ubicarPanel() {
  const r = burbujaBoton().getBoundingClientRect();
  const p = colocarPanel(r, innerWidth, innerHeight);
  Object.assign(panel().style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.ancho}px`, height: `${p.alto}px` });
}

function hacerArrastrable() {
  const b = burbujaBoton();
  let inicio = null, movido = false;
  b.addEventListener('pointerdown', ev => {
    const r = b.getBoundingClientRect();
    inicio = { x: ev.clientX, y: ev.clientY, dx: ev.clientX - r.left, dy: ev.clientY - r.top };
    movido = false;
    b.setPointerCapture(ev.pointerId);
  });
  b.addEventListener('pointermove', ev => {
    if (!inicio) return;
    if (!movido && Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) < 6) return;
    movido = true;
    b.classList.add('arrastrando');
    ponerBurbuja(ev.clientX - inicio.dx, ev.clientY - inicio.dy);
  });
  const soltar = () => {
    if (!inicio) return;
    inicio = null;
    b.classList.remove('arrastrando');
    if (movido) {
      const r = b.getBoundingClientRect();
      guardarPosicion(r.left, r.top);
    }
  };
  b.addEventListener('pointerup', soltar);
  b.addEventListener('pointercancel', soltar);
  // Un arrastre no debe abrir la conversación; un toque o Enter sí.
  b.addEventListener('click', ev => {
    if (movido) { movido = false; ev.preventDefault(); return; }
    panel().hidden ? abrir() : cerrar();
  });
  // Teclado: flechas mueven la burbuja (accesible sin ratón).
  b.addEventListener('keydown', ev => {
    const pasos = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[ev.key];
    if (!pasos) return;
    ev.preventDefault();
    const r = b.getBoundingClientRect();
    const p = ponerBurbuja(r.left + pasos[0], r.top + pasos[1]);
    guardarPosicion(p.x, p.y);
  });
  window.addEventListener('resize', () => {
    if (b.classList.contains('esquina')) { if (!panel().hidden) ubicarPanel(); return; }
    const r = b.getBoundingClientRect();
    ponerBurbuja(r.left, r.top);
  });
}

// ---------------------------------------------------------------- Abrir / cerrar
export function abrir() {
  const p = panel();
  p.hidden = false;
  ubicarPanel();
  burbujaBoton().setAttribute('aria-expanded', 'true');
  burbujaBoton().classList.add('abierta');
  if (!presentado) saludar();
  actualizarAcceso();
  if (estado.usuario) p.querySelector('input').focus({ preventScroll: true });
}

export function cerrar() {
  panel().hidden = true;
  const b = burbujaBoton();
  b.setAttribute('aria-expanded', 'false');
  b.classList.remove('abierta');
  b.classList.remove('vuelve');
  void b.offsetWidth;          // reinicia la animación de «vuelta a burbuja»
  b.classList.add('vuelve');
  b.focus({ preventScroll: true });
}

export function iniciarWillaq() {
  // Sin posición guardada, la burbuja vive en la esquina inferior derecha (CSS),
  // así queda bien aunque la página cargue oculta o con tamaño cero.
  const guardada = leerPosicion();
  if (guardada && innerWidth > 0) ponerBurbuja(guardada.x, guardada.y);
  else burbujaBoton().classList.add('esquina');
  hacerArrastrable();
  panel().querySelector('[data-cerrar-willaq]').addEventListener('click', cerrar);
  panel().querySelector('[data-willaq-form]').addEventListener('submit', ev => {
    ev.preventDefault();
    const input = ev.target.elements.texto;
    preguntar(input.value);
    input.value = '';
  });
  document.addEventListener('willaq:preguntar', ev => preguntar(ev.detail));
  alCambiarSesion(() => { if (!panel().hidden) actualizarAcceso(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel().hidden) cerrar(); });
}
