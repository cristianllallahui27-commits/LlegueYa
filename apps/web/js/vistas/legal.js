// Información legal: privacidad, cookies y términos. Describe lo que LlegueYa hace hoy; si cambia, se actualiza aquí.
import { el, vaciar } from '../dom.js';

// Correo de contacto para derechos sobre datos personales. Cámbialo por el del responsable del proyecto.
export const CONTACTO_LEGAL = 'cristian.llallahui.27@unsch.edu.pe';
const ACTUALIZADO = '20 de noviembre de 2026';

const lista = items => el('ul', {}, items.map(t => el('li', {}, t)));

function privacidad() {
  return [
    el('h2', { id: 'privacidad' }, 'Privacidad y datos personales'),
    el('p', {}, 'LlegueYa es un proyecto universitario de la UNSCH (curso Arquitectura de Software). Tratamos tus datos conforme a la Ley N.º 29733, Ley de Protección de Datos Personales del Perú, y su reglamento.'),
    el('h3', {}, 'Qué datos guardamos y para qué'),
    lista([
      'Cuenta: correo, nombre visible y foto de perfil si la agregas. Sirve para que puedas entrar, publicar y guardar lugares.',
      'Lo que publicas: fotos, textos, comentarios y lugares guardados. Se muestran a otros viajeros solo después de la revisión de administración.',
      'Ubicación: solo si pulsas «Mi ubicación». La usa tu navegador para dibujar tu punto en el mapa; no se guarda en tu cuenta.',
      'Intereses: los lugares que abres, los tipos que filtras y los destinos que buscas se guardan solo en tu navegador para ordenar tu muro; no se envían a LlegueYa y puedes borrarlos en Mi espacio → Mi cuenta.',
      'Consultas de mapa: al buscar un sitio o pedir una ruta, nuestro servidor envía el texto buscado o las coordenadas a servicios de OpenStreetMap (Photon, Nominatim y OSRM). No les enviamos tu nombre ni tu correo.',
    ]),
    el('h3', {}, 'Con quién se comparten'),
    lista([
      'Supabase, que opera el inicio de sesión y la base de datos.',
      'Google, solo si eliges entrar con Google.',
      'No vendemos tus datos ni los usamos para publicidad personalizada.',
    ]),
    el('h3', {}, 'Tus derechos'),
    el('p', {}, 'Puedes pedir acceso, rectificación, cancelación u oposición sobre tus datos, y que se elimine tu cuenta. Escribe a ',
      el('a', { href: `mailto:${CONTACTO_LEGAL}` }, CONTACTO_LEGAL), '. Si crees que no atendimos tu pedido, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.'),
    el('h3', {}, 'Fotos de otras personas'),
    el('p', {}, 'Publica solo fotos propias o con permiso de quienes aparecen. Retiramos contenido que alguien reporte como suyo sin autorización.'),
  ];
}

function cookies() {
  return [
    el('h2', { id: 'cookies' }, 'Cookies'),
    el('p', {}, 'Usamos únicamente cookies necesarias para que el sitio funcione. No usamos cookies de publicidad ni de analítica de terceros.'),
    lista([
      'Cookie de sesión: mantiene tu inicio de sesión. Es HttpOnly (el código de la página no puede leerla) y se borra al cerrar sesión.',
      'Los mapas se cargan desde OpenStreetMap y Esri; esos servidores pueden registrar tu dirección IP al enviarte los mosaicos del mapa.',
    ]),
    el('p', {}, 'Como no hay cookies opcionales, no necesitas aceptar nada para usar el sitio. Puedes borrar las cookies desde la configuración de tu navegador; tendrás que volver a iniciar sesión.'),
  ];
}

function terminos() {
  return [
    el('h2', { id: 'terminos' }, 'Términos de uso'),
    lista([
      'Sé respetuoso: no se permite contenido ofensivo, engañoso, ilegal ni que viole derechos de otras personas.',
      'Eres responsable de lo que publicas. Al hacerlo, nos autorizas a mostrarlo en LlegueYa.',
      'Los lugares marcados como «demostración» son datos de prueba revisados en fuentes públicas; verifica horarios y precios antes de viajar.',
      'Las rutas y tiempos son referenciales. Viaja con precaución y respeta las normas de cada lugar.',
      'Administración puede retirar contenido o suspender cuentas que incumplan estas reglas.',
    ]),
  ];
}

export async function render(vista) {
  vaciar(vista, el('article', { class: 'legal' },
    el('h1', { class: 'titulo-vista' }, 'Privacidad, cookies y términos'),
    el('p', { class: 'nota' }, `Última actualización: ${ACTUALIZADO}. Texto informativo del proyecto; no sustituye asesoría legal.`),
    el('nav', { class: 'legal-indice', 'aria-label': 'Secciones' },
      el('a', { href: '#privacidad', onclick: ir }, 'Privacidad'), el('a', { href: '#cookies', onclick: ir }, 'Cookies'), el('a', { href: '#terminos', onclick: ir }, 'Términos')),
    privacidad(), cookies(), terminos()));
}

// Los enlaces internos usan el hash para rutas; aquí desplazamos sin cambiar de vista.
function ir(ev) {
  ev.preventDefault();
  document.getElementById(ev.currentTarget.getAttribute('href').slice(1))?.scrollIntoView({ block: 'start' });
}
