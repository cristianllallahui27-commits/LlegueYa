// Lógica del borde de LlegueYa (probada en tests/borde.test.mjs). El punto de entrada es index.js.
// Borde de LlegueYa en Cloudflare Workers (plan gratuito).
//
//  · La web (apps/web) se sirve como «static assets»: gratis, ilimitado y desde la CDN.
//  · /api/* pasa por este Worker, que:
//      1. Balancea entre varios backends (ORIGENES) con afinidad por sesión: la misma
//         cookie ly_session cae siempre en el mismo backend (las sesiones viven en memoria).
//      2. Hace failover: si un backend no responde, lo marca caído 30 s y usa el siguiente.
//      3. Cachea en el borde las lecturas públicas del catálogo (solo sin sesión y solo si
//         el backend las declara públicas con Cache-Control).
//      4. Firma cada petición con X-LlegueYa-Borde para que el backend rechace accesos directos.

export const RUTAS_PUBLICAS = ['/api/v1/catalogo/lugares', '/api/v1/catalogo/mapa', '/api/v1/catalogo/destinos'];
export const PAUSA_CAIDO_MS = 30_000;
const IDEMPOTENTES = new Set(['GET', 'HEAD']);
const REINTENTABLES = new Set([502, 503, 504]);

export function listarOrigenes(texto) {
  return String(texto || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(s => /^https?:\/\/[^\s/]+$/.test(s));
}

export function leerCookie(cabecera, nombre) {
  for (const parte of String(cabecera || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return v.join('=');
  }
  return null;
}

// FNV-1a de 32 bits: reparte sesiones de forma estable entre backends.
export function hash(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}

// Orden de intento: primero el backend «dueño» de la sesión (o uno al azar), luego el resto;
// los marcados como caídos van al final, por si todos lo están.
export function ordenDeIntento(origenes, sesion, caidos, ahora, azar = Math.random) {
  const n = origenes.length;
  const inicio = sesion ? hash(sesion) % n : Math.floor(azar() * n);
  const rotados = origenes.map((_, i) => origenes[(inicio + i) % n]);
  const vivo = o => !(caidos.get(o) > ahora);
  return [...rotados.filter(vivo), ...rotados.filter(o => !vivo(o))];
}

export function esCacheable(request, url) {
  return request.method === 'GET' && !leerCookie(request.headers.get('cookie'), 'ly_session')
    && RUTAS_PUBLICAS.some(r => url.pathname === r || url.pathname.startsWith(r + '/'));
}

export function respuestaGuardable(response) {
  const cc = (response.headers.get('cache-control') || '').toLowerCase();
  return response.status === 200 && !response.headers.has('set-cookie')
    && /(s-maxage|public)/.test(cc) && !/(private|no-store)/.test(cc);
}

export function crearBorde({ fetch: pedir = (...a) => fetch(...a), cache = null, ahora = () => Date.now(), azar = Math.random } = {}) {
  const caidos = new Map();   // memoria del aislamiento: suficiente para un failover pasivo

  async function alBackend(request, url, env) {
    const origenes = listarOrigenes(env.ORIGENES);
    if (!origenes.length) return json({ detail: 'El borde no tiene backends configurados (ORIGENES).' }, 500);
    const sesion = leerCookie(request.headers.get('cookie'), 'ly_session');
    const orden = ordenDeIntento(origenes, sesion, caidos, ahora(), azar);
    const reintenta = IDEMPOTENTES.has(request.method);
    const cuerpo = reintenta ? null : request.body;

    for (const [i, origen] of orden.entries()) {
      const cabeceras = new Headers(request.headers);
      cabeceras.set('X-LlegueYa-Borde', env.BORDE_CLAVE || '');
      cabeceras.set('X-Forwarded-Host', url.host);
      cabeceras.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
      try {
        const r = await pedir(origen + url.pathname + url.search, {
          method: request.method, headers: cabeceras, body: cuerpo, redirect: 'manual',
        });
        if (reintenta && REINTENTABLES.has(r.status) && i < orden.length - 1) { caidos.set(origen, ahora() + PAUSA_CAIDO_MS); continue; }
        caidos.delete(origen);
        const salida = new Response(r.body, r);
        salida.headers.set('X-LlegueYa-Backend', String(origenes.indexOf(origen) + 1));
        return salida;
      } catch {
        caidos.set(origen, ahora() + PAUSA_CAIDO_MS);
        if (!reintenta) break;   // una escritura no se repite: podría duplicarse
      }
    }
    return json({ detail: 'LlegueYa está en mantenimiento. Vuelve a intentarlo en un momento.' }, 503);
  }

  return {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      if (url.pathname === '/__borde/salud') {
        const origenes = listarOrigenes(env.ORIGENES);
        return json({ origenes: origenes.length, caidos: origenes.map((o, i) => (caidos.get(o) > ahora() ? i + 1 : null)).filter(Boolean) });
      }
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

      const almacen = cache || (typeof caches !== 'undefined' ? caches.default : null);
      if (almacen && esCacheable(request, url)) {
        const clave = new Request(url.toString(), { method: 'GET' });
        const guardada = await almacen.match(clave);
        if (guardada) { const r = new Response(guardada.body, guardada); r.headers.set('X-Cache-Borde', 'HIT'); return r; }
        const r = await alBackend(request, url, env);
        if (respuestaGuardable(r)) {
          const copia = r.clone();
          const guardar = almacen.put(clave, copia);
          if (ctx && ctx.waitUntil) ctx.waitUntil(guardar); else await guardar;
        }
        r.headers.set('X-Cache-Borde', 'MISS');
        return r;
      }
      return alBackend(request, url, env);
    },
  };
}

function json(datos, estado) {
  return new Response(JSON.stringify(datos), { status: estado, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

