// Piezas visuales reutilizables: publicaciones, tarjetas de lugar, avatar, foto.
import { compartir as compartirEnlace } from './compartir.js';
import { api } from './api.js';
import { avisar, el, icono } from './dom.js';
import { conSesion, estado, pedirAcceso } from './estado.js';
import { dibujoPersona, leerAvatar } from './avatarlocal.js';
import { registrarInteres } from './preferencias.js';
import { TIPOS, etiquetaTipo, iniciales, textoComentarios, textoLikes, tiempoRelativo } from './util.js';

// Icono simple de la categoría (cerámica, plato, pirámide…). Si el tipo no existe usa el pin genérico.
export function iconoTipo(tipo, clase = 'ico ico-tipo') {
  return icono(`tipo-${Object.hasOwn(TIPOS, tipo) ? tipo : 'otro'}`, clase);
}

export function etiquetaCategoria(tipo) {
  return el('span', { class: `etiqueta-estado categoria tipo-${tipo}` }, iconoTipo(tipo, 'ico ico-mini'), etiquetaTipo(tipo));
}

export function avatar(persona, clase = 'avatar') {
  // Si la persona eligió su propia foto o ícono en este navegador, se usa para su propia cuenta.
  const propio = persona && estado.usuario && persona.id && persona.id === estado.usuario.id ? leerAvatar(persona.id) : null;
  if (propio && propio.tipo === 'foto') return el('img', { class: clase, src: propio.data, alt: '', width: 36, height: 36 });
  if (propio && propio.tipo === 'persona') return el('span', { class: `${clase} avatar-persona`, 'aria-hidden': 'true' }, dibujoPersona(propio.persona));
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
    iconoTipo(tipo, 'ico ico-sinfoto'), el('span', {}, 'Aún sin foto con licencia libre.', el('br'), 'Comparte la tuya.'));
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
  const pista = el('div', { class: 'carrusel', tabindex: fotos.length > 1 ? '0' : null, role: 'group', 'aria-roledescription': 'carrusel',
    'aria-label': `Fotos de ${nombre}` }, fotos.map((f, i) => foto(f, tipo, { alt: (f && f.descripcion) || nombre, carga: i ? 'lazy' : 'eager' })));
  if (fotos.length < 2) return [pista];
  const puntos = el('div', { class: 'puntos', 'aria-hidden': 'true' }, fotos.map((_, i) => el('i', { class: i ? '' : 'activo' })));
  const contador = el('span', { class: 'contador-fotos', 'aria-hidden': 'true' }, `1 / ${fotos.length}`);
  const ir = delta => {
    const n = fotos.length;
    const actual = Math.round(pista.scrollLeft / pista.clientWidth);
    pista.scrollTo({ left: ((actual + delta + n) % n) * pista.clientWidth, behavior: 'smooth' });
  };
  // Los botones pueden estar dentro de un enlace (muro): no deben abrir la ficha.
  const flecha = (delta, nombreIcono, etiqueta) => el('button', { class: `flecha-foto ${delta < 0 ? 'ant' : 'sig'}`, type: 'button', 'aria-label': etiqueta,
    onclick: ev => { ev.preventDefault(); ev.stopPropagation(); ir(delta); } }, icono(nombreIcono));
  pista.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(-1); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(1); }
  });
  pista.addEventListener('scroll', () => {
    const i = Math.round(pista.scrollLeft / pista.clientWidth);
    [...puntos.children].forEach((p, j) => p.classList.toggle('activo', i === j));
    contador.textContent = `${i + 1} / ${fotos.length}`;
    pista.dispatchEvent(new CustomEvent('ly:foto', { detail: i, bubbles: true }));
  }, { passive: true });
  pista.irA = i => pista.scrollTo({ left: i * pista.clientWidth, behavior: 'smooth' });
  autoAvanzar(pista, () => ir(1));
  return [pista, flecha(-1, 'anterior', 'Foto anterior'), flecha(1, 'siguiente', 'Foto siguiente'), contador, puntos];
}

// Avance automático del carrusel: se mueve solo cada pocos segundos, con un leve acercamiento a la foto
// visible. Se pausa con el cursor encima, al enfocar, fuera de pantalla, con la pestaña oculta o si la
// persona pidió menos movimiento en su sistema.
const MENOS_MOVIMIENTO = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
function autoAvanzar(pista, siguiente, intervalo = 5500) {
  pista.classList.add('carrusel-vivo');
  let pausa = false, visible = false;
  const marcar = () => {
    const i = Math.round(pista.scrollLeft / Math.max(pista.clientWidth, 1));
    [...pista.children].forEach((f, j) => f.classList.toggle('foto-activa', i === j));
  };
  marcar();
  pista.addEventListener('ly:foto', marcar);
  const parar = () => { pausa = true; }, seguir = () => { pausa = false; };
  const raiz = () => pista.parentElement || pista;
  pista.addEventListener('pointerenter', parar);
  pista.addEventListener('pointerleave', seguir);
  pista.addEventListener('focusin', parar);
  pista.addEventListener('focusout', seguir);
  pista.addEventListener('touchstart', () => { pausa = true; setTimeout(seguir, 8000); }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { threshold: 0.5 }).observe(pista);
  else visible = true;
  const reloj = setInterval(() => {
    if (!pista.isConnected) { clearInterval(reloj); return; }
    if (raiz().matches(':hover')) return;
    if (!pausa && visible && !document.hidden && !MENOS_MOVIMIENTO.matches) siguiente();
  }, intervalo);
}

// Carrusel para fotos subidas por un negocio (rutas simples, sin autor ni licencia).
export function carruselNegocio(rutas, nombre) {
  if (!rutas || !rutas.length) return null;
  const fotos = rutas.map((url, i) => ({ url, descripcion: `${nombre}, foto ${i + 1}` }));
  return el('div', { class: 'post-media galeria-negocio' }, carrusel(fotos, 'servicio', nombre));
}

// Visor a pantalla completa: flechas del teclado, Esc para cerrar y créditos de cada foto.
function abrirVisor(fotos, inicio, nombre) {
  const lista = fotos.filter(Boolean);
  if (!lista.length) return;
  let i = Math.min(inicio, lista.length - 1);
  const img = el('img', { alt: '' });
  const pie = el('p', { class: 'visor-pie', 'aria-live': 'polite' });
  const dialogo = el('dialog', { class: 'visor', 'aria-label': `Fotos de ${nombre}` });
  const pintar = () => {
    const f = lista[i];
    img.src = f.url.replace(/width=\d+/, 'width=1600');
    img.alt = f.descripcion || nombre;
    pie.textContent = `${i + 1} de ${lista.length} · Foto: ${f.autor}, ${f.licencia}`;
  };
  const mover = d => { i = (i + d + lista.length) % lista.length; pintar(); };
  dialogo.append(
    el('button', { class: 'visor-cerrar boton-icono', type: 'button', 'aria-label': 'Cerrar fotos', onclick: () => dialogo.close() }, icono('cerrar')),
    lista.length > 1 ? el('button', { class: 'flecha-foto ant', type: 'button', 'aria-label': 'Foto anterior', onclick: () => mover(-1) }, icono('anterior')) : null,
    img,
    lista.length > 1 ? el('button', { class: 'flecha-foto sig', type: 'button', 'aria-label': 'Foto siguiente', onclick: () => mover(1) }, icono('siguiente')) : null,
    pie);
  dialogo.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft') mover(-1); if (ev.key === 'ArrowRight') mover(1); });
  dialogo.addEventListener('click', ev => { if (ev.target === dialogo) dialogo.close(); });
  dialogo.addEventListener('close', () => dialogo.remove());
  document.body.append(dialogo);
  pintar();
  dialogo.showModal();
}

export function galeria(fotos, tipo, nombre, clase = 'post-media') {
  const lista = fotos && fotos.length ? fotos : [null];
  const contenedor = el('div', { class: clase }, carrusel(lista, tipo, nombre));
  const primera = lista[0];
  if (primera) contenedor.append(credito(primera));
  const pista = contenedor.querySelector('.carrusel');
  if (lista.length > 1) {
    pista.addEventListener('ly:foto', ev => {
      const f = lista[ev.detail];
      const c = contenedor.querySelector('.credito');
      if (f && c) { c.textContent = `Foto: ${f.autor}`; c.href = f.fuente_url; c.title = `${f.autor} · ${f.licencia}`; }
    });
  }
  if (clase !== 'ficha-portada') return contenedor;
  // Ficha: tocar la foto la abre grande y debajo van las miniaturas para saltar a cualquiera.
  if (primera) {
    pista.classList.add('ampliable');
    pista.addEventListener('click', ev => {
      if (ev.target.closest('.flecha-foto')) return;
      abrirVisor(lista, Math.round(pista.scrollLeft / pista.clientWidth), nombre);
    });
  }
  if (lista.length < 2) return contenedor;
  const miniaturas = el('div', { class: 'miniaturas', role: 'group', 'aria-label': 'Todas las fotos' }, lista.map((f, i) =>
    el('button', { class: `miniatura${i ? '' : ' activa'}`, type: 'button', 'aria-label': `Ver foto ${i + 1} de ${lista.length}`, onclick: () => pista.irA(i) },
      foto(f, tipo, { alt: '', ancho: 160 }))));
  pista.addEventListener('ly:foto', ev => [...miniaturas.children].forEach((m, j) => m.classList.toggle('activa', j === ev.detail)));
  return el('div', { class: 'galeria-ficha' }, contenedor, miniaturas);
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
  // Nombre y categoría en una sola fila sobre un degradado suave al pie de la foto (la imagen manda).
  const placa = el('div', { class: 'placa-foto' }, el('strong', {}, l.nombre), etiquetaCategoria(l.tipo));
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
    el('div', { class: 'post-foto' }, media, placa),
    el('div', { class: 'post-acciones' },
      el('a', { class: 'accion', href: `#/lugar/${l.slug}`, 'aria-label': 'Ver ficha' }, icono('explorar')),
      botonAccion('chat', `Preguntar a Willaq Uma por ${l.nombre}`, false, () => {
        document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: `Cuéntame sobre ${l.nombre}` }));
      }),
      botonAccion('compartir', 'Compartir', false, () => compartirEnlace({ tipo: 'lugar', ref: l.slug, etiqueta: l.nombre })),
      el('span', { class: 'derecha' }, guardar)),
    el('div', { class: 'post-cuerpo' },
      el('p', { class: 'post-texto' }, l.resumen),
      el('div', { class: 'post-cta' },
        el('button', { class: 'boton boton-principal boton-ancho', type: 'button',
          onclick: () => document.dispatchEvent(new CustomEvent('ly:crear', { detail: { lugar: l.slug } })) },
        icono('foto'), `Sube tu foto de ${l.nombre}`),
        el('a', { class: 'enlace-suave', href: `#/lugar/${l.slug}` }, 'Ver ficha'))));
}

// ---------------------------------------------------------------- Publicación de viajero
// Insignia de reputación: depende de los me gusta que recibió el autor en sus publicaciones.
export function insigniaConfianza(rep, clase = 'insignia-confianza') {
  if (!rep || !rep.nivel) return null;
  return el('span', { class: `${clase} nivel-${rep.nivel}`, title: `${rep.etiqueta}: ${rep.likes} me gusta recibidos` },
    icono('escudo', 'ico ico-mini'), rep.etiqueta);
}

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
        if (activo && lugar) registrarInteres({ lugar: lugar.slug, tipo: lugar.tipo, destino: lugar.destino }, 2);
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

  const rep = p.autor_reputacion;
  return el('article', { class: `post${rep && rep.nivel ? ` post-${rep.nivel}` : ''}`, dataset: { id: p.id } },
    el('header', { class: 'post-cabecera' }, avatar(p.autor),
      el('div', { class: 'post-autor' },
        el('strong', {}, p.autor.nombre), insigniaConfianza(rep),
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
      botonAccion('compartir', 'Compartir', false, () => compartirEnlace({ tipo: 'publicacion', ref: p.id, etiqueta: `Publicación de ${p.autor.nombre}` })),
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

// «Cómo llegar en transporte público»: paraderos de colectivos o terminal, pasaje y tiempo aproximados.
// «Cómo llegar» en un solo bloque: pasaje, tiempo y terminales; cada terminal abre la ruta en Google Maps.
export function bloqueTransporte(t, aviso, destino, porTuCuenta = '') {
  const q = encodeURIComponent;
  const ruta = p => (destino && destino.lat != null
    ? `https://www.google.com/maps/dir/?api=1&origin=${q(p.mapa)}&destination=${destino.nombre ? q(`${destino.nombre}, Ayacucho, Perú`) : `${destino.lat},${destino.lon}`}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${q(p.mapa)}`);
  return el('div', { class: 'transporte' },
    el('div', { class: 'transporte-datos' },
      el('div', {}, el('dt', {}, 'Pasaje aproximado'), el('dd', {}, t.tarifa)),
      el('div', {}, el('dt', {}, 'Tiempo'), el('dd', {}, t.tiempo))),
    porTuCuenta ? el('p', { class: 'aviso-terminales' }, icono('escudo', 'ico ico-mini'), ` ${porTuCuenta}`) : null,
    el('ul', { class: 'paraderos' }, t.paraderos.map(p => el('li', {},
      el('a', { class: 'paradero', href: ruta(p), target: '_blank', rel: 'noopener noreferrer' },
        icono('bus', 'ico'), el('span', {}, el('strong', {}, p.nombre), el('small', {}, `${p.tipo || 'Paradero'} · ${p.referencia}`)), icono('siguiente', 'ico ico-mini')),
      p.id ? el('a', { class: 'paradero-mapa', href: `#/mapa?terminal=${p.id}` }, icono('mapa', 'ico ico-mini'), 'Ver en el mapa') : null))),
    t.nota ? el('p', {}, t.nota) : null,
    el('p', { class: 'nota' }, aviso, ' Fuentes: ',
      t.fuentes.map((f, i) => [i ? ', ' : '', el('a', { href: f.url, target: '_blank', rel: 'noopener noreferrer' }, f.nombre)])));
}

// Paquetes y agencias verificadas que llevan a un lugar.
export function tarjetaPaquete(n) {
  const soles = v => `desde S/ ${Number(v).toFixed(2).replace(/\.00$/, '')}`;
  return el('article', { class: 'paquete' },
    el('header', {}, el('strong', {}, n.negocio), n.patrocinado ? el('span', { class: 'etiqueta-estado patrocinio' }, 'Patrocinado') : null),
    el('p', { class: 'post-meta' }, n.rubro_nombre, n.direccion ? ` · ${n.direccion}` : ''),
    n.descripcion ? el('p', {}, n.descripcion) : null,
    n.ofertas && n.ofertas.length ? el('ul', { class: 'ofertas' }, n.ofertas.slice(0, 4).map(o =>
      el('li', {}, el('span', {}, o.nombre), o.precio_desde ? el('b', {}, soles(o.precio_desde)) : null))) : null,
    el('p', { class: 'nota' }, icono('escudo', 'ico ico-mini'), ' Verificado por LlegueYa',
      n.contacto ? ` · Contacto: ${n.contacto}` : ' · Inicia sesión para ver el contacto'));
}
