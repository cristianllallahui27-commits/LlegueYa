# Pruebas de LlegueYa

| Archivo | Tipo | Cómo correr |
|---|---|---|
| `test_identidad.py` | Unitarias e integración HTTP de Identidad | `python -m pytest tests -q` |
| `test_plataforma.py` | Catálogo, Comunidad, Eventos, Willaq Uma y gateway | igual |
| `test_administracion.py`, `test_cuentas.py`, `test_planes_negocio.py`, `test_reputacion.py`, `test_mapas_y_fotos.py`, `test_negocios_y_asistente.py` | Administración, cuentas con correo, planes por nivel, reputación, mapas y rutas, terminales, fotos y Willaq Uma | igual |
| `test_postgres.py` | Migraciones + RLS + repositorios en PostgreSQL real | define `TEST_DATABASE_URL` (base desechable) |
| `test_arquitectura.py` | Reglas de dependencias entre capas y servicios | igual |
| `jest/unidad/` | Lógica de la web y Worker de borde (Jest) | `npm run test:unidad` |
| `jest/api/` | Contrato y permisos de la API REST con servidor real (Jest) | `npm run test:api` |
| cobertura Jest | Informe en `reports/jest-coverage/` | `npm run test:cobertura` |
| `web-navegador.mjs` | End to End con Playwright | levantar `tests.servidor_e2e:app` en 8010 y `node tests/web-navegador.mjs` |
| `carga/k6-plataforma.js` | Carga con k6 | `k6 run -e PERFIL=escalabilidad -e BASE_URL=http://127.0.0.1:8010 tests/carga/k6-plataforma.js` (perfiles `humo`, `carga`, `escalabilidad`) |
| `calidad-local.mjs` | Revisión de la documentación HTML | `node tests/calidad-local.mjs` |

`servidor_e2e.py` usa un proveedor de identidad doble: permite probar la sesión sin Google real y no se incluye en la imagen Docker. Los reportes van a `reports/` (ignorado por Git).
