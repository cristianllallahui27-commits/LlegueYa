# Fuentes, alcance y pendientes del primer entregable

## Material utilizado

| Fuente | Uso en LlegueYa |
|---|---|
| [llegueYa_ARQUITECTURA.pdf](llegueYa_ARQUITECTURA.pdf), 11 páginas | Contexto turístico, propuesta inicial, proveedores, paquetes y chatbot. Las cifras se atribuyen al documento; no se han auditado sus fuentes externas ni actualizado los datos. |
| [GUIA-004-ASF.pdf](GUIA-004-ASF.pdf), 13 páginas | Estructura documental (pp. 7-8), escenarios de calidad (pp. 9-11), componentes y diseño (pp. 11-12), y exposición del primer sprint (p. 13). |
| Análisis y arquitectura existentes en LlegueYa, commit `3cb5559` | Alcance posterior, HU01-HU19, RF01-RF21, AC01-AC07, RC01-RC13, DA01-DA11 y ADR-001-ADR-009. También se conservan los recursos locales de arquitectura existentes aún sin commit. |
| [Ejemplo de diseño de la docente](https://github.com/devlizbethjaico/Marketplace-arquitSoft-02/tree/main/docs/03-dise%C3%B1o-de-software/dise%C3%B1o-interno) | Organización de los tres documentos y separación de responsabilidades. No se trasladan pedidos, pagos, ERP ni su stack a LlegueYa. |
| Capturas y nombres de archivos compartidos por el equipo | Referencia visual de las secciones 01-04 y los tres archivos de diseño interno. Se usa `docs`, como indica la guía. |

Los PDF se conservan como fuentes, sin modificar su contenido. Sus indicaciones académicas describen el trabajo de referencia; el alcance de este cambio sigue la petición del equipo: secciones 1, 2 y 3, dejando la 4 al colaborador.

## Diferencias entre la propuesta inicial y el alcance actual

| Tema | PDF inicial | Alcance posterior documentado y utilizado |
|---|---|---|
| Entradas | Venta, QR antifraude y validación de ingreso (pp. 5-9, 11). | Orientación al punto de venta presencial o enlace virtual; sin venta, cobro ni QR (RC05; ADR-006). |
| Aforo / grupos | Cupos, personal de control y reserva por operador (pp. 6-10). | No incluidos. Actores actuales: turista, proveedor y administrador. |
| Chatbot | Mezcla web y WhatsApp/Telegram (pp. 6, 10-11); orientación web en p. 9. | Solo web (RC01 y RC10), con información turística propia. |
| Despliegue | Servicios separados y herramientas como Kubernetes, Redis o brokers (pp. 6-8, 10-11). | Monolito modular (ADR-001). Herramientas citadas son opciones históricas, no tecnologías aprobadas o instaladas. |
| Contenido social/cultural | No detalla todos los flujos del alcance posterior. | Reseñas, fotos, historias, fotografías y libros se sustentan en HU05-HU11, HU18-HU19 y RF06-RF12/RF20-RF21 existentes. |

El monolito modular y Clean Architecture son propuestas del equipo registradas en ADR; no se presenta el proyecto como construido ni se atribuye a la guía una elección de framework para LlegueYa.

## Pendientes explícitos

- Aprobar metas, carga y entorno de EQ-01-EQ-07; no hay pruebas de rendimiento o disponibilidad ejecutadas.
- Elegir lenguaje, framework, motor de datos, alojamiento y proveedores de mapas, IA y almacenamiento.
- Confirmar correo (RC09), destinatarios y política de avisos.
- Validar autorización de contenido sugerida (RC11), vigencia documental y permisos detallados.
- Precisar si la moderación ocurre antes o después de publicar, escala de puntuación y reglas de fotos.
- Actualizar fechas/horarios/precios con fuentes oficiales antes de mostrarlos como vigentes. RC12 es una referencia estacional del material inicial; las fechas variables de Carnaval y Semana Santa no equivalen a un calendario fijo aprobado para cada año.
- Definir invalidación de caché y contratos del chatbot; no recomendar ofertas inelegibles ni presentar precios inventados.
- Integrar `04-modelo-c4` del colaborador mediante el flujo Git del equipo. Este cambio no crea ni modifica esa sección.

## Revisión de la guía

| Actividad | Evidencia |
|---|---|
| Reorganizar documentación y recursos tecnológicos | Carpetas `docs` y `tecnologia`; índice raíz actualizado. |
| Escenarios medibles por atributo | `01-analisis-de-sistema/08-escenarios-atributos-calidad.md`, siete escenarios con las seis partes. |
| Componentes e imagen en Markdown | `02-arquitectura-software/componentes-arquitectonicos.md` y `docs/img/componentes-arquitectonicos.png`. |
| Diseño interno, patrones y SOLID | Tres archivos en `03-diseño-de-software/diseño-interno`. |
| Modelo C4 | Pendiente del colaborador, según reparto del equipo. |
| Ejemplo tecnológico | Pseudocódigo en `tecnologia`; sin afirmar stack elegido ni aplicación ejecutable. |
| Exposición | La guía establece 12 minutos por equipo, participación de todo el equipo y trazabilidad de componentes a requisitos. No se declara completo el sprint mientras falte C4. |
