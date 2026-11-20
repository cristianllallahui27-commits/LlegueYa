// Jest globalSetup: levanta el backend real de LlegueYa (FastAPI) con un doble de Supabase Auth,
// así las pruebas de API no necesitan internet ni crean cuentas reales.
import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';

export const PUERTO = 8020;
export const BASE = `http://127.0.0.1:${PUERTO}`;
export const CLAVE_BORDE = 'clave-de-pruebas-jest';

function python() {
  if (process.env.PYTHON) return process.env.PYTHON;
  if (process.platform === 'win32' && existsSync('.venv/Scripts/python.exe')) return '.venv/Scripts/python.exe';
  return 'python3';
}

export default async function iniciar() {
  rmSync('tmp/fotos-e2e', { recursive: true, force: true });
  const proceso = spawn(python(), ['-m', 'uvicorn', 'tests.servidor_e2e:app', '--port', String(PUERTO), '--log-level', 'warning'], {
    // BORDE_CLAVE activa el candado de origen: así cada archivo de pruebas usa su propia IP (CF-Connecting-IP)
    // y el límite de intentos de uno no afecta a otro.
    env: { ...process.env, APP_ORIGIN: BASE, AUTH_LIMITE_MINUTO: '10', COMUNIDAD_AUTOPUBLICAR: 'false', BORDE_CLAVE: CLAVE_BORDE },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  globalThis.__SERVIDOR_LLEGUEYA__ = proceso;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${BASE}/api/v1/health`)).ok) return; } catch { /* aún arrancando */ }
    await new Promise(r => setTimeout(r, 150));
  }
  proceso.kill();
  throw new Error('El servidor de pruebas no arrancó en 15 s');
}
