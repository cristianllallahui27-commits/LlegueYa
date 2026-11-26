import { api } from '../api.js';
import { botonWhatsapp } from './negocio.js';
import { avatar, error, foto, iconoTipo, insigniaConfianza, postViajero, vacio } from '../componentes.js';
import { el, icono, vaciar } from '../dom.js';
import { estado, pedirAcceso } from '../estado.js';
import { TIPOS } from '../util.js';
import { ordenarPorInteres } from '../preferencias.js';

function historias(destinos) {
  return el('nav', { class: 'historias', 'aria-label': 'Destinos' },
    el('h2', { class: 'titulo-seccion' }, 'Destinos ', el('span', {}, 'de Ayacucho')),
    el('div', { class: 'historias-fila' }, destinos.map(d => el('a', { class: 'historia', href: `#/explorar?destino=${encodeURIComponent(d.nombre)}` },
      el('span', { class: 'historia-arco' }, foto(d.portada, 'natural', { alt: '', ancho: 240 })),
      el('span', {}, d.nombre)))));
}

// Portada: una foto real del destino al fondo, titular grande y dos acciones claras.
function portada(fondo) {
  const categorias = ['arqueologico', 'natural', 'cultural', 'gastronomia', 'artesania', 'aventura'];
  return el('section', { class: 'portada-turistica con-fondo', 'aria-label': 'Descubre Ayacucho' },
    fondo ? el('div', { class: 'portada-fondo', 'aria-hidden': 'true' }, foto(fondo, 'natural', { alt: '', ancho: 1200, carga: 'eager' })) : null,
    el('div', { class: 'portada-contenido' },
      el('p', { class: 'portada-etiqueta' }, el('span', { 'aria-hidden': 'true' }), 'Ayacucho · Perú'),
      el('h1', {}, 'Ayacucho ', el('mark', {}, 'se vive'), ',', el('br'), 'se comparte y se recomienda'),
      el('p', {}, 'Fotos reales de viajeros, lugares con historia y negocios verificados, en un solo lugar.'),
      el('nav', { class: 'categorias', 'aria-label': 'Categorías' }, categorias.map(t =>
        el('a', { class: `categoria tipo-${t}`, href: `#/explorar?tipo=${t}` }, iconoTipo(t, 'ico ico-categoria'), el('span', {}, TIPOS[t]))))));
}

// Viajeros con más me gusta recibidos: se muestran solo cuando ya existen.
function viajerosDestacados(lista) {
  if (!lista.length) return null;
  return el('section', { class: 'tarjeta destacados', 'aria-label': 'Viajeros destacados' },
    el('h2', {}, 'Viajeros en los que más se confía'),
    el('ul', {}, lista.map(({ autor, reputacion }) => el('li', {},
      avatar(autor), el('span', { class: 'destacado-datos' }, el('strong', {}, autor.nombre), insigniaConfianza(reputacion),
        el('small', {}, `${reputacion.likes} me gusta recibidos`))))));
}

const SOLES = n => (n === null || n === undefined ? '' : `desde S/ ${Number(n).toFixed(2).replace(/\.00$/, '')}`);

// Publicidad identificada. Cuanto mayor el plan del negocio, más detalle y más presencia.
function patrocinado(a) {
  const nivel = a.nivel || 'basico';
  const ofertas = (a.ofertas || []).slice(0, nivel === 'premium' ? 4 : 2);
  return el('article', { class: `post patrocinado nivel-${nivel}` },
    el('header', { class: 'post-cabecera' }, el('span', { class: 'avatar avatar-letra' }, icono('tienda', 'ico ico-mini')),
      el('div', { class: 'post-autor' }, el('strong', {}, a.negocio), el('span', { class: 'post-meta' }, a.rubro, a.direccion ? ` · ${a.direccion}` : '')),
      el('span', { class: 'etiqueta-estado patrocinio' }, nivel === 'premium' ? 'Destacado' : 'Patrocinado')),
    a.foto ? el('div', { class: 'post-media' }, el('img', { src: a.foto, alt: a.negocio, loading: 'lazy', class: 'foto-anuncio' })) : null,
    el('div', { class: 'post-cuerpo' },
      el('p', { class: 'post-texto' }, a.descripcion),
      ofertas.length ? el('ul', { class: 'ofertas' }, ofertas.map(o =>
        el('li', {}, el('span', {}, o.nombre), o.precio_desde ? el('b', {}, SOLES(o.precio_desde)) : null))) : null,
      el('div', { class: 'post-pie' },
        el('span', { class: 'etiqueta-estado' }, icono('escudo', 'ico ico-mini'), ' Verificado por LlegueYa'),
        a.whatsapp ? botonWhatsapp(a.whatsapp, a.negocio) : null,
        a.contacto ? el('span', { class: 'nota' }, `Contacto: ${a.contacto}`) : null,
        a.lat !== null && a.lat !== undefined
          ? el('a', { class: 'enlace-suave', href: `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lon}`, target: '_blank', rel: 'noopener' }, 'Cómo llegar') : null,
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
  let destinos, lugares, destacados = [], anuncios = [];
  let soloFotos = true;
  try {
    [destinos, lugares] = await Promise.all([api.destinos(), api.lugares({ limite: 12 })]);
    try { destacados = (await api.destacados()).viajeros; } catch { destacados = []; }
    try { anuncios = (await api.anuncios()).anuncios; } catch { anuncios = []; }
  } catch (e) {
    vaciar(vista, error(e.message, () => render(vista, ruta, ctx)));
    return;
  }
  const fondo = (lugares.items.find(l => l.portada) || {}).portada || null;
  const lista = el('div', { class: 'muro' });
  const zonaMas = el('p', {});
  const zonaVacia = el('div', {});
  let siguiente = null;

  const pintar = items => {
    for (const dato of ordenarPorInteres(items, ctx.lugares)) lista.append(postViajero(dato, { alComentar: ctx.abrirComentarios, alReportar: ctx.abrirReporte, lugares: ctx.lugares }));
  };
  const colocarAnuncios = () => {
    // Los de mayor plan salen primero y más arriba; el resto se reparte cada 3 publicaciones.
    anuncios.forEach((a, i) => {
      const posts = [...lista.children].filter(n => !n.classList.contains('patrocinado'));
      const tarjeta = patrocinado(a);
      const ancla = posts[Math.min(i === 0 ? 0 : i * 3, posts.length - 1)];
      ancla ? ancla.after(tarjeta) : lista.append(tarjeta);
    });
  };

  const masBoton = el('button', { class: 'boton boton-borde', type: 'button' }, 'Cargar más experiencias');
  const cargar = async desde => {
    const params = { limite: desde ? 10 : 20 };   // primera tanda más grande para mezclar mejor
    if (desde) params.desde = desde;
    if (soloFotos) params.con_foto = 'true';
    const r = await api.muro(params);
    siguiente = r.siguiente;
    pintar(r.items);
    masBoton.hidden = siguiente === null;
    return r;
  };
  masBoton.addEventListener('click', async () => {
    masBoton.disabled = true;
    try { await cargar(siguiente); } catch (e) { masBoton.after(error(e.message)); }
    masBoton.disabled = false;
  });

  const recargar = async () => {
    vaciar(lista); vaciar(zonaVacia);
    try {
      const r = await cargar(0);
      // Si aún no hay fotos pero sí experiencias escritas, mostramos todo para que nada parezca perdido.
      if (!r.items.length && soloFotos && !recargar.probado) {
        recargar.probado = true;
        soloFotos = false; pintarFiltro();
        await recargar();
        if (lista.children.length) zonaVacia.prepend(el('p', { class: 'nota' }, 'Aún no hay fotos: te mostramos todas las experiencias.'));
        return;
      }
      if (!r.items.length) {
        vaciar(zonaVacia, vacio(soloFotos ? 'Todavía no hay fotos publicadas' : 'Todavía no hay experiencias publicadas',
          'Las fotos y consejos de los viajeros aparecerán aquí.',
          el('button', { class: 'boton boton-principal', type: 'button',
            onclick: () => (estado.usuario ? document.dispatchEvent(new CustomEvent('ly:crear')) : pedirAcceso('Inicia sesión para compartir tu primera experiencia.')) },
          'Compartir la primera')));
      }
      colocarAnuncios();
    } catch (e) { vaciar(zonaVacia, error(e.message, recargar)); }
  };

  const filtro = el('div', { class: 'filtros filtro-muro', role: 'group', 'aria-label': 'Qué ver' });
  const pintarFiltro = () => vaciar(filtro, [[true, 'Fotos'], [false, 'Todo']].map(([valor, nombre]) =>
    el('button', { class: 'chip', type: 'button', 'aria-pressed': String(soloFotos === valor),
      onclick: () => { soloFotos = valor; pintarFiltro(); recargar(); } }, nombre)));
  pintarFiltro();

  vaciar(vista, el('div', {}, portada(fondo), historias(destinos.destinos), viajerosDestacados(destacados), compositor(),
    filtro, zonaVacia, lista, zonaMas));
  zonaMas.append(masBoton);
  masBoton.hidden = true;
  await recargar();
}
