// Estado compartido de la sesión y acciones que exigen cuenta.
import { api } from './api.js';
import { mensajeEstadoAcceso } from './util.js';

export const estado = { usuario: null, metodos: { google: false, correo: false }, lugares: [], cargado: false };
const oyentes = new Set();

export function alCambiarSesion(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
export const cuentasActivas = () => estado.metodos.google || estado.metodos.correo;

export async function cargarSesion() {
  try {
    const salud = await api.salud();
    const m = salud.metodos || { google: salud.google_configurado, correo: false };
    estado.metodos = { google: Boolean(m.google), correo: Boolean(m.correo) };
  } catch { estado.metodos = { google: false, correo: false }; }
  try { estado.usuario = cuentasActivas() ? await api.yo() : null; } catch { estado.usuario = null; }
  estado.cargado = true;
  oyentes.forEach(fn => fn(estado.usuario));
  return estado.usuario;
}

// Abre el diálogo de acceso en la pestaña pedida: 'entrar', 'registro' o 'recuperar'.
export function pedirAcceso(motivo, pestana = 'entrar', aviso = null) {
  const dialogo = document.getElementById('dialogo-acceso');
  document.getElementById('acceso-motivo').textContent = motivo
    || 'Con tu cuenta puedes dar me gusta, comentar, conversar con Willaq Uma y compartir tus fotos.';
  document.getElementById('acceso-google').hidden = !estado.metodos.google;
  document.getElementById('acceso-correo').hidden = !estado.metodos.correo;
  document.getElementById('acceso-estado').textContent = aviso || mensajeEstadoAcceso(null, cuentasActivas()) || '';
  document.dispatchEvent(new CustomEvent('ly:acceso-pestana', { detail: pestana }));
  // Recordamos a dónde volver tras el acceso (solo rutas internas).
  try { sessionStorage.setItem('ly_volver', location.hash.startsWith('#/') && location.hash !== '#/nueva-clave' ? location.hash : '#/inicio'); } catch { /* sin almacenamiento */ }
  if (!dialogo.open) dialogo.showModal();
}

export function conSesion(motivo, accion) {
  return (...args) => (estado.usuario ? accion(...args) : pedirAcceso(motivo));
}
