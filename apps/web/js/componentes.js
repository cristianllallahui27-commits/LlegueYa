// Piezas visuales reutilizables: publicaciones, tarjetas de lugar, avatar, foto.
import { api } from './api.js';
import { avisar, el, icono } from './dom.js';
import { conSesion, estado, pedirAcceso } from './estado.js';
import { etiquetaTipo, iniciales, textoComentarios, textoLikes, tiempoRelativo } from './util.js';

export function avatar(persona, clase = 'avatar') {
  if (persona && persona.avatar) {
    return el('img', { class: clase, src: persona.avatar, alt: '', referrerpolicy: 'no-referrer', width: 36, height: 36 });
  }
  return el('span', { class: `${clase} avatar-letra`, 'aria-hidden': 'true' }, iniciales(persona && persona.nombre));
}

export function avatarCatalogo() {
  return el('img', { class: 'avatar avatar-arco', src: 'logo.png', alt: '', width: 36, height: 36 });
}

// Foto con respaldo honesto: si no hay foto libre o no carga, se muestra una ilustración.
export function foto(f, tipo, { alt = '', carga = 'lazy', ancho = 1080 } = {}) {
  const respaldo = () => el('div', { class: `sin-foto ${tipo || ''}`, role: 'img', 'aria-label': alt || 'Sin foto' },
    el('span', {}, 'Aún sin foto con licencia libre.', el('br'), 'Comparte la tuya.'));
  if (!f) return respaldo();
  const img = el('img', { src: f.url.replace(/width=\d+/, `width=${ancho}`), alt: alt || f.descripcion || '', loading: carga, decoding: 'async' });
  img.addEventListener('error', () => img.replaceWith(respaldo()), { once: true });
  return img;
}

export function credito(f) {
  if (!f) return null;
  return el('a', { class: 'credito', href: f.fuente_url, target: '_blank', rel: 'noopener', title: `${f.autor} · ${f.licencia}` },
    `Foto: ${f.autor}`);
}

function carrusel(fotos, tipo, nombre) {
  const pista = el('div', { class: 'carrusel' }, fotos.map((f, i) => foto(f, tipo, { alt: (f && f.descripcion) || nombre, carga: i ? 'lazy' : 'eager' })));
  if (fotos.length < 2) return [pista];
  const puntos = el('div', { class: 'puntos', 'aria-hidden': 'true' }, fotos.map((_, i) => el('i', { class: i ? '' : 'activo' })));
  pista.addEventListener('scroll', () => {
    const i = Math.round(pista.scrollLeft / pista.clientWidth);
    [...puntos.children].forEach((p, j) => p.classList.toggle('activo', i === j));
  }, { passive: true });
  return [pista, puntos];
}

export function galeria(fotos, tipo, nombre, clase = 'post-media') {
  const lista = fotos && fotos.length ? fotos : [null];
  const contenedor = el('div', { class: clase }, carrusel(lista, tipo, nombre));
  const primera = lista[0];
  if (primera) contenedor.append(credito(primera));
  if (lista.length > 1) {
    const pista = contenedor.querySelector('.carrusel');
    pista.addEventListener('scroll', () => {
      const f = lista[Math.round(pista.scrollLeft / pista.clientWidth)];
      const c = contenedor.querySelector('.credito');
      if (f && c) { c.textContent = `Foto: ${f.autor}`; c.href = f.fuente_url; c.title = `${f.autor} · ${f.licencia}`; }
    }, { passive: true });
  }
  return contenedor;
}

function botonAccion(nombreIcono, etiqueta, presionado, alPulsar) {
  const b = el('button', { class: 'accion', type: 'button', 'aria-label': etiqueta, 'aria-pressed': String(Boolean(presionado)) },
    icono(nombreIcono));
  b.addEventListener('click', () => alPulsar(b));
  return b;
}

async function compartir(url, titulo) {
  const enlace = new URL(url, location.origin).href;
  try {
    if (navigator.share) await navigator.share({ title: titulo, url: enlace });
    else { await navigator.clipboard.writeText(enlace); avisar('Enlace copiado'); }
  } catch { /* el usuario canceló */ }
}

// ---------------------------------------------------------------- Lugar en el muro
export function postLugar(l, { favoritos = new Set() } = {}) {
  const guardado = favoritos.has(l.slug);
  const fotos = l.fotos || (l.portada ? [l.portada] : []);
  const media = el('a', { href: `#/lugar/${l.slug}`, 'aria-label': `Abrir ${l.nombre}` }, galeria(fotos, l.tipo, l.nombre));
  const guardar = botonAccion('guardar', guardado ? 'Quitar de mis lugares' : 'Guardar lugar', guardado,
    conSesion('Inicia sesión para guardar lugares y armar tu viaje.', async b => {
      const activo = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(activo));
      try {
        await api.favorito(l.slug, activo);
        activo ? favoritos.add(l.slug) : favoritos.delete(l.slug);
        avisar(activo ? 'Guardado en tus lugares' : 'Quitado de tus lugares');
      } catch (e) { b.setAttribute('aria-pressed', String(!activo)); avisar(e.message); }
    }));
  return el('article', { class: 'post lugar' },
    el('header', { class: 'post-cabecera' }, avatarCatalogo(),
      el('div', { class: 'post-autor' },
        el('strong', {}, 'Catálogo LlegueYa'),
        el('span', { class: 'post-meta' }, icono('pin', 'ico ico-mini'), el('a', { href: `#/explorar?destino=${encodeURIComponent(l.destino)}` }, l.zona))),
      l.demostracion ? el('span', { class: 'etiqueta-estado demo', title: 'Información de prueba revisada en fuentes públicas' }, 'Demostración') : null),
    media,
    el('div', { class: 'post-acciones' },
      el('a', { class: 'accion', href: `#/lugar/${l.slug}`, 'aria-label': 'Ver ficha' }, icono('explorar')),
      botonAccion('chat', `Preguntar a Willaq Uma por ${l.nombre}`, false, () => {
        document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: `Cuéntame sobre ${l.nombre}` }));
      }),
      botonAccion('compartir', 'Compartir', false, () => compartir(`/#/lugar/${l.slug}`, l.nombre)),
      el('span', { class: 'derecha' }, guardar)),
    el('div', { class: 'post-cuerpo' },
      el('p', { class: 'post-texto' }, el('strong', {}, l.nombre), l.resumen),
      el('div', { class: 'post-pie' }, el('span', { class: 'etiqueta-estado' }, etiquetaTipo(l.tipo)),
        el('a', { class: 'enlace-suave', href: `#/lugar/${l.slug}` }, estado.usuario ? 'Ver cómo llegar' : 'Ver ficha'))));
}

// ---------------------------------------------------------------- Publicación de viajero
export function postViajero(p, { alComentar, alReportar, lugares = new Map() } = {}) {
  const lugar = p.lugar_slug ? lugares.get(p.lugar_slug) : null;
  const likes = el('p', { class: 'post-likes' }, textoLikes(p.likes));
  let total = p.likes;

  const meGusta = botonAccion('corazon', 'Me gusta', p.me_gusta,
    conSesion('Inicia sesión para dar me gusta.', async b => {
      const activo = b.getAttribute('aria-pressed') !== 'true';
      // Respuesta optimista y reversible (SDD 7.5): si falla, se deshace y se avisa.
      b.setAttribute('aria-pressed', String(activo));
      b.classList.toggle('latido', activo);
      total += activo ? 1 : -1;
      likes.textContent = textoLikes(total);
      try {
        const r = await api.like('publicacion', p.id, activo);
        total = r.likes; likes.textContent = textoLikes(total);
      } catch (e) {
        b.setAttribute('aria-pressed', String(!activo));
        total += activo ? -1 : 1; likes.textContent = textoLikes(total);
        avisar(e.message);
      }
    }));

  const guardar = botonAccion('guardar', 'Guardar publicación', p.guardada,
    conSesion('Inicia sesión para guardar publicaciones.', async b => {
      const activo = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(activo));
      try { await api.guardar(p.id, activo); avisar(activo ? 'Guardado' : 'Quitado de guardados'); }
      catch (e) { b.setAttribute('aria-pressed', String(!activo)); avisar(e.message); }
    }));

  const verComentarios = el('button', { class: 'ver-comentarios', type: 'button' }, textoComentarios(p.comentarios));
  const abrir = () => alComentar && alComentar(p, n => { verComentarios.textContent = textoComentarios(n); });
  verComentarios.addEventListener('click', abrir);

  return el('article', { class: 'post', dataset: { id: p.id } },
    el('header', { class: 'post-cabecera' }, avatar(p.autor),
      el('div', { class: 'post-autor' },
        el('strong', {}, p.autor.nombre),
        el('span', { class: 'post-meta' },
          el('time', { datetime: p.creado_en }, tiempoRelativo(p.creado_en)),
          lugar ? [' · ', el('a', { href: `#/lugar/${lugar.slug}` }, lugar.nombre)] : null)),
      p.estado === 'en_revision' ? el('span', { class: 'etiqueta-estado revision', title: 'Solo tú la ves hasta que se apruebe' }, 'En revisión') : null,
      alReportar && !(estado.usuario && estado.usuario.id === p.autor.id)
        ? el('button', { class: 'boton-icono post-reportar', type: 'button', 'aria-label': `Reportar publicación de ${p.autor.nombre}`, title: 'Reportar', onclick: () => alReportar(p) }, icono('bandera'))
        : null),
    p.foto_url ? el('div', { class: 'post-media' }, el('img', { src: p.foto_url, alt: `Foto de ${p.autor.nombre}`, loading: 'lazy' })) : null,
    el('div', { class: 'post-acciones' }, meGusta,
      botonAccion('comentario', 'Comentar', false, abrir),
      botonAccion('compartir', 'Compartir', false, () => compartir('/#/inicio', 'LlegueYa')),
      el('span', { class: 'derecha' }, guardar)),
    el('div', { class: 'post-cuerpo' }, likes,
      p.texto ? el('p', { class: 'post-texto' }, el('strong', {}, p.autor.nombre), p.texto) : null,
      verComentarios));
}

export function vacio(titulo, texto, accion) {
  return el('div', { class: 'vacio' }, el('h3', {}, titulo), el('p', {}, texto), accion || null);
}

export function error(mensaje, reintentar) {
  return el('div', { class: 'error', role: 'alert' }, mensaje, ' ',
    reintentar ? el('button', { class: 'boton boton-texto', type: 'button', onclick: reintentar }, 'Reintentar') : null);
}

export { pedirAcceso };
