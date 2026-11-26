# Estructura del proyecto y colección de Postman

## Dónde está cada cosa

| Parte | Carpeta | Qué contiene |
|---|---|---|
| **Frontend** (lo que ve el usuario) | `apps/web/` | `index.html`, estilos en `css/`, lógica en `js/` (vistas en `js/vistas/`), fuentes, iconos y librerías en `vendor/` |
| **Backend** (API y reglas de negocio) | `services/` | Un paquete por servicio: `identidad`, `catalogo`, `comunidad`, `eventos`, `publicidad`, `recomendaciones`, `asistente`; `compartido` (seguridad, sesión, Swagger) y `gateway` (los junta en local) |
| Base de datos | `supabase/` | `migrations/` (tablas, RLS, permisos), `seed/` y `tests/` |
| Infraestructura | `infra/` y `.github/` | Cloudflare Worker, nginx, inicialización de PostgreSQL para Docker, colección de Postman y CI de GitHub Actions (`.github/workflows/ci.yml`) |
| Pruebas | `tests/` | `test_*.py` (pytest), `jest/` (Jest), `carga/` (k6) y `web-navegador.mjs` (Playwright) |
| Documentación | `docs/` | Sprint 1 y Sprint 2, desarrollo y arquitectura (`modelo-c4/`) |
| Datos locales | `data/` | Fotos que sube administración (`data/fotos/catalogo/`). No se sube a GitHub |

Dentro de cada servicio del backend se repite la misma estructura de Clean Architecture:
`dominio.py` (reglas), `aplicacion.py` (casos de uso), `infraestructura.py` (base de datos o memoria),
`presentacion.py` (endpoints HTTP) y `composicion.py` (ensamblado).

## Postman

La colección se genera desde el contrato real (`/api/openapi.json`), así que siempre coincide con Swagger.

1. Arranca la app con `iniciar-llegueya.bat` (queda en `http://127.0.0.1:8000`).
2. En Postman: **Import** y elige estos dos archivos de `infra/postman/`:
   - `LlegueYa.postman_collection.json` (80 peticiones en 8 carpetas, una por servicio, más la carpeta «Pruebas funcionales (Lab 05)»)
   - `LlegueYa-local.postman_environment.json` (variable `baseUrl`)
3. Elige el entorno «LlegueYa local» arriba a la derecha.
4. Ejecuta **Identidad → Iniciar sesión** con tu correo y tu clave. Postman guarda la cookie de sesión y la reutiliza.
5. Las peticiones de la carpeta **Administración** y las de `catalogo/admin/…` solo responden si ese correo está en `ADMIN_CORREOS`.

Las peticiones que escriben ya llevan la cabecera `Origin`, que el backend exige para evitar peticiones falsas desde otros sitios.
Para subir una foto usa **Catálogo → Subir una foto**: en el cuerpo (`form-data`) elige el archivo en el campo `foto`.

Si cambias algún endpoint, regenera la colección:

```
python scripts/generar_postman.py
```
