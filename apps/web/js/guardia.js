// Guardia de sesión: el panel de administración solo lo ve el administrador, y si se corta el
// internet o vence la sesión, la persona vuelve a identificarse y sigue donde estaba.
// La seguridad real la impone el servidor (401/403); esto solo refleja ese resultado en pantalla.
import { api, ErrorApi } from './api.js';
import { avisar } from './dom.js';
import { cargarSesion, estado, pedirAcceso } from './estado.js';

export const identidad = u => String(u.id ?? u.correo ?? u.nombre);

function ocultarAdmin() {
  document.querySelectorAll('.solo-admin').forEach(n => { n.hidden = true; });
}

// Pregunta al servidor quién eres ahora mismo. Devuelve true si todo sigue en orden.
export async function revalidarSesion() {
  if (!estado.usuario) return true;
  try {
    const u = await api.yo();
    const eraAdmin = Boolean(estado.usuario.admin);
    estado.usuario = u;
    if (eraAdmin && !u.admin) sinPermiso();
    document.querySelectorAll('.solo-admin').forEach(n => { n.hidden = !u.admin; });
    return true;
  } catch (e) {
    if (e instanceof ErrorApi && e.estado === 0) return true; // sin red: no es motivo para expulsar a nadie
    if (e instanceof ErrorApi && e.estado === 401) { await sesionVencida(); return false; }
    return true;
  }
}

let pidiendo = false;
async function sesionVencida() {
  if (!estado.usuario || pidiendo) return;
  pidiendo = true;
  try { sessionStorage.setItem('ly_reanudar', JSON.stringify({ id: identidad(estado.usuario), hash: location.hash })); } catch { /* sin almacenamiento */ }
  try { sessionStorage.setItem('ly_volver', location.hash.startsWith('#/') ? location.hash : '#/inicio'); } catch { /* */ }
  ocultarAdmin();
  await cargarSesion(); // el servidor ya no te reconoce: la cuenta lateral vuelve a «Entrar»
  pedirAcceso('Tu sesión terminó o se perdió la conexión con tu cuenta. Entra de nuevo para confirmar que eres tú; lo que estabas haciendo sigue en pantalla.');
  document.getElementById('dialogo-acceso').addEventListener('close', () => { pidiendo = false; }, { once: true });
}

function sinPermiso() {
  ocultarAdmin();
  avisar('Tu cuenta ya no tiene permisos de administración.');
  if (location.hash.startsWith('#/admin')) location.hash = '#/inicio';
}

export function montarGuardia() {
  const banner = document.getElementById('aviso-red');
  const mostrar = texto => { if (banner) { banner.textContent = texto; banner.hidden = !texto; } };
  document.addEventListener('ly:sesion-vencida', sesionVencida);
  document.addEventListener('ly:sin-permiso', () => { revalidarSesion(); });
  window.addEventListener('offline', () => mostrar('Sin conexión a internet. Lo que escribiste sigue aquí; no se perderá. Volveremos a conectar solos.'));
  window.addEventListener('online', async () => {
    mostrar('');
    avisar('Conexión recuperada.');
    await revalidarSesion(); // confirma que sigues siendo tú antes de continuar
  });
  if (navigator.onLine === false) mostrar('Sin conexión a internet. Lo que escribiste sigue aquí; no se perderá.');
  // Revisión periódica y al volver a la pestaña: la sesión puede vencer sin que nadie toque nada.
  setInterval(() => { if (!document.hidden && navigator.onLine !== false) revalidarSesion(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revalidarSesion(); });
}
