import { api } from '../api.js';
import { avatar, error, foto, postLugar, postViajero, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { estado, pedirAcceso } from '../estado.js';
import { intercalar } from '../util.js';

function historias(destinos) {
  return el('nav', { class: 'historias', 'aria-label': 'Destinos' },
    destinos.map(d => el('a', { class: 'historia', href: `#/explorar?destino=${encodeURIComponent(d.nombre)}` },
      el('span', { class: 'historia-arco' }, foto(d.portada, 'natural', { alt: '', ancho: 240 })),
      el('span', {}, d.nombre))));
}

function patrocinado(a) {
  return el('article', { class: 'post patrocinado' },
    el('header', { class: 'post-cabecera' }, el('span', { class: 'avatar avatar-letra' }, icono('tienda', 'ico ico-mini')),
      el('div', { class: 'post-autor' }, el('strong', {}, a.negocio), el('span', { class: 'post-meta' }, a.rubro)),
      el('span', { class: 'etiqueta-estado patrocinio' }, 'Patrocinado')),
    el('div', { class: 'post-cuerpo' },
      el('p', { class: 'post-texto' }, a.descripcion),
      el('div', { class: 'post-pie' },
        el('span', { class: 'etiqueta-estado' }, icono('escudo', 'ico ico-mini'), ' Verificado por LlegueYa'),
        el('span', { class: 'nota' }, `Contacto: ${a.contacto}`),
        a.enlace ? el('a', { class: 'enlace-suave', href: a.enlace, target: '_blank', rel: 'noopener sponsored' }, 'Ver más') : null)));
}

function compositor() {
  const abrir = () => document.dispatchEvent(new CustomEvent('ly:crear'));
  return el('div', { class: 'tarjeta compositor' },
    avatar(estado.usuario),
    el('button', { class: 'campo', type: 'button', onclick: abrir },
      estado.usuario ? `¿Qué descubriste hoy, ${estado.usuario.nombre.split(' ')[0]}?` : '¿Qué descubriste en Ayacucho?'),
    el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Agregar foto', onclick: abrir }, icono('foto')));
}

export async function render(vista, ruta, ctx) {
  vaciar(vista, el('p', { class: 'cargando' }, 'Cargando el muro…'));
  let destinos, lugares, muro, anuncios = [];
  try {
    [destinos, lugares, muro] = await Promise.all([api.destinos(), api.lugares({ limite: 24 }), api.muro({ limite: 10 })]);
    try { anuncios = (await api.anuncios()).anuncios; } catch { anuncios = []; }
  } catch (e) {
    vaciar(vista, error(e.message, () => render(vista, ruta, ctx)));
    return;
  }
  const lista = el('div', { class: 'muro' });
  let siguiente = muro.siguiente;
  const pintar = items => {
    for (const item of items) {
      lista.append(item.tipo === 'lugar'
        ? postLugar(item.dato, { favoritos: ctx.favoritos })
        : postViajero(item.dato, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares }));
    }
  };
  pintar(intercalar(muro.items, lugares.items, 2));
  // Publicidad identificada: negocios verificados por LlegueYa, siempre marcados como patrocinados.
  anuncios.forEach((a, i) => {
    const posicion = lista.children[1 + i * 4];
    const tarjeta = patrocinado(a);
    posicion ? posicion.after(tarjeta) : lista.append(tarjeta);
  });

  const masBoton = el('button', { class: 'boton boton-borde', type: 'button' }, 'Cargar más experiencias');
  masBoton.addEventListener('click', async () => {
    masBoton.disabled = true;
    try {
      const r = await api.muro({ desde: siguiente, limite: 10 });
      siguiente = r.siguiente;
      pintar(r.items.map(dato => ({ tipo: 'publicacion', dato })));
    } catch (e) { masBoton.after(error(e.message)); }
    masBoton.disabled = false;
    masBoton.hidden = siguiente === null;
  });
  masBoton.hidden = siguiente === null;

  const invitacion = muro.items.length ? null : vacio('Todavía no hay experiencias publicadas',
    'Las fotos y consejos de los viajeros aparecerán aquí. Mientras tanto, mira los lugares del catálogo.',
    el('button', { class: 'boton boton-principal', type: 'button',
      onclick: () => (estado.usuario ? document.dispatchEvent(new CustomEvent('ly:crear')) : pedirAcceso('Inicia sesión para compartir tu primera experiencia.')) },
    'Compartir la primera'));

  vaciar(vista, el('div', {}, historias(destinos.destinos), compositor(), invitacion,
    lista, el('p', {}, masBoton)));
}
