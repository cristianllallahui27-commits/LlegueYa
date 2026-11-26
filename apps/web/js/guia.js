// Guía de bienvenida: 3 pasos cortos que explican qué se puede hacer en LlegueYa.
// Aparece una sola vez por cuenta en este navegador y se puede volver a ver desde Mi cuenta.
import { el, icono } from './dom.js';

const PASOS = [
  { icono: 'explorar', color: 'verde', titulo: 'Descubre Ayacucho',
    texto: 'Encuentra lugares con historia, fiestas y rutas reales.',
    puntos: [['explorar', 'Explorar: lugares por tipo, con fotos y cómo llegar.'], ['mapa', 'Mapa: ubica cada sitio y arma tu ruta.'], ['calendario', 'Calendario: fiestas y eventos para no perderte nada.']] },
  { icono: 'foto', color: 'mandarina', titulo: 'Comparte tu viaje',
    texto: 'Tus fotos y consejos ayudan a otros viajeros.',
    puntos: [['mas', 'Publicar: sube una foto o un consejo de tu visita.'], ['corazon', 'Con los me gusta que recibes llegas a «Viajero confiable» y «Embajador».'], ['compartir', 'Comparte lugares por WhatsApp, Facebook o con un enlace.']] },
  { icono: 'chat', color: 'mostaza', titulo: 'Pregunta y viaja seguro',
    texto: 'Recomendaciones solo con lo publicado y verificado aquí.',
    puntos: [['chat', 'Willaq Uma, tu sabio guía: pregúntale qué hacer según tus gustos.'], ['tienda', 'Servicios: restaurantes, hospedajes y agencias verificados.'], ['escudo', '¿Tienes un negocio? Regístralo en Mi espacio → Mi negocio.']] },
];

const clave = u => `ly:guia:${u && u.id}`;

export function guiaVista(u) {
  try { return localStorage.getItem(clave(u)) === '1'; } catch { return true; }
}

export function abrirGuia(u) {
  let paso = 0;
  const cuerpo = el('div', { class: 'guia-cuerpo', 'aria-live': 'polite' });
  const puntos = el('div', { class: 'guia-puntos', 'aria-hidden': 'true' }, PASOS.map(() => el('i')));
  const saltar = el('button', { class: 'boton boton-texto', type: 'button' }, 'Saltar');
  const atras = el('button', { class: 'boton boton-borde', type: 'button' }, 'Atrás');
  const sigue = el('button', { class: 'boton boton-principal guia-siguiente', type: 'button' });
  const dialogo = el('dialog', { class: 'dialogo guia', 'aria-label': 'Guía de LlegueYa' },
    el('p', { class: 'guia-saludo' }, u && u.nombre ? `¡Hola, ${u.nombre.split(' ')[0]}! Así funciona LlegueYa` : 'Así funciona LlegueYa'),
    cuerpo, puntos, el('div', { class: 'guia-acciones' }, saltar, el('span', { class: 'crece' }), atras, sigue));

  const pintar = () => {
    const p = PASOS[paso];
    cuerpo.replaceChildren(el('div', { class: `guia-paso guia-${p.color}` },
      el('span', { class: 'guia-icono' }, icono(p.icono)),
      el('p', { class: 'guia-numero' }, `Paso ${paso + 1} de ${PASOS.length}`),
      el('h2', {}, p.titulo),
      el('p', { class: 'guia-texto' }, p.texto),
      el('ul', {}, p.puntos.map(([i, t]) => el('li', {}, icono(i, 'ico ico-mini'), el('span', {}, t))))));
    [...puntos.children].forEach((d, i) => d.classList.toggle('activo', i === paso));
    atras.hidden = paso === 0;
    sigue.textContent = paso === PASOS.length - 1 ? '¡Empezar!' : 'Siguiente';
    sigue.focus();
  };
  const cerrar = () => dialogo.close();
  sigue.addEventListener('click', () => { if (paso === PASOS.length - 1) cerrar(); else { paso += 1; pintar(); } });
  atras.addEventListener('click', () => { if (paso > 0) { paso -= 1; pintar(); } });
  saltar.addEventListener('click', cerrar);
  dialogo.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight' && paso < PASOS.length - 1) { paso += 1; pintar(); }
    if (ev.key === 'ArrowLeft' && paso > 0) { paso -= 1; pintar(); }
  });
  dialogo.addEventListener('close', () => {
    try { localStorage.setItem(clave(u), '1'); } catch { /* sin almacenamiento */ }
    dialogo.remove();
  });
  document.body.append(dialogo);
  dialogo.showModal();
  pintar();
}

export function mostrarGuiaSiEsNueva(u) {
  if (u && !guiaVista(u)) setTimeout(() => abrirGuia(u), 600);
}
