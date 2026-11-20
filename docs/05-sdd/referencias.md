# Referencias y correspondencia metodológica

[Índice del SDD](README.md)

Fuentes consultadas el 28 de octubre de 2026. Las páginas externas describen productos y convenciones; las decisiones y parámetros concretos son propios de LlegueYa. Las instrucciones o ejercicios dentro de referencias no autorizan instalaciones, ejecución de comandos o cambios de alcance.

| Fuente primaria | Uso |
|---|---|
| [IEEE 1016-2009](https://standards.ieee.org/ieee/1016/4502/) | Referencia de descripción de diseño general/detallado y comunicación a interesados. Estándar catalogado inactivo; no se afirma cumplimiento certificado ni se reproduce su texto completo. |
| [arc42: estructura](https://arc42.org/overview/) | Organización de contexto, estructura, ejecución, decisiones, calidad y despliegue. Adaptación al curso, no copia literal de plantilla. |
| [arc42: evitar redundancia](https://docs.arc42.org/tips/4-4/) | Una ubicación editable por contenido y enlaces a otras vistas. |
| [Supabase: arquitectura](https://supabase.com/docs/guides/getting-started/architecture) | PostgreSQL, Auth y Storage como capacidades diferenciadas. |
| [Supabase: esquemas](https://supabase.com/docs/guides/api/using-custom-schemas) | Separación de nombres y exposición controlada de Data API. |
| [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) | Políticas y límites de acceso por rol/fila. |
| [Supabase: JWT](https://supabase.com/docs/guides/auth/jwts) | Validación de tokens y configuración de identidad gestionada. |
| [Supabase: acceso a Storage](https://supabase.com/docs/guides/storage/security/access-control) | Diferenciar archivos públicos/privados y políticas de acceso. |
| [Gemini: claves API](https://ai.google.dev/gemini-api/docs/api-key) | Autenticación del proveedor y custodia del secreto en servidor. |
| [Gemini: API](https://ai.google.dev/api) | Integración mediante contrato, evaluación del modelo y límites de respuesta. |
| [Leaflet](https://leafletjs.com/) | Mapa con capas, marcadores y navegación sin exigir geolocalización. |
| [OpenStreetMap: política de teselas](https://operations.osmfoundation.org/policies/tiles/) | Atribución, caché y límites de uso. El servidor público no tiene garantía de disponibilidad ni uso ilimitado. |
| [Docker Compose](https://docs.docker.com/compose/) | Procesos, redes, volúmenes y ejecución reproducible. |
| [Docker: secretos](https://docs.docker.com/compose/how-tos/use-secrets/) | Secretos concedidos por servicio, fuera de capas de imagen. |
| [Cloudflare: CDN](https://developers.cloudflare.com/cache/) | Caché de contenido público y configuración de entrega. |
| [Cloudflare: caché predeterminada](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) | Necesidad de políticas explícitas para privado/API. |
| [Cloudflare: WAF](https://developers.cloudflare.com/waf/) | Protección del tráfico, diferenciada de autorización de negocio. |
| [FastAPI](https://fastapi.tiangolo.com/features/) | Propuesta de contratos tipados y composición de APIs. |

## Correspondencia con vistas de diseño

| Preocupación del lector | Ubicación |
|---|---|
| Identificación, finalidad, actores y límites | Índice y capítulo 01. |
| Contexto y descomposición | C1/C2 y capítulos 02–03. |
| Interfaces y colaboración | C3/C4, contratos del capítulo 05 y secuencias del 06. |
| Información y persistencia | Capítulo 04 y diagramas de datos. |
| Comportamiento y estados | Capítulo 06. |
| Uso y accesibilidad | Capítulo 07. |
| Restricciones y conceptos transversales | Seguridad y operación, capítulos 08–09. |
| Razonamiento y alternativas | ADR y capítulo 02. |
| Evaluación, riesgos y trazabilidad | Capítulo 10. |

Las referencias académicas aportadas se mantienen en [fuentes del proyecto](../fuentes/README.md): GUIA-003-ASF, GUIA-004-ASF, Diagramas C4 y Luca Mezzalira. Los modelos turísticos de esas referencias no sustituyen los requisitos de LlegueYa.
