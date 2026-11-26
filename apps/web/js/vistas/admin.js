// Panel de administración: moderación, cuentas falsas, negocios verificados y planes.
// La web solo muestra el panel; cada acción la vuelve a validar el servidor (rol admin).
import { api } from '../api.js';
import { avatar, carruselNegocio, error, foto, iconoTipo, vacio } from '../componentes.js';
import { confirmar, pedirTexto } from '../confirmar.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { estado } from '../estado.js';
import { TIPOS, precioPlan, precioSoles, rangoFechas, tiempoRelativo } from '../util.js';
import { extrasNegocio } from './negocio.js';
import { selectorUbicacion } from './mapa.js';

const PESTANAS = [['lugares', 'Lugares'], ['terminales', 'Terminales'], ['eventos', 'Calendario'], ['moderacion', 'Moderación'], ['reportes', 'Reportes'], ['contenido', 'Fotos y publicaciones'], ['cuentas', 'Cuentas'], ['negocios', 'Negocios y promociones'], ['planes', 'Planes']];

function cifra(n, texto) {
  return el('li', {}, el('b', {}, n), el('span', {}, texto));
}

async function moderacion(panel) {
  const { publicaciones, comentarios } = await api.admin.moderacion();
  const fila = (tipo, x, contenido) => {
    const acciones = el('div', { class: 'post-pie' });
    for (const [aprobar, texto, clase] of [[true, 'Aprobar', 'boton-secundario'], [false, 'Rechazar', 'boton-borde']]) {
      acciones.append(el('button', { class: `boton ${clase}`, type: 'button', onclick: async ev => {
        if (!(await confirmar({ titulo: aprobar ? 'Aprobar' : 'Rechazar', mensaje: aprobar ? 'Será visible para todos en LlegueYa.' : 'No se mostrará en LlegueYa.', aceptar: aprobar ? 'Aprobar' : 'Rechazar', peligro: !aprobar }))) return;
        ev.target.disabled = true;
        try { await api.admin.decidir(tipo, x.id, aprobar); avisar(aprobar ? 'Aprobado: ya es visible' : 'Rechazado'); ev.target.closest('.admin-fila').remove(); }
        catch (e) { ev.target.disabled = false; avisar(e.message); }
      } }, texto));
    }
    return el('article', { class: 'admin-fila tarjeta' },
      el('div', { class: 'cuenta-fila' }, avatar(x.autor), el('div', {}, el('strong', {}, x.autor.nombre),
        el('span', {}, `${tipo === 'publicacion' ? 'Publicación' : 'Comentario'} · ${tiempoRelativo(x.creado_en)}`))),
      contenido, acciones);
  };
  vaciar(panel,
    el('h2', { class: 'titulo-bloque' }, `Publicaciones por revisar (${publicaciones.length})`),
    publicaciones.length ? publicaciones.map(p => fila('publicacion', p,
      [p.foto_url ? el('img', { class: 'admin-foto', src: p.foto_url, alt: 'Foto enviada' }) : null, el('p', {}, p.texto || '(solo foto)')]))
      : vacio('Nada pendiente', 'Todas las publicaciones están revisadas.'),
    el('h2', { class: 'titulo-bloque' }, `Comentarios por revisar (${comentarios.length})`),
    comentarios.length ? comentarios.map(c => fila('comentario', c, el('p', {}, c.texto)))
      : vacio('Nada pendiente', 'No hay comentarios esperando revisión.'));
}

// ---------------------------------------------------------------- Lugares del catálogo
function campo(id, etiqueta, control, ayuda) {
  return el('div', { class: 'campo' }, el('label', { class: 'etiqueta', for: id }, etiqueta), control,
    ayuda ? el('p', { class: 'nota' }, ayuda) : null);
}

let fotoSec = 0;
// Cada foto es una tarjeta: imagen grande, acciones claras y campos con su nombre a la vista.
// El enlace de una foto de otra web va aparte, en «Foto de otra web», para no confundir.
function filaFoto(f = {}, n) {
  const id = `foto-${++fotoSec}`;
  const url = el('input', { id: `${id}-url`, name: 'foto_url', type: 'text', placeholder: 'https://…', value: f.url || '' });
  const estadoSubida = el('p', { class: 'nota foto-estado', role: 'status' });
  const archivo = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true, 'aria-label': `Elegir foto ${n} de tu computadora` });
  const previa = el('img', { class: 'foto-tarjeta-img', alt: `Foto ${n}`, hidden: !f.url || null, src: f.url || '' });
  const vacia = el('div', { class: 'foto-tarjeta-vacia', hidden: Boolean(f.url) || null }, icono('foto'), el('span', {}, 'Sin foto'));
  const subir = el('button', { class: 'boton boton-secundario', type: 'button', onclick: () => archivo.click() }, icono('subir'), f.url ? 'Cambiar foto' : 'Subir foto');
  const mostrar = src => { previa.src = src; previa.hidden = !src; vacia.hidden = Boolean(src); subir.lastChild.textContent = src ? 'Cambiar foto' : 'Subir foto'; };
  archivo.addEventListener('change', async () => {
    const elegido = archivo.files[0];
    if (!elegido) return;
    estadoSubida.textContent = 'Subiendo…';
    try {
      const r = await api.admin.subirFotoLugar(elegido);
      url.value = r.url; mostrar(r.url);
      estadoSubida.textContent = 'Foto subida. Pulsa «Guardar cambios» al final para que quede guardada.';
    } catch (e) { estadoSubida.textContent = e.message; }
  });
  url.addEventListener('change', () => mostrar(url.value.trim()));
  const campo = (sufijo, etiqueta, ayuda, input) => el('div', { class: 'foto-campo' },
    el('label', { class: 'etiqueta', for: `${id}-${sufijo}` }, etiqueta, ayuda ? el('small', {}, ` ${ayuda}`) : null), input);
  const fila = el('article', { class: 'foto-tarjeta' },
    el('div', { class: 'foto-tarjeta-imagen' }, previa, vacia, el('span', { class: 'insignia-portada' }, icono('estrella', 'ico ico-mini'), 'Portada')),
    el('div', { class: 'foto-tarjeta-datos' },
      el('div', { class: 'foto-acciones' },
        subir,
        el('button', { class: 'boton boton-borde boton-portada', type: 'button', onclick: () => { fila.parentElement.prepend(fila); avisar('Esta foto será la portada al guardar'); } }, icono('estrella'), 'Usar de portada'),
        el('button', { class: 'boton peligro', type: 'button', 'aria-label': `Quitar foto ${n}`, onclick: () => { fila.remove(); avisar('Foto quitada. Pulsa «Guardar cambios» para confirmar.'); } }, icono('papelera'), 'Quitar')),
      archivo, estadoSubida,
      el('div', { class: 'foto-campos' },
        campo('autor', 'Autor', '(solo si la foto no es tuya)', el('input', { id: `${id}-autor`, name: 'foto_autor', placeholder: 'Nombre del autor', value: f.autor && f.autor !== 'LlegueYa' ? f.autor : '', maxlength: 120 })),
        campo('licencia', 'Licencia', '(si es de otra web)', el('input', { id: `${id}-licencia`, name: 'foto_licencia', placeholder: 'CC BY-SA 4.0', value: f.licencia && f.licencia !== 'Foto propia' ? f.licencia : '', maxlength: 80 }))),
      el('details', { class: 'foto-web' },
        el('summary', {}, 'Foto de otra web (enlace)'),
        campo('url', 'Enlace de la foto', '', url),
        campo('fuente', 'Página de origen', '(opcional)', el('input', { id: `${id}-fuente`, name: 'foto_fuente', type: 'url', placeholder: 'https://commons.wikimedia.org/…', value: f.fuente_url && f.fuente_url !== f.url ? f.fuente_url : '' })))));
  return fila;
}

// Entrada al lugar: cuánto cuesta y dónde se compra (en el lugar o por internet, con su enlace).
function campoEntrada(e) {
  const compra = el('select', { id: 'lugar-entrada-compra', name: 'entrada_compra' },
    [['', 'No indicar'], ['lugar', 'Se paga en el mismo lugar'], ['web', 'Se compra por internet'], ['ambos', 'En el lugar o por internet']]
      .map(([v, t]) => el('option', { value: v, selected: v === (e.compra || '') || null }, t)));
  const url = el('input', { id: 'lugar-entrada-url', name: 'entrada_url', type: 'url', placeholder: 'https://… (página oficial de venta)', value: e.url || '', maxlength: 500 });
  const cajaUrl = el('div', { class: 'foto-campo', hidden: !['web', 'ambos'].includes(e.compra) || null },
    el('label', { class: 'etiqueta', for: 'lugar-entrada-url' }, 'Enlace para comprar entradas', el('small', {}, ' (para comprar con anticipación)')), url);
  compra.addEventListener('change', () => { cajaUrl.hidden = !['web', 'ambos'].includes(compra.value); });
  return el('fieldset', { class: 'grupo campo-entrada' }, el('legend', { class: 'etiqueta' }, 'Entrada'),
    el('p', { class: 'nota' }, 'Escribe «Libre» si no se paga. Si se paga, pon el precio por tipo de visitante.'),
    el('div', { class: 'foto-campos' },
      el('div', { class: 'foto-campo' }, el('label', { class: 'etiqueta', for: 'lugar-entrada-costo' }, 'Costo de ingreso'),
        el('input', { id: 'lugar-entrada-costo', name: 'entrada_costo', maxlength: 160, placeholder: 'Libre · o · S/ 10 adultos · S/ 5 estudiantes', value: e.costo || '' })),
      el('div', { class: 'foto-campo' }, el('label', { class: 'etiqueta', for: 'lugar-entrada-compra' }, '¿Dónde se paga?'), compra)),
    cajaUrl);
}

function formularioLugar(lugar, destinos, alTerminar) {
  const l = lugar || {};
  const fotos = el('div', { class: 'fotos-editor' }, (l.fotos && l.fotos.length ? l.fotos : [{}]).map((f, i) => filaFoto(f, i + 1)));
  const agregarFoto = el('button', { class: 'boton boton-borde', type: 'button', onclick: () => {
    if (fotos.children.length < 8) fotos.append(filaFoto({}, fotos.children.length + 1));
  } }, icono('mas'), 'Agregar foto');
  const tipo = el('select', { id: 'lugar-tipo', name: 'tipo', required: true },
    Object.entries(TIPOS).map(([id, nombre]) => el('option', { value: id, selected: id === l.tipo || null }, nombre)));
  const nota = el('p', { class: 'nota', role: 'status', 'aria-live': 'polite' });
  const form = el('form', { class: 'tarjeta form-plan form-lugar', novalidate: true },
    el('h2', { class: 'titulo-bloque' }, lugar ? `Editar «${l.nombre}»` : 'Nuevo lugar turístico'),
    el('div', { class: 'fila-campos' },
      campo('lugar-nombre', 'Nombre', el('input', { id: 'lugar-nombre', name: 'nombre', required: true, maxlength: 120, value: l.nombre || '' })),
      campo('lugar-tipo', 'Tipo', tipo)),
    el('div', { class: 'fila-campos' },
      campo('lugar-destino', 'Destino (ciudad o provincia)', el('input', { id: 'lugar-destino', name: 'destino', list: 'lista-destinos', required: true, maxlength: 120, value: l.destino || '' })),
      campo('lugar-zona', 'Zona o referencia', el('input', { id: 'lugar-zona', name: 'zona', maxlength: 120, value: l.zona || '', placeholder: 'A 20 min de la Plaza Mayor' }))),
    el('datalist', { id: 'lista-destinos' }, destinos.map(d => el('option', { value: d }))),
    campo('lugar-resumen', 'Resumen (se ve en el muro)', el('input', { id: 'lugar-resumen', name: 'resumen', required: true, maxlength: 280, value: l.resumen || '' })),
    campo('lugar-desc', 'Qué es y un poco de historia', el('textarea', { id: 'lugar-desc', name: 'descripcion', rows: 5, required: true, maxlength: 4000, placeholder: 'Qué es este lugar y un poco de su historia: 3 a 5 líneas, claro y sin relleno.' }, l.descripcion || '')),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Ubicación en el mapa'),
      selectorUbicacion({ lat: l.lat ?? null, lon: l.lon ?? null })),
    el('div', { class: 'fila-campos' },
      campo('lugar-altitud', 'Altitud (m s. n. m.)', el('input', { id: 'lugar-altitud', name: 'altitud_m', type: 'number', min: 0, max: 7000, value: l.altitud_m ?? '' })),
      campo('lugar-fuente', 'Fuente de la información', el('input', { id: 'lugar-fuente', name: 'fuente_url', type: 'url', placeholder: 'https://', value: l.fuente_url || '' }))),
    campo('lugar-llegar', 'Cómo llegar', el('textarea', { id: 'lugar-llegar', name: 'como_llegar', rows: 2, maxlength: 1000 }, l.como_llegar || '')),
    campo('lugar-recom', 'Recomendaciones (una por línea)', el('textarea', { id: 'lugar-recom', name: 'recomendaciones', rows: 3 }, (l.recomendaciones || []).join('\n'))),
    campoEntrada(l.entrada || {}),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Fotos (hasta 8, JPG, PNG o WebP de máximo 5 MB)'),
      el('p', { class: 'nota' }, 'La primera foto es la portada. Sube fotos desde tu computadora con «Subir foto»; si usas una de otra web, ábrela en «Foto de otra web» y pon autor y licencia.'), fotos, agregarFoto),
    nota,
    el('div', { class: 'post-pie' },
      el('button', { class: 'boton boton-principal', type: 'submit' }, lugar ? 'Guardar cambios' : 'Publicar lugar'),
      el('button', { class: 'boton boton-texto', type: 'button', onclick: () => alTerminar(null) }, 'Cancelar')));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    const [urls, autores, licencias, fuentes] = ['foto_url', 'foto_autor', 'foto_licencia', 'foto_fuente'].map(k => d.getAll(k));
    const datos = {
      nombre: d.get('nombre'), tipo: d.get('tipo'), destino: d.get('destino'), zona: d.get('zona'),
      resumen: d.get('resumen'), descripcion: d.get('descripcion'), como_llegar: d.get('como_llegar'),
      fuente_url: d.get('fuente_url'), altitud_m: d.get('altitud_m') ? Number(d.get('altitud_m')) : null,
      lat: d.get('lat') ? Number(d.get('lat')) : null, lon: d.get('lon') ? Number(d.get('lon')) : null,
      recomendaciones: String(d.get('recomendaciones') || '').split('\n').map(x => x.trim()).filter(Boolean),
      entrada_costo: String(d.get('entrada_costo') || '').trim(), entrada_compra: d.get('entrada_compra') || '',
      entrada_url: String(d.get('entrada_url') || '').trim(),
      fotos: urls.map((url, i) => ({ url: url.trim(), autor: autores[i], licencia: licencias[i], fuente_url: fuentes[i].trim() })).filter(f => f.url),
    };
    if (!(await confirmar({ titulo: lugar ? 'Guardar cambios' : 'Publicar lugar', mensaje: lugar ? `Se actualizará «${datos.nombre}» para todos los viajeros.` : `«${datos.nombre}» aparecerá en el catálogo, el mapa y Willaq Uma.`, aceptar: lugar ? 'Guardar cambios' : 'Publicar' }))) return;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true; nota.textContent = 'Guardando…';
    try {
      const r = lugar ? await api.admin.editarLugar(lugar.slug, datos) : await api.admin.crearLugar(datos);
      avisar(lugar ? 'Cambios guardados' : 'Lugar publicado');
      alTerminar(r);
    } catch (e) { nota.textContent = e.message; boton.disabled = false; }
  });
  return form;
}

// ---- Calendario: eventos con foto pequeña ----
function formularioEvento(ev, lugares, alTerminar) {
  const nuevo = !ev;
  const e = ev || {};
  const titulo = el('input', { id: 'ev-titulo', name: 'titulo', required: true, maxlength: 120, value: e.titulo || '', placeholder: 'Ej.: Festival de la Quinua' });
  const desc = el('textarea', { id: 'ev-desc', name: 'descripcion', rows: 3, maxlength: 600, placeholder: 'De qué trata o qué se hace en esta actividad' }, e.descripcion || '');
  const donde = el('input', { id: 'ev-donde', name: 'lugar_texto', required: true, maxlength: 120, value: e.lugar || '', placeholder: 'Ej.: Plaza de Quinua' });
  const slug = el('select', { id: 'ev-slug', name: 'lugar_slug' }, el('option', { value: '' }, 'Sin ficha de lugar'),
    lugares.map(l => el('option', { value: l.slug, selected: l.slug === e.lugar_slug || null }, l.nombre)));
  const inicio = el('input', { id: 'ev-inicio', name: 'inicio', type: 'date', required: true, value: e.inicio || '' });
  const fin = el('input', { id: 'ev-fin', name: 'fin', type: 'date', required: true, value: e.fin || '' });
  const url = el('input', { id: 'ev-foto', name: 'foto_url', type: 'text', placeholder: 'Sube una foto pequeña o pega un enlace https://…', value: e.foto_url || '' });
  const previa = el('img', { class: 'foto-previa', alt: 'Vista previa', width: 96, height: 72, hidden: !e.foto_url || null, src: e.foto_url || '' });
  const estadoSubida = el('span', { class: 'nota', role: 'status' });
  const archivo = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true, 'aria-label': 'Elegir foto del evento' });
  archivo.addEventListener('change', async () => {
    if (!archivo.files[0]) return;
    estadoSubida.textContent = 'Subiendo…';
    try { const r = await api.admin.subirFotoLugar(archivo.files[0]); url.value = r.url; previa.src = r.url; previa.hidden = false; estadoSubida.textContent = 'Foto subida'; }
    catch (err) { estadoSubida.textContent = err.message; }
  });
  url.addEventListener('change', () => { previa.hidden = !url.value; previa.src = url.value; });
  const quitarFoto = el('button', { class: 'boton boton-texto', type: 'button', onclick: () => { url.value = ''; previa.hidden = true; estadoSubida.textContent = 'Sin foto: se guardará sin imagen.'; } }, 'Quitar foto');
  const guardar = el('button', { class: 'boton boton-principal', type: 'submit' }, nuevo ? 'Publicar evento' : 'Guardar cambios');
  const form = el('form', { class: 'formulario-admin', novalidate: true },
    el('h2', {}, nuevo ? 'Nuevo evento' : `Editar: ${e.titulo}`),
    campo('ev-titulo', 'Nombre de la fiesta o actividad', titulo),
    campo('ev-desc', 'De qué se trata', desc),
    campo('ev-donde', 'Dónde se hace', donde),
    campo('ev-slug', 'Ficha de lugar (opcional)', slug, 'Si eliges uno, el evento enlaza a su ficha.'),
    el('div', { class: 'dos-columnas' }, campo('ev-inicio', 'Empieza', inicio), campo('ev-fin', 'Termina', fin)),
    campo('ev-foto', 'Foto pequeña (opcional)', el('div', { class: 'foto-fila' }, previa, url,
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => archivo.click() }, icono('subir'), 'Subir foto'), quitarFoto, archivo, estadoSubida),
      'Se muestra pequeña junto al evento en el calendario. JPG, PNG o WebP de hasta 5 MB.'),
    el('div', { class: 'post-pie' }, guardar, el('button', { class: 'boton boton-borde', type: 'button', onclick: () => alTerminar(false) }, 'Cancelar')));
  form.addEventListener('submit', async ev2 => {
    ev2.preventDefault();
    if (titulo.value.trim().length < 2 || !donde.value.trim() || !inicio.value || !fin.value) { avisar('Completa nombre, lugar y fechas.'); return; }
    if (fin.value < inicio.value) { avisar('El evento no puede terminar antes de empezar.'); return; }
    if (!(await confirmar({ titulo: nuevo ? 'Publicar evento' : 'Guardar cambios', mensaje: nuevo ? `«${titulo.value.trim()}» aparecerá en el calendario para todos.` : `Se actualizará «${titulo.value.trim()}» en el calendario.`, aceptar: nuevo ? 'Publicar' : 'Guardar' }))) return;
    guardar.disabled = true;
    const datos = { titulo: titulo.value.trim(), descripcion: desc.value.trim(), lugar_texto: donde.value.trim(), lugar_slug: slug.value || null,
      inicio: inicio.value, fin: fin.value, foto_url: url.value.trim() || null };
    try { nuevo ? await api.admin.crearEvento(datos) : await api.admin.editarEvento(e.id, datos); avisar(nuevo ? 'Evento publicado' : 'Cambios guardados'); alTerminar(true); }
    catch (err) { guardar.disabled = false; avisar(err.message); }
  });
  return form;
}

async function eventos(panel) {
  const [{ items }, lug] = await Promise.all([api.admin.eventos(), api.lugares({ limite: 48 })]);
  const recargar = () => eventos(panel);
  const abrir = ev => { vaciar(panel, formularioEvento(ev, lug.items, ok => (ok ? recargar() : recargar()))); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  vaciar(panel,
    el('div', { class: 'admin-cabecera barra-lugares' },
      el('p', { class: 'bajada crece' }, 'Fiestas y actividades del calendario. Cada una puede llevar una foto pequeña que ayuda a entender de qué se trata.'),
      el('button', { class: 'boton boton-principal', type: 'button', onclick: () => abrir(null) }, icono('mas'), 'Agregar evento')),
    items.length ? items.map(e => el('article', { class: 'admin-fila tarjeta fila-lugar' },
      e.foto_url ? el('img', { class: 'foto-previa', src: e.foto_url, alt: '', width: 96, height: 72 }) : el('div', { class: 'foto-previa foto-vacia', 'aria-hidden': 'true' }, icono('foto')),
      el('div', { class: 'crece' }, el('strong', {}, e.titulo), el('span', { class: 'nota fila-tipo' }, `${rangoFechas(e.inicio, e.fin)} · ${e.lugar}`)),
      el('div', { class: 'post-pie' },
        el('button', { class: 'boton boton-borde', type: 'button', onclick: () => abrir(e) }, 'Editar'),
        el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
          if (!(await confirmar({ titulo: 'Eliminar evento', mensaje: `Vas a eliminar «${e.titulo}» del calendario. No se puede deshacer.`, aceptar: 'Sí, eliminar', peligro: true }))) return;
          const b = ev.currentTarget; b.disabled = true;
          try { await api.admin.eliminarEvento(e.id); avisar('Evento eliminado'); recargar(); } catch (err) { b.disabled = false; avisar(err.message); }
        } }, icono('papelera'), 'Eliminar')))) : vacio('Aún no hay eventos', 'Agrega el primero con el botón de arriba.'));
}

async function lugares(panel) {
  const [{ items }, { destinos }] = await Promise.all([api.admin.lugares(), api.destinos()]);
  const nombresDestino = [...new Set([...destinos.map(d => d.nombre), ...items.map(l => l.destino)])];
  const recargar = () => lugares(panel);
  const abrirFormulario = lugar => {
    vaciar(panel, formularioLugar(lugar, nombresDestino, r => { recargar(); if (r) location.hash = '#/admin?seccion=lugares'; }));
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const publicados = items.filter(l => l.estado === 'publicado').length;
  const demos = items.filter(l => l.demostracion).length;
  vaciar(panel,
    el('div', { class: 'admin-cabecera barra-lugares' },
      el('p', { class: 'bajada crece' }, `${publicados} lugares publicados y ${items.length - publicados} retirados. Lo que publiques aparece en el muro, Explorar, el mapa y en las respuestas de Willaq Uma.`),
      demos ? el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
        if (!(await confirmar({ titulo: 'Eliminar lugares de demostración', mensaje: `Se borrarán ${demos} lugares de ejemplo. Esta acción no se puede deshacer.`, aceptar: 'Sí, eliminar', peligro: true }))) return;
        const b = ev.currentTarget; b.disabled = true;
        try { const r = await api.admin.quitarDemostracion(); avisar(`${r.eliminados} lugares de demostración eliminados`); recargar(); }
        catch (e) { b.disabled = false; avisar(e.message); }
      } }, icono('papelera'), `Quitar demostración (${demos})`) : null,
      el('button', { class: 'boton boton-principal', type: 'button', onclick: () => abrirFormulario(null) }, icono('mas'), 'Agregar lugar')),
    items.length ? items.map(l => {
      const retirado = l.estado === 'retirado';
      return el('article', { class: `admin-fila tarjeta fila-lugar${retirado ? ' retirado' : ''}` },
        foto(l.portada, l.tipo, { alt: '', ancho: 200 }),
        el('div', { class: 'crece' }, el('strong', {}, l.nombre),
          el('span', { class: 'nota fila-tipo' }, iconoTipo(l.tipo, 'ico ico-mini'), `${TIPOS[l.tipo] || l.tipo} · ${l.destino}${l.lat === null ? ' · sin ubicación en el mapa' : ''}`),
          retirado ? el('span', { class: 'etiqueta-estado demo' }, 'Retirado') : null,
          l.demostracion ? el('span', { class: 'etiqueta-estado demo' }, 'Demostración') : null),
        el('div', { class: 'post-pie' },
          retirado ? null : el('a', { class: 'boton boton-texto', href: `#/lugar/${l.slug}` }, 'Ver'),
          el('button', { class: 'boton boton-borde', type: 'button', onclick: () => abrirFormulario(l) }, 'Editar'),
          el('button', { class: `boton ${retirado ? 'boton-secundario' : 'boton-borde peligro'}`, type: 'button', onclick: async ev => {
            if (!retirado && !(await confirmar({ titulo: 'Retirar lugar', mensaje: `«${l.nombre}» dejará de verse en LlegueYa, pero podrás volver a publicarlo.`, aceptar: 'Retirar', peligro: true }))) return;
            if (retirado && !(await confirmar({ titulo: 'Publicar de nuevo', mensaje: `«${l.nombre}» volverá a verse para todos.`, aceptar: 'Publicar' }))) return;
            ev.target.disabled = true;
            try { await api.admin.estadoLugar(l.slug, retirado); avisar(retirado ? 'Lugar publicado de nuevo' : 'Lugar retirado'); recargar(); }
            catch (e) { ev.target.disabled = false; avisar(e.message); }
          } }, retirado ? 'Publicar de nuevo' : 'Retirar'),
          el('button', { class: 'boton boton-borde peligro', type: 'button', 'aria-label': `Eliminar ${l.nombre}`, onclick: async ev => {
            if (!(await confirmar({ titulo: 'Eliminar lugar para siempre', mensaje: `Vas a eliminar «${l.nombre}» con sus fotos. No se puede deshacer. Si solo quieres ocultarlo, usa Retirar.`, aceptar: 'Sí, eliminar', peligro: true }))) return;
            const b = ev.currentTarget; b.disabled = true;
            try { await api.admin.eliminarLugar(l.slug); avisar('Lugar eliminado'); recargar(); }
            catch (e) { b.disabled = false; avisar(e.message); }
          } }, icono('papelera'), 'Eliminar')));
    }) : vacio('Aún no hay lugares', 'Agrega el primero con el botón de arriba.'));
}

async function pedirMotivo(texto) {
  return (await pedirTexto({ titulo: 'Suspender cuenta', mensaje: texto, aceptar: 'Suspender', peligro: true, ayuda: 'Motivo', vacio: 'Escribe el motivo para continuar.' })) || '';
}

async function reportes(panel) {
  const { items } = await api.admin.reportes();
  const resolver = async (r, datos, boton) => {
    if (!datos.suspender_autor && !(await confirmar({ titulo: datos.retirar ? 'Retirar publicación' : 'Desestimar reporte', mensaje: datos.retirar ? 'La publicación dejará de verse en LlegueYa y el reporte quedará resuelto.' : 'El reporte se cierra sin tomar medidas contra la publicación.', aceptar: datos.retirar ? 'Retirar' : 'Desestimar', peligro: Boolean(datos.retirar) }))) return;
    boton.disabled = true;
    try {
      const x = await api.admin.resolverReporte(r.id, datos);
      avisar(x.retirado ? (x.autor_suspendido ? 'Publicación retirada y cuenta suspendida' : 'Publicación retirada') : 'Reporte desestimado');
      reportes(panel);
    } catch (e) { boton.disabled = false; avisar(e.message); }
  };
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Lo que los viajeros marcaron como falso, ofensivo o engañoso. Revisa la publicación y decide: retirarla, retirarla y suspender al autor, o desestimar el reporte.'),
    items.length ? items.map(r => {
      const p = r.publicacion;
      const acciones = el('div', { class: 'post-pie' });
      acciones.append(
        el('button', { class: 'boton boton-secundario', type: 'button', onclick: ev => resolver(r, { retirar: true, decision: 'Contenido retirado' }, ev.target) }, 'Retirar publicación'),
        el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
          const motivo = await pedirMotivo(`Motivo para suspender a ${p ? p.autor.nombre : 'la cuenta'}:`);
          if (motivo) resolver(r, { retirar: true, suspender_autor: true, decision: motivo }, ev.target);
        } }, 'Retirar y suspender autor'),
        el('button', { class: 'boton boton-texto', type: 'button', onclick: ev => resolver(r, { retirar: false, decision: 'Sin falta' }, ev.target) }, 'Desestimar'));
      return el('article', { class: 'admin-fila tarjeta' },
        el('div', { class: 'admin-cabecera' }, icono('bandera'),
          el('div', { class: 'crece' }, el('strong', {}, r.motivo), el('span', {}, `Reportado ${tiempoRelativo(r.creado_en)}`)),
          el('span', { class: 'etiqueta-estado revision' }, 'Pendiente')),
        r.detalle ? el('p', { class: 'nota' }, `«${r.detalle}»`) : null,
        p ? el('div', { class: 'reporte-contenido' },
          el('div', { class: 'cuenta-fila' }, avatar(p.autor), el('strong', {}, p.autor.nombre)),
          p.foto_url ? el('img', { class: 'admin-foto', src: p.foto_url, alt: 'Foto reportada' }) : null,
          el('p', {}, p.texto || '(solo foto)')) : el('p', { class: 'nota' }, 'La publicación ya no existe.'),
        acciones);
    }) : vacio('Sin reportes pendientes', 'Cuando un viajero reporte algo, aparecerá aquí.'));
}

async function contenido(panel) {
  const { items } = await api.admin.contenido();
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Todo lo publicado y visible. Quita una foto que no corresponde (la publicación sigue sin ella) o retira la publicación completa.'),
    items.length ? el('div', { class: 'admin-rejilla' }, items.map(p => {
      const tarjeta = el('article', { class: 'tarjeta admin-pieza' });
      const acciones = el('div', { class: 'post-pie' });
      if (p.foto_url) {
        acciones.append(el('button', { class: 'boton boton-borde', type: 'button', onclick: async ev => {
          if (!(await confirmar({ titulo: 'Quitar foto', mensaje: `Se quitará la foto de la publicación de ${p.autor.nombre}. No se puede deshacer.`, aceptar: 'Quitar foto', peligro: true }))) return;
          ev.target.disabled = true;
          try { await api.admin.quitarFoto(p.id); avisar('Foto eliminada'); contenido(panel); } catch (e) { ev.target.disabled = false; avisar(e.message); }
        } }, 'Quitar foto'));
      }
      acciones.append(el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
        if (!(await confirmar({ titulo: 'Retirar publicación', mensaje: 'Dejará de verse en LlegueYa.', aceptar: 'Retirar', peligro: true }))) return;
        ev.target.disabled = true;
        try { await api.admin.retirar(p.id); avisar('Publicación retirada'); tarjeta.remove(); } catch (e) { ev.target.disabled = false; avisar(e.message); }
      } }, 'Retirar'));
      vaciar(tarjeta,
        p.foto_url ? el('img', { class: 'admin-foto', src: p.foto_url, alt: `Foto de ${p.autor.nombre}`, loading: 'lazy' }) : null,
        el('div', { class: 'cuenta-fila' }, avatar(p.autor), el('div', {}, el('strong', {}, p.autor.nombre), el('span', {}, tiempoRelativo(p.creado_en)))),
        p.texto ? el('p', {}, p.texto) : null, acciones);
      return tarjeta;
    })) : vacio('Nada publicado todavía', 'Las publicaciones aprobadas aparecerán aquí.'));
}

async function cuentas(panel) {
  const { items } = await api.admin.cuentas();
  const elegidas = new Set();
  const contador = el('span', { class: 'nota' }, 'Ninguna seleccionada');
  const masiva = el('button', { class: 'boton boton-borde peligro', type: 'button', disabled: true }, 'Suspender seleccionadas');
  const actualizar = () => {
    contador.textContent = elegidas.size ? `${elegidas.size} seleccionada${elegidas.size > 1 ? 's' : ''}` : 'Ninguna seleccionada';
    masiva.disabled = !elegidas.size;
  };
  masiva.addEventListener('click', async () => {
    const motivo = await pedirMotivo(`Motivo para suspender ${elegidas.size} cuentas (por ejemplo: cuentas falsas creadas en serie):`);
    if (!motivo) return;
    try {
      const r = await api.admin.suspensionMasiva([...elegidas], motivo);
      avisar(`${r.suspendidas} cuentas suspendidas. Se ocultaron ${r.contenido_oculto} publicaciones o comentarios.`);
      cuentas(panel);
    } catch (e) { avisar(e.message); }
  });
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Suspender una cuenta cierra su sesión, impide que vuelva a entrar y oculta lo que publicó. Úsalo con cuentas falsas o que suplantan a otros. Marca varias para darlas de baja a la vez.'),
    el('div', { class: 'barra-masiva tarjeta' }, contador, masiva),
    items.length ? items.map(c => {
      const boton = el('button', { class: `boton ${c.suspendida ? 'boton-secundario' : 'boton-borde peligro'}`, type: 'button', disabled: c.eres_tu || null },
        c.eres_tu ? 'Tu cuenta' : (c.suspendida ? 'Reactivar' : 'Suspender'));
      boton.addEventListener('click', async () => {
        let motivo = '';
        if (!c.suspendida) {
          motivo = await pedirMotivo(`Motivo para suspender a ${c.nombre}:`);
          if (!motivo) return;
        }
        try {
          const r = await api.admin.suspension(c.id, !c.suspendida, motivo);
          avisar(r.suspendida ? `Cuenta suspendida. Se ocultaron ${r.contenido_oculto} publicaciones o comentarios.` : 'Cuenta reactivada');
          cuentas(panel);
        } catch (e) { avisar(e.message); }
      });
      const caja = (c.eres_tu || c.suspendida) ? el('span', { class: 'caja-vacia' })
        : el('input', { type: 'checkbox', 'aria-label': `Seleccionar a ${c.nombre}`, onchange: ev => { if (ev.target.checked) elegidas.add(c.id); else elegidas.delete(c.id); actualizar(); } });
      return el('article', { class: 'admin-fila tarjeta cuenta-fila' }, caja, avatar(c),
        el('div', { class: 'crece' }, el('strong', {}, c.nombre),
          el('span', {}, `${c.publicaciones} publicaciones`, c.suspendida ? ` · Suspendida: ${c.motivo}` : '')),
        boton);
    }) : vacio('Sin cuentas todavía', 'Aquí aparecerán quienes entren, publiquen o comenten.'));
}

function tarjetaSolicitud(s, recargar) {
  const requisitos = el('ul', { class: 'requisitos' }, Object.entries(s.requisitos).map(([nombre, cumple]) => {
    const id = `req-${s.id}-${nombre}`.replace(/[^a-z0-9-]/gi, '');
    const caja = el('input', { type: 'checkbox', id, checked: cumple || null, disabled: s.estado !== 'pendiente' || null });
    caja.addEventListener('change', async () => {
      try { await api.admin.requisito(s.id, nombre, caja.checked); } catch (e) { caja.checked = !caja.checked; avisar(e.message); }
    });
    return el('li', {}, caja, el('label', { for: id }, nombre));
  }));
  const acciones = el('div', { class: 'post-pie' });
  if (s.estado === 'pendiente') {
    if (s.pago === 'pendiente') {
      acciones.append(el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => {
        const ref = (await pedirTexto({ titulo: 'Registrar pago', mensaje: `Referencia del pago de ${precioSoles(s.monto)} (voucher, Yape, depósito).`, aceptar: 'Registrar', ayuda: 'Referencia' })) || '';
        if (!ref) return;
        try { await api.admin.pago(s.id, ref); avisar('Pago registrado'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Registrar pago'));
    }
    acciones.append(
      el('button', { class: 'boton boton-secundario', type: 'button', onclick: async () => {
        if (!(await confirmar({ titulo: 'Verificar negocio', mensaje: 'Aparecerá como patrocinado en LlegueYa.', aceptar: 'Aprobar' }))) return;
        try { await api.admin.decisionSolicitud(s.id, true, ''); avisar('Negocio verificado: ya aparece como patrocinado'); recargar(); }
        catch (e) { avisar(e.message); }
      } }, 'Aprobar'),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => {
        const motivo = (await pedirTexto({ titulo: 'Rechazar solicitud', mensaje: 'El negocio verá este motivo.', aceptar: 'Rechazar', peligro: true, ayuda: 'Motivo' })) || '';
        if (!motivo) return;
        try { await api.admin.decisionSolicitud(s.id, false, motivo); avisar('Solicitud rechazada'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Rechazar'));
  }
  const pago = { no_requerido: 'Sin pago (gratuito)', pendiente: `Pago pendiente: ${precioPlan(s.plan).split(' / ')[0]}`, registrado: `Pagado (${s.referencia_pago})` }[s.pago];
  return el('article', { class: 'admin-fila tarjeta' },
    el('div', { class: 'admin-cabecera' }, icono('tienda'),
      el('div', { class: 'crece' }, el('strong', {}, s.negocio), el('span', {}, `${s.rubro_nombre} · pedido por ${s.solicitante}`)),
      el('span', { class: `etiqueta-estado ${s.estado === 'pendiente' ? 'revision' : s.estado === 'rechazada' ? 'demo' : ''}` }, s.estado)),
    carruselNegocio(s.fotos, s.negocio),
    el('p', {}, s.descripcion),
    extrasNegocio(s),
    el('p', { class: 'nota' }, `Contacto: ${s.contacto}`, s.whatsapp ? ` · WhatsApp +${s.whatsapp}` : '', s.enlace ? [' · ', el('a', { href: s.enlace, target: '_blank', rel: 'noopener' }, s.enlace)] : null),
    el('p', { class: 'nota' }, `Plan ${s.plan.nivel_nombre}: ${s.plan.nombre} (${precioPlan(s.plan)}) · ${pago}`),
    s.motivo ? el('p', { class: 'nota' }, `Motivo: ${s.motivo}`) : null,
    el('h3', { class: 'subtitulo' }, 'Requisitos verificados por LlegueYa'), requisitos, acciones);
}

async function negocios(panel) {
  const { items } = await api.admin.solicitudes();
  const recargar = () => negocios(panel);
  const pendientes = items.filter(s => s.estado === 'pendiente');
  const resueltas = items.filter(s => s.estado !== 'pendiente');
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Los negocios turísticos (hospedaje, restaurantes, movilidad, agencias y artesanía) piden promocionarse. Verifica cada requisito, registra el pago si el plan lo tiene y aprueba. Pagar no garantiza la aprobación.'),
    el('h2', { class: 'titulo-bloque' }, `Por verificar (${pendientes.length})`),
    pendientes.length ? pendientes.map(s => tarjetaSolicitud(s, recargar)) : vacio('Sin solicitudes nuevas', 'Cuando un negocio pida promocionarse, aparecerá aquí.'),
    resueltas.length ? [el('h2', { class: 'titulo-bloque' }, 'Resueltas'), resueltas.map(s => tarjetaSolicitud(s, recargar))] : null);
}

async function planes(panel) {
  const { planes: lista } = await api.admin.solicitudes();
  const form = el('form', { class: 'tarjeta form-plan' },
    el('h2', { class: 'titulo-bloque' }, 'Nuevo plan de promoción'),
    el('label', { class: 'etiqueta', for: 'plan-nombre' }, 'Nombre'), el('input', { id: 'plan-nombre', name: 'nombre', required: true, maxlength: 60 }),
    el('label', { class: 'etiqueta', for: 'plan-desc' }, 'Qué incluye'), el('input', { id: 'plan-desc', name: 'descripcion', maxlength: 300 }),
    el('div', { class: 'fila-campos' },
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-nivel' }, 'Nivel'), el('select', { id: 'plan-nivel', name: 'nivel' },
        el('option', { value: 'basico' }, 'Básico'), el('option', { value: 'plus', selected: true }, 'Plus'), el('option', { value: 'premium' }, 'Premium'))),
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-moneda' }, 'Moneda'), el('select', { id: 'plan-moneda', name: 'moneda' },
        el('option', { value: 'PEN' }, 'Soles (S/)'), el('option', { value: 'USD' }, 'Dólares (US$)')))),
    el('div', { class: 'fila-campos' },
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-precio' }, 'Precio'), el('input', { id: 'plan-precio', name: 'precio', type: 'number', min: 0, step: '0.01', required: true })),
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-dias' }, 'Duración (días)'), el('input', { id: 'plan-dias', name: 'duracion_dias', type: 'number', min: 1, max: 365, value: 30, required: true }))),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'destacado' }), 'Destacado (aparece primero en el muro)'),
    el('button', { class: 'boton boton-principal', type: 'submit' }, 'Crear plan'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    if (!(await confirmar({ titulo: 'Crear plan', mensaje: `Se publicará el plan «${d.get('nombre')}» para que los negocios lo elijan.`, aceptar: 'Crear plan' }))) return;
    try {
      await api.admin.crearPlan({ nombre: d.get('nombre'), descripcion: d.get('descripcion'), precio: d.get('precio'),
        duracion_dias: Number(d.get('duracion_dias')), destacado: d.get('destacado') === 'on', nivel: d.get('nivel'), moneda: d.get('moneda') });
      avisar('Plan creado'); planes(panel);
    } catch (e) { avisar(e.message); }
  });
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Tú defines los precios en soles o dólares y activas o desactivas cada plan. Un plan desactivado deja de ofrecerse, pero los negocios que ya lo tienen siguen igual. El pago se registra a mano hasta que se integre una pasarela de pagos.'),
    lista.map(p => el('article', { class: `admin-fila tarjeta admin-cabecera${p.activo ? '' : ' inactivo'}` },
      el('span', { class: `etiqueta-estado nivel-plan nivel-${p.nivel}` }, p.nivel_nombre),
      el('div', { class: 'crece' }, el('strong', {}, `${p.nombre} · ${precioPlan(p)}`),
        el('span', {}, `${p.duracion_dias} días${p.destacado ? ' · destacado' : ''}${p.gratuidad_inicial ? ' · una vez por negocio' : ''}${p.activo ? '' : ' · desactivado'}`)),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => {
        if (!(await confirmar({ titulo: p.activo ? 'Desactivar plan' : 'Activar plan', mensaje: p.activo ? `«${p.nombre}» dejará de ofrecerse a los negocios nuevos.` : `«${p.nombre}» volverá a ofrecerse a los negocios.`, aceptar: p.activo ? 'Desactivar' : 'Activar', peligro: p.activo }))) return;
        try { await api.admin.activarPlan(p.id, !p.activo); planes(panel); } catch (e) { avisar(e.message); }
      } }, p.activo ? 'Desactivar' : 'Activar'),
      editorPrecio(p, () => planes(panel)))),
    form);
}

// Cambiar precio, moneda y duración de un plan existente. Los negocios ya aprobados conservan lo que pagaron.
function editorPrecio(p, recargar) {
  const precio = el('input', { type: 'number', min: 0, step: '0.01', value: p.precio, 'aria-label': `Precio de ${p.nombre}`, disabled: p.gratuidad_inicial || null });
  const moneda = el('select', { 'aria-label': `Moneda de ${p.nombre}` },
    el('option', { value: 'PEN', selected: p.moneda === 'PEN' || null }, 'S/'), el('option', { value: 'USD', selected: p.moneda === 'USD' || null }, 'US$'));
  const dias = el('input', { type: 'number', min: 1, max: 365, value: p.duracion_dias, 'aria-label': `Días de ${p.nombre}` });
  const form = el('form', { class: 'editor-precio' }, moneda, precio, dias, el('span', { class: 'nota' }, 'días'),
    el('button', { class: 'boton boton-secundario', type: 'submit' }, 'Guardar precio'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const nuevo = { precio: precio.value, moneda: moneda.value, duracion_dias: Number(dias.value) };
    if (!(await confirmar({ titulo: 'Cambiar precio', mensaje: `«${p.nombre}» quedará en ${precioPlan(nuevo)}. Los negocios ya aprobados conservan lo que pagaron.`, aceptar: 'Guardar cambios' }))) return;
    try { await api.admin.editarPlan(p.id, p.gratuidad_inicial ? { duracion_dias: nuevo.duracion_dias } : nuevo); avisar('Precio actualizado'); recargar(); }
    catch (e) { avisar(e.message); }
  });
  return form;
}


// ---------------------------------------------------------------- Terminales y paraderos
function formularioTerminal(t, lugares, alTerminar) {
  t = t || { tipo: 'paradero', destinos: [], fuentes: [] };
  const destinos = el('div', { class: 'ofertas-editor' });
  const filaDestino = (d = {}) => {
    const sel = el('select', { name: 'dest_slug', 'aria-label': 'Lugar de destino' }, el('option', { value: '' }, 'Elige el lugar'),
      lugares.map(l => el('option', { value: l.slug, selected: l.slug === d.slug || null }, l.nombre)));
    const f = el('div', { class: 'destino-fila' }, sel,
      el('input', { name: 'dest_tiempo', placeholder: 'Tiempo (Cerca de 1 hora)', maxlength: 80, value: d.tiempo || '', 'aria-label': 'Tiempo de viaje' }),
      el('input', { name: 'dest_tarifa', placeholder: 'Pasaje (Entre S/ 5 y S/ 10…)', maxlength: 160, value: d.tarifa || '', 'aria-label': 'Pasaje' }),
      el('input', { name: 'dest_nota', placeholder: 'Nota (opcional)', maxlength: 200, value: d.nota || '', 'aria-label': 'Nota' }),
      el('button', { class: 'boton-icono', type: 'button', 'aria-label': 'Quitar destino', onclick: () => f.remove() }, icono('cerrar')));
    destinos.append(f);
  };
  (t.destinos.length ? t.destinos : [{}]).forEach(filaDestino);
  const fuente = (t.fuentes || [])[0] || {};
  const nota = el('p', { class: 'nota', role: 'status', 'aria-live': 'polite' });
  const form = el('form', { class: 'tarjeta form-plan form-lugar', novalidate: true },
    el('h2', { class: 'titulo-bloque' }, t.id ? `Corregir «${t.nombre}»` : 'Nuevo terminal o paradero'),
    campo('ter-nombre', 'Nombre', el('input', { id: 'ter-nombre', name: 'nombre', required: true, maxlength: 120, value: t.nombre || '', placeholder: 'Terminal Terrestre Los Libertadores' })),
    campo('ter-tipo', 'Tipo', el('select', { id: 'ter-tipo', name: 'tipo' },
      el('option', { value: 'terminal', selected: t.tipo === 'terminal' || null }, 'Terminal de buses'),
      el('option', { value: 'paradero', selected: t.tipo === 'paradero' || null }, 'Paradero de autos y combis'))),
    campo('ter-ref', 'Referencia para ubicarlo', el('input', { id: 'ter-ref', name: 'referencia', required: true, maxlength: 200, value: t.referencia || '', placeholder: 'Av. Pérez de Cuéllar s/n, frente a…' })),
    el('div', { class: 'foto-campos' },
      campo('ter-horario', 'Horario', el('input', { id: 'ter-horario', name: 'horario', maxlength: 40, value: t.horario || '', placeholder: '24 h  ·  05:30 – 19:00' })),
      campo('ter-frec', 'Frecuencia', el('input', { id: 'ter-frec', name: 'frecuencia', maxlength: 40, value: t.frecuencia || '', placeholder: 'Cada 15 min' }))),
    el('div', { class: 'foto-campos' },
      campo('ter-pasaje', 'Pasaje (resumen)', el('input', { id: 'ter-pasaje', name: 'pasaje', maxlength: 60, value: t.pasaje || '', placeholder: 'S/ 5 – 10' })),
      campo('ter-mapa', 'Texto para Google Maps', el('input', { id: 'ter-mapa', name: 'mapa', maxlength: 200, value: t.mapa || '', placeholder: 'Óvalo del Dios Wari, Ayacucho' }))),
    campo('ter-desc', 'Descripción corta', el('input', { id: 'ter-desc', name: 'descripcion', maxlength: 240, value: t.descripcion || '', placeholder: 'Combis hacia Quinua y la Pampa de Ayacucho.' })),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Ubicación en el mapa'),
      selectorUbicacion({ lat: t.lat ?? null, lon: t.lon ?? null, ayuda: 'Toca el mapa donde está el terminal o paradero. Puedes arrastrar el pin.' })),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Destinos a los que lleva'),
      el('p', { class: 'nota' }, 'Elige el lugar y escribe el tiempo y el pasaje aproximados.'), destinos,
      el('button', { class: 'boton boton-borde', type: 'button', onclick: () => filaDestino() }, icono('mas'), 'Agregar destino')),
    el('div', { class: 'foto-campos' },
      campo('ter-fnombre', 'Fuente (nombre)', el('input', { id: 'ter-fnombre', name: 'fuente_nombre', maxlength: 80, value: fuente.nombre || '', placeholder: 'Guía de viaje, municipalidad…' })),
      campo('ter-furl', 'Fuente (enlace)', el('input', { id: 'ter-furl', name: 'fuente_url', type: 'url', maxlength: 500, value: fuente.url || '', placeholder: 'https://' }))),
    nota,
    el('div', { class: 'post-pie' },
      el('button', { class: 'boton boton-principal', type: 'submit' }, t.id ? 'Guardar cambios' : 'Publicar terminal'),
      el('button', { class: 'boton boton-texto', type: 'button', onclick: () => alTerminar(false) }, 'Cancelar')));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    const [slugs, tiempos, tarifas, notas] = ['dest_slug', 'dest_tiempo', 'dest_tarifa', 'dest_nota'].map(k => d.getAll(k));
    const datos = {
      nombre: String(d.get('nombre') || '').trim(), tipo: d.get('tipo'), referencia: String(d.get('referencia') || '').trim(),
      horario: d.get('horario'), frecuencia: d.get('frecuencia'), pasaje: d.get('pasaje'), mapa: d.get('mapa'), descripcion: d.get('descripcion'),
      lat: d.get('lat') ? Number(d.get('lat')) : null, lon: d.get('lon') ? Number(d.get('lon')) : null, foto_url: t.foto_url || '',
      destinos: slugs.map((slug, i) => ({ slug, tiempo: tiempos[i], tarifa: tarifas[i], nota: notas[i] })).filter(x => x.slug),
      // La primera fuente se edita aquí; las demás se conservan tal cual.
      fuentes: [...(d.get('fuente_url') ? [{ nombre: d.get('fuente_nombre') || 'Fuente', url: d.get('fuente_url') }] : []), ...(t.fuentes || []).slice(1)].slice(0, 4),
    };
    if (datos.lat === null) { nota.textContent = 'Marca el terminal en el mapa.'; return; }
    if (!(await confirmar({ titulo: t.id ? 'Guardar cambios' : 'Publicar terminal', mensaje: t.id ? `Se actualizará «${datos.nombre}» para todos los viajeros.` : `«${datos.nombre}» aparecerá en Terminales, en el Mapa y en «Cómo llegar».`, aceptar: t.id ? 'Guardar cambios' : 'Publicar' }))) return;
    nota.textContent = 'Guardando…';
    try {
      if (t.id) await api.admin.editarTerminal(t.id, datos); else await api.admin.crearTerminal(datos);
      avisar(t.id ? 'Terminal actualizado' : 'Terminal publicado'); alTerminar(true);
    } catch (e) { nota.textContent = e.message; }
  });
  return form;
}

async function terminalesAdmin(panel) {
  const [{ items }, lug] = await Promise.all([api.terminales(), api.lugares({ limite: 48 })]);
  const recargar = () => terminalesAdmin(panel);
  const abrir = t => { vaciar(panel, formularioTerminal(t, lug.items, () => recargar())); panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const nombres = new Map(lug.items.map(l => [l.slug, l.nombre]));
  vaciar(panel,
    el('div', { class: 'admin-cabecera barra-lugares' },
      el('p', { class: 'bajada crece' }, 'Terminales y paraderos de autos y buses. Corrige su ubicación, horario y pasajes, o elimina los que ya no funcionan. Son solo referencia para viajar por cuenta propia.'),
      el('button', { class: 'boton boton-principal', type: 'button', onclick: () => abrir(null) }, icono('mas'), 'Agregar terminal')),
    items.length ? items.map(t => el('article', { class: 'admin-fila tarjeta fila-lugar' },
      el('span', { class: 'terminal-icono', 'aria-hidden': 'true' }, icono('bus')),
      el('div', { class: 'crece' }, el('strong', {}, t.nombre),
        el('span', { class: 'nota fila-tipo' }, [t.tipo_nombre, t.horario, t.pasaje && `Pasaje ${t.pasaje}`].filter(Boolean).join(' · ')),
        el('span', { class: 'nota' }, 'Lleva a: ', t.destinos.map(d => nombres.get(d.slug) || d.slug).join(', ') || '—')),
      el('div', { class: 'post-pie' },
        el('a', { class: 'boton boton-texto', href: `#/mapa?terminal=${t.id}` }, 'Ver en el mapa'),
        el('button', { class: 'boton boton-borde', type: 'button', onclick: () => abrir(t) }, 'Corregir'),
        el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
          if (!(await confirmar({ titulo: 'Eliminar terminal', mensaje: `Vas a eliminar «${t.nombre}». Dejará de verse en Terminales, el Mapa y «Cómo llegar». No se puede deshacer.`, aceptar: 'Sí, eliminar', peligro: true }))) return;
          const b = ev.currentTarget; b.disabled = true;
          try { await api.admin.eliminarTerminal(t.id); avisar('Terminal eliminado'); recargar(); } catch (err) { b.disabled = false; avisar(err.message); }
        } }, icono('papelera'), 'Eliminar')))) : vacio('Aún no hay terminales', 'Agrega el primero con el botón de arriba.'));
}

const SECCIONES = { lugares, terminales: terminalesAdmin, eventos, moderacion, reportes, contenido, cuentas, negocios, planes };

export async function render(vista, ruta) {
  if (!estado.usuario || !estado.usuario.admin) {
    vaciar(vista, vacio('Solo para administración', 'Esta sección es para el equipo de LlegueYa.', el('a', { class: 'boton boton-secundario', href: '#/inicio' }, 'Volver al inicio')));
    return;
  }
  const actual = SECCIONES[ruta.filtros.seccion] ? ruta.filtros.seccion : 'lugares';
  const panel = el('div', { role: 'tabpanel' }, el('p', { class: 'cargando' }, 'Cargando…'));
  let resumen = null;
  try { resumen = await api.admin.resumen(); } catch (e) { vaciar(vista, error(e.message)); return; }
  // Cifras en tarjetas: se resaltan y llevan a su sección solo cuando hay algo pendiente.
  const pendiente = (n, texto, seccion, icn) => el(n ? 'a' : 'div', { class: `admin-cifra${n ? ' con-pendientes' : ''}`, href: n ? `#/admin?seccion=${seccion}` : null },
    icono(icn, 'ico'), el('b', {}, n), el('span', {}, texto));
  const ICONOS = { lugares: 'explorar', terminales: 'bus', eventos: 'calendario', moderacion: 'escudo', reportes: 'bandera',
    contenido: 'foto', cuentas: 'perfil', negocios: 'tienda', planes: 'estrella' };
  vaciar(vista, el('section', { class: 'ancho admin' },
    el('h1', { class: 'titulo-vista' }, 'Administración'),
    el('div', { class: 'admin-cifras-tarjetas' },
      pendiente(resumen.publicaciones_pendientes, 'publicaciones por revisar', 'moderacion', 'foto'),
      pendiente(resumen.comentarios_pendientes, 'comentarios por revisar', 'moderacion', 'comentario'),
      pendiente(resumen.reportes_pendientes ?? 0, 'reportes por resolver', 'reportes', 'bandera'),
      pendiente(resumen.solicitudes_pendientes, 'negocios por verificar', 'negocios', 'tienda'),
      pendiente(resumen.cuentas_suspendidas, 'cuentas suspendidas', 'cuentas', 'perfil')),
    el('nav', { class: 'admin-secciones', role: 'tablist', 'aria-label': 'Secciones de administración' }, PESTANAS.map(([id, nombre]) =>
      el('a', { role: 'tab', href: `#/admin?seccion=${id}`, 'aria-selected': String(id === actual) }, icono(ICONOS[id] || 'escudo', 'ico'), nombre))),
    panel));
  try { await SECCIONES[actual](panel); } catch (e) { vaciar(panel, error(e.message, () => SECCIONES[actual](panel))); }
}
