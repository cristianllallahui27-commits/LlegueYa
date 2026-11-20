# Desarrollo de LlegueYa

El SDD describe el producto objetivo; esta carpeta registra **lo que ya funciona** y cómo ejecutarlo.

## Estado al 17/11/2026

| Servicio | Qué hace hoy | Datos |
|---|---|---|
| Identidad (I) | Acceso con Google vía Supabase (PKCE), sesión HttpOnly, nombre y foto de Google. | Sesión en memoria (1 réplica). |
| Catálogo (C) | Lugares con fotos y atribución, vista previa sin cuenta y ficha completa con sesión, mapa, destinos, favoritos. Caché TTL + ETag + `Cache-Control` para CDN. | PostgreSQL (`DB_CATALOGO_DSN`) o datos de demostración. |
| Comunidad (M) | Muro tipo red social: publicaciones con foto, me gusta, comentarios y respuestas en hilo, guardados. Moderación previa por defecto. | PostgreSQL (`DB_COMUNIDAD_DSN`) o memoria. Fotos en disco local (puerto listo para Supabase Storage). |
| Eventos (E) | Calendario de fiestas con «Avísame». Fechas tradicionales marcadas como referenciales. | Memoria. |
| Publicidad (P) | Negocios turísticos (hospedaje, restaurante, movilidad, agencias/paquetes, artesanía) piden promoción; administración verifica requisitos por rubro, registra el pago a mano (pasarela pendiente) y aprueba. Primer mes gratuito una vez por cuenta; los demás planes y precios los crea administración. Anuncios marcados «Patrocinado · Verificado por LlegueYa». | Memoria (adaptador PostgreSQL pendiente). |
| Recomendaciones (R) | Planes de viaje por días que propone Willaq Uma; el viajero los acepta y quedan en Mi espacio. Se revalidan contra el Catálogo. | Memoria. |
| Administración | Panel `#/admin` (correos en `ADMIN_CORREOS`): moderar publicaciones y comentarios, suspender cuentas falsas (cierra sesión, bloquea el ingreso y oculta su contenido), verificar negocios y definir planes. | Coordina Identidad, Comunidad y Publicidad. |
| Asistente (A) | **Willaq Uma**, el sabio guía (solo con cuenta): saluda «Bienvenido, soy Willaq Uma» la primera vez, luego según la hora; arma viajes por días; se presenta formalmente, pregunta qué te gusta y recomienda con lugares, fiestas y experiencias aprobadas de viajeros. No inventa: si algo no está publicado lo dice, y los datos generales van marcados. Burbuja flotante que se arrastra y recuerda su posición. | Lee Catálogo, Eventos y Comunidad. Gemini pendiente. |

Publicidad (P) y Recomendaciones (R) siguen solo en diseño. La web (`apps/web/`) es HTML, CSS y módulos JavaScript sin compilación.

## Ejecutar en Windows (Python 3.12)

Desde la raíz del repositorio:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn services.gateway.composicion:crear_app --factory --host 127.0.0.1 --port 8000 --no-access-log
```

Abrir **http://127.0.0.1:8000** (no `localhost`, no `file://`). Sin `.env` se navega todo en modo visitante. Para entrar con Google: [Google y Supabase](GOOGLE-SUPABASE.md). Correos y cuentas en local: [Correos en local](CORREOS-EN-LOCAL.md).

Variables útiles en `.env`:

| Variable | Para qué |
|---|---|
| `SUPABASE_PROJECT_URL`, `SUPABASE_PUBLISHABLE_KEY` | Activan el botón de Google. |
| `DB_CATALOGO_DSN`, `DB_COMUNIDAD_DSN` | Leen/escriben en Supabase con los logins `llegueya_*` (ver `supabase/manual/`). Vacías = memoria. |
| `COMUNIDAD_AUTOPUBLICAR=true` | Solo en local: publica sin esperar moderación. Por defecto queda «En revisión». |
| `CATALOGO_CACHE_TTL` | Segundos de caché del catálogo (60 por defecto). |
| `ADMIN_CORREOS` | Correos de Google con acceso al panel de administración, separados por comas. |

### Probar la sesión sin Google (solo pruebas)

`tests/servidor_e2e.py` arranca la misma composición con un proveedor de identidad **doble** que simula el regreso de Google. Sirve para las pruebas E2E y de carga; no está en Docker ni en el gateway.

```powershell
$env:APP_ORIGIN="http://127.0.0.1:8010"; .\.venv\Scripts\python.exe -m uvicorn tests.servidor_e2e:app --port 8010
```

## Pruebas y calidad

| Tipo | Comando | Resultado 17/11/2026 |
|---|---|---|
| Unitarias + integración HTTP | `python -m coverage run -m pytest tests -q` | 89 aprobadas (5 se omiten sin PostgreSQL) |
| Integración PostgreSQL real | igual, con `TEST_DATABASE_URL` de una base desechable | 5 aprobadas con PostgreSQL 16 (migraciones + RLS + repositorios + moderación) |
| Puerta de cobertura | `python -m coverage json` y `python scripts/comprobar-cobertura.py` | Todos los servicios ≥ 98 % líneas y ≥ 91 % ramas |
| Lógica web y borde (Jest) | `npm run test:cobertura` | 26 pruebas unitarias y 58 de API, cobertura ≥ 90 % por archivo |
| End to End | servidor de pruebas en 8010 + `node tests/web-navegador.mjs` | 18 pasos aprobados (visitante, acceso, publicar, like, hilo, ficha, guardados, calendario, Willaq Uma: presentación, recomendaciones, burbuja y plan aceptado; sin cuenta no se conversa ni comenta; negocio pide promoción y administración lo verifica y suspende una cuenta; móvil) |
| Carga (k6) | `k6 run -e BASE_URL=http://127.0.0.1:8010 tests/carga/k6-plataforma.js` | Script listo; ejecutar y guardar evidencia en `reports/` |
| Base de datos | `node supabase/tests/validar-base.mjs` | Actualizado a 66 tablas |

Todo esto corre solo en GitHub Actions (`.github/workflows/ci.yml`) en cada push.

## Arquitectura del código

Cada servicio tiene `dominio.py` (reglas, sin frameworks), `aplicacion.py` (casos de uso y puertos), `infraestructura.py` (memoria, PostgreSQL, almacén, caché), `presentacion.py` (FastAPI) y `composicion.py` (ensamblado y `crear_app()` propio para desplegarlo solo). `services/compartido/` tiene las cabeceras de seguridad y el puerto `VerificadorSesion` (en proceso o por HTTP a Identidad). `services/gateway/` es la composición local de un solo proceso; `compose.yaml` + `infra/nginx/` es la versión distribuida.

## Pendiente (no se declara hecho)

- Google real: falta la clave publishable en `.env` y habilitar Google en Supabase (pasos en la guía).
- Aplicar la migración `20261117000100_plataforma_social.sql`, el seed y los logins en Supabase.
- Supabase Storage para fotos de viajeros (hoy disco local), panel de moderación, Publicidad y Recomendaciones, Gemini en Willaq Uma.
- Dominio, Cloudflare y hosting: ver [DNS, CDN y despliegue](DESPLIEGUE-DNS-CDN.md).
- Estado de Supabase, conexión del backend y capacidad: ver [Base de datos y capacidad](BASE-DATOS-Y-CAPACIDAD.md).
- Docker: el Dockerfile y compose están listos; la construcción se verifica en CI (no había Docker en la máquina de desarrollo).
