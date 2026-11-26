// Navegación animada (inspirada en «Navigation tabs V2»):
// - Celular: el ícono activo sube a una burbuja verde que flota sobre la barra y se desliza con rebote.
// - Escritorio: una píldora se desliza con rebote hasta la sección activa y el ícono da un saltito.
// Solo transform/opacity (fluido) y CSSOM, sin estilos en línea en el HTML (CSP). Respeta «reducir movimiento».
import { sonar } from './sonido.js';

export function montarNavAnimada() {
  const lista = document.querySelector('.riel-lista');
  if (!lista || lista.querySelector('.nav-indicador')) return;
  const indicador = document.createElement('li');
  indicador.className = 'nav-indicador';
  indicador.setAttribute('aria-hidden', 'true');
  indicador.setAttribute('role', 'presentation');
  indicador.append(document.createElement('span'));
  lista.prepend(indicador);
  lista.classList.add('nav-animada');

  let anterior = null;
  const mover = (animar = true) => {
    const activo = lista.querySelector('a[aria-current="page"]');
    if (!activo || !activo.offsetParent) { indicador.classList.remove('visible'); return; }
    const caja = activo.getBoundingClientRect(), base = lista.getBoundingClientRect();
    if (!animar) indicador.classList.add('sin-transicion');
    indicador.style.setProperty('--x', `${caja.left - base.left}px`);
    indicador.style.setProperty('--y', `${caja.top - base.top}px`);
    indicador.style.setProperty('--ancho', `${caja.width}px`);
    indicador.style.setProperty('--alto', `${caja.height}px`);
    indicador.classList.add('visible');
    if (!animar) requestAnimationFrame(() => requestAnimationFrame(() => indicador.classList.remove('sin-transicion')));
    if (activo !== anterior) {
      // Reinicia el saltito del ícono en la sección nueva.
      activo.classList.remove('salta');
      void activo.offsetWidth;
      if (animar) activo.classList.add('salta');
      anterior = activo;
    }
  };

  // La app marca la sección activa con aria-current: observamos ese cambio.
  new MutationObserver(() => mover(true)).observe(lista, { subtree: true, attributes: true, attributeFilter: ['aria-current', 'hidden'] });
  window.addEventListener('resize', () => mover(false));
  // Sonido solo cuando la persona toca una sección distinta (gesto propio, nunca automático).
  lista.addEventListener('click', ev => {
    const a = ev.target.closest('a[data-ruta]');
    if (!a || a.getAttribute('aria-current') === 'page') return;
    const enlaces = [...lista.querySelectorAll('a[data-ruta]')];
    sonar(enlaces.indexOf(a));
    a.classList.remove('onda');
    void a.offsetWidth;
    a.classList.add('onda');
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => mover(false));
  mover(false);
}
