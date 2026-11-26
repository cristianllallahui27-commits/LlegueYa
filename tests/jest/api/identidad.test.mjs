// Identidad: registro e inicio de sesión con correo, sesión por cookie, CSRF y límite de intentos.
import { describe, expect, test } from '@jest/globals';
import { ADMIN, BASE, Cliente, correoNuevo } from './cliente.mjs';

describe('Acceso con correo (RF01, EQ-04)', () => {
  test('salud informa los métodos de acceso activos', async () => {
    const r = await new Cliente().get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.json.metodos).toEqual({ google: true, correo: true });
  });

  test('registro valida la clave y el correo con mensajes en español', async () => {
    const c = new Cliente();
    const corta = await c.post('/api/v1/auth/registro', { correo: correoNuevo(), clave: 'corta1', nombre: 'Ana' });
    expect(corta.status).toBe(422);
    expect(corta.json.detail).toMatch(/clave/i);
    const sinNumeros = await c.post('/api/v1/auth/registro', { correo: correoNuevo(), clave: 'solamenteletras', nombre: 'Ana' });
    expect(sinNumeros.status).toBe(422);
    const correoMalo = await c.post('/api/v1/auth/registro', { correo: 'no-es-correo', clave: 'ayacucho2026', nombre: 'Ana' });
    expect(correoMalo.status).toBe(422);
  });

  test('registro crea la sesión y /auth/me devuelve a la persona sin datos sensibles', async () => {
    const correo = correoNuevo();
    const c = await Cliente.conCuenta(correo, 'Rosa Quispe');
    const yo = await c.get('/api/v1/auth/me');
    expect(yo.status).toBe(200);
    expect(yo.json).toMatchObject({ nombre: 'Rosa Quispe', correo, admin: false });
    expect(JSON.stringify(yo.json)).not.toMatch(/ayacucho2026/);
  });

  test('el mismo correo no puede registrarse dos veces', async () => {
    const correo = correoNuevo();
    await Cliente.conCuenta(correo);
    const otra = await new Cliente().post('/api/v1/auth/registro', { correo, clave: 'otraclave99', nombre: 'Copia' });
    expect(otra.status).toBe(409);
  });

  test('entrar con clave equivocada falla sin decir si el correo existe', async () => {
    const correo = correoNuevo();
    await Cliente.conCuenta(correo);
    const mala = await new Cliente().post('/api/v1/auth/entrar', { correo, clave: 'equivocada1' });
    const inexistente = await new Cliente().post('/api/v1/auth/entrar', { correo: correoNuevo(), clave: 'equivocada1' });
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.json.detail).toBe(inexistente.json.detail);
  });

  test('cerrar sesión invalida la cookie', async () => {
    const c = await Cliente.conCuenta();
    expect((await c.get('/api/v1/auth/me')).status).toBe(200);
    await c.post('/api/v1/auth/logout');
    expect((await c.get('/api/v1/auth/me')).status).toBe(401);
  });

  test('el correo de ADMIN_CORREOS entra como administración', async () => {
    const c = new Cliente();
    let r = await c.post('/api/v1/auth/registro', { correo: ADMIN, clave: 'admin2026', nombre: 'Administración' });
    if (r.status === 409) r = await c.post('/api/v1/auth/entrar', { correo: ADMIN, clave: 'admin2026' });
    expect((await c.get('/api/v1/auth/me')).json.admin).toBe(true);
  });

  test('CSRF: una escritura sin Origin del sitio se rechaza', async () => {
    const sinOrigen = await new Cliente().post('/api/v1/auth/entrar', { correo: correoNuevo(), clave: 'x1234567' }, { origen: false });
    expect(sinOrigen.status).toBe(403);
    const otroSitio = await new Cliente().post('/api/v1/auth/entrar', { correo: correoNuevo(), clave: 'x1234567' },
      { origen: false, cabeceras: { Origin: 'https://sitio-malicioso.example' } });
    expect(otroSitio.status).toBe(403);
  });

  test('límite por IP: tras 10 intentos por minuto responde 429 y otras IP siguen atendidas', async () => {
    const atacante = new Cliente({ ip: '203.0.113.50' });
    const estados = [];
    for (let i = 0; i < 12; i++) estados.push((await atacante.post('/api/v1/auth/entrar', { correo: correoNuevo(), clave: `intento${i}x` })).status);
    expect(estados.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(estados.at(-1)).toBe(429);
    expect((await new Cliente().post('/api/v1/auth/entrar', { correo: correoNuevo(), clave: 'intento99x' })).status).toBe(401);
  });

  test('bloqueo por cuenta: tras 5 claves incorrectas la cuenta se bloquea aunque cambie la IP', async () => {
    const correo = correoNuevo();
    const estados = [];
    for (let i = 0; i < 5; i++) estados.push((await new Cliente().post('/api/v1/auth/entrar', { correo, clave: `intento${i}x` })).status);
    expect(estados).toEqual([401, 401, 401, 401, 429]);
    const otraIp = await new Cliente().post('/api/v1/auth/entrar', { correo, clave: 'intento9x' });
    expect(otraIp.status).toBe(429);
    expect(otraIp.json.detail).toMatch(/bloqueamos/);
  });

  test('candado de origen: sin pasar por el Worker de Cloudflare la API responde 403', async () => {
    const directo = new Cliente({ borde: false });
    expect((await directo.get('/api/v1/catalogo/destinos')).status).toBe(403);
    expect((await directo.get('/api/v1/health')).status).toBe(200);
    expect(BASE).toMatch(/^http:\/\/127\.0\.0\.1/);
  });
});
