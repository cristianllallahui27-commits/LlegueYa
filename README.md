# LlegueYa

Sistema inteligente de guía turística y viaje seguro al patrimonio arqueológico y cultural de Ayacucho.

## Equipo y curso

- LLALLAHUI GOMEZ, Cristian Mier - 27222118.
- ATAO HUAMAN, Yordi Ajeo - 27222121.

Arquitectura de Software (IS-488), Escuela Profesional de Ingeniería de Sistemas, UNSCH. Docente: Ing. Lizbeth Jaico Quispe. Semestre 2026-II.

## Alcance actual

Plataforma web que orienta al turista hacia sitios arqueológicos y sus puntos/enlaces de venta de entradas; permite consultar proveedores con documentación verificada, puntuaciones, comentarios, fotos de experiencias, historias, fotografías y libros turísticos. Incluye propuestas de paquetes y un chatbot web que orienta por presupuesto y temporada.

LlegueYa **no vende ni cobra entradas**. No incluye pagos, emisión/validación QR, aforo ni chatbot por WhatsApp/Telegram. El alcance actual está registrado en los requisitos y ADR; las diferencias con el PDF inicial se explican en [fuentes y pendientes](docs/fuentes/README.md).

## Primer entregable: índice

| Sección | Documentación |
|---|---|
| 01. Análisis del sistema | [Necesidad](docs/01-analisis-de-sistema/00-necesidad-del-negocio.md), [actores](docs/01-analisis-de-sistema/01-actores.md), [historias](docs/01-analisis-de-sistema/02-historias-de-usuario.md), [requisitos](docs/01-analisis-de-sistema/03-requisitos-funcionales.md), [calidad](docs/01-analisis-de-sistema/04-atributos-de-calidad.md), [restricciones](docs/01-analisis-de-sistema/05-restricciones.md), [drivers](docs/01-analisis-de-sistema/06-drivers-arquitectonicos.md), [ADR](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md) y [escenarios medibles](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md). |
| 02. Arquitectura de software | [Arquitectura inicial](docs/02-arquitectura-software/arquitectura-inicial.md), [estilo](docs/02-arquitectura-software/estilo-arquitectonico.md), [enfoque Clean Architecture](docs/02-arquitectura-software/enfoque-arquitectonico.md) y [componentes](docs/02-arquitectura-software/componentes-arquitectonicos.md). |
| 03. Diseño de software | [Diseño interno de módulos](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md), [patrones de diseño](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md) y [principios de diseño](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md). |
| 04. Modelo C4 | Incorporado por el colaborador: [contexto](modelo-c4/Nivel1-DiagramadeContextodelSistema.md), [contenedores](modelo-c4/Nivel2-DiagramadeContenedores.md), [componentes](modelo-c4/Nivel3-DiagramadeComponentes.md) y [código](modelo-c4/Nivel4-DiagramadeCodigo.md). Conservado sin modificaciones en este trabajo. |
| Fuentes | [Documentos base, diferencias de alcance y pendientes](docs/fuentes/README.md). |
| Tecnología | [Ejemplo conceptual sin stack elegido](tecnologia/README.md). |

## Estructura

```text
LlegueYa/
├── docs/
│   ├── 01-analisis-de-sistema/
│   │   └── 00 a 08: necesidad, análisis, ADR y escenarios
│   ├── 02-arquitectura-software/
│   │   ├── arquitectura-inicial.md
│   │   ├── componentes-arquitectonicos.md
│   │   ├── estilo-arquitectonico.md / .drawio / .html
│   │   ├── enfoque-arquitectonico.md
│   │   └── enfoque/ (recursos conservados)
│   ├── 03-diseño-de-software/
│   │   └── diseño-interno/
│   │       ├── diseño-interno-de-modulos.md
│   │       ├── patrones-de-diseño.md
│   │       └── principios-de-diseño.md
│   ├── img/
│   └── fuentes/
├── modelo-c4/ (entrega del colaborador, conservada)
├── tecnologia/
│   └── README.md
└── README.md
```

La guía propone `docs/04-modelo-c4/`. El colaborador incorporó sus cuatro archivos en `modelo-c4/` mediante el commit `e50d899`, integrado por `bf1dc91` mientras se preparaban estas secciones. Se conserva su ubicación y contenido; el equipo puede acordar su reubicación después.

## Estado y exposición

Este repositorio contiene **documentación de análisis y diseño**, no una aplicación construida. Los nombres técnicos nuevos son propuestas conceptuales; las métricas de calidad tienen estado por validar y no se presentan como pruebas realizadas.

La Guía 04 solicita entregar la URL del repositorio y exponer durante 12 minutos por equipo. Cada integrante debe explicar de qué requisito surge cada componente. Las secciones 1-3 están preparadas para revisión y C4 ya está incorporado por el colaborador. La revisión conjunta de C4 y su coherencia con estas secciones queda al equipo, junto con los pendientes señalados en las fuentes.
