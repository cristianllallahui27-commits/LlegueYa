// Cliente HTTP mínimo para las pruebas: guarda la cookie de sesión y envía Origin (protección CSRF).
import { appendFileSync } from 'node:fs';
import { BASE, CLAVE_BORDE } from './servidor.mjs';

export { BASE };
export const ADMIN = 'admin@llegueya.test';   // está en ADMIN_CORREOS del servidor de pruebas

// Cada cliente simula a un visitante distinto que entra por el Worker de Cloudflare.
let siguienteIp = 1;
export class Cliente {
  constructor({ ip = `10.20.${Math.floor(siguienteIp / 250)}.${(siguienteIp++ % 250) + 1}`, borde = true } = {}) {
    this.cookies = new Map();
    this.ip = ip;
    this.borde = borde;
  }

  async pedir(metodo, ruta, cuerpo, { origen = true, cabeceras = {} } = {}) {
    if (cuerpo === null) cuerpo = undefined;
    const h = { ...cabeceras };
    if (this.borde) { h['X-LlegueYa-Borde'] = CLAVE_BORDE; h['CF-Connecting-IP'] = this.ip; }
    if (origen) h.Origin = BASE;
    if (this.cookies.size) h.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
    const esFormulario = cuerpo instanceof FormData;
    if (cuerpo !== undefined && !esFormulario) h['Content-Type'] = 'application/json';
    const body = cuerpo === undefined ? undefined : esFormulario ? cuerpo : JSON.stringify(cuerpo);
    if (process.env.JEST_RUTAS) appendFileSync(process.env.JEST_RUTAS, `${metodo} ${ruta.split('?')[0]}\n`);
    const r = await fetch(BASE + ruta, { method: metodo, headers: h, body, redirect: 'manual' });
    for (const c of r.headers.getSetCookie()) {
      const [par] = c.split(';');
      const [k, ...v] = par.split('=');
      const valor = v.join('=');
      if (valor && !/max-age=0|expires=thu, 01 jan 1970/i.test(c)) this.cookies.set(k, valor); else this.cookies.delete(k);
    }
    const texto = await r.text();
    let json = null;
    try { json = texto ? JSON.parse(texto) : null; } catch { /* no es JSON */ }
    return { status: r.status, json, texto, headers: r.headers };
  }

  get(ruta, op) { return this.pedir('GET', ruta, undefined, op); }
  post(ruta, cuerpo = {}, op) { return this.pedir('POST', ruta, cuerpo, op); }
  put(ruta, cuerpo = {}, op) { return this.pedir('PUT', ruta, cuerpo, op); }

  del(ruta, op) { return this.pedir('DELETE', ruta, undefined, op); }

  publicar(texto, extra = {}) {
    const f = new FormData();
    f.set('texto', texto);
    for (const [k, v] of Object.entries(extra)) f.set(k, v);
    return this.pedir('POST', '/api/v1/comunidad/publicaciones', f);
  }

  static async conCuenta(correo = correoNuevo(), nombre = 'Viajera de Prueba', clave = 'ayacucho2026') {
    const c = new Cliente();
    const r = await c.post('/api/v1/auth/registro', { correo, clave, nombre });
    if (r.status >= 300) throw new Error(`Registro falló: ${r.status} ${JSON.stringify(r.json)}`);
    return c;
  }
}

// La cuenta de administración se comparte entre archivos: se registra la primera vez y luego se entra.
export async function comoAdmin() {
  const c = new Cliente();
  const r = await c.post('/api/v1/auth/registro', { correo: ADMIN, clave: 'admin2026', nombre: 'Administración' });
  if (r.status === 409) await c.post('/api/v1/auth/entrar', { correo: ADMIN, clave: 'admin2026' });
  return c;
}

let n = 0;
export const correoNuevo = () => `viajero${Date.now()}${n++}@llegueya.test`;
