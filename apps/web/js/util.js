// Lógica pura de la interfaz (sin DOM): se prueba con node --test.

export const TIPOS = {
  arqueologico: 'Arqueología', natural: 'Naturaleza', cultural: 'Historia y cultura',
  camping: 'Camping', aventura: 'Aventura', otro: 'Otros',
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function etiquetaTipo(tipo) {
  return TIPOS[tipo] || 'Otros';
}

export function iniciales(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'V';
  return (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function tiempoRelativo(iso, ahora = new Date()) {
  const segundos = Math.max(0, Math.round((ahora - new Date(iso)) / 1000));
  if (segundos < 60) return 'ahora';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return dias === 1 ? 'ayer' : `hace ${dias} días`;
  const f = new Date(iso);
  return `${f.getUTCDate()} ${MESES_CORTOS[f.getUTCMonth()]}`;
}

// Fechas de eventos llegan como AAAA-MM-DD (sin hora): se leen sin zona horaria.
export function partesFecha(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return { anio: a, mes: m - 1, dia: d, mesCorto: MESES_CORTOS[m - 1], mesLargo: MESES[m - 1] };
}

export function rangoFechas(inicio, fin) {
  const a = partesFecha(inicio), b = partesFecha(fin);
  if (inicio === fin) return `${a.dia} de ${a.mesLargo} de ${a.anio}`;
  if (a.mes === b.mes && a.anio === b.anio) return `${a.dia} al ${b.dia} de ${a.mesLargo} de ${a.anio}`;
  return `${a.dia} de ${a.mesLargo} al ${b.dia} de ${b.mesLargo} de ${b.anio}`;
}

export function agruparPorMes(eventos) {
  const grupos = [];
  for (const e of eventos) {
    const p = partesFecha(e.inicio);
    const clave = `${p.mesLargo} ${p.anio}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.mes === clave) ultimo.eventos.push(e);
    else grupos.push({ mes: clave, eventos: [e] });
  }
  return grupos;
}

// El muro mezcla experiencias de viajeros con lugares del catálogo, sin repetir
// lugares y sin inventar actividad: si no hay publicaciones, se ven solo lugares.
export function intercalar(publicaciones, lugares, cada = 2) {
  const salida = [];
  let i = 0;
  const pendientes = [...lugares];
  for (const p of publicaciones) {
    salida.push({ tipo: 'publicacion', dato: p });
    i += 1;
    if (i % cada === 0 && pendientes.length) salida.push({ tipo: 'lugar', dato: pendientes.shift() });
  }
  for (const l of pendientes) salida.push({ tipo: 'lugar', dato: l });
  return salida;
}

export function leerRuta(hash) {
  const [ruta, consulta = ''] = String(hash || '').replace(/^#\/?/, '').split('?');
  const [vista, ...resto] = ruta.split('/');
  const filtros = Object.fromEntries(new URLSearchParams(consulta));
  const validas = ['inicio', 'explorar', 'mapa', 'calendario', 'servicios', 'willaq-uma', 'mi-espacio', 'lugar', 'admin', 'nueva-clave'];
  if (!validas.includes(vista)) return { vista: 'inicio', parametro: null, filtros: {} };
  const parametro = resto.join('/') || null;
  if (vista === 'lugar' && !/^[a-z0-9-]{1,80}$/.test(parametro || '')) return { vista: 'inicio', parametro: null, filtros: {} };
  return { vista, parametro, filtros };
}

export const FOTO_MAXIMA = 5 * 1024 * 1024;
export function validarFoto(archivo) {
  if (!archivo) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return 'Solo se aceptan fotos JPG, PNG o WebP.';
  if (archivo.size > FOTO_MAXIMA) return 'La foto supera los 5 MB.';
  return null;
}

export function textoLikes(n) {
  if (!n) return 'Sé el primero en darle me gusta';
  return n === 1 ? '1 me gusta' : `${n.toLocaleString('es-PE')} me gusta`;
}

export function textoComentarios(n) {
  if (!n) return 'Comentar';
  return n === 1 ? 'Ver 1 comentario' : `Ver los ${n} comentarios`;
}

export function mensajeEstadoAcceso(estado, configurado) {
  if (estado === 'suspendida') return 'Esta cuenta está suspendida por incumplir las normas de la comunidad. Si crees que es un error, escribe al equipo de LlegueYa.';
  if (estado === 'enlace-vencido') return 'El enlace ya no es válido o se abrió en otro navegador. Pide uno nuevo desde «¿Olvidaste tu clave?».';
  if (!configurado) return 'Las cuentas se activan cuando el proyecto Supabase está configurado.';
  if (estado === 'error') return 'No pudimos completar el acceso. Vuelve a intentarlo.';
  if (estado === 'configuracion') return 'Falta configurar Google en Supabase. Mientras tanto, entra con tu correo.';
  return null;
}

// Misma regla que el servidor (identidad/dominio.py): 8 a 72 caracteres, con letras y números.
export function problemaClave(clave) {
  const c = String(clave || '');
  if (c.length < 8) return 'La clave necesita al menos 8 caracteres.';
  if (c.length > 72) return 'La clave admite como máximo 72 caracteres.';
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(c) || !/\d/.test(c)) return 'Combina letras y números en tu clave.';
  return null;
}

export function esCorreoInstitucional(correo) {
  return /@([a-z0-9-]+\.)*(edu(\.[a-z]{2})?|unsch\.edu\.pe)$/i.test(String(correo || '').trim());
}

// Ofertas de un negocio: descarta filas vacías y normaliza el precio (vacío = «consultar»).
export function limpiarOfertas(filas) {
  return (filas || []).map(f => ({ nombre: String(f.nombre || '').trim(), precio_desde: String(f.precio_desde ?? '').trim(), detalle: String(f.detalle || '').trim() }))
    .filter(f => f.nombre).slice(0, 8);
}

// ---------------------------------------------------------------- Burbuja de Willaq Uma
// Mantiene la burbuja dentro de la pantalla (margenInferior deja libre la barra móvil).
export function limitarPosicion(x, y, ancho, alto, vw, vh, margenInferior = 12) {
  const m = 8;
  return {
    x: Math.round(Math.min(Math.max(m, x), Math.max(m, vw - ancho - m))),
    y: Math.round(Math.min(Math.max(m, y), Math.max(m, vh - alto - margenInferior))),
  };
}

// Abre la conversación junto a la burbuja: hacia el lado con más espacio.
export function colocarPanel(burbuja, vw, vh) {
  const m = 12;
  const movil = vw < 720;
  const ancho = movil ? vw - 16 : Math.min(400, vw - 2 * m);
  const alto = Math.min(movil ? Math.round(vh * 0.72) : 600, vh - 2 * m);
  const centroX = burbuja.left + burbuja.width / 2;
  let left = movil ? 8 : (centroX > vw / 2 ? burbuja.right - ancho : burbuja.left);
  let top = burbuja.top + burbuja.height / 2 > vh / 2 ? burbuja.top - m - alto : burbuja.bottom + m;
  left = Math.min(Math.max(m / 2, left), vw - ancho - m / 2);
  top = Math.min(Math.max(m, top), vh - alto - m);
  return { left: Math.round(left), top: Math.round(top), ancho: Math.round(ancho), alto: Math.round(alto) };
}

// ---------------------------------------------------------------- Saludo de Willaq Uma
// Primera vez: se presenta completo. Vuelve después de un rato: saluda según la hora.
// Conversación seguida (menos de 3 horas): no repite el saludo.
export const PAUSA_PARA_SALUDAR_MS = 3 * 60 * 60 * 1000;

export function saludoPorHora(fecha) {
  const h = fecha.getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function tipoDeSaludo(registro, ahora) {
  if (!registro || !Number.isFinite(registro.ultima)) return 'presentacion';
  return ahora.getTime() - registro.ultima >= PAUSA_PARA_SALUDAR_MS ? 'regreso' : 'ninguno';
}

export function precioSoles(monto) {
  const n = Number(monto);
  return n === 0 ? 'Gratis' : `S/ ${n.toFixed(2)}`;
}

// Ruta en Google Maps hasta un punto (la abre el visitante; LlegueYa no conoce su ubicación).
export function enlaceComoLlegar(lat, lon) {
  const n = v => Number(v).toFixed(6);
  return `https://www.google.com/maps/dir/?api=1&destination=${n(lat)},${n(lon)}`;
}
