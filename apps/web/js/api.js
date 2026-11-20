// Acceso a la API. Mismo origen: el navegador envía la cookie HttpOnly y el
// encabezado Origin que el backend exige en cada escritura.
export class ErrorApi extends Error {
  constructor(estado, mensaje, requiereSesion = false) {
    super(mensaje);
    this.estado = estado;
    this.requiereSesion = requiereSesion;
  }
}

async function pedir(ruta, opciones = {}) {
  let respuesta;
  try {
    respuesta = await fetch(ruta, { credentials: 'same-origin', ...opciones });
  } catch {
    throw new ErrorApi(0, 'No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.');
  }
  if (respuesta.status === 204) return null;
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* respuesta sin cuerpo JSON */ }
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, (datos && datos.detail && typeof datos.detail === 'string')
      ? datos.detail : 'Algo falló en el servidor. Vuelve a intentarlo.', Boolean(datos && datos.requiere_sesion) || respuesta.status === 401);
  }
  return datos;
}

const json = (metodo, cuerpo) => ({ method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

export const api = {
  salud: () => pedir('/api/v1/health'),
  yo: () => pedir('/api/v1/auth/me'),
  registrar: datos => pedir('/api/v1/auth/registro', json('POST', datos)),
  entrar: (correo, clave) => pedir('/api/v1/auth/entrar', json('POST', { correo, clave })),
  recuperar: correo => pedir('/api/v1/auth/recuperar', json('POST', { correo })),
  nuevaClave: clave => pedir('/api/v1/auth/clave', json('POST', { clave })),
  lugares: (params = {}) => pedir('/api/v1/catalogo/lugares?' + new URLSearchParams(params)),
  lugar: slug => pedir(`/api/v1/catalogo/lugares/${encodeURIComponent(slug)}`),
  destinos: () => pedir('/api/v1/catalogo/destinos'),
  mapa: () => pedir('/api/v1/catalogo/mapa'),
  favorito: (slug, activo) => pedir(`/api/v1/catalogo/favoritos/${encodeURIComponent(slug)}`, json('PUT', { activo })),
  favoritos: () => pedir('/api/v1/catalogo/favoritos'),
  muro: (params = {}) => pedir('/api/v1/comunidad/muro?' + new URLSearchParams(params)),
  publicar: formData => pedir('/api/v1/comunidad/publicaciones', { method: 'POST', body: formData }),
  like: (tipo, id, activo) => pedir('/api/v1/comunidad/likes', json('POST', { tipo, id, activo })),
  comentarios: id => pedir(`/api/v1/comunidad/publicaciones/${encodeURIComponent(id)}/comentarios`),
  comentar: (id, texto, padre_id) => pedir(`/api/v1/comunidad/publicaciones/${encodeURIComponent(id)}/comentarios`, json('POST', { texto, padre_id })),
  guardar: (id, activo) => pedir(`/api/v1/comunidad/guardados/${encodeURIComponent(id)}`, json('PUT', { activo })),
  motivosReporte: () => pedir('/api/v1/comunidad/motivos-reporte'),
  reportar: (id, motivo, detalle) => pedir(`/api/v1/comunidad/publicaciones/${encodeURIComponent(id)}/reportes`, json('POST', { motivo, detalle })),
  miComunidad: () => pedir('/api/v1/comunidad/yo'),
  eventos: () => pedir('/api/v1/eventos'),
  suscribir: (id, activa) => pedir(`/api/v1/eventos/${encodeURIComponent(id)}/suscripcion`, json('PUT', { activa })),
  preguntar: texto => pedir('/api/v1/asistente/mensajes', json('POST', { texto })),
  presentacionWillaq: () => pedir('/api/v1/asistente/presentacion'),
  aceptarViaje: plan => pedir('/api/v1/recomendaciones/viajes', json('POST', { plan })),
  misViajes: () => pedir('/api/v1/recomendaciones/viajes'),
  eliminarViaje: id => pedir(`/api/v1/recomendaciones/viajes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  anuncios: () => pedir('/api/v1/publicidad/anuncios'),
  rubros: () => pedir('/api/v1/publicidad/rubros'),
  planes: () => pedir('/api/v1/publicidad/planes'),
  solicitarPromocion: datos => pedir('/api/v1/publicidad/solicitudes', json('POST', datos)),
  directorio: rubro => pedir('/api/v1/publicidad/directorio' + (rubro ? `?rubro=${encodeURIComponent(rubro)}` : '')),
  misSolicitudes: () => pedir('/api/v1/publicidad/mis-solicitudes'),
  admin: {
    resumen: () => pedir('/api/v1/admin/resumen'),
    moderacion: () => pedir('/api/v1/admin/moderacion'),
    decidir: (tipo, id, aprobar) => pedir(`/api/v1/admin/moderacion/${tipo}/${encodeURIComponent(id)}`, json('POST', { aprobar })),
    cuentas: () => pedir('/api/v1/admin/cuentas'),
    suspensionMasiva: (ids, motivo) => pedir('/api/v1/admin/cuentas/suspension-masiva', json('POST', { ids, motivo })),
    lugares: () => pedir('/api/v1/catalogo/admin/lugares'),
    crearLugar: datos => pedir('/api/v1/catalogo/admin/lugares', json('POST', datos)),
    editarLugar: (slug, datos) => pedir(`/api/v1/catalogo/admin/lugares/${encodeURIComponent(slug)}`, json('PUT', datos)),
    estadoLugar: (slug, publicado) => pedir(`/api/v1/catalogo/admin/lugares/${encodeURIComponent(slug)}/estado`, json('POST', { publicado })),
    reportes: () => pedir('/api/v1/admin/reportes'),
    resolverReporte: (id, datos) => pedir(`/api/v1/admin/reportes/${encodeURIComponent(id)}`, json('POST', datos)),
    contenido: () => pedir('/api/v1/admin/contenido'),
    quitarFoto: id => pedir(`/api/v1/admin/publicaciones/${encodeURIComponent(id)}/quitar-foto`, { method: 'POST' }),
    retirar: id => pedir(`/api/v1/admin/publicaciones/${encodeURIComponent(id)}/retirar`, { method: 'POST' }),
    suspension: (id, suspender, motivo) => pedir(`/api/v1/admin/cuentas/${encodeURIComponent(id)}/suspension`, json('POST', { suspender, motivo })),
    solicitudes: () => pedir('/api/v1/publicidad/admin/solicitudes'),
    crearPlan: datos => pedir('/api/v1/publicidad/admin/planes', json('POST', datos)),
    activarPlan: (id, activo) => pedir(`/api/v1/publicidad/admin/planes/${encodeURIComponent(id)}`, json('PUT', { activo })),
    requisito: (id, requisito, cumple) => pedir(`/api/v1/publicidad/admin/solicitudes/${encodeURIComponent(id)}/requisitos`, json('PUT', { requisito, cumple })),
    pago: (id, referencia) => pedir(`/api/v1/publicidad/admin/solicitudes/${encodeURIComponent(id)}/pago`, json('POST', { referencia })),
    decisionSolicitud: (id, aprobar, motivo) => pedir(`/api/v1/publicidad/admin/solicitudes/${encodeURIComponent(id)}/decision`, json('POST', { aprobar, motivo })),
  },
};
