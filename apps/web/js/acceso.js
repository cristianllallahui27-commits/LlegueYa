// Acceso con correo (entrar, crear cuenta, recuperar clave) y reportes de publicaciones.
// Google se resuelve con un formulario normal: el navegador sigue las redirecciones de Supabase.
import { api } from './api.js';
import { avisar, conOjito, el, vaciar } from './dom.js';
import { cargarSesion, estado, pedirAcceso } from './estado.js';
import { identidad } from './guardia.js';
import { puertaActiva } from './puerta.js';
import { esCorreoInstitucional, problemaClave } from './util.js';

const $ = id => document.getElementById(id);

function volver() {
  let destino = '#/inicio';
  try { destino = sessionStorage.getItem('ly_volver') || destino; sessionStorage.removeItem('ly_volver'); } catch { /* */ }
  return destino.startsWith('#/') ? destino : '#/inicio';
}

const TITULOS = { bienvenida: '¡Bienvenido a LlegueYa!', entrar: 'Inicia sesión', registro: 'Crea tu cuenta',
  recuperar: 'Recupera tu clave', verificar: 'Verifica tu correo' };
const BAJADAS = { entrar: 'Qué bueno verte de nuevo por aquí.', registro: 'Es gratis y te toma un minuto.' };

// Primero la bienvenida (Google, crear cuenta o iniciar sesión); luego cada formulario por separado.
function mostrar(pestana) {
  if (!TITULOS[pestana]) pestana = 'entrar';
  const formularios = { entrar: $('form-entrar'), registro: $('form-registro'), recuperar: $('form-recuperar'), verificar: $('form-verificar') };
  const bienvenida = pestana === 'bienvenida';
  $('acceso-bienvenida').hidden = !bienvenida;
  $('acceso-correo').hidden = bienvenida;
  Object.entries(formularios).forEach(([id, f]) => { f.hidden = id !== pestana; });
  [$('acceso-bienvenida'), formularios[pestana]].forEach(n => { if (n) { n.classList.remove('entra'); void n.offsetWidth; n.classList.add('entra'); } });
  document.querySelectorAll('.pestanas-acceso [role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.pestana === pestana)));
  document.querySelector('.pestanas-acceso').hidden = true;
  document.querySelector('.acceso-volver').hidden = bienvenida;
  $('dialogo-acceso').classList.toggle('en-bienvenida', bienvenida);
  const motivo = $('acceso-motivo');
  if (!bienvenida) { motivo.dataset.original = motivo.dataset.original || motivo.textContent; motivo.textContent = BAJADAS[pestana] || ''; }
  else if (motivo.dataset.original) { motivo.textContent = motivo.dataset.original; delete motivo.dataset.original; }
  motivo.hidden = !motivo.textContent;
  $('acceso-titulo').textContent = TITULOS[pestana];
  if (pestana === 'entrar' || pestana === 'registro') setTimeout(() => formularios[pestana].querySelector('input:not([type=hidden])')?.focus(), 60);
  if (pestana === 'verificar') setTimeout(() => $('verificar-codigo').focus(), 50);
}

async function enviar(form, accion) {
  const boton = form.querySelector('button[type="submit"]');
  const nota = $('acceso-estado');
  boton.disabled = true; nota.textContent = 'Un momento…';
  try { await accion(Object.fromEntries(new FormData(form)), nota); }
  catch (e) { nota.textContent = e.message; }
  finally { boton.disabled = false; }
}

async function entrarConSesion(nombre) {
  // Desde la puerta de entrada: se recarga para montar la aplicación completa con la sesión nueva.
  if (puertaActiva()) {
    try { sessionStorage.setItem('ly_saludo', nombre || '¡Hola de nuevo!'); } catch { /* */ }
    location.hash = volver();
    location.reload();
    return;
  }
  $('dialogo-acceso').close();
  await cargarSesion();
  avisar(nombre || (estado.usuario ? `¡Hola, ${estado.usuario.nombre.split(' ')[0]}!` : 'Sesión iniciada'));
  // Si la sesión se perdió a medias, la misma persona sigue exactamente donde estaba (sin recargar la vista).
  let reanudar = null;
  try { reanudar = JSON.parse(sessionStorage.getItem('ly_reanudar')); sessionStorage.removeItem('ly_reanudar'); } catch { /* */ }
  if (reanudar && estado.usuario) {
    if (identidad(estado.usuario) === reanudar.id) { avisar('Listo, seguimos donde estabas. Revisa que todo siga como lo dejaste.'); return; }
    avisar('Entraste con otra cuenta. Te llevo al inicio para no mezclar acciones.');
    location.hash = '#/inicio'; return;
  }
  const destino = volver();
  if (location.hash === destino) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = destino;
}

// Paso del código: el correo de confirmación trae un código de 6 dígitos.
function pedirCodigo(correo, mensaje) {
  $('verificar-correo').value = correo;
  $('verificar-correo-texto').textContent = correo;
  $('form-verificar').reset();
  $('verificar-correo').value = correo;
  mostrar('verificar');
  $('acceso-estado').textContent = mensaje || '';
}

let esperaReenvio = 0;
function cuentaRegresiva(boton) {
  esperaReenvio = 60;
  boton.disabled = true;
  const t = setInterval(() => {
    esperaReenvio -= 1;
    boton.textContent = esperaReenvio > 0 ? `Reenviar código (${esperaReenvio} s)` : 'Reenviar código';
    if (esperaReenvio <= 0) { clearInterval(t); boton.disabled = false; }
  }, 1000);
}

export function prepararAcceso() {
  conOjito($('entrar-clave'));
  conOjito($('registro-clave'));
  document.addEventListener('ly:acceso-pestana', ev => mostrar(ev.detail));
  $('dialogo-acceso').addEventListener('click', ev => {
    const b = ev.target.closest('[data-pestana]');
    if (b) { mostrar(b.dataset.pestana); $('acceso-estado').textContent = ''; }
  });

  const correoRegistro = $('registro-correo');
  correoRegistro.addEventListener('input', () => {
    $('registro-correo-nota').textContent = esCorreoInstitucional(correoRegistro.value)
      ? 'Correo institucional: perfecto para estudiantes y docentes.' : '';
  });

  $('form-entrar').addEventListener('submit', ev => {
    ev.preventDefault();
    enviar(ev.target, async d => {
      if (!d.correo || !d.clave) throw new Error('Escribe tu correo y tu clave.');
      try { await api.entrar(d.correo.trim(), d.clave); }
      catch (e) {
        if (e.message.startsWith('Primero confirma tu correo')) { pedirCodigo(d.correo.trim(), 'Tu cuenta aún no está verificada. Escribe el código que te enviamos o pide uno nuevo.'); return; }
        throw e;
      }
      ev.target.reset();
      await entrarConSesion();
    });
  });

  $('form-registro').addEventListener('submit', ev => {
    ev.preventDefault();
    enviar(ev.target, async (d, nota) => {
      if (!d.nombre.trim() || !d.correo.trim()) throw new Error('Completa tu nombre y tu correo.');
      const problema = problemaClave(d.clave);
      if (problema) throw new Error(problema);
      const correo = d.correo.trim();
      const r = await api.registrar({ nombre: d.nombre.trim(), correo, clave: d.clave });
      ev.target.reset();
      if (r.estado === 'sesion') { await entrarConSesion('¡Bienvenido a LlegueYa!'); return; }
      pedirCodigo(correo, r.detail);
      cuentaRegresiva($('verificar-reenviar'));
      nota.textContent = r.detail;
    });
  });

  const codigo = $('verificar-codigo');
  codigo.addEventListener('input', () => { codigo.value = codigo.value.replace(/[^\d]/g, '').slice(0, 10); });
  $('form-verificar').addEventListener('submit', ev => {
    ev.preventDefault();
    enviar(ev.target, async d => {
      if (!/^\d{6,10}$/.test(d.codigo || '')) throw new Error('Escribe el código de 6 dígitos que te llegó al correo.');
      await api.verificarCodigo(d.correo, d.codigo);
      await entrarConSesion('¡Cuenta verificada! Bienvenido a LlegueYa.');
    });
  });
  $('verificar-reenviar').addEventListener('click', async ev => {
    const boton = ev.currentTarget;
    if (esperaReenvio > 0) return;
    try { const r = await api.reenviarCodigo($('verificar-correo').value); $('acceso-estado').textContent = r.detail; cuentaRegresiva(boton); }
    catch (e) { $('acceso-estado').textContent = e.message; }
  });

  $('form-recuperar').addEventListener('submit', ev => {
    ev.preventDefault();
    enviar(ev.target, async (d, nota) => {
      if (!d.correo.trim()) throw new Error('Escribe el correo de tu cuenta.');
      const r = await api.recuperar(d.correo.trim());
      nota.textContent = r.detail;
    });
  });
}

// ---------------------------------------------------------------- Vista #/nueva-clave
export async function render(vista) {
  if (!estado.usuario) {
    vaciar(vista, el('section', { class: 'estrecho' }, el('h1', { class: 'titulo-vista' }, 'Nueva clave'),
      el('p', { class: 'bajada' }, 'Abre el enlace que te enviamos al correo, en este mismo navegador, para crear tu clave nueva.'),
      el('button', { class: 'boton boton-secundario', type: 'button', onclick: () => pedirAcceso('', 'recuperar') }, 'Pedir otro enlace')));
    return;
  }
  const nota = el('p', { class: 'nota', role: 'status', 'aria-live': 'polite' }, 'De 8 a 72 caracteres, con letras y números.');
  const form = el('form', { class: 'tarjeta form-plan', novalidate: true },
    el('label', { class: 'etiqueta', for: 'nueva-clave' }, 'Clave nueva'),
    el('input', { id: 'nueva-clave', name: 'clave', type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }),
    el('label', { class: 'etiqueta', for: 'nueva-clave-2' }, 'Repítela'),
    el('input', { id: 'nueva-clave-2', name: 'repetida', type: 'password', autocomplete: 'new-password', required: true, maxlength: 72 }),
    nota, el('button', { class: 'boton boton-principal', type: 'submit' }, 'Guardar clave'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const problema = problemaClave(d.clave) || (d.clave !== d.repetida ? 'Las dos claves no coinciden.' : null);
    if (problema) { nota.textContent = problema; return; }
    try { await api.nuevaClave(d.clave); avisar('Tu clave se actualizó'); location.hash = '#/inicio'; }
    catch (e) { nota.textContent = e.message; }
  });
  conOjito(form.querySelector('#nueva-clave'));
  conOjito(form.querySelector('#nueva-clave-2'));
  vaciar(vista, el('section', { class: 'estrecho' }, el('h1', { class: 'titulo-vista' }, 'Crea tu clave nueva'),
    el('p', { class: 'bajada' }, `Hola, ${estado.usuario.nombre}. Elige una clave que no uses en otros sitios.`), form));
}

// ---------------------------------------------------------------- Reportar publicación
let motivos = null;
let reportando = null;

export async function abrirReporte(publicacion) {
  if (!estado.usuario) { pedirAcceso('Inicia sesión para reportar una publicación.'); return; }
  reportando = publicacion;
  const caja = $('reporte-motivos');
  $('reporte-estado').textContent = '';
  $('reporte-detalle').value = '';
  try { motivos = motivos || (await api.motivosReporte()).motivos; } catch (e) { avisar(e.message); return; }
  vaciar(caja, motivos.map((m, i) => el('label', { class: 'casilla' },
    el('input', { type: 'radio', name: 'motivo', value: m, required: true, checked: i === 0 || null }), m)));
  $('dialogo-reporte').showModal();
}

export function prepararReporte() {
  $('form-reporte').addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(ev.target));
    try {
      await api.reportar(reportando.id, d.motivo, d.detalle || '');
      $('dialogo-reporte').close();
      avisar('Gracias. El equipo revisará tu reporte.');
    } catch (e) { $('reporte-estado').textContent = e.message; }
  });
}
