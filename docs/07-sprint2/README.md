# Sprint 2 · Implementación y validación de la arquitectura

**Qué contiene esta carpeta:** la evidencia del Sprint 2 del curso Arquitectura de Software (IS-488). Muestra cómo la arquitectura documentada en el Sprint 1 ([análisis](../01-analisis-de-sistema/), [arquitectura](../02-arquitectura-software/), [SDD](../05-sdd/README.md), [C4](../../modelo-c4/README.md)) quedó implementada en una primera versión funcional, y cómo se demuestra con pruebas que responde a los atributos de calidad definidos.

| Documento | Contenido |
|---|---|
| [1. Estilo y patrón arquitectónico](01-estilo-y-patron-arquitectonico.md) | Servicios de negocio + Clean Architecture llevados a código, con diagramas y la prueba que vigila la regla de dependencias |
| [2. Especificaciones SDD](02-especificaciones-sdd.md) | Nueve funcionalidades con historia de usuario, criterios de aceptación (Dado/Cuando/Entonces), tareas técnicas y pruebas |
| [3. API REST y OpenAPI](03-api-rest-openapi.md) | Swagger UI, contrato OpenAPI 3, convenciones y las 80 operaciones |
| [4. Base de datos y caché](04-base-de-datos-y-cache.md) | Comportamiento medido de PostgreSQL (RLS, índices, planes de ejecución) y estrategia de caché en cuatro niveles |
| [5. SOLID y patrones](05-solid-y-patrones.md) | Cada principio y patrón con la clase donde se aplica |
| [6. Pruebas y CI/CD](06-pruebas-automatizadas-y-ci.md) | Jest, pytest, Playwright, cobertura ≥ 90 % y flujo de GitHub Actions |
| [7. Validación de atributos de calidad](07-validacion-atributos-calidad.md) | EQ-01 a EQ-07 medidos: k6 hasta 2 000 usuarios, seguridad, disponibilidad, mantenibilidad |
| [`api/openapi.json`](api/openapi.json) | Contrato OpenAPI exportado (el CI comprueba que coincide con el código) |
| [`evidencias/`](evidencias/) | Resultados en bruto: resúmenes de k6, cobertura Jest, análisis de base de datos |

## Cumplimiento del Sprint 2

### Actividades

| # | Actividad pedida | Cómo se cumple | Evidencia |
|---|---|---|---|
| 1 | Implementar el estilo arquitectónico | Siete servicios de negocio con datos propios, entrada API única y despliegue independiente por servicio; borde en Cloudflare con réplicas | [Doc. 1 §1.1](01-estilo-y-patron-arquitectonico.md#11-estilo-servicios-de-negocio-detrás-de-una-entrada-única) · `services/` · `infra/` |
| 2 | Aplicar el patrón arquitectónico (Clean Architecture) | Dominio, aplicación (casos de uso + puertos), infraestructura (adaptadores) y presentación en los 7 servicios; la regla de dependencias se prueba en cada cambio | [Doc. 1 §1.2](01-estilo-y-patron-arquitectonico.md#12-patrón-clean-architecture-en-cada-servicio) · `tests/test_arquitectura.py` |
| 3 | Especificaciones SDD con criterios de aceptación y tareas técnicas | 9 funcionalidades, 43 criterios de aceptación enlazados a sus pruebas | [Doc. 2](02-especificaciones-sdd.md) · [SDD](../05-sdd/README.md) |
| 4 | Endpoints REST funcionales documentados con OpenAPI/Swagger | 80 operaciones en 8 grupos; Swagger UI en `/api/docs`; contrato exportado y verificado en el CI | [Doc. 3](03-api-rest-openapi.md) · [`api/openapi.json`](api/openapi.json) |
| 5 | Analizar el comportamiento de la base de datos y la estrategia de caché | Mediciones con 20 000 publicaciones: índices, RLS, planes de ejecución; caché en navegador, CDN, borde y proceso | [Doc. 4](04-base-de-datos-y-cache.md) · [`evidencias/bd-y-cache.json`](evidencias/bd-y-cache.json) |
| 6 | Aplicar principios SOLID y patrones de diseño | Los cinco principios y 13 patrones, cada uno con su clase | [Doc. 5](05-solid-y-patrones.md) |
| 7 | Pruebas automatizadas con Jest integradas en CI/CD con GitHub Actions | Jest: 28 pruebas unitarias y 59 de reglas de negocio de la API, con cobertura ≥ 90 %; job `jest` en `.github/workflows/ci.yml`, junto a pytest, Playwright y k6 | [Doc. 6](06-pruebas-automatizadas-y-ci.md) · `jest.config.mjs` · `tests/jest/` |
| 8 | Pruebas de atributos de calidad (k6 hasta 2 000 usuarios, Jest…) | k6 con rampa progresiva 200 → 500 → 1 000 → 2 000 usuarios concurrentes, 1 y 2 réplicas; matriz de seguridad con Jest; *failover*; arquitectura | [Doc. 7](07-validacion-atributos-calidad.md) · `tests/carga/k6-plataforma.js` |

### Entregables

| Entregable | Dónde está |
|---|---|
| Código fuente organizado según la arquitectura | `services/<servicio>/{dominio,aplicacion,infraestructura,presentacion,composicion}.py`, `apps/web`, `infra/`, `supabase/` |
| Primera versión funcional | `iniciar-llegueya.bat` (Windows) o `uvicorn services.gateway.composicion:crear_app --factory`; web en <http://127.0.0.1:8000> |
| Documentación de API con OpenAPI/Swagger | <http://127.0.0.1:8000/api/docs> · [`api/openapi.json`](api/openapi.json) · [Doc. 3](03-api-rest-openapi.md) |
| Pruebas automatizadas con Jest y reporte de cobertura | `npm run test:cobertura` → `reports/jest-coverage/index.html` · [`evidencias/jest-cobertura.json`](evidencias/jest-cobertura.json) |
| Evidencias de validación de atributos de calidad | [Doc. 7](07-validacion-atributos-calidad.md) · [`evidencias/`](evidencias/) |

## Ejecutar y comprobar en cinco minutos

```bash
pip install -r requirements-dev.txt && npm install
uvicorn services.gateway.composicion:crear_app --factory --port 8000   # o iniciar-llegueya.bat
# Web: http://127.0.0.1:8000 · Swagger: http://127.0.0.1:8000/api/docs
npm run test:cobertura            # Jest
python -m pytest tests -q         # pytest
# k6 contra el servidor de pruebas (doble de Supabase: no crea cuentas reales)
uvicorn tests.servidor_e2e:app --port 8010 &
k6 run -e BASE_URL=http://127.0.0.1:8010 -e PERFIL=humo tests/carga/k6-plataforma.js
```
