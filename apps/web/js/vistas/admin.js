// Panel de administración: moderación, cuentas falsas, negocios verificados y planes.
// La web solo muestra el panel; cada acción la vuelve a validar el servidor (rol admin).
import { api } from '../api.js';
import { avatar, error, foto, vacio } from '../componentes.js';
import { avisar, el, icono, vaciar } from '../dom.js';
import { estado } from '../estado.js';
import { TIPOS, precioSoles, tiempoRelativo } from '../util.js';
import { selectorUbicacion } from './mapa.js';

const PESTANAS = [['lugares', 'Lugares'], ['moderacion', 'Moderación'], ['reportes', 'Reportes'], ['contenido', 'Fotos y publicaciones'], ['cuentas', 'Cuentas'], ['negocios', 'Negocios y promociones'], ['planes', 'Planes']];

function cifra(n, texto) {
  return el('li', {}, el('b', {}, n), el('span', {}, texto));
}

async function moderacion(panel) {
  const { publicaciones, comentarios } = await api.admin.moderacion();
  const fila = (tipo, x, contenido) => {
    const acciones = el('div', { class: 'post-pie' });
    for (const [aprobar, texto, clase] of [[true, 'Aprobar', 'boton-secundario'], [false, 'Rechazar', 'boton-borde']]) {
      acciones.append(el('button', { class: `boton ${clase}`, type: 'button', onclick: async ev => {
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

function filaFoto(f = {}, n) {
  const fila = el('div', { class: 'foto-fila' },
    el('input', { name: 'foto_url', type: 'url', placeholder: 'https://… (enlace de la imagen)', value: f.url || '', 'aria-label': `Enlace de la foto ${n}` }),
    el('input', { name: 'foto_autor', placeholder: 'Autor', value: f.autor || '', maxlength: 120, 'aria-label': `Autor de la foto ${n}` }),
    el('input', { name: 'foto_licencia', placeholder: 'Licencia (CC BY-SA 4.0…)', value: f.licencia || '', maxlength: 80, 'aria-label': `Licencia de la foto ${n}` }),
    el('input', { name: 'foto_fuente', type: 'url', placeholder: 'Página de origen (opcional)', value: f.fuente_url && f.fuente_url !== f.url ? f.fuente_url : '', 'aria-label': `Página de origen de la foto ${n}` }),
    el('button', { class: 'boton-icono', type: 'button', 'aria-label': `Quitar foto ${n}`, onclick: () => fila.remove() }, icono('cerrar')));
  return fila;
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
    campo('lugar-desc', 'Descripción', el('textarea', { id: 'lugar-desc', name: 'descripcion', rows: 4, required: true, maxlength: 4000 }, l.descripcion || '')),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Ubicación en el mapa'),
      selectorUbicacion({ lat: l.lat ?? null, lon: l.lon ?? null })),
    el('div', { class: 'fila-campos' },
      campo('lugar-altitud', 'Altitud (m s. n. m.)', el('input', { id: 'lugar-altitud', name: 'altitud_m', type: 'number', min: 0, max: 7000, value: l.altitud_m ?? '' })),
      campo('lugar-fuente', 'Fuente de la información', el('input', { id: 'lugar-fuente', name: 'fuente_url', type: 'url', placeholder: 'https://', value: l.fuente_url || '' }))),
    campo('lugar-llegar', 'Cómo llegar', el('textarea', { id: 'lugar-llegar', name: 'como_llegar', rows: 2, maxlength: 1000 }, l.como_llegar || '')),
    campo('lugar-recom', 'Recomendaciones (una por línea)', el('textarea', { id: 'lugar-recom', name: 'recomendaciones', rows: 3 }, (l.recomendaciones || []).join('\n'))),
    el('fieldset', { class: 'grupo' }, el('legend', { class: 'etiqueta' }, 'Fotos con licencia libre (hasta 8)'),
      el('p', { class: 'nota' }, 'Usa fotos de Wikimedia Commons o propias, siempre con autor y licencia.'), fotos, agregarFoto),
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
      fotos: urls.map((url, i) => ({ url: url.trim(), autor: autores[i], licencia: licencias[i], fuente_url: fuentes[i].trim() })).filter(f => f.url),
    };
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

async function lugares(panel) {
  const [{ items }, { destinos }] = await Promise.all([api.admin.lugares(), api.destinos()]);
  const nombresDestino = [...new Set([...destinos.map(d => d.nombre), ...items.map(l => l.destino)])];
  const recargar = () => lugares(panel);
  const abrirFormulario = lugar => {
    vaciar(panel, formularioLugar(lugar, nombresDestino, r => { recargar(); if (r) location.hash = '#/admin?seccion=lugares'; }));
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const publicados = items.filter(l => l.estado === 'publicado').length;
  vaciar(panel,
    el('div', { class: 'admin-cabecera barra-lugares' },
      el('p', { class: 'bajada crece' }, `${publicados} lugares publicados y ${items.length - publicados} retirados. Lo que publiques aparece en el muro, Explorar, el mapa y en las respuestas de Willaq Uma.`),
      el('button', { class: 'boton boton-principal', type: 'button', onclick: () => abrirFormulario(null) }, icono('mas'), 'Agregar lugar')),
    items.length ? items.map(l => {
      const retirado = l.estado === 'retirado';
      return el('article', { class: `admin-fila tarjeta fila-lugar${retirado ? ' retirado' : ''}` },
        foto(l.portada, l.tipo, { alt: '', ancho: 200 }),
        el('div', { class: 'crece' }, el('strong', {}, l.nombre),
          el('span', { class: 'nota' }, `${TIPOS[l.tipo] || l.tipo} · ${l.destino}${l.lat === null ? ' · sin ubicación en el mapa' : ''}`),
          retirado ? el('span', { class: 'etiqueta-estado demo' }, 'Retirado') : null),
        el('div', { class: 'post-pie' },
          retirado ? null : el('a', { class: 'boton boton-texto', href: `#/lugar/${l.slug}` }, 'Ver'),
          el('button', { class: 'boton boton-borde', type: 'button', onclick: () => abrirFormulario(l) }, 'Editar'),
          el('button', { class: `boton ${retirado ? 'boton-secundario' : 'boton-borde peligro'}`, type: 'button', onclick: async ev => {
            if (!retirado && !confirm(`¿Retirar «${l.nombre}»? Dejará de verse, pero podrás volver a publicarlo.`)) return;
            ev.target.disabled = true;
            try { await api.admin.estadoLugar(l.slug, retirado); avisar(retirado ? 'Lugar publicado de nuevo' : 'Lugar retirado'); recargar(); }
            catch (e) { ev.target.disabled = false; avisar(e.message); }
          } }, retirado ? 'Publicar de nuevo' : 'Retirar')));
    }) : vacio('Aún no hay lugares', 'Agrega el primero con el botón de arriba.'));
}

function pedirMotivo(texto) {
  return (prompt(texto) || '').trim();
}

async function reportes(panel) {
  const { items } = await api.admin.reportes();
  const resolver = async (r, datos, boton) => {
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
        el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: ev => {
          const motivo = pedirMotivo(`Motivo para suspender a ${p ? p.autor.nombre : 'la cuenta'}:`);
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
          if (!confirm(`¿Quitar la foto de ${p.autor.nombre}? No se puede deshacer.`)) return;
          ev.target.disabled = true;
          try { await api.admin.quitarFoto(p.id); avisar('Foto eliminada'); contenido(panel); } catch (e) { ev.target.disabled = false; avisar(e.message); }
        } }, 'Quitar foto'));
      }
      acciones.append(el('button', { class: 'boton boton-borde peligro', type: 'button', onclick: async ev => {
        if (!confirm('¿Retirar esta publicación? Dejará de verse en LlegueYa.')) return;
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
    const motivo = pedirMotivo(`Motivo para suspender ${elegidas.size} cuentas (por ejemplo: cuentas falsas creadas en serie):`);
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
          motivo = pedirMotivo(`Motivo para suspender a ${c.nombre}:`);
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
        const ref = (prompt(`Referencia del pago de ${precioSoles(s.monto)} (voucher, Yape, depósito):`) || '').trim();
        if (!ref) return;
        try { await api.admin.pago(s.id, ref); avisar('Pago registrado'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Registrar pago'));
    }
    acciones.append(
      el('button', { class: 'boton boton-secundario', type: 'button', onclick: async () => {
        try { await api.admin.decisionSolicitud(s.id, true, ''); avisar('Negocio verificado: ya aparece como patrocinado'); recargar(); }
        catch (e) { avisar(e.message); }
      } }, 'Aprobar'),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => {
        const motivo = (prompt('¿Por qué se rechaza? El negocio verá este motivo.') || '').trim();
        if (!motivo) return;
        try { await api.admin.decisionSolicitud(s.id, false, motivo); avisar('Solicitud rechazada'); recargar(); } catch (e) { avisar(e.message); }
      } }, 'Rechazar'));
  }
  const pago = { no_requerido: 'Sin pago (gratuito)', pendiente: `Pago pendiente: ${precioSoles(s.monto)}`, registrado: `Pagado (${s.referencia_pago})` }[s.pago];
  return el('article', { class: 'admin-fila tarjeta' },
    el('div', { class: 'admin-cabecera' }, icono('tienda'),
      el('div', { class: 'crece' }, el('strong', {}, s.negocio), el('span', {}, `${s.rubro_nombre} · pedido por ${s.solicitante}`)),
      el('span', { class: `etiqueta-estado ${s.estado === 'pendiente' ? 'revision' : s.estado === 'rechazada' ? 'demo' : ''}` }, s.estado)),
    el('p', {}, s.descripcion),
    el('p', { class: 'nota' }, `Contacto: ${s.contacto}`, s.enlace ? [' · ', el('a', { href: s.enlace, target: '_blank', rel: 'noopener' }, s.enlace)] : null),
    el('p', { class: 'nota' }, `Plan: ${s.plan.nombre} (${precioSoles(s.plan.precio)}, ${s.plan.duracion_dias} días) · ${pago}`),
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
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-precio' }, 'Precio (S/)'), el('input', { id: 'plan-precio', name: 'precio', type: 'number', min: 0, step: '0.01', required: true })),
      el('div', {}, el('label', { class: 'etiqueta', for: 'plan-dias' }, 'Duración (días)'), el('input', { id: 'plan-dias', name: 'duracion_dias', type: 'number', min: 1, max: 365, value: 30, required: true }))),
    el('label', { class: 'casilla' }, el('input', { type: 'checkbox', name: 'destacado' }), 'Destacado (aparece primero en el muro)'),
    el('button', { class: 'boton boton-principal', type: 'submit' }, 'Crear plan'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const d = new FormData(form);
    try {
      await api.admin.crearPlan({ nombre: d.get('nombre'), descripcion: d.get('descripcion'), precio: d.get('precio'),
        duracion_dias: Number(d.get('duracion_dias')), destacado: d.get('destacado') === 'on' });
      avisar('Plan creado'); planes(panel);
    } catch (e) { avisar(e.message); }
  });
  vaciar(panel,
    el('p', { class: 'bajada' }, 'Tú defines los precios. El pago se registra a mano hasta que se integre una pasarela de pagos.'),
    lista.map(p => el('article', { class: 'admin-fila tarjeta admin-cabecera' },
      el('div', { class: 'crece' }, el('strong', {}, `${p.nombre} · ${precioSoles(p.precio)}`),
        el('span', {}, `${p.duracion_dias} días${p.destacado ? ' · destacado' : ''}${p.gratuidad_inicial ? ' · una vez por negocio' : ''}`)),
      el('button', { class: 'boton boton-borde', type: 'button', onclick: async () => {
        try { await api.admin.activarPlan(p.id, !p.activo); planes(panel); } catch (e) { avisar(e.message); }
      } }, p.activo ? 'Desactivar' : 'Activar'))),
    form);
}

const SECCIONES = { lugares, moderacion, reportes, contenido, cuentas, negocios, planes };

export async function render(vista, ruta) {
  if (!estado.usuario || !estado.usuario.admin) {
    vaciar(vista, vacio('Solo para administración', 'Esta sección es para el equipo de LlegueYa.', el('a', { class: 'boton boton-secundario', href: '#/inicio' }, 'Volver al inicio')));
    return;
  }
  const actual = SECCIONES[ruta.filtros.seccion] ? ruta.filtros.seccion : 'lugares';
  const panel = el('div', { role: 'tabpanel' }, el('p', { class: 'cargando' }, 'Cargando…'));
  let resumen = null;
  try { resumen = await api.admin.resumen(); } catch (e) { vaciar(vista, error(e.message)); return; }
  vaciar(vista, el('section', { class: 'ancho admin' },
    el('h1', { class: 'titulo-vista' }, 'Administración'),
    el('ul', { class: 'perfil-numeros admin-cifras' },
      cifra(resumen.publicaciones_pendientes, 'publicaciones por revisar'),
      cifra(resumen.comentarios_pendientes, 'comentarios por revisar'),
      cifra(resumen.reportes_pendientes ?? 0, 'reportes por resolver'),
      cifra(resumen.solicitudes_pendientes, 'negocios por verificar'),
      cifra(resumen.cuentas_suspendidas, 'cuentas suspendidas')),
    el('div', { class: 'pestanas', role: 'tablist' }, PESTANAS.map(([id, nombre]) =>
      el('a', { role: 'tab', href: `#/admin?seccion=${id}`, 'aria-selected': String(id === actual) }, nombre))),
    panel));
  try { await SECCIONES[actual](panel); } catch (e) { vaciar(panel, error(e.message, () => SECCIONES[actual](panel))); }
}
