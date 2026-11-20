# 02 · Arquitectura y decisiones técnicas

[Índice](README.md) · [Anterior](01-alcance.md) · [Siguiente](03-servicios-capas-y-solid.md)

## 2.1 Estilo global y organización interna

El estilo es **distribuido orientado a servicios de negocio**. Identidad (I), Catálogo (C), Comunidad (M), Eventos (E), Publicidad (P), Recomendaciones (R) y Asistente (A) son aplicaciones desplegables independientes. Cada una organiza su interior por capas con Clean Architecture. La distribución añade comunicación por red y fallos parciales; las capas controlan dependencias de código. SOLID guía el diseño de componentes y contratos, no obliga a crear servicios nuevos.

[C1](../../modelo-c4/Nivel1-DiagramadeContextodelSistema.md) fija contexto, [C2](../../modelo-c4/Nivel2-DiagramadeContenedores.md) identifica aplicaciones y datos, [C3](../../modelo-c4/Nivel3-DiagramadeComponentes.md) amplía Publicidad, y [C4](../../modelo-c4/Nivel4-DiagramadeCodigo.md) detalla Selección de anuncios. El despliegue es una vista complementaria. Esas vistas siguen siendo su ubicación principal.

## 2.2 Tecnologías y límites de la decisión

| Recurso | Elección de diseño | Justificación y condición |
|---|---|---|
| Frontend WEB | HTML semántico, CSS y JavaScript modular de navegador. | Interfaz centrada en lectura, sin servidor Node.js. Reutilización mediante componentes de interfaz. Framework adicional fuera de esta línea base. |
| APIs I–A | Python/FastAPI, propuesta técnica del SDD. | Contratos tipados y puertos/adaptadores. No se incorporan PHP o Node.js como backend. |
| Datos | Supabase gestionado sobre PostgreSQL. | Servicio elegido para datos, con siete esquemas de negocio y cuentas técnicas separadas. |
| Identidad técnica | Supabase Auth, detrás del servicio Identidad. | Autenticación y recuperación gestionadas; roles y perfil de negocio pertenecen a I. |
| Archivos | Supabase Storage, mediante adaptadores de cada dueño. | Buckets privados para originales, galería y evidencia; derivados públicos separados. |
| IA | Gemini API desde A. | Proveedor solicitado. Modelo concreto configurable y seleccionado mediante evaluación, sin fijar un nombre comercial no validado. |
| Mapa | Leaflet y cartografía basada en OpenStreetMap. | Biblioteca libre para arrastre, zoom y marcadores. Proveedor de teselas intercambiable. |
| Borde | Cloudflare DNS/proxy HTTPS, CDN y reglas de protección disponibles en el plan elegido. | Acelera recursos públicos y filtra tráfico. No reemplaza permisos de aplicación. |
| Entrada/origen | Nginx, propuesta técnica. | Sirve WEB y enruta APIs en un origen lógico. No contiene reglas de negocio. |
| Mensajería | RabbitMQ, propuesta técnica. | Entrega durable de cambios con outbox/inbox de aplicación. No reemplaza bases ni ejecuta reglas publicitarias. |
| Ejecución | Docker y Docker Compose. | Entornos reproducibles y servicios separados. Versiones exactas/digests se fijarán tras prueba de compatibilidad antes de implementar. |

La selección no implica gratuidad de toda la solución. Supabase, Gemini, Cloudflare y alojamiento tienen límites y condiciones que se evaluarán sin inventar precios ni garantías. Se usan fuentes oficiales en [referencias](referencias.md).

## 2.3 Una base gestionada y siete esquemas

La línea base utiliza **un proyecto Supabase, una base PostgreSQL y siete esquemas privados**: `identidad`, `catalogo`, `comunidad`, `eventos`, `publicidad`, `recomendaciones` y `asistente`. Los identificadores previos DI–DA representan ahora particiones de propiedad, no siete contenedores de base distintos. En C2 el contenedor de datos DB describe PostgreSQL gestionado y sus esquemas. Auth y Storage tienen componentes gestionados propios.

Cada servicio usa un rol técnico de ejecución limitado a su esquema; el rol de migración es distinto. No hay joins, claves foráneas, triggers de negocio ni transacciones entre esquemas de servicios. Las referencias remotas se validan por contratos API. La infraestructura administrada de Supabase puede tener sus propios esquemas y relaciones, sin convertirlos en tablas de negocio compartidas.

La base compartida reduce operación inicial y permite transacciones por dominio, pero comparte disponibilidad, conexiones y recursos. No constituye aislamiento físico ni un microservicio plenamente autónomo de persistencia. Si la operación exige independencia física, se evaluarán proyectos/bases separados con migración por servicio. Se conserva esa posibilidad mediante puertos y contratos; no se promete que la migración sea gratuita o automática.

## 2.4 Mapa sin geolocalización

WEB carga la biblioteca Leaflet empaquetada como activo estático y solicita teselas al proveedor configurado. C devuelve marcadores con coordenadas revisadas; la base no calcula dónde está el turista. El centro inicial es el destino elegido o la vista regional de Ayacucho. El viewport del mapa solo indica la región explorada, no la ubicación del usuario.

Para el piloto de bajo volumen se contempla `tile.openstreetmap.org`, sujeto a su política: atribución visible, Referer válido, respeto de caché y ausencia de descarga masiva o precarga offline. Es un servicio de mejor esfuerzo, con capacidad limitada y sin SLA; no se presenta como alojamiento gratuito ilimitado. El proveedor se configura y puede cambiar sin alterar los marcadores ni el dominio. Una salida pública con mayor tráfico exige revisar política y seleccionar proveedor adecuado antes de liberar.

No se añaden Google Maps, geocodificación, Places o Routes. Si las teselas fallan, siguen disponibles las tarjetas y ubicación textual. El servicio de mapas no participa en aprobación de proveedores ni publicidad.

## 2.5 Comunicación y degradación

Las consultas usan HTTPS/JSON y autorización. C, M, E y P publican cambios versionados mediante outbox local. E, P, R y A consumen con inbox y proyecciones propias. El broker no es una autorización: P revalida Catálogo/Eventos antes de entregar publicidad. Los límites de tiempo evitan esperas indefinidas. Si Gemini falla, A devuelve orientación estructurada disponible; si P falla, se omiten anuncios. Una caída de I impide nuevas operaciones autenticadas que no puedan validar el estado de cuenta; las vistas públicas independientes continúan.

## 2.6 Registro y alternativas

ADR-023 documenta Supabase y el aislamiento por esquemas, ADR-024 Docker/Cloudflare, ADR-025 Gemini, ADR-026 el mapa y ADR-027 perfil/lectura/movilidad en el [registro general](../01-analisis-de-sistema/07-decisiones-arquitectonicas.md). PostgreSQL propio aumenta operación; una base NoSQL no aporta una necesidad demostrada para reglas relacionales. Un monolito reduce complejidad operativa, pero no es la distribución elegida. Siete proyectos Supabase aumentarían aislamiento y carga de gestión; se difieren hasta demostrar necesidad.

Los modelos de datos, permisos y APIs aquí descritos no dependen de que Gemini, Maps o el proveedor del borde se conviertan en lógica de dominio. Cada integración se encapsula en un adaptador.
