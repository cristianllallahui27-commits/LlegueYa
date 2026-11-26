import { api } from '../api.js';
import { avatar, error, foto, insigniaConfianza, postViajero, vacio } from '../componentes.js';
import { confirmar } from '../confirmar.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { estado, pedirAcceso } from '../estado.js';
import { precioPlan } from '../util.js';
import { formularioNegocio, galeria } from './negocio.js';
import { cambiarSonido, sonar, sonidoActivo } from '../sonido.js';
import { abrirGuia } from '../guia.js';
import { borrarIntereses, tieneIntereses } from '../preferencias.js';
import { PERSONAS, dibujoPersona, guardarAvatar, leerAvatar, reducirFoto } from '../avatarlocal.js';
import { TIPOS } from '../util.js';

function miViaje(viajes, recargar) {
  if (!viajes.length) {
    return vacio('Aún no tienes un plan de viaje', 'Pídele a Willaq Uma que te arme uno y acéptalo si te gusta.',
      el('button', { class: 'boton boton-secundario', type: 'button',
        onclick: () => document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: 'Arma mi viaje de 2 días' })) }, 'Pedir un plan a Willaq Uma'));
  }
  return viajes.map(v => el('article', { class: 'tarjeta plan-viaje plan-guardado' },
    el('div', { class: 'admin-cabecera' }, el('h3', { class: 'crece' }, v.titulo),
      el('button', { class: 'boton boton-texto', type: 'button', onclick: async () => {
        if (!(await confirmar({ titulo: 'Quitar plan', mensaje: 'Se quitará este plan de tu espacio.', aceptar: 'Quitar', peligro: true }))) return;
        try { await api.eliminarViaje(v.id); avisar('Plan quitado'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Quitar')),
    el('ol', {}, v.dias.map(d => el('li', {}, el('strong', {}, `Día ${d.numero} · ${d.titulo}`),
      d.lugares.length ? el('ul', {}, d.lugares.map(l => el('li', {}, el('a', { href: `#/lugar/${l.slug}` }, l.nombre), ` — ${l.resumen}`))) : el('p', {}, 'Día libre'))))));
}

function miNegocio(solicitudes, rubros, planes, niveles, recargar) {
  const estados = { pendiente: 'En verificación', aprobada: 'Aprobada · patrocinado', rechazada: 'Rechazada' };
  return [
    solicitudes.map(s => el('article', { class: 'tarjeta admin-fila' },
      el('div', { class: 'admin-cabecera' }, icono('tienda'), el('div', { class: 'crece' }, el('strong', {}, s.negocio), el('span', {}, s.rubro_nombre)),
        el('span', { class: `etiqueta-estado ${s.estado === 'pendiente' ? 'revision' : s.estado === 'rechazada' ? 'demo' : ''}` }, estados[s.estado])),
      galeria(s.fotos, s.negocio),
      el('p', { class: 'nota' }, `Plan ${s.plan.nombre} · ${precioPlan(s.plan)}`,
        s.pago === 'pendiente' ? ' · Pago pendiente: te contactaremos para coordinarlo.' : ''),
      s.motivo ? el('p', { class: 'nota' }, `Motivo: ${s.motivo}`) : null,
      s.fin ? el('p', { class: 'nota' }, `Patrocinado hasta el ${new Date(s.fin).toLocaleDateString('es-PE')}`) : null)),
    formularioNegocio(rubros, planes, niveles, recargar),
  ];
}

function miCuenta(u) {
  const vista = el('div', { class: 'avatar-vista' }, avatar(u, 'avatar avatar-grande'));
  const repintar = () => vaciar(vista, avatar(u, 'avatar avatar-grande'));
  const iconos = el('div', { class: 'avatar-iconos', role: 'group', 'aria-label': 'Elige tu personaje' }, PERSONAS.map(([id, nombre]) =>
    el('button', { class: 'icono-opcion persona-opcion', type: 'button', 'aria-label': `Personaje ${PERSONAS.findIndex(x => x[0] === id) + 1}`,
      onclick: async () => { if (!(await confirmar({ titulo: 'Cambiar foto de perfil', mensaje: 'Usarás este personaje como tu foto de perfil.', aceptar: 'Guardar cambios' }))) return; try { guardarAvatar(u.id, { tipo: 'persona', persona: id }); repintar(); avisar('Foto de perfil actualizada'); } catch (e) { avisar(e.message); } } },
      dibujoPersona(id))));
  const archivo = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
  archivo.addEventListener('change', async () => {
    if (!archivo.files[0]) return;
    if (!(await confirmar({ titulo: 'Cambiar foto de perfil', mensaje: 'Esta foto se verá como tu foto de perfil en este navegador.', aceptar: 'Guardar cambios' }))) { archivo.value = ''; return; }
    try { guardarAvatar(u.id, { tipo: 'foto', data: await reducirFoto(archivo.files[0]) }); repintar(); avisar('Foto de perfil actualizada'); }
    catch (e) { avisar(e.message); }
  });
  const f1 = el('input', { id: 'clave-nueva', type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
  const f2 = el('input', { id: 'clave-repite', type: 'password', autocomplete: 'new-password', minlength: 8, required: true });
  const nota = el('p', { class: 'nota', role: 'status', 'aria-live': 'polite' });
  const form = el('form', { class: 'tarjeta form-plan', novalidate: true },
    el('h3', { class: 'titulo-bloque' }, 'Cambiar mi clave'),
    el('label', { class: 'etiqueta', for: 'clave-nueva' }, 'Clave nueva'), f1,
    el('label', { class: 'etiqueta', for: 'clave-repite' }, 'Repite la clave'), f2,
    nota, el('button', { class: 'boton boton-secundario', type: 'submit' }, 'Guardar clave'),
    el('p', { class: 'nota' }, '¿La olvidaste? Cierra sesión y usa «Recuperar clave»: te enviamos un enlace al correo.'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (f1.value !== f2.value) { nota.textContent = 'Las dos claves deben ser iguales.'; return; }
    if (!(await confirmar({ titulo: 'Cambiar tu clave', mensaje: 'Tu clave actual dejará de funcionar y usarás la nueva para entrar.', aceptar: 'Guardar clave' }))) return;
    nota.textContent = 'Guardando…';
    try { const r = await api.nuevaClave(f1.value); nota.textContent = (r.detail || 'Tu clave se actualizó.') + ' Si los avisos de seguridad están activados en el servidor, también te llegará un correo.'; form.reset(); }
    catch (e) { nota.textContent = e.message; }
  });
  const casillaSonido = el('input', { type: 'checkbox', checked: sonidoActivo() || null });
  casillaSonido.addEventListener('change', async () => {
    const activo = casillaSonido.checked;
    if (!(await confirmar({ titulo: 'Sonido al navegar', mensaje: activo ? 'Sonará una nota suave de quena al cambiar de sección.' : 'La navegación quedará en silencio.', aceptar: 'Guardar cambios' }))) { casillaSonido.checked = !activo; return; }
    cambiarSonido(activo);
    if (activo) sonar(2);
    avisar(activo ? 'Sonido activado' : 'Sonido apagado');
  });
  const preferencias = el('section', { class: 'tarjeta form-plan' },
    el('h3', { class: 'titulo-bloque' }, 'Preferencias'),
    el('label', { class: 'casilla' }, casillaSonido, 'Sonido suave al cambiar de sección (nota de quena)'),
    el('p', { class: 'nota' }, 'Se guarda en este navegador. Suena bajito y solo cuando tú tocas el menú.'),
    el('button', { class: 'boton boton-borde', type: 'button', onclick: () => abrirGuia(u) }, icono('explorar'), 'Ver la guía de LlegueYa'),
    el('p', { class: 'nota' }, 'Tu muro se ordena según los lugares que abres, los tipos que filtras y los destinos que buscas. Eso se guarda solo en este navegador y nunca se envía a LlegueYa.'),
    el('button', { class: 'boton boton-texto', type: 'button', onclick: async () => {
      if (!tieneIntereses()) { avisar('Aún no hay intereses guardados en este navegador.'); return; }
      if (!(await confirmar({ titulo: 'Borrar mis intereses', mensaje: 'Tu muro volverá a mostrarse sin preferencias hasta que explores de nuevo.', aceptar: 'Borrar', peligro: true }))) return;
      borrarIntereses(); avisar('Intereses borrados');
    } }, 'Borrar mis intereses'));
  return el('div', {},
    preferencias,
    el('section', { class: 'tarjeta form-plan' },
      el('h3', { class: 'titulo-bloque' }, 'Mi foto de perfil'), vista,
      el('p', { class: 'nota' }, 'Elige un personaje o sube una foto tuya. Se guarda en este navegador.'),
      iconos,
      el('div', { class: 'post-pie' },
        el('button', { class: 'boton boton-borde', type: 'button', onclick: () => archivo.click() }, icono('foto'), 'Subir mi foto'), archivo,
        el('button', { class: 'boton boton-texto', type: 'button', onclick: async () => { if (!(await confirmar({ titulo: 'Quitar foto de perfil', mensaje: 'Volverás a tu foto de cuenta o a tus iniciales.', aceptar: 'Quitar', peligro: true }))) return; guardarAvatar(u.id, null); repintar(); avisar('Volviste a tu foto de cuenta o iniciales'); } }, 'Quitar'))),
    form);
}

function rejillaLugares(items) {
  return el('div', { class: 'rejilla' }, items.map(l => el('a', { class: 'celda', href: `#/lugar/${l.slug}` },
    foto(l.portada, l.tipo, { alt: '', ancho: 480 }), el('span', { class: 'celda-texto' }, el('strong', {}, l.nombre)))));
}

export async function render(vista, ruta, ctx) {
  if (!estado.usuario) {
    vaciar(vista, el('section', {}, el('h1', { class: 'titulo-vista' }, 'Mi espacio'),
      vacio('Tu espacio de viaje', 'Inicia sesión para ver tus publicaciones, lo que guardaste y tus lugares favoritos.',
        el('button', { class: 'boton boton-principal', type: 'button', onclick: () => pedirAcceso() }, 'Iniciar sesión'))));
    return;
  }
  vaciar(vista, el('p', { class: 'cargando' }, 'Cargando tu espacio…'));
  let mio, favoritos, viajes, solicitudes, rubros, planes;
  try {
    [mio, favoritos, viajes, solicitudes, rubros, planes] = await Promise.all([api.miComunidad(), api.favoritos(),
      api.misViajes(), api.misSolicitudes(), api.rubros(), api.planes()]);
  }
  catch (e) { vaciar(vista, error(e.message, () => render(vista, ruta, ctx))); return; }

  const u = estado.usuario;
  const panel = el('div', { role: 'tabpanel' });
  const pestanas = [
    ['Publicaciones', () => mio.publicaciones.length
      ? el('div', { class: 'muro' }, mio.publicaciones.map(p => postViajero(p, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares })))
      : vacio('Aún no publicas', 'Comparte una foto o un consejo de tu viaje.',
          el('button', { class: 'boton boton-principal', type: 'button', onclick: () => document.dispatchEvent(new CustomEvent('ly:crear')) }, 'Compartir experiencia'))],
    ['Guardados', () => mio.guardadas.length
      ? el('div', { class: 'muro' }, mio.guardadas.map(p => postViajero(p, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares })))
      : vacio('Nada guardado todavía', 'Toca el marcador de una publicación para encontrarla aquí después.')],
    ['Mis lugares', () => favoritos.items.length ? rejillaLugares(favoritos.items)
      : vacio('Sin lugares guardados', 'Guarda lugares desde Explorar para armar tu viaje.', el('a', { class: 'boton boton-secundario', href: '#/explorar' }, 'Explorar'))],
    ['Mi viaje', () => miViaje(viajes.items, () => render(vista, { ...ruta, filtros: { pestana: 'viaje' } }, ctx))],
    ['Mi cuenta', () => miCuenta(u)],
    ['Mi negocio', () => miNegocio(solicitudes.items, rubros.rubros, planes.planes, planes.niveles, () => render(vista, { ...ruta, filtros: { pestana: 'negocio' } }, ctx))],
  ];
  const barra = el('div', { class: 'pestanas', role: 'tablist' });
  const elegir = i => {
    [...barra.children].forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    vaciar(panel, pestanas[i][1]());
  };
  pestanas.forEach(([nombre], i) => barra.append(el('button', { type: 'button', role: 'tab', onclick: () => elegir(i) }, nombre)));

  vaciar(vista, el('section', {},
    el('header', { class: 'perfil-cabecera' }, avatar(u),
      el('div', {}, el('h1', {}, u.nombre), insigniaConfianza(mio.reputacion),
        el('ul', { class: 'perfil-numeros' },
          el('li', {}, el('b', {}, mio.publicaciones.length), el('span', {}, 'publicaciones')),
          el('li', {}, el('b', {}, mio.guardadas.length), el('span', {}, 'guardados')),
          el('li', {}, el('b', {}, favoritos.items.length), el('span', {}, 'lugares')),
          el('li', {}, el('b', {}, mio.reputacion ? mio.reputacion.likes : 0), el('span', {}, 'me gusta recibidos'))))),
    el('br'), barra, panel));
  const cab = vista.querySelector('.perfil-cabecera');
  document.addEventListener('ly:avatar', () => { if (cab.isConnected) cab.firstElementChild.replaceWith(avatar(u)); });
  elegir({ viaje: 3, cuenta: 4, negocio: 5 }[ruta.filtros && ruta.filtros.pestana] || 0);
}
