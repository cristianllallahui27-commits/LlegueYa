// Arranque de la web de LlegueYa: rutas, cuenta, publicar y comentarios.
import { api } from './api.js';
import { avatar, error, vacio } from './componentes.js';
import { avisar, el, icono, vaciar } from './dom.js';
import { alCambiarSesion, cargarSesion, cuentasActivas, estado, pedirAcceso } from './estado.js';
import * as acceso from './acceso.js';
import { leerRuta, mensajeEstadoAcceso, partesFecha, tiempoRelativo, validarFoto } from './util.js';
import { abrir as abrirWillaq, iniciarWillaq } from './willaq.js';
import * as inicio from './vistas/inicio.js';
import * as explorar from './vistas/explorar.js';
import * as mapa from './vistas/mapa.js';
import * as calendario from './vistas/calendario.js';
import * as lugar from './vistas/lugar.js';
import * as perfil from './vistas/perfil.js';
import * as admin from './vistas/admin.js';
import * as servicios from './vistas/servicios.js';

const VISTAS = { inicio, explorar, mapa, calendario, servicios, lugar, 'mi-espacio': perfil, admin, 'nueva-clave': acceso };
const ctx = { favoritos: new Set(), lugares: new Map(), abrirComentarios, abrirReporte: acceso.abrirReporte };
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- Rutas
async function navegar() {
  const ruta = leerRuta(location.hash);
  document.querySelectorAll('[data-ruta]').forEach(a => {
    if (a.dataset.ruta === ruta.vista) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const vista = $('vista');
  if (ruta.vista === 'willaq-uma') {
    vaciar(vista, el('section', {}, el('h1', { class: 'titulo-vista' }, 'Willaq Uma'),
      el('p', { class: 'bajada' }, 'Tu sabio guía. Su nombre recuerda al Willaq Umu, el consejero sabio del mundo inca. No organiza tu viaje por ti: te recomienda según lo que te gusta, con los lugares, fiestas y experiencias publicados en LlegueYa, y te avisa cuando algo no está publicado.'),
      el('p', { class: 'nota' }, 'Lo encuentras siempre como burbuja flotante: tócala para conversar y arrástrala a donde te acomode.'),
      el('img', { src: 'img/asistente-inca.png', alt: 'Ilustración de Willaq Uma', width: 180, height: 180 }),
      el('p', {}, el('button', { class: 'boton boton-secundario', type: 'button', onclick: abrirWillaq }, icono('chat'), 'Conversar con Willaq Uma'))));
    abrirWillaq();
    return;
  }
  window.scrollTo({ top: 0 });
  try {
    await VISTAS[ruta.vista].render(vista, ruta, ctx);
  } catch (e) {
    vaciar(vista, error('No pudimos mostrar esta sección. Recarga la página.'));
    console.error(e);
  }
}

// ---------------------------------------------------------------- Cuenta (columna lateral)
function pintarCuenta() {
  const tarjeta = $('tarjeta-cuenta');
  const u = estado.usuario;
  document.querySelectorAll('.solo-admin').forEach(n => { n.hidden = !(u && u.admin); });
  if (u) {
    vaciar(tarjeta,
      el('div', { class: 'cuenta-fila' }, avatar(u), el('div', {}, el('strong', {}, u.nombre), el('span', {}, u.admin ? 'Administración de LlegueYa' : 'Viajero de LlegueYa'))),
      el('div', { class: 'post-pie' },
        el('a', { class: 'boton boton-borde', href: '#/mi-espacio' }, 'Mi espacio'),
        el('form', { action: '/api/v1/auth/logout', method: 'post' }, el('button', { class: 'boton boton-texto', type: 'submit' }, 'Cerrar sesión'))));
    return;
  }
  const activas = cuentasActivas();
  vaciar(tarjeta,
    el('h2', {}, 'Únete a la comunidad viajera'),
    el('p', {}, 'Comparte fotos, guarda lugares y conversa con Willaq Uma.'),
    el('button', { class: 'boton boton-principal', type: 'button', disabled: !activas || null, onclick: () => pedirAcceso() }, 'Entrar'),
    el('button', { class: 'boton boton-borde', type: 'button', disabled: !activas || null, onclick: () => pedirAcceso('', 'registro') }, 'Crear cuenta'),
    activas ? null : el('p', { class: 'nota' }, mensajeEstadoAcceso(null, false)));
}

async function pintarEventosLaterales() {
  const lista = $('lateral-eventos');
  try {
    const { items } = await api.eventos();
    vaciar(lista, items.slice(0, 3).map(e => {
      const p = partesFecha(e.inicio);
      return el('li', {}, el('span', { class: 'dia', 'aria-hidden': 'true' }, p.dia, el('small', {}, p.mesCorto)),
        el('div', {}, el('strong', {}, e.titulo), el('span', {}, e.lugar)));
    }));
  } catch { vaciar(lista, el('li', {}, 'No se pudo cargar el calendario.')); }
}

async function cargarFavoritos() {
  ctx.favoritos.clear();
  if (!estado.usuario) return;
  try { (await api.favoritos()).items.forEach(l => ctx.favoritos.add(l.slug)); } catch { /* sin favoritos */ }
}

// ---------------------------------------------------------------- Publicar
function prepararCrear() {
  const dialogo = $('dialogo-crear'), form = $('form-crear'), archivo = $('crear-foto');
  const vistaPrevia = $('crear-vista-previa'), textoFoto = $('crear-foto-texto'), estadoForm = $('crear-estado');
  const selector = $('crear-lugar');
  let url = null;

  const abrir = (detalle = {}) => {
    if (!estado.usuario) { pedirAcceso('Inicia sesión para compartir tu experiencia.'); return; }
    vaciar(selector, el('option', { value: '' }, 'Sin lugar'), [...ctx.lugares.values()].map(l => el('option', { value: l.slug }, l.nombre)));
    selector.value = detalle.lugar || '';
    estadoForm.textContent = '';
    dialogo.showModal();
  };
  document.querySelectorAll('[data-accion="crear"]').forEach(b => b.addEventListener('click', () => abrir()));
  document.addEventListener('ly:crear', ev => abrir(ev.detail || {}));

  archivo.addEventListener('change', () => {
    const f = archivo.files[0];
    const problema = validarFoto(f);
    if (url) URL.revokeObjectURL(url);
    if (problema) { estadoForm.textContent = problema; archivo.value = ''; vistaPrevia.hidden = true; textoFoto.hidden = false; return; }
    estadoForm.textContent = '';
    if (f) { url = URL.createObjectURL(f); vistaPrevia.src = url; vistaPrevia.hidden = false; textoFoto.hidden = true; }
  });

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const datos = new FormData(form);
    if (!archivo.files[0]) datos.delete('foto');
    if (!String(datos.get('texto') || '').trim() && !archivo.files[0]) { estadoForm.textContent = 'Escribe algo o agrega una foto.'; return; }
    const enviar = form.querySelector('button[type="submit"]');
    enviar.disabled = true; estadoForm.textContent = 'Publicando…';
    try {
      const p = await api.publicar(datos);
      form.reset(); vistaPrevia.hidden = true; textoFoto.hidden = false;
      dialogo.close();
      avisar(p.estado === 'en_revision' ? 'Publicado. Lo verás marcado «En revisión» hasta que se apruebe.' : 'Publicado');
      if (location.hash === '#/inicio' || !location.hash) navegar(); else location.hash = '#/inicio';
    } catch (e) {
      estadoForm.textContent = e.message;
      if (e.requiereSesion) { dialogo.close(); pedirAcceso(); }
    } finally { enviar.disabled = false; }
  });
}

// ---------------------------------------------------------------- Comentarios
let comentarioActual = null;
async function abrirComentarios(publicacion, alActualizar) {
  comentarioActual = { publicacion, alActualizar, padre: null };
  const dialogo = $('dialogo-comentarios');
  $('comentario-respondiendo').hidden = true;
  // Leer comentarios es libre; escribir exige cuenta.
  const form = $('form-comentario');
  form.hidden = !estado.usuario;
  let invitacion = $('comentario-invitacion');
  if (!estado.usuario && !invitacion) {
    invitacion = el('div', { id: 'comentario-invitacion', class: 'form-comentario' },
      el('p', { class: 'nota' }, 'Inicia sesión para comentar o responder.'),
      el('button', { class: 'boton boton-secundario', type: 'button', onclick: () => { dialogo.close(); pedirAcceso('Inicia sesión para comentar.'); } }, 'Iniciar sesión'));
    form.after(invitacion);
  }
  if (invitacion) invitacion.hidden = Boolean(estado.usuario);
  if (!dialogo.open) dialogo.showModal();
  await pintarComentarios();
}

async function pintarComentarios() {
  const lista = $('comentarios-lista');
  vaciar(lista, el('p', { class: 'cargando' }, 'Cargando…'));
  try {
    const { items } = await api.comentarios(comentarioActual.publicacion.id);
    comentarioActual.alActualizar && comentarioActual.alActualizar(items.length);
    if (!items.length) { vaciar(lista, vacio('Sin comentarios', 'Escribe el primero.')); return; }
    vaciar(lista, items.map(c => {
      let total = c.likes;
      const meGusta = el('button', { type: 'button', 'aria-pressed': String(c.me_gusta) }, total ? `${total} me gusta` : 'Me gusta');
      meGusta.addEventListener('click', async () => {
        if (!estado.usuario) { pedirAcceso('Inicia sesión para dar me gusta.'); return; }
        const activo = meGusta.getAttribute('aria-pressed') !== 'true';
        try {
          const r = await api.like('comentario', c.id, activo);
          total = r.likes; meGusta.setAttribute('aria-pressed', String(activo));
          meGusta.textContent = total ? `${total} me gusta` : 'Me gusta';
        } catch (e) { avisar(e.message); }
      });
      const responder = c.profundidad < 3 ? el('button', { type: 'button', onclick: () => {
        comentarioActual.padre = c.id;
        const aviso = $('comentario-respondiendo');
        aviso.textContent = `Respondiendo a ${c.autor.nombre}`; aviso.hidden = false;
        $('comentario-texto').focus();
      } }, 'Responder') : null;
      return el('div', { class: `comentario${c.profundidad ? ' respuesta' : ''}` }, avatar(c.autor),
        el('div', {}, el('p', {}, el('strong', {}, c.autor.nombre), ' ', c.texto),
          el('div', { class: 'comentario-meta' }, el('time', { datetime: c.creado_en }, tiempoRelativo(c.creado_en)),
            c.estado === 'en_revision' ? el('span', {}, 'En revisión') : null, meGusta, responder)));
    }));
  } catch (e) { vaciar(lista, error(e.message, pintarComentarios)); }
}

function prepararComentarios() {
  $('form-comentario').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!estado.usuario) { pedirAcceso('Inicia sesión para comentar.'); return; }
    const input = $('comentario-texto');
    try {
      await api.comentar(comentarioActual.publicacion.id, input.value, comentarioActual.padre);
      input.value = ''; comentarioActual.padre = null; $('comentario-respondiendo').hidden = true;
      await pintarComentarios();
    } catch (e) { avisar(e.message); }
  });
}

// ---------------------------------------------------------------- Inicio
function prepararDialogos() {
  document.querySelectorAll('dialog').forEach(d => {
    d.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('click', ev => { if (ev.target === d) d.close(); });
  });
}

export async function iniciar() {
  const estadoUrl = new URLSearchParams(location.search).get('estado');
  if (estadoUrl) history.replaceState(null, '', '/' + location.hash);
  prepararDialogos();
  prepararCrear();
  prepararComentarios();
  acceso.prepararAcceso();
  acceso.prepararReporte();
  iniciarWillaq();
  alCambiarSesion(pintarCuenta);
  await cargarSesion();
  await cargarFavoritos();
  try { (await api.lugares({ limite: 48 })).items.forEach(l => ctx.lugares.set(l.slug, l)); } catch { /* el muro mostrará el error */ }
  pintarEventosLaterales();

  if (estadoUrl === 'bienvenido' && estado.usuario) {
    avisar(`¡Hola, ${estado.usuario.nombre.split(' ')[0]}!`);
    let volver = null;
    try { volver = sessionStorage.getItem('ly_volver'); sessionStorage.removeItem('ly_volver'); } catch { /* */ }
    if (volver && volver.startsWith('#/')) location.hash = volver;
  } else if (['error', 'configuracion', 'suspendida', 'enlace-vencido'].includes(estadoUrl)) {
    pedirAcceso('', estadoUrl === 'enlace-vencido' ? 'recuperar' : 'entrar', mensajeEstadoAcceso(estadoUrl, cuentasActivas()));
  }
  window.addEventListener('hashchange', navegar);
  await navegar();
}

iniciar();
