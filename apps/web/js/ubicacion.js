// Ubicación del dispositivo, compartida por Mapa y Terminales. Siempre con permiso de la persona,
// solo en su navegador (nunca se envía al servidor) y solo para orientarse.
import { el, icono } from './dom.js';

export const ubicacion = { posicion: null, precision: null, hora: 0 };
const VIGENCIA = 5 * 60 * 1000;   // una posición de hace más de 5 minutos ya no sirve como punto actual

export const ubicacionVigente = () => Boolean(ubicacion.posicion) && Date.now() - ubicacion.hora < VIGENCIA;

export async function permisoUbicacion() {
  try { return (await navigator.permissions.query({ name: 'geolocation' })).state; } catch { return 'prompt'; }
}

// Pide la posición actual. Primero una lectura rápida (Wi-Fi/red) y, si tarda, una con más tiempo.
export function pedirUbicacion() {
  return new Promise((resolver, rechazar) => {
    if (!navigator.geolocation) { rechazar(new Error('Tu navegador no ofrece ubicación.')); return; }
    const ok = p => {
      ubicacion.posicion = [p.coords.latitude, p.coords.longitude];
      ubicacion.precision = p.coords.accuracy;
      ubicacion.hora = Date.now();
      resolver(ubicacion);
    };
    const mensaje = e => new Error(e.code === 1
      ? 'No diste permiso de ubicación. Actívalo en el candado junto a la dirección → Ubicación → Permitir.'
      : 'Tu equipo no pudo darnos la ubicación. Revisa que la ubicación de Windows (o de tu celular) esté encendida.');
    navigator.geolocation.getCurrentPosition(ok, e => {
      if (e.code === 1) { rechazar(mensaje(e)); return; }
      navigator.geolocation.getCurrentPosition(ok, e2 => rechazar(mensaje(e2)), { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 120000 });
  });
}

// Franja que muestra si la ubicación está activa y, si no, pide activarla.
export function franjaUbicacion(alActivar) {
  const texto = el('span', {});
  const boton = el('button', { class: 'boton boton-secundario', type: 'button' }, icono('pin'), 'Activar mi ubicación');
  const caja = el('div', { class: 'franja-ubicacion', role: 'status', 'aria-live': 'polite' }, icono('pin', 'ico franja-ico'), texto, boton);
  const pintar = (estadoTexto, activa) => {
    texto.textContent = estadoTexto;
    caja.classList.toggle('activa', activa);
    boton.hidden = activa;
  };
  const activar = async () => {
    pintar('Buscando tu ubicación… si tu navegador pregunta, elige «Permitir».', false);
    boton.disabled = true;
    try {
      await pedirUbicacion();
      pintar(`Tu ubicación está activa (±${Math.round(ubicacion.precision)} m). Solo se usa en tu navegador.`, true);
      alActivar && alActivar(ubicacion);
    } catch (e) { pintar(e.message, false); }
    finally { boton.disabled = false; }
  };
  boton.addEventListener('click', activar);
  if (ubicacionVigente()) pintar(`Tu ubicación está activa (±${Math.round(ubicacion.precision)} m). Solo se usa en tu navegador.`, true);
  else {
    pintar('Tu ubicación no está activa. Actívala para saber desde dónde partes.', false);
    permisoUbicacion().then(p => { if (p === 'granted') activar(); });
  }
  return { nodo: caja, activar };
}
