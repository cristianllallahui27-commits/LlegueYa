// Pruebas de carga de LlegueYa con k6 (https://k6.io) · escenarios EQ-01 (rendimiento) y EQ-03 (escalabilidad).
//
// Simula turistas que abren el muro, exploran y leen fichas (lectura pública) y viajeros con sesión que
// conversan con Willaq Uma. Cada usuario virtual llega con su propia IP, como si pasara por el Worker de
// Cloudflare (cabeceras CF-Connecting-IP y X-LlegueYa-Borde), así el límite por IP actúa como en producción.
//
//   k6 run -e BASE_URL=http://127.0.0.1:8010 -e PERFIL=humo tests/carga/k6-plataforma.js          (30 s, 5 VUs)
//   k6 run -e BASE_URL=... -e PERFIL=carga tests/carga/k6-plataforma.js                              (3 min, 200 VUs)
//   k6 run -e BASE_URL=... -e PERFIL=escalabilidad tests/carga/k6-plataforma.js                      (7 min, hasta 2 000 VUs)
//   k6 run ... --summary-export reports/k6-escalabilidad.json                                         para guardar evidencia
//
// Variables: BORDE_CLAVE (la del servidor), ASISTENTE=0 para medir solo lectura, VUS y DURACION para el perfil humo.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8010';
const PERFIL = __ENV.PERFIL || 'carga';
const CLAVE = __ENV.BORDE_CLAVE || '';
const CON_ASISTENTE = __ENV.ASISTENTE !== '0';
const errores = new Rate('errores');
const fichas = new Trend('ficha_ms', true);

// Rampa progresiva pedida en el Sprint 2: 200 → 500 → 1 000 → 2 000 usuarios concurrentes.
const PERFILES = {
  humo: { lectores: { vus: Number(__ENV.VUS || 5), duration: __ENV.DURACION || '30s' }, conversan: 2 },
  carga: { lectores: { stages: [{ duration: '30s', target: 200 }, { duration: '2m', target: 200 }, { duration: '30s', target: 0 }] }, conversan: 20 },
  escalabilidad: {
    lectores: {
      stages: [
        { duration: '1m', target: 200 }, { duration: '1m', target: 500 }, { duration: '1m', target: 1000 },
        { duration: '1m', target: 2000 }, { duration: '2m', target: 2000 }, { duration: '1m', target: 0 },
      ],
    },
    conversan: 50,
  },
};
const P = PERFILES[PERFIL];
const duracionTotal = P.lectores.duration || P.lectores.stages.reduce((s, e) => s + parseInt(e.duration, 10) * (e.duration.endsWith('m') ? 60 : 1), 0) + 's';

const escenarios = {
  lectores: P.lectores.stages
    ? { executor: 'ramping-vus', exec: 'lector', ...P.lectores, gracefulRampDown: '10s' }
    : { executor: 'constant-vus', exec: 'lector', ...P.lectores },
};
if (CON_ASISTENTE) {
  escenarios.conversan = { executor: 'constant-vus', exec: 'conversa', vus: P.conversan, duration: duracionTotal };
}

export const options = {
  scenarios: escenarios,
  // Metas de los escenarios de calidad del Sprint 1 (docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md).
  thresholds: {
    'http_req_duration{tipo:lectura}': ['p(95)<2000'],     // EQ-01: p95 de consultas ≤ 2 s
    'http_req_duration{tipo:asistente}': ['p(95)<3000'],
    errores: ['rate<0.01'],                                // EQ-01 / EQ-03: < 1 % de errores técnicos
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const LUGARES = ['plaza-mayor-huamanga', 'complejo-arqueologico-wari', 'santuario-pampa-de-ayacucho', 'vilcashuaman', 'pueblo-de-quinua'];

function cabeceras(extra = {}) {
  // IP distinta por usuario virtual (10.x.y.z), como la que Cloudflare informa al backend.
  const ip = `10.${(__VU >> 16) & 255}.${(__VU >> 8) & 255}.${__VU & 255}`;
  return { 'X-LlegueYa-Borde': CLAVE, 'CF-Connecting-IP': ip, ...extra };
}

export function setup() {
  if (!CON_ASISTENTE) return { cookies: [] };
  // Cuentas de prueba para quienes conversan (el servidor de carga usa un doble de Supabase: no son cuentas reales).
  const cookies = [];
  for (let i = 0; i < P.conversan; i++) {
    const r = http.post(`${BASE}/api/v1/auth/registro`,
      JSON.stringify({ correo: `carga${Date.now()}${i}@llegueya.test`, clave: 'ayacucho2026', nombre: `Viajero ${i}` }),
      { headers: { 'Content-Type': 'application/json', Origin: BASE, 'X-LlegueYa-Borde': CLAVE, 'CF-Connecting-IP': `172.16.0.${i + 1}` } });
    const c = r.cookies.ly_session && r.cookies.ly_session[0];
    if (c) cookies.push(c.value);
  }
  return { cookies };
}

export function lector() {
  const lectura = { tags: { tipo: 'lectura' }, headers: cabeceras() };
  group('Muro', () => {
    const r = http.batch([
      ['GET', `${BASE}/api/v1/catalogo/destinos`, null, lectura],
      ['GET', `${BASE}/api/v1/catalogo/lugares?limite=24`, null, lectura],
      ['GET', `${BASE}/api/v1/comunidad/muro?limite=10`, null, lectura],
      ['GET', `${BASE}/api/v1/eventos`, null, lectura],
    ]);
    errores.add(!r.every(x => x.status === 200));
    check(r[1], { 'catálogo cacheable en CDN': x => (x.headers['Cache-Control'] || '').includes('s-maxage') });
  });
  sleep(1);
  group('Explorar y ficha', () => {
    const tipo = ['arqueologico', 'natural', 'cultural'][Math.floor(Math.random() * 3)];
    const e = http.get(`${BASE}/api/v1/catalogo/lugares?tipo=${tipo}`, lectura);
    const slug = LUGARES[Math.floor(Math.random() * LUGARES.length)];
    const f = http.get(`${BASE}/api/v1/catalogo/lugares/${slug}`, lectura);
    fichas.add(f.timings.duration);
    errores.add(!check(f, { 'ficha 200': x => x.status === 200, 'vista previa sin sesión': x => x.json('requiere_sesion') === true }) || e.status !== 200);
  });
  sleep(Math.random() * 2 + 1);
}

export function conversa(datos) {
  const preguntas = ['¿Cómo llego a Wari?', '¿Qué fiestas se vienen?', 'Quiero ver ruinas', 'Arma un viaje de 2 días', 'hola'];
  const cookie = datos.cookies[(__VU - 1) % Math.max(datos.cookies.length, 1)];
  const r = http.post(`${BASE}/api/v1/asistente/mensajes`, JSON.stringify({ texto: preguntas[Math.floor(Math.random() * preguntas.length)] }),
    { headers: cabeceras({ 'Content-Type': 'application/json', Origin: BASE, Cookie: `ly_session=${cookie}` }), tags: { tipo: 'asistente' } });
  // 429 es el límite de mensajes por persona funcionando, no un error técnico.
  errores.add(!check(r, { 'Willaq Uma responde': x => x.status === 200 || x.status === 429 }));
  sleep(Math.random() * 3 + 2);
}
