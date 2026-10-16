# 06 - Drivers arquitectónicos

| ID | Driver | Origen | Respuesta arquitectónica |
|---|---|---|---|
| DA01 | Demanda estacional y continuidad | AC02, AC03 | Despliegue y réplica independientes; degradación de IA/publicidad. |
| DA02 | Lectura frecuente de fotos y fichas | AC01, RF50 | Paginación, proyecciones, cachés y CDN con control de detalle. |
| DA03 | Orientación a entradas verificadas | RC05, RC06 | Catálogo mantiene enlaces; navegador abre la venta externa. |
| DA04 | Proveedores y categorías verificadas | RC07, RC15 | Evidencia privada, revisión por rubro y elegibilidad central en Catálogo. |
| DA05 | Integración de mapas | RC04 | Puerto y adaptador dentro del servicio consumidor. |
| DA06 | Chatbot contextual y personalizado | RF34, RF35, RF47 | Asistente separado de cálculo de recomendaciones y selección publicitaria. |
| DA07 | Calendario y avisos oportunos | RF27-RF29, RF51 | Servicio con tareas persistidas, preferencias y versiones. |
| DA08 | Comunidad y propuestas moderadas | RF21-RF25, RF51, RF52, RF55 | Estados, autoría, revisión, retiro y control de archivos. |
| DA09 | API estable | RC03 | Entrada API y contratos versionados por servicio. |
| DA10 | Mantenibilidad | AC07 | Clean Architecture y propiedad de datos por servicio. |
| DA11 | Acceso y privacidad | RF01, RF46, RF53 | Sesión, autorización por propiedad y separación de vistas previas/detalles. |
| DA12 | Publicidad configurable | RF30-RF45, RF54 | Planes, beneficio único, condiciones congeladas, cuotas y métricas. |
| DA13 | Consistencia entre servicios | RC18, AC05 | Outbox/inbox, eventos versionados, deduplicación y revalidación de estado. |

Las [decisiones arquitectónicas](07-decisiones-arquitectonicas.md) explican cada respuesta y sus consecuencias. No se asume infraestructura desplegada.