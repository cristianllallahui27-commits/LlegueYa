// Perfil: solo la foto de la persona (con «Perfil» pequeño debajo). Al pulsarla se abre un menú con su
// cuenta; sin sesión, la misma foto genérica lleva a «Entrar».
import { confirmar } from './confirmar.js';
import { avatar } from './componentes.js';
import { el, icono, vaciar } from './dom.js';
import { alCambiarSesion, estado, pedirAcceso } from './estado.js';

const botones = () => [...document.querySelectorAll('[data-perfil]')];
let menu = null;

export function pintarPerfil() {
  const u = estado.usuario;
  botones().forEach(b => {
    vaciar(b.querySelector('.perfil-avatar'), u ? avatar(u, 'avatar perfil-foto')
      : el('span', { class: 'avatar perfil-foto avatar-letra' }, icono('perfil', 'ico')));
    b.querySelector('.perfil-rotulo').textContent = u ? 'Perfil' : 'Entrar';
    b.setAttribute('aria-label', u ? 'Mi perfil' : 'Entrar');
  });
  document.querySelectorAll('[data-salir]').forEach(f => { f.hidden = !u; });
  if (menu && !menu.hidden) { if (u) llenar(); else cerrar(); }
}

function cerrar() {
  if (!menu) return;
  menu.hidden = true;
  botones().forEach(b => b.setAttribute('aria-expanded', 'false'));
}

function llenar() {
  const u = estado.usuario;
  vaciar(menu,
    el('div', { class: 'perfil-menu-cab' }, avatar(u, 'avatar avatar-grande'),
      el('div', {}, el('strong', {}, u.nombre), el('span', {}, u.admin ? 'Administración' : 'Viajero'))),
    el('a', { class: 'perfil-menu-item', href: '#/mi-espacio' }, icono('perfil'), 'Mi espacio'),
    el('a', { class: 'perfil-menu-item', href: '#/mi-espacio?pestana=cuenta' }, icono('foto'), 'Cambiar foto o clave'),
    el('p', { class: 'pie-enlaces' }, el('a', { href: '#/legal' }, 'Privacidad'), ' ', el('a', { href: '#/legal' }, 'Cookies'), ' ', el('a', { href: '#/legal' }, 'Términos')));
}

function abrir(origen) {
  llenar();
  menu.hidden = false;
  const r = origen.getBoundingClientRect(), ancho = menu.offsetWidth || 280;
  const izquierda = Math.max(8, Math.min(r.left + r.width / 2 - ancho / 2, window.innerWidth - ancho - 8));
  const hueco = window.innerHeight - r.bottom;
  menu.style.left = `${izquierda}px`;
  if (hueco > menu.offsetHeight + 16 || r.top < menu.offsetHeight) { menu.style.top = `${r.bottom + 8}px`; menu.style.bottom = 'auto'; }
  else { menu.style.bottom = `${window.innerHeight - r.top + 8}px`; menu.style.top = 'auto'; }
  botones().forEach(b => b.setAttribute('aria-expanded', String(b === origen)));
}

export function montarPerfil() {
  menu = el('section', { class: 'perfil-menu', id: 'perfil-menu', role: 'dialog', 'aria-label': 'Mi perfil', hidden: true });
  document.body.append(menu);
  botones().forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation();
    if (!estado.usuario) { cerrar(); pedirAcceso(); return; }
    if (!menu.hidden && b.getAttribute('aria-expanded') === 'true') cerrar(); else abrir(b);
  }));
  document.addEventListener('click', ev => { if (!menu.hidden && !menu.contains(ev.target)) cerrar(); });
  menu.addEventListener('click', ev => { if (ev.target.closest('a')) cerrar(); });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !menu.hidden) { const b = document.querySelector('[data-perfil][aria-expanded="true"]'); cerrar(); if (b) b.focus(); } });
  window.addEventListener('hashchange', cerrar);
  window.addEventListener('resize', cerrar);
  document.querySelectorAll('[data-salir]').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (await confirmar({ titulo: 'Cerrar sesión', mensaje: 'Saldrás de tu cuenta en este navegador. Lo que no hayas guardado se perderá.', aceptar: 'Cerrar sesión', peligro: true })) f.submit();
  }));
  alCambiarSesion(pintarPerfil);
  pintarPerfil();
}
