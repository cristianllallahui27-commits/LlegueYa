# C4 del proyecto LlegueYa

Diseño documental de una plataforma turística de Ayacucho. El estilo global es **distribuido orientado a servicios de negocio**, con siete servicios desplegables de forma independiente. **Clean Architecture** organiza el interior de cada servicio. C4 comunica esas decisiones con distintos niveles de ampliación; no es un estilo arquitectónico ni exige un producto tecnológico.

| Vista | Alcance y público | Elementos |
|---|---|---|
| [C1: contexto](Nivel1-DiagramadeContextodelSistema.md) | LlegueYa completo. Negocio y equipo técnico. | Personas, un sistema de interés y sistemas externos. |
| [C2: contenedores](Nivel2-DiagramadeContenedores.md) | Interior de LlegueYa. Equipo de arquitectura y desarrollo. | Web, entrada API, siete servicios, siete bases de datos lógicas, mensajería y archivos. |
| [C3: componentes](Nivel3-DiagramadeComponentes.md) | Interior del contenedor Publicidad y planes. Desarrollo. | Controlador, casos de uso y adaptadores. Las bases de datos y otros contenedores quedan fuera de este límite. |
| [C4: clases conceptuales](Nivel4-DiagramadeCodigo.md) | Componente Selección de anuncios de Publicidad. Desarrollo. | Clases, interfaces y dependencias de diseño. No representa código implementado. |
| [Despliegue](Despliegue-e-infraestructura.md) | Distribución operativa propuesta. Operación y arquitectura. | Nodos de ejecución, red, persistencia, archivos y recuperación. Es una vista complementaria, no un quinto nivel. |

## Diagramas gráficos y editables

[Visor local HTML](diagramas/index.html) con ocho vistas ampliables y [archivo Draw.io multipágina](diagramas/LlegueYa-C4.drawio). Cada nivel también contiene SVG y Mermaid. Las vistas complementarias de Clean Architecture y despliegue se identifican como tales.

## Convenciones

Cada gráfico declara título, alcance y estado de diseño. Las cajas identifican nombre, tipo y responsabilidad. En C2 y C3 se añade tecnología propuesta, cuando existe. Los cilindros son contenedores de datos. Los subgráficos marcan límites, nunca implican por sí solos un proceso. Las flechas indican quién inicia una interacción y contienen verbo, propósito y protocolo cuando corresponde. La respuesta de una llamada queda implícita.

Los IDs WEB, GW, I, C, M, E, P, R, A, DI, DC, DM, DE, DP, DR, DA, BUS y OBJ se conservan entre vistas. Un mismo servicio se dibuja como contenedor en C2 y como límite de componentes en C3. Las personas y sistemas externos no cambian de identidad al ampliar el modelo.

**Leyenda:** persona = actor humano; sistema externo = software fuera de LlegueYa; rectángulo = aplicación o componente según el nivel declarado; cilindro = almacén; flecha continua = llamada o lectura/escritura iniciada en origen; flecha discontinua = publicación/consumo de eventos o implementación de interfaz, según la leyenda específica. Los textos también expresan el tipo: el color no es la única señal.

**Estado tecnológico:** el asterisco (*) identifica candidatos pendientes del SDD: Python/FastAPI, PostgreSQL, RabbitMQ y Nginx. HTML/CSS/JavaScript describe la opción de web propuesta. No se aprueba un stack ni se incluye PHP o Node.js. Proveedores de IA, mapas, correo, objetos y CDN quedan por definir.

Las vistas C2 se separan por propósito para mantener legibilidad. C2-A muestra todas las aplicaciones y bases propias; C2-B muestra colaboración y sistemas externos; C2-C muestra eventos y archivos. Deben leerse juntas. El inventario y las tablas de relaciones completan el modelo y evitan interpretar una vista parcial como todo el sistema.

## Criterios de lectura

La base de datos no se dibuja en C1 porque pertenece al interior del sistema. En C2 aparece al mismo nivel de abstracción que las aplicaciones. En C3 queda fuera del servicio que se amplía. En C4 se describen clases e interfaces, no servidores ni tablas del despliegue. Un contenedor C4 puede ser una aplicación o almacén de datos; no equivale obligatoriamente a un contenedor Docker.

Referencias: [fuentes y páginas aplicadas](../docs/fuentes/README.md). Las recomendaciones académicas orientan la representación; el alcance y los ADR de LlegueYa determinan el diseño.
