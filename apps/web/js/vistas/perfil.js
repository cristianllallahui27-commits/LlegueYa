import { api } from '../api.js';
import { avatar, error, foto, postViajero, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { estado, pedirAcceso } from '../estado.js';
import { limpiarOfertas, precioSoles } from '../util.js';
import { selectorUbicacion } from './mapa.js';

function miViaje(viajes, recargar) {
  if (!viajes.length) {
    return vacio('Aún no tienes un plan de viaje', 'Pídele a Willaq Uma que te arme uno y acéptalo si te gusta.',
      el('button', { class: 'boton boton-secundario', type: 'button',
        onclick: () => document.dispatchEvent(new CustomEvent('willaq:preguntar', { detail: 'Arma mi viaje de 2 días' })) }, 'Pedir un plan a Willaq Uma'));
  }
  return viajes.map(v => el('article', { class: 'tarjeta plan-viaje plan-guardado' },
    el('div', { class: 'admin-cabecera' }, el('h3', { class: 'crece' }, v.titulo),
      el('button', { class: 'boton boton-texto', type: 'button', onclick: async () => {
        if (!confirm('¿Quitar este plan de tu espacio?')) return;
        try { await api.eliminarViaje(v.id); avisar('Plan quitado'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Quitar')),
    el('ol', {}, v.dias.map(d => el('li', {}, el('strong', {}, `Día ${d.numero} · ${d.titulo}`),
      d.lugares.length ? el('ul', {}, d.lugares.map(l => el('li', {}, el('a', { href: `#/lugar/${l.slug}` }, l.nombre), ` — ${l.resumen}`))) : el('p', {}, 'Día libre'))))));
}

function editorOfertas() {
  const lista = el('div', { class: 'ofertas-editor' });
  const agregar = el('button', { class: 'boton boton-borde', type: 'button' }, icono('mas'), 'Agregar producto o servicio');
  const fila = () => {
    const n = lista.children.length + 1;
    const f = el('div', { class: 'oferta-fila' },
      el('input', { name: 'oferta_nombre', 'aria-label': `Producto o servicio ${n}`, placeholder: 'Retablo pequeño, tour a Wari…', maxlength: 80 }),
      el('input', { name: 'oferta_precio', 'aria-label': `Precio desde (S/) ${n}`, placeholder: 'Desde S/', type: 'number', min: 0, step: '0.01' }),
      el('input', { name: 'oferta_detalle', 'aria-label': `Detalle ${n}`, placeholder: 'Detalle (opcional)', maxlength: 200 }),
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': `Quitar fila ${n}`, onclick: () => { f.remove(); agregar.hidden = false; } }, icono('cerrar')));
    lista.append(f);
    agregar.hidden = lista.children.length >= 8;
  };
  agregar.addEventListener('click', fila);
  fila();
  return [lista, agregar];
}

function formularioNegocio(rubros, planes, alEnviar) {
  const requisitos = el('ul', { class: 'requisitos lectura' });
  const rubro = el('select', { id: 'neg-rubro', name: 'rubro', required: true },
    el('option', { value: '' }, 'Elige el rubro'), rubros.map(r => el('option', { value: r.id }, r.nombre)));
  rubro.addEventListener('change', () => {
    const r = rubros.find(x => x.id === rubro.value);
    vaciar(requisitos, r ? r.requisitos.map(q => el('li', {}, q)) : []);
  });
  const form = el('form', { class: 'tarjeta form-plan' },
    el('h3', { class: 'titulo-bloque' }, 'Registrar o promocionar mi negocio'),
    el('p', { class: 'nota' }, 'Artesanos, movilidad, agencias, hospedajes y restaurantes. LlegueYa verifica cada negocio antes de mostrarlo en Servicios y artesanía, para que el viajero viva una buena experiencia.'),
    el('label', { class: 'etiqueta', for: 'neg-nombre' }, 'Nombre del negocio'), el('input', { id: 'neg-nombre', name: 'negocio', required: true, maxlength: 120 }),
    el('label', { class: 'etiqueta', for: 'neg-rubro' }, 'Rubro'), rubro,
    el('p', { class: 'nota' }, 'Te pediremos:'), requisitos,
    el('label', { class: 'etiqueta', for: 'neg-desc' }, 'Qué ofreces'), el('textarea', { id: 'neg-desc', name: 'descripcion', rows: 3, required: true, maxlength: 1000 }),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Productos y servicios con precio'), editorOfertas()),
    el('label', { class: 'etiqueta', for: 'neg-direccion' }, 'Dirección'), el('input', { id: 'neg-direccion', name: 'direccion', maxlength: 200, placeholder: 'Jr. 28 de Julio 100, Huamanga' }),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Ubicación en el mapa'), selectorUbicacion({ ayuda: 'Toca el mapa donde está tu local. Puedes arrastrar el pin.' })),
    el('label', { class: 'etiqueta', for: 'neg-contacto' }, 'Contacto (teléfono o correo)'), el('input', { id: 'neg-contacto', name: 'contacto', required: true, maxlength: 120 }),
    el('label', { class: 'etiqueta', for: 'neg-enlace' }, 'Página o red social (opcional)'), el('input', { id: 'neg-enlace', name: 'enlace', type: 'url', placeholder: 'https://', maxlength: 200 }),
    el('label', { class: 'etiqueta', for: 'neg-plan' }, 'Plan'),
    el('select', { id: 'neg-plan', name: 'plan_id', required: true }, planes.map(p =>
      el('option', { value: p.id }, `${p.nombre} · ${precioSoles(p.precio)} · ${p.duracion_dias} días`))),
    el('button', { class: 'boton boton-principal', type: 'submit' }, 'Enviar solicitud'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(form);
    const nombres = fd.getAll('oferta_nombre'), precios = fd.getAll('oferta_precio'), detalles = fd.getAll('oferta_detalle');
    const ofertas = limpiarOfertas(nombres.map((nombre, i) => ({ nombre, precio_desde: precios[i], detalle: detalles[i] })));
    const d = Object.fromEntries(['negocio', 'rubro', 'descripcion', 'direccion', 'contacto', 'enlace', 'plan_id'].map(k => [k, fd.get(k) || '']));
    if (fd.get('lat')) { d.lat = Number(fd.get('lat')); d.lon = Number(fd.get('lon')); }
    d.ofertas = ofertas;
    try { await api.solicitarPromocion(d); avisar('Solicitud enviada. Te avisaremos cuando la revisemos.'); alEnviar(); }
    catch (e) { avisar(e.message); }
  });
  return form;
}

function miNegocio(solicitudes, rubros, planes, recargar) {
  const estados = { pendiente: 'En verificación', aprobada: 'Aprobada · patrocinado', rechazada: 'Rechazada' };
  return [
    solicitudes.map(s => el('article', { class: 'tarjeta admin-fila' },
      el('div', { class: 'admin-cabecera' }, icono('tienda'), el('div', { class: 'crece' }, el('strong', {}, s.negocio), el('span', {}, s.rubro_nombre)),
        el('span', { class: `etiqueta-estado ${s.estado === 'pendiente' ? 'revision' : s.estado === 'rechazada' ? 'demo' : ''}` }, estados[s.estado])),
      el('p', { class: 'nota' }, `Plan ${s.plan.nombre} · ${precioSoles(s.plan.precio)}`,
        s.pago === 'pendiente' ? ' · Pago pendiente: te contactaremos para coordinarlo.' : ''),
      s.motivo ? el('p', { class: 'nota' }, `Motivo: ${s.motivo}`) : null,
      s.fin ? el('p', { class: 'nota' }, `Patrocinado hasta el ${new Date(s.fin).toLocaleDateString('es-PE')}`) : null)),
    formularioNegocio(rubros, planes, recargar),
  ];
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
    ['Mi negocio', () => miNegocio(solicitudes.items, rubros.rubros, planes.planes, () => render(vista, { ...ruta, filtros: { pestana: 'negocio' } }, ctx))],
  ];
  const barra = el('div', { class: 'pestanas', role: 'tablist' });
  const elegir = i => {
    [...barra.children].forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
    vaciar(panel, pestanas[i][1]());
  };
  pestanas.forEach(([nombre], i) => barra.append(el('button', { type: 'button', role: 'tab', onclick: () => elegir(i) }, nombre)));

  vaciar(vista, el('section', {},
    el('header', { class: 'perfil-cabecera' }, avatar(u),
      el('div', {}, el('h1', {}, u.nombre),
        el('ul', { class: 'perfil-numeros' },
          el('li', {}, el('b', {}, mio.publicaciones.length), el('span', {}, 'publicaciones')),
          el('li', {}, el('b', {}, mio.guardadas.length), el('span', {}, 'guardados')),
          el('li', {}, el('b', {}, favoritos.items.length), el('span', {}, 'lugares'))))),
    el('form', { action: '/api/v1/auth/logout', method: 'post' },
      el('button', { class: 'boton boton-borde', type: 'submit' }, icono('salir'), 'Cerrar sesión')),
    el('br'), barra, panel));
  elegir({ viaje: 3, negocio: 4 }[ruta.filtros && ruta.filtros.pestana] || 0);
}
