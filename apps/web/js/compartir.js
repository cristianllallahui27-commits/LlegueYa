// Compartir un lugar, una fiesta o una publicación fuera de LlegueYa (WhatsApp, Facebook o enlace).
// Quien reciba el enlace entra a la aplicación y ve de qué se trata, sin necesidad de cuenta.
import { avisar, el, icono } from './dom.js';

const NOMBRES = { lugar: 'Lugar', evento: 'Fiesta o evento', publicacion: 'Publicación' };

export function enlaceDe({ tipo, ref }) {
  const base = location.origin + '/';
  if (tipo === 'lugar') return `${base}#/lugar/${encodeURIComponent(ref)}`;
  if (tipo === 'evento') return `${base}#/calendario`;
  return `${base}#/inicio`;
}

async function copiar(url) {
  try { await navigator.clipboard.writeText(url); avisar('Enlace copiado'); }
  catch { avisar('No pudimos copiarlo. Copia la dirección desde la barra del navegador.'); }
}

function abrirFuera(destino) {
  window.open(destino, '_blank', 'noopener,noreferrer');
  if (/^(127\.|localhost)/.test(location.hostname)) avisar('Este enlace es de tu computadora. Otras personas podrán abrirlo cuando LlegueYa esté publicado en internet.');
}

// a: { tipo: 'lugar' | 'evento' | 'publicacion', ref, etiqueta }
export function compartir(a) {
  const url = enlaceDe(a);
  const titulo = a.etiqueta || NOMBRES[a.tipo];
  const texto = `${titulo} en LlegueYa, la comunidad viajera de Ayacucho: ${url}`;
  const d = el('dialog', { class: 'dialogo compartir', 'aria-label': 'Compartir' });
  const cerrar = () => d.close();
  d.append(
    el('div', { class: 'dialogo-cabecera' }, el('h2', {}, 'Compartir'),
      el('button', { class: 'boton-icono dialogo-cerrar', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))),
    el('div', { class: 'compartir-cuerpo' },
      el('p', { class: 'compartir-titulo' }, titulo),
      el('p', { class: 'nota' }, 'Quien abra el enlace entrará a LlegueYa y verá de qué se trata.'),
      el('button', { class: 'boton boton-whatsapp', type: 'button', onclick: () => { abrirFuera(`https://wa.me/?text=${encodeURIComponent(texto)}`); cerrar(); } }, icono('compartir'), 'Enviar por WhatsApp'),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => { abrirFuera(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`); cerrar(); } }, icono('compartir'), 'Facebook'),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => { await copiar(url); cerrar(); } }, icono('guardar'), 'Copiar enlace')));
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', ev => { if (ev.target === d) cerrar(); }); // tocar fuera cierra
  document.body.append(d);
  d.showModal();
}
