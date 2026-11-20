// Willaq Uma: requiere cuenta, no inventa lugares ni eventos, y sus planes de viaje se validan contra el catálogo.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente } from './cliente.mjs';

describe('Asistente Willaq Uma (RF14-RF16, EQ-02)', () => {
  let viajero;
  let slugs;
  beforeAll(async () => {
    viajero = await Cliente.conCuenta(undefined, 'Rosa');
    slugs = new Set((await new Cliente().get('/api/v1/catalogo/lugares?limite=48')).json.items.map(l => l.slug));
  });

  test('se presenta como el sabio guía de LlegueYa', async () => {
    const r = await new Cliente().get('/api/v1/asistente/presentacion');
    expect(r.json.asistente).toBe('Willaq Uma');
    expect(JSON.stringify(r.json)).toMatch(/Bienvenido/);
  });

  test.each([
    '¿Qué lugares arqueológicos me recomiendas?',
    'Arma un viaje de 3 días',
    'Quiero ir a Machu Picchu y a la playa de Máncora',
    'Me gusta la naturaleza',
    'qué eventos hay',
  ])('«%s» solo cita lugares que existen en el catálogo', async pregunta => {
    const r = await viajero.post('/api/v1/asistente/mensajes', { texto: pregunta });
    expect(r.status).toBe(200);
    expect(r.json.parrafos.length).toBeGreaterThan(0);
    for (const l of r.json.lugares) expect(slugs.has(l.slug)).toBe(true);
    for (const d of r.json.plan?.dias ?? []) for (const l of d.lugares) expect(slugs.has(l.slug ?? l)).toBe(true);
  });

  test('un plan de viaje aceptado se guarda; uno con lugares inventados se rechaza', async () => {
    const r = await viajero.post('/api/v1/asistente/mensajes', { texto: 'Arma un viaje de 2 días' });
    expect(r.json.plan).toBeTruthy();
    const ok = await viajero.post('/api/v1/recomendaciones/viajes', { plan: r.json.plan });
    expect(ok.status).toBe(201);
    expect((await viajero.get('/api/v1/recomendaciones/viajes')).json.items.length).toBe(1);
    const falso = structuredClone(r.json.plan);
    falso.dias[0].lugares = [{ slug: 'machu-picchu', nombre: 'Machu Picchu' }];
    expect((await viajero.post('/api/v1/recomendaciones/viajes', { plan: falso })).status).toBe(422);
  });
});
