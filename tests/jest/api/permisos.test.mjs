// EQ-04 Seguridad: matriz de permisos. Sin sesión → 401; con sesión sin rol → 403 en administración.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente, comoAdmin } from './cliente.mjs';

const CON_SESION = [
  ['POST', '/api/v1/comunidad/likes', { tipo: 'publicacion', id: 'x', activo: true }],
  ['POST', '/api/v1/comunidad/publicaciones/x/comentarios', { texto: 'Hola' }],
  ['POST', '/api/v1/comunidad/publicaciones/x/reportes', { motivo: 'Otro' }],
  ['PUT', '/api/v1/comunidad/guardados/x', { activo: true }],
  ['GET', '/api/v1/comunidad/yo'],
  ['POST', '/api/v1/asistente/mensajes', { texto: 'Hola' }],
  ['PUT', '/api/v1/catalogo/favoritos/complejo-arqueologico-wari', { activo: true }],
  ['GET', '/api/v1/catalogo/favoritos'],
  ['PUT', '/api/v1/eventos/x/suscripcion', { activa: true }],
  ['GET', '/api/v1/recomendaciones/viajes'],
  ['POST', '/api/v1/publicidad/solicitudes', { negocio: 'N', rubro: 'otro', descripcion: 'D', contacto: 'C', plan_id: 'p' }],
  ['GET', '/api/v1/publicidad/mis-solicitudes'],
  ['GET', '/api/v1/auth/me'],
];

const SOLO_ADMIN = [
  ['GET', '/api/v1/admin/resumen'],
  ['GET', '/api/v1/admin/moderacion'],
  ['GET', '/api/v1/admin/reportes'],
  ['GET', '/api/v1/admin/contenido'],
  ['GET', '/api/v1/admin/cuentas'],
  ['POST', '/api/v1/admin/cuentas/suspension-masiva', { ids: ['a'], motivo: 'Bots' }],
  ['POST', '/api/v1/admin/publicaciones/x/quitar-foto'],
  ['GET', '/api/v1/catalogo/admin/lugares'],
  ['POST', '/api/v1/catalogo/admin/lugares/wari/estado', { publicado: false }],
  ['GET', '/api/v1/publicidad/admin/solicitudes'],
  ['POST', '/api/v1/publicidad/admin/planes', { nombre: 'X', precio: '1', duracion_dias: 1 }],
];

describe('Matriz de permisos (EQ-04)', () => {
  let viajero;
  let admin;
  beforeAll(async () => { viajero = await Cliente.conCuenta(); admin = await comoAdmin(); });

  test.each(CON_SESION.map(([m, r, c]) => [m, r, c ?? null]))('%s %s sin sesión → 401', async (metodo, ruta, cuerpo) => {
    const r = await new Cliente().pedir(metodo, ruta, cuerpo);
    expect(r.status).toBe(401);
    expect(typeof r.json.detail).toBe('string');
  });

  test.each(SOLO_ADMIN.map(([m, r, c]) => [m, r, c ?? null]))('%s %s sin sesión → 401 y viajero → 403', async (metodo, ruta, cuerpo) => {
    expect((await new Cliente().pedir(metodo, ruta, cuerpo)).status).toBe(401);
    const r = await viajero.pedir(metodo, ruta, cuerpo);
    expect(r.status).toBe(403);
    expect(r.json.detail).toMatch(/admin/i);
  });

  test('administración sí accede al panel', async () => {
    const r = await admin.get('/api/v1/admin/resumen');
    expect(r.status).toBe(200);
    expect(r.json).toHaveProperty('reportes_pendientes');
  });

  test('una cuenta suspendida pierde la sesión y su contenido se oculta', async () => {
    const sospechosa = await Cliente.conCuenta(undefined, 'Cuenta Falsa');
    const yo = (await sospechosa.get('/api/v1/auth/me')).json;
    const pub = await sospechosa.publicar('Vendo entradas falsas a Wari');
    await admin.post(`/api/v1/admin/moderacion/publicacion/${pub.json.id}`, { aprobar: true });
    const r = await admin.post(`/api/v1/admin/cuentas/${yo.id}/suspension`, { suspender: true, motivo: 'Estafa' });
    expect(r.json.suspendida).toBe(true);
    expect((await sospechosa.get('/api/v1/auth/me')).status).toBe(401);
    const muro = (await new Cliente().get('/api/v1/comunidad/muro?limite=30')).json.items;
    expect(muro.some(p => p.id === pub.json.id)).toBe(false);
  });
});
