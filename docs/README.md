# Documentación de LlegueYa

[Proyecto](../README.md) · [Leer SDD](05-sdd/index.html) · [Índice editable del SDD](05-sdd/README.md) · [Gráficos C4](../modelo-c4/diagramas/index.html)

## Recorrido de lectura

| Pregunta | Fuente principal |
|---|---|
| ¿Qué problema y requisitos tenemos? | [Análisis](01-analisis-de-sistema/00-necesidad-del-negocio.md), [RF01–RF65](01-analisis-de-sistema/03-requisitos-funcionales.md), [historias](01-analisis-de-sistema/02-historias-de-usuario.md). |
| ¿Qué reglas y límites tiene el producto? | [Alcance funcional](04-especificacion-funcional/01-analisis-y-alcance.md). |
| ¿Qué arquitectura elegimos y por qué? | [Estilo](02-arquitectura-software/estilo-arquitectonico.md), [Clean Architecture](02-arquitectura-software/enfoque-arquitectonico.md), [ADR](01-analisis-de-sistema/07-decisiones-arquitectonicas.md). |
| ¿Dónde están los diagramas C4? | [Modelo C4](../modelo-c4/README.md), única ubicación principal de esas vistas. |
| ¿Cómo se implementarán datos, contratos, estados e interfaz? | [SDD](05-sdd/README.md). |
| ¿Qué fuentes respaldan el diseño? | [Fuentes del proyecto](fuentes/README.md) y [referencias del SDD](05-sdd/referencias.md). |

## Convenciones de mantenimiento

Una definición editable por tema. El SDD enlaza requisitos y arquitectura, sin copiar documentos completos. Los archivos Markdown y fuentes de diagramas son editables; las imágenes y el lector HTML son representaciones de lectura. Git conserva versiones: no crear carpetas «final2» ni respaldos dentro de la documentación. Las rutas históricas conservadas solo apuntan a su fuente principal.

`05-sdd/` agrupa diseño detallado. `modelo-c4/` agrupa contexto/contenedores/componentes/clases y su Draw.io. `fuentes/` contiene referencias, nunca secretos o expedientes. `.env.example` es un inventario vacío; la configuración privada queda fuera del control de versiones.
