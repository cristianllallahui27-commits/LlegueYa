// Publicidad y Servicios y artesanía: verificación antes de mostrar, contacto con sesión y ubicación en Ayacucho.
import { beforeAll, describe, expect, test } from '@jest/globals';
import { Cliente, comoAdmin } from './cliente.mjs';

describe('Negocios verificados (RF30-RF33, EQ-05)', () => {
  let admin;
  let artesana;
  let plan;
  beforeAll(async () => {
    admin = await comoAdmin();
    artesana = await Cliente.conCuenta(undefined, 'Taller Jiménez');
    plan = (await new Cliente().get('/api/v1/publicidad/planes')).json.planes[0].id;
  });

  const solicitud = extra => ({
    negocio: 'Retablos Jiménez Jest', rubro: 'artesania', descripcion: 'Retablos ayacuchanos hechos a mano', contacto: '966 222 333',
    plan_id: plan, direccion: 'Jr. 28 de Julio 100', lat: -13.16, lon: -74.22,
    ofertas: [{ nombre: 'Retablo pequeño', precio_desde: '45', detalle: 'Dos niveles' }], ...extra,
  });

  test('un negocio no aparece hasta cumplir todos los requisitos y ser aprobado', async () => {
    const s = (await artesana.post('/api/v1/publicidad/solicitudes', solicitud())).json;
    expect(s.estado).toBe('pendiente');
    const dir = async () => (await new Cliente().get('/api/v1/publicidad/directorio?rubro=artesania')).json.items;
    expect((await dir()).some(n => n.id === s.id)).toBe(false);
    const temprano = await admin.post(`/api/v1/publicidad/admin/solicitudes/${s.id}/decision`, { aprobar: true });
    expect(temprano.status).toBe(422);
    expect(temprano.json.detail).toMatch(/requisitos/);
    for (const requisito of Object.keys(s.requisitos)) {
      await admin.put(`/api/v1/publicidad/admin/solicitudes/${s.id}/requisitos`, { requisito, cumple: true });
    }
    expect((await admin.post(`/api/v1/publicidad/admin/solicitudes/${s.id}/decision`, { aprobar: true })).status).toBe(200);
    const visible = (await dir()).find(n => n.id === s.id);
    expect(visible.contacto).toBeNull();
    expect(visible.requiere_sesion).toBe(true);
    expect(visible.ofertas[0].precio_desde).toBe('45.00');
    const conSesion = (await artesana.get('/api/v1/publicidad/directorio?rubro=artesania')).json.items.find(n => n.id === s.id);
    expect(conSesion.contacto).toBe('966 222 333');
  });

  test('la ubicación del negocio debe estar en Ayacucho y las ofertas tener precio válido', async () => {
    expect((await artesana.post('/api/v1/publicidad/solicitudes', solicitud({ lat: -12.05, lon: -77.04 }))).status).toBe(422);
    expect((await artesana.post('/api/v1/publicidad/solicitudes', solicitud({ ofertas: [{ nombre: 'X', precio_desde: '-5' }] }))).status).toBe(422);
  });
});
