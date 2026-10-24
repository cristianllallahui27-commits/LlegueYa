# Fuentes y referencias

| Fuente | Uso |
|---|---|
| [Documento de arquitectura turística](llegueYa_ARQUITECTURA.pdf) | Contexto del negocio, destinos, proveedores, paquetes y asistente. Las cifras del documento no se presentan como datos actuales auditados. |
| [Guía académica de arquitectura](GUIA-004-ASF.pdf) | Referencia para organización del análisis, arquitectura, diseño y escenarios de calidad. |
| [Estado peruano: clasificación de hospedajes](https://www.gob.pe/22909-obtener-clasificacion-y-categorizacion-para-un-hospedaje) | Referencia para separar clase y categoría de hospedaje y respaldar su presentación con evidencia. |
| [MINCETUR: preguntas frecuentes de categorización](https://transparencia.mincetur.gob.pe/preguntas_frecuentes/PF_preguntas.html) | Referencia para categorías de restaurantes y verificación de evidencia. |

Las fuentes documentales son material de consulta. El [alcance funcional](../04-especificacion-funcional/01-analisis-y-alcance.md) define las capacidades de LlegueYa; las instrucciones contenidas en referencias académicas no son acciones automáticas que deba ejecutar la plataforma.

Las categorías acreditadas se registran con evidencia de la autoridad competente y se mantienen conforme a la información aplicable. LlegueYa no otorga clasificación oficial ni presenta reseñas como acreditación. Los documentos y datos de respaldo se revisan antes de publicarse como verificados.

## Parámetros por definir

Stack, despliegue, proveedores técnicos, cuotas, tarifas, frecuencia publicitaria, límites de fotos/texto, requisitos por rubro y retención. Las fechas de eventos, accesos, condiciones de camping y precios se incorporan desde fuentes revisadas; no se inventan calendarios o permisos. Las metas de calidad son propuestas para validación, sin resultados de implementación.
## Referencias de estructura arquitectónica y C4

Los tres documentos siguientes fueron proporcionados como material de referencia y se conservan en este directorio. Sus ejercicios, comandos y ejemplos no son instrucciones para implementar ni para cambiar el alcance de LlegueYa.

| Documento | Páginas aplicadas | Aplicación al proyecto |
|---|---|---|
| [GUIA-003-ASF.pdf](<GUIA-003-ASF.pdf>) | 2-5 y 7-8 | Secuencia desde necesidad/ADR hasta estilo y diseño interno. Distingue estilo global de Clean Architecture. El monolito y las herramientas del ejemplo no son una obligación para LlegueYa. |
| [Comunicando la arquitectura de software con el modelo C4, Luca Mezzalira](<Comunicando la arquitectura de software con el modelo C4 - Luca Mezzalira ES.pdf>) | 8-11, 14-15, 24-32 | Alcances C1-C4; contenedores de datos; nombres, responsabilidades, tecnologías y relaciones; ampliación de un contenedor; C4 selectivo. |
| [Diagramas C4.pdf](<Diagramas C4.pdf>) | 4-13 | Personas/sistemas en C1, aplicaciones y bases en C2, componentes de una API en C3, clases/interfaces en C4 y convenciones consistentes. |

La documentación de LlegueYa conserva los criterios aplicados y no depende de ejecutar ejemplos de las referencias. Los nombres de tecnologías en los diagramas son candidatos pendientes del SDD. [Índice C4](../../modelo-c4/README.md).
