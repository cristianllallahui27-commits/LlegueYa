// Contrato OpenAPI: lo documentado en Swagger existe, tiene resumen en español y declara su seguridad.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente } from './cliente.mjs';

describe('OpenAPI / Swagger', () => {
  let contrato;
  beforeAll(async () => { contrato = (await new Cliente().get('/api/openapi.json')).json; });

  test('es OpenAPI 3 con los ocho grupos de la arquitectura', () => {
    expect(contrato.openapi).toMatch(/^3\./);
    expect(contrato.tags.map(t => t.name)).toEqual(
      ['Identidad', 'Catálogo', 'Comunidad', 'Eventos', 'Publicidad', 'Recomendaciones', 'Asistente', 'Administración']);
  });

  test('cada operación tiene resumen, grupo y declara si requiere sesión', () => {
    const ops = Object.entries(contrato.paths).flatMap(([ruta, m]) => Object.entries(m).map(([metodo, op]) => ({ ruta, metodo, op })));
    expect(ops.length).toBeGreaterThanOrEqual(80);
    for (const { op } of ops) {
      expect(op.summary.length).toBeGreaterThan(5);
      expect(op.tags).toHaveLength(1);
      expect(Array.isArray(op.security)).toBe(true);
    }
  });

  test('los GET públicos documentados responden (no hay rutas fantasma)', async () => {
    const c = new Cliente();
    const publicos = Object.entries(contrato.paths)
      .filter(([ruta, m]) => m.get && !ruta.includes('{') && m.get.security.length === 0
        && !(m.get.parameters || []).some(p => p.required)).map(([ruta]) => ruta);
    for (const ruta of publicos) {
      const r = await c.get(ruta);
      expect([200, 303, 307]).toContain(r.status);
    }
  });

  test('Swagger UI se sirve desde el propio sitio, sin CDN externos', async () => {
    const r = await new Cliente().get('/api/docs');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/text\/html/);
    expect(r.texto).toContain('/vendor/swagger-ui/swagger-ui-bundle.js');
    expect(r.texto).not.toMatch(/cdn\.|unpkg|jsdelivr/);
  });
});
