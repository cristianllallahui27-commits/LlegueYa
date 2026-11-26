# Plataforma tecnológica de LlegueYa

El [capítulo 02 del SDD](../docs/05-sdd/02-arquitectura-y-decisiones.md) es la definición principal de tecnología y alternativas. Este directorio ofrece su resumen de navegación; las versiones usadas están en `requirements.txt` y `package.json`.

| Función | Tecnología y estado |
|---|---|
| Datos, autenticación y archivos | Supabase PostgreSQL, Auth y Storage, elegidos para el diseño. Una base con siete esquemas privados, no siete bases físicas. |
| Asistente | Willaq Uma responde con reglas sobre el contenido publicado en LlegueYa; Gemini queda como integración opcional desde el servidor. |
| Ejecución | Docker y Compose (aplicación + PostgreSQL con volumen y healthcheck). |
| Borde | Cloudflare para DNS, HTTPS/proxy, CDN público y protección según plan. No cachea datos privados. |
| APIs | Python 3.12 y FastAPI, con contrato OpenAPI en `/api/docs`. |
| Interfaz | HTML, CSS y módulos JavaScript sin compilación; sin backend PHP o Node.js. |
| Mapa | Leaflet con teselas OSM, CARTO, Esri y OpenTopoMap; rutas con OSRM. La ubicación se usa solo si la persona la activa. |
| Integración durable | RabbitMQ, propuesta junto a outbox/inbox e idempotencia. |
| Entrada al origen | Nginx, propuesta para WEB y enrutamiento de APIs. |

[Datos y permisos](../docs/05-sdd/04-datos-y-supabase.md), [seguridad](../docs/05-sdd/08-seguridad.md), [operación](../docs/05-sdd/09-despliegue-y-operacion.md) y [fuentes oficiales](../docs/05-sdd/referencias.md). Ningún archivo de documentación contiene credenciales funcionales.
