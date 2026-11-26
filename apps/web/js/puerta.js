// Puerta de entrada: como en las redes sociales, sin sesión no se ve la aplicación.
// Al fondo se mueven, desenfocadas, las fotos de los lugares del catálogo; encima va el acceso.
// Solo animación CSS (transform), sin librerías ni estilos en línea; respeta «reducir movimiento».
import { api } from './api.js';
import { el, vaciar } from './dom.js';
import { cuentasActivas, estado, pedirAcceso } from './estado.js';

const $ = id => document.getElementById(id);
let fotosCargadas = false;

export const puertaActiva = () => document.body.classList.contains('con-puerta');
export const debeMostrarse = () => cuentasActivas() && !estado.usuario;

async function pintarFondo() {
  if (fotosCargadas) return;
  fotosCargadas = true;
  let urls = [];
  try {
    const { items } = await api.lugares({ limite: 48 });
    urls = items.filter(l => l.portada && l.portada.url).map(l => l.portada.url.replace(/width=\d+/, 'width=480'));
  } catch { /* sin fotos: queda el degradado de fondo */ }
  if (!urls.length) return;
  while (urls.length < 12) urls = urls.concat(urls);
  const columnas = 4;
  const fondo = $('puerta-fondo');
  vaciar(fondo, Array.from({ length: columnas }, (_, c) => {
    const propias = urls.filter((_, i) => i % columnas === c);
    // Cada columna repite su tira dos veces para que el desplazamiento sea infinito y sin saltos.
    const tira = [...propias, ...propias].map(src => el('img', { src, alt: '', loading: 'eager', decoding: 'async', draggable: 'false' }));
    return el('div', { class: `puerta-columna col-${c + 1}` }, el('div', { class: 'puerta-tira' }, tira));
  }));
}

export async function abrirPuerta(aviso = null, pestana = 'bienvenida') {
  document.body.classList.add('con-puerta');
  $('puerta').hidden = false;
  pedirAcceso('Lugares, fiestas y experiencias reales de viajeros en Ayacucho, en un solo lugar.', pestana, aviso);
  pintarFondo();
}

export function cerrarPuerta() {
  if (!puertaActiva()) return;
  document.body.classList.remove('con-puerta', 'puerta-legal');
  $('puerta').hidden = true;
}

// Mientras la puerta está activa, el acceso no se puede cerrar (Esc o clic afuera).
export function prepararPuerta() {
  const dialogo = $('dialogo-acceso');
  dialogo.addEventListener('cancel', ev => { if (puertaActiva()) ev.preventDefault(); });
  // Privacidad y términos sí se pueden leer sin cuenta.
  dialogo.addEventListener('click', ev => {
    const a = ev.target.closest('a[href="#/legal"]');
    if (a && puertaActiva()) { document.body.classList.add('puerta-legal'); dialogo.close(); }
  });
}

export function volverDeLegal() {
  document.body.classList.remove('puerta-legal');
  location.hash = '#/inicio';
}
