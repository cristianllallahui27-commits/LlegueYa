# LlegueYa

Plataforma web de turismo, comunidad y publicidad para conocer Ayacucho, compartir experiencias y encontrar servicios y actividades.

LlegueYa reúne destinos, lugares de camping y aventura, hospedajes, restaurantes, artesanos y otros prestadores. Presenta categorías acreditadas, portadas y galerías, reseñas de viajeros, eventos con fechas confirmadas y un asistente que orienta por intereses, grupo familiar y presupuesto.

El **Turista** es un único actor: sin cuenta explora vistas previas; al registrarse o iniciar sesión accede a fichas detalladas, galerías completas, opciones personalizadas del bot, favoritos, historial, avisos y participación. Puede compartir experiencias con fotos, dar o retirar likes en fotos/comentarios, responder en hilos y proponer lugares o eventos para revisión administrativa. Las interacciones requieren cuenta y sesión válida.

Los proveedores publican perfiles, fotos de sus servicios y paquetes propios. La promoción incluye un mes gratuito inicial por defecto, configurable por administración. Los planes de continuidad y mayor alcance tienen tarifas, cuotas y prioridad patrocinada definidas por el propietario. La publicidad se identifica y solo muestra objetivos aprobados y pertinentes al viaje.

## Código y guía de desarrollo

La web funciona como una red social de viajeros: muro con historias de destinos, publicaciones con foto, me gusta, comentarios en hilo, guardados, explorar, fichas de lugares con galería, mapa, calendario de fiestas y **Willaq Uma**, el asistente que responde con el contenido publicado en la plataforma. Backend en `services/` (Identidad, Catálogo, Comunidad, Eventos y Asistente) y web en `apps/web/`.

[Ejecutar localmente](docs/06-desarrollo/README.md) · [Configurar Google](docs/06-desarrollo/GOOGLE-SUPABASE.md) · [DNS, CDN y despliegue](docs/06-desarrollo/DESPLIEGUE-DNS-CDN.md) · [Criterios de evaluación](docs/06-desarrollo/CRITERIOS-EVALUACION.md) · [Guía de prompts](prompts/README.md). Publicidad y Recomendaciones siguen en diseño.

## Base de datos

[Tablas, migraciones y configuración Supabase](supabase/README.md). 64 tablas aplicadas en el proyecto remoto; la migración `20261117000100_plataforma_social.sql` añade 2 tablas (66), permisos RLS de Catálogo y Comunidad, y `supabase/seed/` carga los lugares de demostración.

## Arquitectura

Siete servicios independientes: Identidad y acceso; Catálogo y proveedores; Comunidad y contenido; Eventos y notificaciones; Publicidad y planes; Recomendaciones y paquetes; Asistente turístico. Cada servicio aplica Clean Architecture, posee sus datos y se comunica mediante REST y eventos durables. Las fotos públicas aprobadas se distribuyen mediante CDN; expedientes y comprobantes son privados.

El [modelo C4](modelo-c4/README.md) presenta contexto, contenedores y una base Supabase con siete esquemas, componentes de Publicidad y clases conceptuales de Selección de anuncios. El [visor gráfico local](modelo-c4/diagramas/index.html) reúne los diagramas ampliables; el [archivo Draw.io](modelo-c4/diagramas/LlegueYa-C4.drawio) permite editarlos. La infraestructura es una vista complementaria y las elecciones y propuestas técnicas se especifican en el SDD.

## Diseño de software

[Leer el SDD con navegación](docs/05-sdd/index.html) · [Índice editable](docs/05-sdd/README.md) · [Índice de documentación](docs/README.md).

La plataforma incluye perfil editable, colecciones privadas, movilidad independiente de paquetes y un mapa con arrastre/zoom y marcadores, sin solicitar ubicación del usuario. El chatbot se integra con Gemini y respeta datos autorizados y presupuesto calculado.

## Documentación

| Sección | Contenido |
|---|---|
| Análisis | [Necesidad](docs/01-analisis-de-sistema/00-necesidad-del-negocio.md), [actores](docs/01-analisis-de-sistema/01-actores.md), [historias](docs/01-analisis-de-sistema/02-historias-de-usuario.md), [RF01-RF65](docs/01-analisis-de-sistema/03-requisitos-funcionales.md), [calidad](docs/01-analisis-de-sistema/04-atributos-de-calidad.md), [restricciones](docs/01-analisis-de-sistema/05-restricciones.md), [drivers](docs/01-analisis-de-sistema/06-drivers-arquitectonicos.md), [decisiones](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md) y [escenarios](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md). |
| Arquitectura | [Vista general](docs/02-arquitectura-software/arquitectura-inicial.md), [estilo](docs/02-arquitectura-software/estilo-arquitectonico.md), [Clean Architecture](docs/02-arquitectura-software/enfoque-arquitectonico.md) y [componentes](docs/02-arquitectura-software/componentes-arquitectonicos.md). |
| Diseño | [Servicios y contratos](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md), [patrones](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md) y [principios](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md). |
| Especificación funcional | [Alcance](docs/04-especificacion-funcional/01-analisis-y-alcance.md), [diseño de servicios](docs/04-especificacion-funcional/02-arquitectura-y-diseno.md), [publicidad y gratuidad](docs/04-especificacion-funcional/03-publicidad-y-periodo-gratuito.md), [acceso del turista](docs/04-especificacion-funcional/04-acceso-del-turista.md) y [categorías, fotos, eventos y camping](docs/04-especificacion-funcional/05-catalogo-eventos-y-actividades.md) y [likes, comentarios y respuestas](docs/04-especificacion-funcional/06-interaccion-social.md). |
| Modelo C4 | [Guía de lectura](modelo-c4/README.md), [despliegue e infraestructura](modelo-c4/Despliegue-e-infraestructura.md), [Contexto](modelo-c4/Nivel1-DiagramadeContextodelSistema.md), [contenedores](modelo-c4/Nivel2-DiagramadeContenedores.md), [componentes](modelo-c4/Nivel3-DiagramadeComponentes.md) y [clases conceptuales](modelo-c4/Nivel4-DiagramadeCodigo.md). |
| SDD | [Diseño detallado](docs/05-sdd/README.md): servicios/capas/SOLID, datos Supabase, contratos, flujos, interfaz, seguridad y operación. |
| Referencias | [Fuentes](docs/fuentes/README.md) y [consideraciones tecnológicas](tecnologia/README.md). |

## Límites y estado

El repositorio contiene la documentación de análisis y diseño y una implementación funcional de Identidad, Catálogo, Comunidad, Eventos y el asistente Willaq Uma, con pruebas unitarias, de integración, End to End, de carga y CI/CD. Los lugares cargados son datos de demostración identificados en la interfaz. El [SDD](docs/05-sdd/README.md) define Supabase, Docker, Cloudflare, Gemini y las propuestas técnicas complementarias; hosting, capacidad y versiones exactas se concretarán antes de implementar. Las metas de calidad son propuestas para validar.

LlegueYa no vende ni cobra entradas, no realiza reservas ni emite QR. Orienta hacia enlaces de venta verificados. Los pagos externos de publicidad se registran y revisan administrativamente; no se incorpora pasarela automática. La bandeja de avisos es web y el canal de correo queda por definir. No se incluyen WhatsApp ni Telegram.

## Equipo y curso

- LLALLAHUI GOMEZ, Cristian Mier — 27222118.
- ATAO HUAMAN, Yordi Ajeo — 27222121.

Arquitectura de Software (IS-488), Escuela Profesional de Ingeniería de Sistemas, UNSCH. Docente: Ing. Lizbeth Jaico Quispe. Semestre 2026-II.
