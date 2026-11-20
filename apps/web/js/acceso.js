// Acceso con correo (entrar, crear cuenta, recuperar clave) y reportes de publicaciones.
// Google se resuelve con un formulario normal: el navegador sigue las redirecciones de Supabase.
import { api } from './api.js';
import { avisar, conOjito, el, vaciar } from './dom.js';
import { cargarSesion, estado, pedirAcceso } from './estado.js';
import { esCorreoInstitucional, problemaClave } from './util.js';

const $ = id => document.getElementById(id);

function volver() {
  let destino = '#/inicio';
  try { destino = sessionStorage.getItem('ly_volver') || destino; sessionStorage.removeItem('ly_volver'); } catch { /* */ }
  return destino.startsWith('#/') ? destino : '#/inicio';
}

function mostrar(pestana) {
  const formularios = { entrar: $('form-entrar'), registro: $('form-registro'), recuperar: $('form-recuperar') };
  Object.entries(formularios).forEach(([id, f]) => { f.hidden = id !== pestana; });
  document.querySelectorAll('.pestanas-acceso [role="tab"]').forEach(t => t.setAttribute('aria-selected', String(t.dataset.pestana === pestana)));
  document.querySelector('.pestanas-acceso').hidden = pestana === 'recuperar';
  $('acceso-titulo').textContent = { entrar: 'Entra a LlegueYa', registro: 'Crea tu cuenta', recuperar: 'Recupera tu clave' }[pestana];
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
  $('dialogo-acceso').close();
  await cargarSesion();
  avisar(nombre || (estado.usuario ? `¡Hola, ${estado.usuario.nombre.split(' ')[0]}!` : 'Sesión iniciada'));
  const destino = volver();
  if (location.hash === destino) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = destino;
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
      await api.entrar(d.correo.trim(), d.clave);
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
      const r = await api.registrar({ nombre: d.nombre.trim(), correo: d.correo.trim(), clave: d.clave });
      ev.target.reset();
      if (r.estado === 'sesion') { await entrarConSesion('¡Bienvenido a LlegueYa!'); return; }
      nota.textContent = r.detail;
    });
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
