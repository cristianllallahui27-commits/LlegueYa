# Plataforma tecnológica de LlegueYa

El [capítulo 02 del SDD](../docs/05-sdd/02-arquitectura-y-decisiones.md) es la definición principal de tecnología y alternativas. Este directorio ofrece su resumen de navegación; versiones exactas se fijarán tras comprobar compatibilidad y capacidad.

| Función | Tecnología y estado |
|---|---|
| Datos, autenticación y archivos | Supabase PostgreSQL, Auth y Storage, elegidos para el diseño. Una base con siete esquemas privados, no siete bases físicas. |
| Chatbot | Gemini desde servidor; modelo concreto configurable y por evaluar. |
| Ejecución | Docker y Compose, elegidos; hosting y dimensionamiento pendientes. |
| Borde | Cloudflare para DNS, HTTPS/proxy, CDN público y protección según plan. No cachea datos privados. |
| APIs | Python/FastAPI, propuesta técnica del SDD. |
| Interfaz | HTML/CSS/JavaScript modular, propuesta sin backend PHP o Node.js. |
| Mapa | Leaflet y proveedor de teselas OSM para piloto sujeto a política; sin geolocalización. |
| Integración durable | RabbitMQ, propuesta junto a outbox/inbox e idempotencia. |
| Entrada al origen | Nginx, propuesta para WEB y enrutamiento de APIs. |

[Datos y permisos](../docs/05-sdd/04-datos-y-supabase.md), [seguridad](../docs/05-sdd/08-seguridad.md), [operación](../docs/05-sdd/09-despliegue-y-operacion.md) y [fuentes oficiales](../docs/05-sdd/referencias.md). No hay aplicación desplegada ni cuentas externas configuradas por esta entrega. Ningún archivo de documentación contiene credenciales funcionales.
