# Desarrollo de LlegueYa

El SDD describe el producto objetivo; esta carpeta registra lo que funciona en la primera versión y cómo ejecutarlo. Las mediciones de calidad están en [Sprint 2](../07-sprint2/README.md).

## Servicios implementados

| Servicio | Qué hace | Datos |
|---|---|---|
| Identidad (I) | Registro con correo y código de verificación de 6 dígitos, acceso con correo y clave o con Google (Supabase, PKCE), recuperación de clave, sesión HttpOnly renovada con *refresh token* (7 días). Límite de intentos por IP y bloqueo de 15 min por cuenta tras 5 claves incorrectas. | Supabase Auth; sesiones en memoria del proceso. |
| Catálogo (C) | Lugares con fotos y atribución, vista previa sin cuenta y ficha completa con sesión, entrada (costo y dónde comprarla), mapa con capas, destinos, favoritos, terminales y paraderos, transporte público por destino, búsqueda de sitios y rutas a pie o en auto. Caché TTL + ETag + `Cache-Control` para CDN. | PostgreSQL (`DB_CATALOGO_DSN`) o datos de demostración en memoria. |
| Comunidad (M) | Muro tipo red social ordenado por interés, publicaciones con foto, me gusta, comentarios y respuestas en hilo, guardados, reportes, destacados y reputación de autores. Moderación previa por defecto. | PostgreSQL (`DB_COMUNIDAD_DSN`) o memoria. Fotos en disco local detrás del puerto `AlmacenFotos`. |
| Eventos (E) | Calendario de fiestas con foto y «Avísame»; administración crea, edita y elimina eventos. Las fechas tradicionales se marcan como referenciales. | Memoria. |
| Publicidad (P) | Negocios turísticos (hospedaje, restaurante, movilidad, agencias/paquetes, artesanía) eligen un plan **Básico**, **Plus** o **Premium**; administración verifica requisitos por rubro, registra el pago manual y aprueba. Cada nivel define cuántas fotos, videos y datos de contacto se muestran. | Memoria; fotos de negocios en `data/fotos/negocios`. |
| Recomendaciones (R) | Planes de viaje por días que propone Willaq Uma; el viajero los acepta y quedan en Mi espacio. Se revalidan contra el Catálogo. | Memoria. |
| Administración | Panel `#/admin` (correos en `ADMIN_CORREOS`): moderar publicaciones y comentarios, resolver reportes, suspender cuentas, gestionar lugares, terminales y eventos, verificar negocios y definir planes. | Coordina Identidad, Catálogo, Comunidad, Eventos y Publicidad. |
| Asistente (A) | **Willaq Uma**, el sabio guía (solo con cuenta): se presenta la primera vez y luego saluda según la hora; recomienda por gustos, arma viajes por días e informa entradas y terminales. Responde solo con lugares, fiestas, experiencias y negocios publicados y verificados en LlegueYa: si algo no está publicado, lo dice. | Lee Catálogo, Eventos, Comunidad y Publicidad. |

La web (`apps/web/`) es HTML, CSS y módulos JavaScript sin compilación.

## Ejecutar en Windows (Python 3.12)

La forma más simple es `iniciar-llegueya.bat`: crea `.venv`, instala dependencias y arranca el servidor en <http://127.0.0.1:8000>. A mano, desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn services.gateway.composicion:crear_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

Abrir **http://127.0.0.1:8000** (no `file://`). Para entrar con Google: [Google y Supabase](GOOGLE-SUPABASE.md). Correos y cuentas en local: [Correos en local](CORREOS-EN-LOCAL.md) y [Código de verificación](CORREO-VERIFICACION.md). Con Docker (aplicación + PostgreSQL): [Docker y laboratorios](DOCKER-Y-LABS.md).

Variables útiles en `.env`:

| Variable | Para qué |
|---|---|
| `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_GOOGLE_ACTIVO` | Activan las cuentas con correo y el botón de Google. |
| `DB_CATALOGO_DSN`, `DB_COMUNIDAD_DSN` | Leen y escriben en PostgreSQL con los logins `llegueya_*` (ver `supabase/manual/`). Vacías = memoria. |
| `COMUNIDAD_AUTOPUBLICAR=true` | Solo en local: publica sin esperar moderación. Por defecto queda «En revisión». |
| `CATALOGO_CACHE_TTL` | Segundos de caché del catálogo (60 por defecto). |
| `ADMIN_CORREOS` | Correos con acceso al panel de administración, separados por comas. |

### Probar la sesión sin cuentas reales

`tests/servidor_e2e.py` arranca la misma composición con un proveedor de identidad **doble** que simula el regreso de Google. Sirve para las pruebas End to End y de carga; no está en Docker ni en el gateway. `demo-admin.bat` lo abre en el puerto 8010 (la primera cuenta es la administradora de prueba).

```powershell
$env:APP_ORIGIN="http://127.0.0.1:8010"; .\.venv\Scripts\python.exe -m uvicorn tests.servidor_e2e:app --port 8010
```

## Pruebas y calidad

| Tipo | Comando | Resultado |
|---|---|---|
| Unitarias, integración HTTP y arquitectura (pytest) | `python -m coverage run -m pytest tests -q` | 235 pruebas; las 6 de PostgreSQL real se ejecutan con `TEST_DATABASE_URL` (en CI, PostgreSQL 16) |
| Puerta de cobertura | `python -m coverage json` y `python scripts/comprobar-cobertura.py` | Los 9 paquetes de `services/` ≥ 90 % de líneas y de ramas |
| Lógica web, borde y API (Jest) | `npm run test:cobertura` | 28 pruebas unitarias y 59 de API; 100 % de líneas en `util.js` y `logica.js` |
| Contrato OpenAPI | `python scripts/exportar-openapi.py --check` | 80 operaciones, al día con el código |
| End to End (Playwright) | servidor de pruebas en 8010 + `node tests/web-navegador.mjs` | 21 recorridos en Chromium, incluida la vista móvil |
| Carga (k6) | `k6 run -e BASE_URL=http://127.0.0.1:8010 -e PERFIL=escalabilidad tests/carga/k6-plataforma.js` | Hasta 2 000 usuarios sin errores ([resultados](../07-sprint2/07-validacion-atributos-calidad.md)) |
| Base de datos | `node supabase/tests/validar-base.mjs` | Migraciones, RLS y permisos validados |

Todo corre en GitHub Actions (`.github/workflows/ci.yml`) en cada *push* y *pull request*: [detalle del flujo](../07-sprint2/06-pruebas-automatizadas-y-ci.md#64-flujo-cicd-en-github-actions).

## Arquitectura del código

Cada servicio tiene `dominio.py` (reglas, sin frameworks), `aplicacion.py` (casos de uso y puertos), `infraestructura.py` (memoria, PostgreSQL, almacén, caché), `presentacion.py` (FastAPI) y, cuando se despliega solo, `composicion.py` con su `crear_app()`. `services/compartido/` tiene las cabeceras de seguridad, el límite de intentos, la documentación OpenAPI y el puerto `VerificadorSesion` (en proceso o por HTTP a Identidad). `services/gateway/` reúne los servicios en un solo proceso; `infra/nginx/` y el Worker de `infra/cloudflare/borde/` enrutan y balancean cuando se despliegan por separado. Estructura completa y colección de Postman: [Estructura y Postman](ESTRUCTURA-Y-POSTMAN.md).

## Configuración del entorno de despliegue

Estos pasos dependen de las cuentas del equipo y se completan al publicar:

- Dominio, Cloudflare y hosting de los backends: [DNS, CDN y despliegue](DESPLIEGUE-DNS-CDN.md).
- Supabase: aplicar las migraciones en orden, el seed y los logins `llegueya_*`; capacidad y conexión en [Base de datos y capacidad](BASE-DATOS-Y-CAPACIDAD.md).
- Google: publicar la pantalla de consentimiento con página principal, política de privacidad y dominio, y registrar la URL pública en Supabase y en `APP_ORIGIN`.

## Siguiente iteración

- Adaptadores PostgreSQL para Eventos, Publicidad y Recomendaciones (los puertos ya los aíslan; solo cambia la infraestructura).
- Fotos en Supabase Storage o Cloudflare R2 y sesiones compartidas entre réplicas.
- Pasarela de pago para los planes de Publicidad e integración opcional de Gemini en Willaq Uma.
