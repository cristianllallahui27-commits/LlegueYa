// Negocios por nivel: comparación de planes (Básico, Plus, Premium), formulario que se adapta
// al plan elegido y ficha pública que muestra más detalle cuanto mayor es el plan.
import { api } from '../api.js';
import { carruselNegocio } from '../componentes.js';
import { confirmar } from '../confirmar.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { limpiarOfertas, precioPlan, precioSoles, validarFoto } from '../util.js';
import { selectorUbicacion } from './mapa.js';

const SERVICIOS = ['Wifi', 'Desayuno incluido', 'Agua caliente', 'Baño privado', 'Estacionamiento', 'Lavandería',
  'Recojo del hotel', 'Guía bilingüe', 'Atención en quechua', 'Atención en inglés', 'Opciones vegetarianas',
  'Delivery', 'Pago con Yape o Plin', 'Pago con tarjeta', 'Acceso para silla de ruedas', 'Apto para niños'];

const nivelDe = (niveles, plan) => niveles.find(n => n.id === plan.nivel) || niveles[0];

// ---------------------------------------------------------------- Comparación de planes
function tarjetaPlan(plan, nivel, alElegir) {
  const radio = el('input', { type: 'radio', name: 'plan_id', value: plan.id, required: true, class: 'oculto-visual' });
  radio.addEventListener('change', () => alElegir(plan));
  return el('label', { class: `plan-tarjeta plan-${nivel.id}` }, radio,
    nivel.id === 'premium' ? el('span', { class: 'plan-cinta' }, 'Vitrina completa') : null,
    el('span', { class: 'plan-nombre' }, plan.nombre),
    el('span', { class: 'plan-precio' }, precioPlan(plan)),
    el('span', { class: 'plan-lema' }, nivel.lema),
    el('ul', { class: 'plan-beneficios' }, nivel.beneficios.map(b => el('li', {}, icono('check', 'ico ico-mini'), b))),
    plan.gratuidad_inicial ? el('span', { class: 'nota' }, 'Una vez por cuenta.') : null,
    el('span', { class: 'plan-elegir', 'aria-hidden': 'true' }, 'Elegir'));
}

export function comparacionPlanes(planes, niveles, alElegir) {
  const orden = { basico: 0, plus: 1, premium: 2 };
  const lista = [...planes].sort((a, b) => orden[a.nivel] - orden[b.nivel] || Number(a.precio) - Number(b.precio));
  return el('div', { class: 'planes-negocio', role: 'radiogroup', 'aria-label': 'Planes para tu negocio' },
    lista.map(p => tarjetaPlan(p, nivelDe(niveles, p), alElegir)));
}

// ---------------------------------------------------------------- Editores de filas
function editorFilas({ max, nombre, campos, agregarTexto }) {
  const lista = el('div', { class: 'ofertas-editor' });
  const agregar = el('button', { class: 'boton boton-borde', type: 'button' }, icono('mas'), agregarTexto);
  const fila = () => {
    const n = lista.children.length + 1;
    const f = el('div', { class: `oferta-fila oferta-fila-${campos.length}` },
      campos.map(c => c.multilinea
        ? el('textarea', { name: `${nombre}_${c.id}`, 'aria-label': `${c.etiqueta} ${n}`, placeholder: c.ayuda, maxlength: c.max, rows: 2 })
        : el('input', { name: `${nombre}_${c.id}`, 'aria-label': `${c.etiqueta} ${n}`, placeholder: c.ayuda, maxlength: c.max, type: c.tipo || 'text', min: c.tipo === 'number' ? 0 : null, step: c.tipo === 'number' ? '0.01' : null })),
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': `Quitar fila ${n}`, onclick: () => { f.remove(); revisar(); } }, icono('cerrar')));
    lista.append(f);
    revisar();
  };
  const revisar = () => {
    const tope = max();
    while (lista.children.length > tope) lista.lastElementChild.remove();
    agregar.hidden = lista.children.length >= tope;
  };
  agregar.addEventListener('click', fila);
  return { nodo: [lista, agregar], fila, revisar, lista };
}

const CAMPOS_OFERTA = [
  { id: 'nombre', etiqueta: 'Producto o servicio', ayuda: 'Retablo pequeño, tour a Wari, habitación doble…', max: 80 },
  { id: 'precio', etiqueta: 'Precio desde (S/)', ayuda: 'Desde S/', tipo: 'number' },
  { id: 'detalle', etiqueta: 'Detalle', ayuda: 'Detalle (opcional)', max: 200 },
];

function leerFilas(fd, nombre, ids) {
  const columnas = ids.map(id => fd.getAll(`${nombre}_${id}`));
  return columnas[0].map((_, i) => Object.fromEntries(ids.map((id, j) => [id, String(columnas[j][i] || '').trim()])));
}

// Sección que solo se habilita desde cierto nivel. Si el plan no la incluye, se ve bloqueada con la invitación a subir.
function seccion(titulo, desde, ...hijos) {
  const aviso = el('p', { class: 'seccion-bloqueada-aviso' }, icono('candado', 'ico ico-mini'), ` Disponible desde el plan ${desde}.`);
  const fs = el('fieldset', { class: 'grupo seccion-plan', dataset: { desde } }, el('legend', { class: 'etiqueta' }, titulo), aviso, ...hijos);
  return fs;
}

// ---------------------------------------------------------------- Formulario
export function formularioNegocio(rubros, planes, niveles, alEnviar) {
  let nivel = null;
  const requisitos = el('ul', { class: 'requisitos lectura' });
  const rubro = el('select', { id: 'neg-rubro', name: 'rubro', required: true },
    el('option', { value: '' }, 'Elige el rubro'), rubros.map(r => el('option', { value: r.id }, r.nombre)));
  rubro.addEventListener('change', () => {
    const r = rubros.find(x => x.id === rubro.value);
    vaciar(requisitos, r ? r.requisitos.map(q => el('li', {}, q)) : []);
  });

  // Descripción con contador según el plan
  const desc = el('textarea', { id: 'neg-desc', name: 'descripcion', rows: 4, required: true, maxlength: 300 });
  const contador = el('span', { class: 'nota contador' });
  const contar = () => { contador.textContent = `${desc.value.length} / ${desc.maxLength}`; };
  desc.addEventListener('input', contar);

  // Fotos: se eligen aquí y se suben al enviar (no quedan fotos sueltas si te arrepientes).
  let archivos = [];
  const miniaturas = el('div', { class: 'fotos-negocio' });
  const notaFotos = el('p', { class: 'nota' });
  const elegirFotos = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true, hidden: true });
  const botonFotos = el('button', { class: 'boton boton-borde', type: 'button', onclick: () => elegirFotos.click() }, icono('foto'), 'Agregar fotos');
  const pintarFotos = () => {
    const tope = nivel ? nivel.limites.fotos : 2;
    archivos = archivos.slice(0, tope);
    vaciar(miniaturas, archivos.map((a, i) => el('figure', { class: 'foto-negocio' },
      el('img', { src: a.url, alt: `Foto ${i + 1} del negocio` }),
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': `Quitar foto ${i + 1}`, onclick: () => { URL.revokeObjectURL(a.url); archivos.splice(i, 1); pintarFotos(); } }, icono('cerrar')))));
    notaFotos.textContent = `${archivos.length} de ${tope} fotos que permite tu plan. JPG, PNG o WebP de hasta 5 MB.`;
    botonFotos.hidden = archivos.length >= tope;
  };
  elegirFotos.addEventListener('change', () => {
    const tope = nivel ? nivel.limites.fotos : 2;
    for (const f of elegirFotos.files) {
      const problema = validarFoto(f);
      if (problema) { avisar(problema); continue; }
      if (archivos.length >= tope) { avisar(`Tu plan permite ${tope} fotos. Sube de plan para agregar más.`); break; }
      archivos.push({ archivo: f, url: URL.createObjectURL(f) });
    }
    elegirFotos.value = '';
    pintarFotos();
  });

  const ofertas = editorFilas({ max: () => (nivel ? nivel.limites.ofertas : 3), nombre: 'oferta', campos: CAMPOS_OFERTA, agregarTexto: 'Agregar producto o servicio' });
  const carta = editorFilas({ max: () => (nivel ? nivel.limites.carta : 0), nombre: 'carta', agregarTexto: 'Agregar a la carta',
    campos: [{ id: 'nombre', etiqueta: 'Plato o ítem', ayuda: 'Puca picante, habitación matrimonial…', max: 80 },
      { id: 'precio', etiqueta: 'Precio (S/)', ayuda: 'S/', tipo: 'number' }, { id: 'detalle', etiqueta: 'Descripción', ayuda: 'Ingredientes, qué incluye…', max: 200 }] });
  const testimonios = editorFilas({ max: () => (nivel ? nivel.limites.testimonios : 0), nombre: 'testimonio', agregarTexto: 'Agregar experiencia de un cliente',
    campos: [{ id: 'autor', etiqueta: 'Nombre del cliente', ayuda: 'Lucía, de Lima', max: 60 }, { id: 'texto', etiqueta: 'Lo que contó', ayuda: 'Lo que contó de su visita', max: 300, multilinea: true }] });
  const videos = el('div', { class: 'videos-negocio' });
  const pintarVideos = () => {
    const tope = nivel ? nivel.limites.videos : 0;
    const actuales = [...videos.querySelectorAll('input')].map(i => i.value);
    vaciar(videos, Array.from({ length: Math.max(tope, 1) }, (_, i) =>
      el('input', { name: 'video', type: 'url', placeholder: 'https://www.youtube.com/watch?v=…', maxlength: 260, 'aria-label': `Enlace del video ${i + 1}`, value: actuales[i] || null })));
  };

  const contactoPlus = seccion('WhatsApp y video', 'Plus',
    el('label', { class: 'etiqueta', for: 'neg-whatsapp' }, 'Tu número de WhatsApp'),
    el('input', { id: 'neg-whatsapp', name: 'whatsapp', type: 'tel', inputmode: 'numeric', maxlength: 15, placeholder: '9XX XXX XXX' }),
    el('span', { class: 'etiqueta' }, icono('video', 'ico ico-mini'), ' Video (YouTube, Facebook, TikTok, Instagram o Vimeo)'), videos);
  const contactoPremium = seccion('Teléfono, horario y página web', 'Premium',
    el('p', { class: 'nota' }, 'En Premium los viajeros también ven el teléfono que escribiste arriba.'),
    el('label', { class: 'etiqueta', for: 'neg-horario' }, 'Horario de atención'),
    el('input', { id: 'neg-horario', name: 'horario', maxlength: 120, placeholder: 'Lun a sáb 8:00 a 20:00' }),
    el('label', { class: 'etiqueta', for: 'neg-enlace' }, 'Página o red social'),
    el('input', { id: 'neg-enlace', name: 'enlace', type: 'url', placeholder: 'https://', maxlength: 200 }));
  const servicios = seccion('Servicios que incluyes', 'Premium',
    el('div', { class: 'chips-elegir' }, SERVICIOS.map(s => el('label', { class: 'chip-casilla' }, el('input', { type: 'checkbox', name: 'servicio', value: s }), s))));
  const capacidad = seccion('Capacidad', 'Premium',
    el('div', { class: 'fila-campos' },
      el('div', {}, el('label', { class: 'etiqueta', for: 'neg-habitaciones' }, 'Habitaciones'), el('input', { id: 'neg-habitaciones', name: 'habitaciones', type: 'number', min: 0, max: 5000 })),
      el('div', {}, el('label', { class: 'etiqueta', for: 'neg-capacidad' }, 'Aforo (personas)'), el('input', { id: 'neg-capacidad', name: 'capacidad', type: 'number', min: 0, max: 5000 }))));
  const seccionCarta = seccion('Carta o tarifario', 'Premium', el('p', { class: 'nota' }, 'Platos, bebidas, tipos de habitación o paquetes con su precio.'), carta.nodo);
  const seccionTestimonios = seccion('Experiencias de clientes', 'Premium',
    el('p', { class: 'nota' }, 'Escribe lo que te contaron tus clientes. Administración puede pedirte pruebas antes de publicarlas.'), testimonios.nodo);
  const premium = [contactoPremium, servicios, capacidad, seccionCarta, seccionTestimonios];

  const resumenPlan = el('p', { class: 'plan-elegido', role: 'status', 'aria-live': 'polite' }, 'Elige un plan para ver todo lo que puedes mostrar.');
  const detalle = el('div', { class: 'negocio-detalle', hidden: true });

  const aplicarNivel = plan => {
    nivel = nivelDe(niveles, plan);
    const l = nivel.limites;
    resumenPlan.textContent = `Plan ${plan.nombre}: ${l.fotos} fotos, ${l.ofertas} productos${l.videos ? `, ${l.videos} video${l.videos > 1 ? 's' : ''}` : ''}${l.contacto ? ', tu WhatsApp' : ''}${l.completo ? ', teléfono, horario, web, carta, servicios, capacidad y experiencias de clientes' : ''}.`;
    desc.maxLength = l.descripcion; contar();
    const bloquear = (fs, activo) => { fs.disabled = !activo; fs.classList.toggle('seccion-bloqueada', !activo); };
    bloquear(contactoPlus, l.contacto);
    bloquear(contactoPremium, l.completo);
    bloquear(servicios, l.servicios > 0);
    bloquear(capacidad, l.capacidad);
    bloquear(seccionCarta, l.carta > 0);
    bloquear(seccionTestimonios, l.testimonios > 0);
    pintarVideos(); pintarFotos();
    ofertas.revisar(); carta.revisar(); testimonios.revisar();
    if (!ofertas.lista.children.length) ofertas.fila();
    if (l.carta && !carta.lista.children.length) carta.fila();
    if (l.testimonios && !testimonios.lista.children.length) testimonios.fila();
    detalle.hidden = false;
  };

  vaciar(detalle,
    el('h4', { class: 'subtitulo' }, '2. Tu negocio'),
    el('label', { class: 'etiqueta', for: 'neg-nombre' }, 'Nombre del negocio'), el('input', { id: 'neg-nombre', name: 'negocio', required: true, maxlength: 120 }),
    el('label', { class: 'etiqueta', for: 'neg-rubro' }, 'Rubro'), rubro,
    el('p', { class: 'nota' }, 'Te pediremos:'), requisitos,
    el('label', { class: 'etiqueta', for: 'neg-desc' }, 'Qué ofreces'), desc, contador,
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Fotos del local'), notaFotos, miniaturas, botonFotos, elegirFotos),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Productos y servicios con precio'), ofertas.nodo),
    el('label', { class: 'etiqueta', for: 'neg-direccion' }, 'Dirección'), el('input', { id: 'neg-direccion', name: 'direccion', maxlength: 160, placeholder: 'Jr. 28 de Julio 100, Huamanga' }),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Ubicación en el mapa'), selectorUbicacion({ ayuda: 'Toca el mapa donde está tu local. Puedes arrastrar el pin.' })),
    el('label', { class: 'etiqueta', for: 'neg-contacto' }, 'Teléfono o correo para administración'),
    el('input', { id: 'neg-contacto', name: 'contacto', required: true, maxlength: 120 }),
    el('p', { class: 'nota' }, 'Con este dato coordinamos la verificación y el pago. Solo en Premium lo ven los viajeros.'),
    el('h4', { class: 'subtitulo' }, '3. Lo que muestran los planes superiores'),
    contactoPlus, ...premium,
    el('button', { class: 'boton boton-principal boton-grande', type: 'submit' }, 'Enviar solicitud'));

  const form = el('form', { class: 'tarjeta form-plan form-negocio', novalidate: true },
    el('h3', { class: 'titulo-bloque' }, 'Registrar o promocionar mi negocio'),
    el('p', { class: 'nota' }, 'Artesanos, movilidad, agencias, hospedajes y restaurantes. LlegueYa verifica cada negocio antes de mostrarlo, para que el viajero viva una buena experiencia.'),
    el('h4', { class: 'subtitulo' }, '1. Elige tu plan'),
    comparacionPlanes(planes, niveles, aplicarNivel), resumenPlan, detalle);

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!nivel) { avisar('Elige un plan primero.'); return; }
    const fd = new FormData(form);
    const d = Object.fromEntries(['negocio', 'rubro', 'descripcion', 'direccion', 'contacto', 'plan_id', 'whatsapp', 'horario', 'enlace']
      .map(k => [k, String(fd.get(k) || '').trim()]));
    if (!d.negocio || !d.rubro || !d.descripcion || !d.contacto) { avisar('Completa nombre, rubro, qué ofreces y el teléfono o correo.'); return; }
    if (fd.get('lat')) { d.lat = Number(fd.get('lat')); d.lon = Number(fd.get('lon')); }
    const filas = (nombre, ids) => limpiarOfertas(leerFilas(fd, nombre, ids).map(f => ({ nombre: f.nombre, precio_desde: f.precio, detalle: f.detalle })), 40);
    d.ofertas = filas('oferta', ['nombre', 'precio', 'detalle']).slice(0, nivel.limites.ofertas);
    d.carta = nivel.limites.carta ? filas('carta', ['nombre', 'precio', 'detalle']) : [];
    d.testimonios = nivel.limites.testimonios ? leerFilas(fd, 'testimonio', ['autor', 'texto']).filter(t => t.autor && t.texto) : [];
    d.videos = fd.getAll('video').map(v => String(v).trim()).filter(Boolean);
    d.servicios = fd.getAll('servicio');
    for (const k of ['habitaciones', 'capacidad']) if (fd.get(k)) d[k] = Number(fd.get(k));
    const plan = planes.find(p => p.id === d.plan_id);
    const cobro = Number(plan.precio) ? ` Costo: ${precioPlan(plan)}; te contactaremos para coordinar el pago.` : '';
    if (!(await confirmar({ titulo: 'Enviar solicitud', mensaje: `Vas a enviar «${d.negocio}» con el plan ${plan.nombre}. Administración la revisará antes de publicarla.${cobro}`, aceptar: 'Enviar solicitud' }))) return;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      d.fotos = [];
      for (const [i, a] of archivos.entries()) {
        boton.textContent = `Subiendo foto ${i + 1} de ${archivos.length}…`;
        d.fotos.push((await api.subirFotoNegocio(a.archivo)).url);
      }
      boton.textContent = 'Enviando…';
      await api.solicitarPromocion(d);
      avisar('Solicitud enviada. Te avisaremos cuando la revisemos.');
      alEnviar();
    } catch (e) { avisar(e.message); }
    finally { boton.disabled = false; boton.textContent = 'Enviar solicitud'; }
  });
  return form;
}

// ---------------------------------------------------------------- Ficha pública (Servicios)
function listaPrecios(items) {
  const precio = o => (o.precio_desde === null ? 'Consultar' : `desde ${precioSoles(o.precio_desde)}`);
  return el('ul', { class: 'ofertas' }, items.map(o => el('li', {},
    el('span', {}, el('strong', {}, o.nombre), o.detalle ? el('small', {}, o.detalle) : null),
    el('span', { class: 'oferta-precio' }, precio(o)))));
}

export function galeria(fotos, nombre) {
  return carruselNegocio(fotos, nombre);
}

export function extrasNegocio(n) {
  const partes = [];
  if (n.videos && n.videos.length) {
    partes.push(el('p', { class: 'negocio-videos' }, n.videos.map((v, i) =>
      el('a', { class: 'boton boton-borde', href: v, target: '_blank', rel: 'noopener noreferrer' }, icono('video'), n.videos.length > 1 ? `Ver video ${i + 1}` : 'Ver video'))));
  }
  if (n.horario) partes.push(el('p', { class: 'negocio-dato' }, icono('reloj', 'ico ico-mini'), ' ', n.horario));
  if (n.habitaciones || n.capacidad) {
    partes.push(el('p', { class: 'negocio-dato' }, [n.habitaciones ? `${n.habitaciones} habitaciones` : null, n.capacidad ? `aforo para ${n.capacidad} personas` : null].filter(Boolean).join(' · ')));
  }
  if (n.servicios && n.servicios.length) partes.push(el('ul', { class: 'chips-servicios' }, n.servicios.map(s => el('li', {}, icono('check', 'ico ico-mini'), s))));
  if (n.carta && n.carta.length) partes.push(el('details', { class: 'negocio-carta' }, el('summary', {}, 'Ver carta y precios'), listaPrecios(n.carta)));
  if (n.testimonios && n.testimonios.length) {
    partes.push(el('section', { class: 'testimonios' }, el('h3', {}, 'Experiencias de clientes'),
      n.testimonios.map(t => el('blockquote', {}, el('p', {}, `“${t.texto}”`), el('cite', {}, t.autor))),
      el('p', { class: 'nota' }, 'Compartidas por el negocio y revisadas por LlegueYa.')));
  }
  return partes;
}

export function botonWhatsapp(numero, negocio) {
  if (!numero) return null;
  const texto = encodeURIComponent(`Hola, te encontré en LlegueYa y quiero información sobre ${negocio}.`);
  return el('a', { class: 'boton boton-whatsapp', href: `https://wa.me/${numero}?text=${texto}`, target: '_blank', rel: 'noopener noreferrer' }, icono('whatsapp'), 'WhatsApp');
}

export { listaPrecios };
