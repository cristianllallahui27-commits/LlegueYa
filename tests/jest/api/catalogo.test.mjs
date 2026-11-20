// Catálogo: vista previa vs ficha completa, caché HTTP y gestión de lugares por administración.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente, comoAdmin } from './cliente.mjs';

const LUGAR = {
  nombre: 'Mirador de Acuchimay Jest', tipo: 'cultural', destino: 'Huamanga', zona: 'Carmen Alto',
  resumen: 'Mirador con vista a toda la ciudad de Huamanga.', descripcion: 'Desde lo alto del cerro se ve el valle completo.',
  lat: -13.1705, lon: -74.2262, recomendaciones: ['Ve al atardecer'], fotos: [],
};

describe('Catálogo (RF02, RF05, EQ-01)', () => {
  let admin;
  beforeAll(async () => { admin = await comoAdmin(); });

  test('sin sesión la ficha es vista previa; con sesión incluye cómo llegar y galería', async () => {
    const anon = await new Cliente().get('/api/v1/catalogo/lugares/complejo-arqueologico-wari');
    expect(anon.status).toBe(200);
    expect(anon.json.requiere_sesion).toBe(true);
    expect(anon.json).not.toHaveProperty('como_llegar');
    expect(anon.headers.get('cache-control')).toMatch(/private/);
    const viajero = await Cliente.conCuenta();
    const completa = await viajero.get('/api/v1/catalogo/lugares/complejo-arqueologico-wari');
    expect(completa.json.requiere_sesion).toBe(false);
    expect(completa.json.como_llegar).toBeTruthy();
    expect(Array.isArray(completa.json.fotos)).toBe(true);
  });

  test('la lista pública es cacheable en la CDN y responde 304 con ETag', async () => {
    const c = new Cliente();
    const r = await c.get('/api/v1/catalogo/lugares?limite=24');
    expect(r.headers.get('cache-control')).toMatch(/s-maxage=\d+/);
    const etag = r.headers.get('etag');
    expect(etag).toBeTruthy();
    expect((await c.get('/api/v1/catalogo/lugares?limite=24', { cabeceras: { 'If-None-Match': etag } })).status).toBe(304);
  });

  test('buscar filtra por texto y tipo; un tipo inexistente se rechaza', async () => {
    const c = new Cliente();
    const r = await c.get('/api/v1/catalogo/lugares?tipo=arqueologico');
    expect(r.json.items.length).toBeGreaterThan(0);
    expect(r.json.items.every(l => l.tipo === 'arqueologico')).toBe(true);
    expect((await c.get('/api/v1/catalogo/lugares?q=quinua')).json.items.some(l => /quinua/i.test(l.nombre))).toBe(true);
    expect((await c.get('/api/v1/catalogo/lugares?tipo=playa')).status).toBe(422);
  });

  test('administración crea, edita, retira y vuelve a publicar un lugar', async () => {
    const creado = await admin.post('/api/v1/catalogo/admin/lugares', LUGAR);
    expect(creado.status).toBe(201);
    const slug = creado.json.slug;
    expect(slug).toBe('mirador-de-acuchimay-jest');
    const editado = await admin.put(`/api/v1/catalogo/admin/lugares/${slug}`, { ...LUGAR, resumen: 'Resumen nuevo del mirador.' });
    expect(editado.json.resumen).toBe('Resumen nuevo del mirador.');
    expect(editado.json.slug).toBe(slug);
    await admin.post(`/api/v1/catalogo/admin/lugares/${slug}/estado`, { publicado: false });
    expect((await new Cliente().get(`/api/v1/catalogo/lugares/${slug}`)).status).toBe(404);
    await admin.post(`/api/v1/catalogo/admin/lugares/${slug}/estado`, { publicado: true });
    expect((await new Cliente().get(`/api/v1/catalogo/lugares/${slug}`)).status).toBe(200);
  });

  test('reglas del lugar: dentro de Ayacucho, fotos con autor y licencia, tipo válido', async () => {
    const lima = await admin.post('/api/v1/catalogo/admin/lugares', { ...LUGAR, lat: -12.05, lon: -77.04 });
    expect(lima.status).toBe(422);
    expect(lima.json.detail).toMatch(/fuera de Ayacucho/);
    const foto = await admin.post('/api/v1/catalogo/admin/lugares', { ...LUGAR, fotos: [{ url: 'https://a.pe/f.jpg', autor: '', licencia: '' }] });
    expect(foto.json.detail).toMatch(/autor y licencia/);
    expect((await admin.post('/api/v1/catalogo/admin/lugares', { ...LUGAR, tipo: 'playa' })).status).toBe(422);
  });
});
