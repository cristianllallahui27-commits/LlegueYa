# LlegueYa · Descripción del diseño de software

> Este SDD es la línea base de diseño. Lo implementado, cómo ejecutarlo y las mediciones de la primera versión están en [Desarrollo](../06-desarrollo/README.md) y en [Sprint 2](../07-sprint2/README.md).

**SDD 1.0 · Línea base de diseño · 28 de octubre de 2026**

Plataforma social de turismo de Ayacucho, centrada en lectura, fotografías y planificación. Este SDD especifica el diseño que guía la implementación. Los valores operativos propuestos se distinguen de las reglas aprobadas.

[Leer el documento con navegación](index.html) · [Índice general de documentación](../README.md) · [Modelo C4](../../modelo-c4/README.md)

## Lectura del documento

| Capítulo | Contenido y resultado |
|---|---|
| [01 · Alcance](01-alcance.md) | Límites, actores, términos y reglas que gobiernan el diseño. |
| [02 · Arquitectura y decisiones](02-arquitectura-y-decisiones.md) | Servicios, tecnologías, alternativas, Supabase y relación con C4. |
| [03 · Servicios, capas y SOLID](03-servicios-capas-y-solid.md) | Componentes, contratos interiores, responsabilidades y dependencias. |
| [04 · Datos y Supabase](04-datos-y-supabase.md) | Diccionario lógico, relaciones, invariantes, esquemas, archivos y acceso. |
| [05 · Contratos e integraciones](05-contratos-e-integraciones.md) | Operaciones API, DTO, errores, mensajes, Gemini y mapa. |
| [06 · Flujos y estados](06-flujos-y-estados.md) | Secuencias, estados y comportamiento ante concurrencia o fallos. |
| [07 · Interfaz y experiencia](07-interfaz-y-experiencia.md) | Navegación, lectura, perfil, muro, mapa y criterios de interacción. |
| [08 · Seguridad](08-seguridad.md) | Autenticación, permisos, privacidad, secretos y revisión previa al commit. |
| [09 · Despliegue y operación](09-despliegue-y-operacion.md) | Docker, Cloudflare, datos gestionados, recuperación y observabilidad. |
| [10 · Trazabilidad y validación](10-trazabilidad-y-validacion.md) | Cobertura de requisitos, escenarios de aceptación, riesgos y pendientes. |
| [11 · Pruebas y calidad](11-pruebas-y-calidad.md) | Integración, seguridad, E2E, calidad y puertas de cobertura mínima del 90 %. |
| [Referencias](referencias.md) | Fuentes primarias y criterios metodológicos aplicados. |

## Control documental

| Campo | Valor |
|---|---|
| Sistema | LlegueYa. |
| Equipo | Cristian Mier Llallahui Gomez y Yordi Ajeo Atao Huaman. |
| Curso | Arquitectura de Software, IS-488, UNSCH. |
| Línea base funcional | RF01–RF65 y HU01–HU46. |
| Diseño aprobado por alcance | Supabase, Docker, Cloudflare y Gemini como integración opcional del asistente; mapa interactivo con ubicación solo si la persona la activa. |
| Diseño propuesto por el equipo | Python/FastAPI, frontend HTML/CSS/JavaScript, Leaflet y mensajería RabbitMQ. |
| Implementación y validación | Primera versión en `services/` y `apps/web/`; pruebas y mediciones en [Sprint 2](../07-sprint2/README.md). |
| Control de cambios | Git conserva el historial. Este documento no contiene secretos y no requiere cuentas reales para leerlo. |

## Propiedad de la información

Los requisitos pertenecen al análisis y a la especificación funcional; las decisiones generales al registro ADR; los diagramas C4 a `modelo-c4/`. Este SDD es la fuente del diseño detallado de datos, contratos, estados e interfaz. El resumen de tecnología enlaza al capítulo 02. Los gráficos derivados y el lector HTML se generan desde las fuentes de documentación, sin duplicar decisiones editables.

La estructura se inspira en descripción de diseño y vistas de arquitectura, adaptadas al curso. No se afirma certificación formal IEEE. La [matriz metodológica](referencias.md) explica su correspondencia.

**Convención:** «debe» identifica una obligación del diseño; «propuesto» identifica un valor que requiere validación; «pendiente» marca una decisión externa o una tarea aún no ejecutada. Los ejemplos usan identificadores ficticios.
