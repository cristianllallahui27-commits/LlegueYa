// Pruebas Jest del Worker de borde (infra/cloudflare/borde) sin Cloudflare: fetch y caché simulados.
import { expect, test } from '@jest/globals';
import assert from 'node:assert/strict';
import { crearBorde, esCacheable, hash, leerCookie, listarOrigenes, ordenDeIntento, respuestaGuardable, PAUSA_CAIDO_MS }
  from '../../../infra/cloudflare/borde/src/logica.js';

// Las respuestas JSON vienen de otro «realm» (fetch de Node): se comparan por valor con expect().toEqual.
const igual = (a, b) => expect(a).toEqual(b);
const A = 'https://api-1.ejemplo.pe', B = 'https://api-2.ejemplo.pe';
const env = { ORIGENES: `${A}, ${B}/`, BORDE_CLAVE: 'secreto', ASSETS: { fetch: () => new Response('<html>web</html>') } };

function cacheMemoria() {
  const m = new Map();
  return { m, match: async r => (m.has(r.url) ? m.get(r.url).clone() : undefined), put: async (r, res) => { m.set(r.url, res); } };
}
function backends(respuestas) {
  const llamadas = [];
  const pedir = async (url, init) => {
    llamadas.push({ url, init });
    const origen = new URL(url).origin;
    const r = respuestas[origen];
    if (r instanceof Error) throw r;
    return typeof r === 'function' ? r(url, init) : new Response(r.cuerpo ?? '{}', { status: r.estado ?? 200, headers: r.cabeceras ?? {} });
  };
  return { pedir, llamadas };
}

test('Configuración y utilidades', () => {
  igual(listarOrigenes(' https://a.pe/, ftp://x , ,http://b.pe/ruta ,https://c.pe'), ['https://a.pe', 'https://c.pe']);
  igual(listarOrigenes(undefined), []);
  assert.equal(leerCookie('a=1; ly_session=abc=d; z=2', 'ly_session'), 'abc=d');
  assert.equal(leerCookie(null, 'ly_session'), null);
  assert.equal(hash('x'), hash('x'));
  assert.notEqual(hash('sesion-1'), hash('sesion-2'));
});

test('Afinidad de sesión y backends caídos al final', () => {
  const caidos = new Map();
  const orden = ordenDeIntento([A, B], 'mi-sesion', caidos, 0);
  igual(ordenDeIntento([A, B], 'mi-sesion', caidos, 0), orden);           // estable
  caidos.set(orden[0], 10_000);
  igual(ordenDeIntento([A, B], 'mi-sesion', caidos, 5_000), [orden[1], orden[0]]);
  igual(ordenDeIntento([A, B], 'mi-sesion', caidos, 20_000), orden);      // vuelve tras la pausa
  igual(ordenDeIntento([A, B], null, new Map(), 0, () => 0.9), [B, A]);
});

test('Qué se cachea en el borde', () => {
  const pub = new Request('https://app.pe/api/v1/catalogo/lugares?tipo=natural');
  assert.ok(esCacheable(pub, new URL(pub.url)));
  const ficha = new Request('https://app.pe/api/v1/catalogo/lugares/wari');
  assert.ok(esCacheable(ficha, new URL(ficha.url)));
  const conSesion = new Request(pub.url, { headers: { cookie: 'ly_session=x' } });
  assert.ok(!esCacheable(conSesion, new URL(pub.url)));
  const muro = new Request('https://app.pe/api/v1/comunidad/muro');
  assert.ok(!esCacheable(muro, new URL(muro.url)));
  const parecida = new Request('https://app.pe/api/v1/catalogo/lugaresx');
  assert.ok(!esCacheable(parecida, new URL(parecida.url)));
  assert.ok(respuestaGuardable(new Response('{}', { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } })));
  assert.ok(!respuestaGuardable(new Response('{}', { headers: { 'cache-control': 'private, no-store' } })));
  assert.ok(!respuestaGuardable(new Response('{}', { headers: { 'cache-control': 'public', 'set-cookie': 'a=1' } })));
  assert.ok(!respuestaGuardable(new Response('{}', { status: 404, headers: { 'cache-control': 'public' } })));
});

test('Estáticos sin tocar el backend y salud del borde', async () => {
  const { pedir, llamadas } = backends({});
  const borde = crearBorde({ fetch: pedir, cache: cacheMemoria() });
  assert.equal(await (await borde.fetch(new Request('https://app.pe/'), env)).text(), '<html>web</html>');
  igual(await (await borde.fetch(new Request('https://app.pe/__borde/salud'), env)).json(), { origenes: 2, caidos: [] });
  assert.equal(llamadas.length, 0);
});

test('Firma, cabeceras y redirecciones pasan intactas', async () => {
  const { pedir, llamadas } = backends({ [A]: { estado: 303, cabeceras: { location: '/?estado=bienvenido', 'set-cookie': 'ly_session=n' } },
    [B]: { estado: 303, cabeceras: { location: '/?estado=bienvenido', 'set-cookie': 'ly_session=n' } } });
  const borde = crearBorde({ fetch: pedir, azar: () => 0 });
  const r = await borde.fetch(new Request('https://app.pe/api/v1/auth/callback?code=1', { headers: { origin: 'https://app.pe' } }), env);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), '/?estado=bienvenido');
  assert.equal(r.headers.get('x-llegueya-backend'), '1');
  const h = llamadas[0].init.headers;
  assert.equal(h.get('x-llegueya-borde'), 'secreto');
  assert.equal(h.get('x-forwarded-host'), 'app.pe');
  assert.equal(h.get('origin'), 'https://app.pe');
  assert.equal(llamadas[0].init.redirect, 'manual');
  assert.equal(llamadas[0].url, `${A}/api/v1/auth/callback?code=1`);
});

test('Caché del catálogo: MISS y luego HIT sin llamar al backend', async () => {
  const cache = cacheMemoria();
  const { pedir, llamadas } = backends({ [A]: { cuerpo: '{"items":[1]}', cabeceras: { 'cache-control': 'public, max-age=60, s-maxage=300' } },
    [B]: { cuerpo: '{"items":[1]}', cabeceras: { 'cache-control': 'public, max-age=60, s-maxage=300' } } });
  const borde = crearBorde({ fetch: pedir, cache });
  const url = 'https://app.pe/api/v1/catalogo/lugares';
  const pendientes = [];
  const r1 = await borde.fetch(new Request(url), env, { waitUntil: p => pendientes.push(p) });
  await Promise.all(pendientes);
  assert.equal(r1.headers.get('x-cache-borde'), 'MISS');
  igual(await r1.json(), { items: [1] });
  const r2 = await borde.fetch(new Request(url), env);
  assert.equal(r2.headers.get('x-cache-borde'), 'HIT');
  igual(await r2.json(), { items: [1] });
  assert.equal(llamadas.length, 1);
  // Con sesión nunca se usa la caché compartida.
  await borde.fetch(new Request(url, { headers: { cookie: 'ly_session=s' } }), env);
  assert.equal(llamadas.length, 2);
  // Respuestas privadas no se guardan.
  const { pedir: p2 } = backends({ [A]: { cabeceras: { 'cache-control': 'no-store' } }, [B]: { cabeceras: { 'cache-control': 'no-store' } } });
  const c2 = cacheMemoria();
  await crearBorde({ fetch: p2, cache: c2 }).fetch(new Request(url), env);
  assert.equal(c2.m.size, 0);
});

test('Failover: lectura salta al otro backend y lo recuerda 30 s', async () => {
  let reloj = 1_000;
  const { pedir, llamadas } = backends({ [A]: new Error('caído'), [B]: { cuerpo: '{"ok":true}' } });
  const borde = crearBorde({ fetch: pedir, ahora: () => reloj, azar: () => 0 });
  const r = await borde.fetch(new Request('https://app.pe/api/v1/comunidad/muro'), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-llegueya-backend'), '2');
  igual((await (await borde.fetch(new Request('https://app.pe/__borde/salud'), env)).json()).caidos, [1]);
  await borde.fetch(new Request('https://app.pe/api/v1/comunidad/muro'), env);
  assert.equal(llamadas.at(-1).url.startsWith(B), true);
  assert.equal(llamadas.length, 3);                       // no reintenta A mientras está en pausa
  reloj += PAUSA_CAIDO_MS + 1;
  igual((await (await borde.fetch(new Request('https://app.pe/__borde/salud'), env)).json()).caidos, []);
});

test('Failover por 503 en lecturas; escrituras nunca se repiten', async () => {
  const { pedir } = backends({ [A]: { estado: 503 }, [B]: { cuerpo: '{"ok":1}' } });
  const r = await crearBorde({ fetch: pedir, azar: () => 0 }).fetch(new Request('https://app.pe/api/v1/eventos'), env);
  assert.equal(r.status, 200);
  const { pedir: p2, llamadas } = backends({ [A]: new Error('caído'), [B]: { cuerpo: '{}' } });
  const post = new Request('https://app.pe/api/v1/comunidad/likes', { method: 'POST', body: '{"id":1}', headers: { 'content-type': 'application/json' } });
  const r2 = await crearBorde({ fetch: p2, azar: () => 0 }).fetch(post, env);
  assert.equal(r2.status, 503);
  assert.match((await r2.json()).detail, /mantenimiento/);
  assert.equal(llamadas.length, 1);
  // Un 503 en escritura se devuelve tal cual (no se reintenta).
  const { pedir: p3 } = backends({ [A]: { estado: 503, cuerpo: '{"detail":"x"}' }, [B]: { cuerpo: '{}' } });
  const r3 = await crearBorde({ fetch: p3, azar: () => 0 }).fetch(new Request('https://app.pe/api/v1/comunidad/likes', { method: 'POST', body: '{}' }), env);
  assert.equal(r3.status, 503);
});

test('Todos caídos o sin configuración', async () => {
  const { pedir } = backends({ [A]: new Error('x'), [B]: new Error('y') });
  assert.equal((await crearBorde({ fetch: pedir }).fetch(new Request('https://app.pe/api/v1/eventos'), env)).status, 503);
  const r = await crearBorde({ fetch: pedir }).fetch(new Request('https://app.pe/api/v1/eventos'), { ...env, ORIGENES: '' });
  assert.equal(r.status, 500);
  // Último backend con 503 en lectura: se entrega su respuesta.
  const { pedir: p2 } = backends({ [A]: { estado: 503 }, [B]: { estado: 503 } });
  assert.equal((await crearBorde({ fetch: p2 }).fetch(new Request('https://app.pe/api/v1/eventos'), env)).status, 503);
});

test('Sin caché disponible (desarrollo local) igual reenvía, y una caché vacía guarda sin waitUntil', async () => {
  const { pedir } = backends({ [A]: { cuerpo: '{"x":1}', cabeceras: { 'cache-control': 'public, s-maxage=60' } }, [B]: { cuerpo: '{"x":1}' } });
  const r = await crearBorde({ fetch: pedir, azar: () => 0 }).fetch(new Request('https://app.pe/api/v1/catalogo/lugares'), env);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-cache-borde'), null);
  const cache = cacheMemoria();
  await crearBorde({ fetch: pedir, cache, azar: () => 0 }).fetch(new Request('https://app.pe/api/v1/catalogo/lugares'), env);
  assert.equal(cache.m.size, 1);
});

test('Sin BORDE_CLAVE firma vacío y POST con backend sano no reintenta', async () => {
  const { pedir, llamadas } = backends({ [A]: { cuerpo: '{}' }, [B]: { cuerpo: '{}' } });
  const r = await crearBorde({ fetch: pedir, azar: () => 0 }).fetch(
    new Request('https://app.pe/api/v1/comunidad/likes', { method: 'POST', body: '{}' }), { ...env, BORDE_CLAVE: undefined });
  assert.equal(r.status, 200);
  assert.equal(llamadas[0].init.headers.get('x-llegueya-borde'), '');
  assert.equal(llamadas.length, 1);
});
