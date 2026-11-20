// Comunidad: moderación previa, me gusta idempotente, comentarios en hilo y reportes.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente, comoAdmin } from './cliente.mjs';

describe('Comunidad (RF06-RF12, EQ-05)', () => {
  let admin;
  let ana;
  let beto;
  beforeAll(async () => {
    admin = await comoAdmin();
    ana = await Cliente.conCuenta(undefined, 'Ana Huamán');
    beto = await Cliente.conCuenta(undefined, 'Beto Quispe');
  });

  const enMuro = async id => (await new Cliente().get('/api/v1/comunidad/muro?limite=30')).json.items.some(p => p.id === id);

  test('una publicación queda en revisión hasta que administración la aprueba', async () => {
    const pub = await ana.publicar('Amanecer en Wari', { lugar: 'complejo-arqueologico-wari' });
    expect(pub.status).toBe(201);
    expect(pub.json.estado).toBe('en_revision');
    expect(pub.json.autor.nombre).toBe('Ana Huamán');
    expect(await enMuro(pub.json.id)).toBe(false);
    await admin.post(`/api/v1/admin/moderacion/publicacion/${pub.json.id}`, { aprobar: true });
    expect(await enMuro(pub.json.id)).toBe(true);
  });

  test('el me gusta es idempotente y el contador no se infla', async () => {
    const pub = await ana.publicar('Retablos en el mercado');
    await admin.post(`/api/v1/admin/moderacion/publicacion/${pub.json.id}`, { aprobar: true });
    for (let i = 0; i < 3; i++) await beto.post('/api/v1/comunidad/likes', { tipo: 'publicacion', id: pub.json.id, activo: true });
    const item = (await beto.get('/api/v1/comunidad/muro?limite=30')).json.items.find(p => p.id === pub.json.id);
    expect(item.likes).toBe(1);
    await beto.post('/api/v1/comunidad/likes', { tipo: 'publicacion', id: pub.json.id, activo: false });
    expect((await beto.get('/api/v1/comunidad/muro?limite=30')).json.items.find(p => p.id === pub.json.id).likes).toBe(0);
  });

  test('comentarios y respuestas forman un hilo; no se responde a lo que sigue en revisión', async () => {
    const pub = await ana.publicar('¿Qué llevar a Millpu?');
    await admin.post(`/api/v1/admin/moderacion/publicacion/${pub.json.id}`, { aprobar: true });
    const com = await beto.post(`/api/v1/comunidad/publicaciones/${pub.json.id}/comentarios`, { texto: 'Lleva bloqueador' });
    expect(com.status).toBe(201);
    const antes = await ana.post(`/api/v1/comunidad/publicaciones/${pub.json.id}/comentarios`, { texto: 'Gracias', padre_id: com.json.id });
    expect(antes.status).toBe(422);
    await admin.post(`/api/v1/admin/moderacion/comentario/${com.json.id}`, { aprobar: true });
    const resp = await ana.post(`/api/v1/comunidad/publicaciones/${pub.json.id}/comentarios`, { texto: 'Gracias', padre_id: com.json.id });
    expect(resp.status).toBe(201);
    expect((await ana.post(`/api/v1/comunidad/publicaciones/${pub.json.id}/comentarios`, { texto: '   ' })).status).toBe(422);
  });

  test('reportes: no se reporta lo propio ni dos veces; administración lo resuelve', async () => {
    const pub = await ana.publicar('Tours baratos, paga por adelantado');
    await admin.post(`/api/v1/admin/moderacion/publicacion/${pub.json.id}`, { aprobar: true });
    const ruta = `/api/v1/comunidad/publicaciones/${pub.json.id}/reportes`;
    expect((await ana.post(ruta, { motivo: 'Spam o publicidad engañosa' })).status).toBe(422);
    expect((await beto.post(ruta, { motivo: 'Motivo inventado' })).status).toBe(422);
    expect((await beto.post(ruta, { motivo: 'Spam o publicidad engañosa' })).status).toBe(201);
    expect((await beto.post(ruta, { motivo: 'Otro' })).status).toBe(422);
    const rep = (await admin.get('/api/v1/admin/reportes')).json.items.find(x => x.publicacion && x.publicacion.id === pub.json.id);
    const r = await admin.post(`/api/v1/admin/reportes/${rep.id}`, { retirar: true, decision: 'Estafa' });
    expect(r.json.retirado).toBe(true);
    expect(await enMuro(pub.json.id)).toBe(false);
  });
});
