# Criterios de evaluación y evidencia

Mapa de la rúbrica del curso a lo que hay en el repositorio. «Al publicar» indica un paso que depende de las cuentas del equipo (dominio, hosting).

| N° | Criterio | Evidencia en el repositorio | Estado |
|---|---|---|---|
| 1 | Identificación del problema y requerimientos | `docs/01-analisis-de-sistema/` (necesidad, actores, HU, RF01–RF65, atributos, restricciones) | Hecho |
| 2 | Análisis y diseño del sistema | `docs/02-*`, `docs/03-*`, `docs/04-especificacion-funcional/` | Hecho |
| 3 | Arquitectura de bajo y alto nivel | `modelo-c4/` (C1–C4 + despliegue), `docs/05-sdd/02-03`, código por capas en `services/*` | Hecho |
| 4 | Desarrollo basado en SDD | `docs/05-sdd/` → `prompts/` → código; reglas del SDD visibles en el código (vista previa vs detalle, moderación, likes únicos, sin GPS, fotos con fuente) | Hecho |
| 5 | Pruebas unitarias e integración | `tests/test_*.py` (identidad, cuentas con correo, plataforma, administración, PostgreSQL), `tests/jest/` (unidad y API), `tests/test_arquitectura.py`; puerta ≥90 % por servicio | Hecho (235 pruebas Python + 87 de Jest; ver [Sprint 2](../07-sprint2/06-pruebas-automatizadas-y-ci.md)) |
| 6 | Pruebas End to End | `tests/web-navegador.mjs` con Playwright: 23 recorridos (registro con correo, recuperar clave, reportes, administración de lugares y cuentas, servicios y artesanía, mapa con capas) | Hecho |
| 7 | Interfaz y experiencia de usuario | `apps/web/`: muro tipo red social, historias de destinos, explorar, ficha, mapa Leaflet, calendario, Mi espacio, Willaq Uma; responsive, teclado, movimiento reducido | Hecho |
| 8 | Escalabilidad del frontend y backend | Web como static assets en Cloudflare; Worker de borde que balancea varios backends con failover (`infra/cloudflare/borde`); `compose.yaml` con réplicas; `infra/nginx/` | Hecho; backends al publicar |
| 9 | Escalabilidad de base de datos | Esquema por servicio, RLS, índices, paginación, likes idempotentes; estado verificado en `BASE-DATOS-Y-CAPACIDAD.md` | Hecho: 67 tablas con RLS ([Base de datos](../../supabase/README.md)) |
| 10 | Dominio/subdominio DNS y CDN | `DESPLIEGUE-DNS-CDN.md`, Worker `llegueya-borde` (validado con `wrangler deploy --dry-run` y `wrangler dev`), `apps/web/_headers` | Hecho en local (`wrangler dev`); `wrangler deploy` al publicar |
| 11 | Implementación de caché | Caché del borde en el Worker (MISS/HIT), `RepositorioEnCache` (TTL, patrón Proxy), ETag/304, `s-maxage`, `proxy_cache` en nginx | Hecho |
| 12 | CI/CD | `.github/workflows/ci.yml`: backend + PostgreSQL, Jest, web + E2E, k6, Docker Compose y despliegue por hook | Hecho; secretos `DEPLOY_HOOK_URL` y de Cloudflare al publicar |
| 13 | Pruebas de carga k6 | `tests/carga/k6-plataforma.js` (perfiles humo, carga y escalabilidad; umbrales p95 y errores) | Hecho: hasta 2 000 usuarios ([evidencias](../07-sprint2/evidencias/)) |
| 14 | Código fuente y base de datos en GitHub | Código, migraciones, seed y validadores en `supabase/` | Hecho |
| 15 | Informe final | Documentación en `docs/` (Sprint 1 y [Sprint 2](../07-sprint2/README.md)) | Base lista para el informe |
| 16 | Presentación y dominio del tema | — | A cargo del equipo |
