# C4 del proyecto: C2, contenedores de LlegueYa

![C4 del proyecto · C2-A: aplicaciones y bases de datos](diagramas/c2a-aplicaciones-datos.svg)
![C4 del proyecto · C2-B: colaboración e integraciones](diagramas/c2b-colaboraciones.svg)
![C4 del proyecto · C2-C: mensajería y archivos](diagramas/c2c-mensajeria-archivos.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

**Alcance:** aplicaciones y almacenes dentro de LlegueYa y sus integraciones. **Público:** arquitectura y desarrollo. **Estado:** diseño sin implementación. El estilo es distribuido orientado a servicios de negocio; Clean Architecture se aplica dentro de cada API de negocio. C2 no mezcla componentes internos ni servidores físicos.

El asterisco (*) señala tecnologías candidatas pendientes del SDD. No fija una elección. Un contenedor C4 es una unidad de aplicación o un almacén de datos; Docker es una opción de despliegue distinta.

## C2-A: aplicaciones y propiedad de bases de datos

Vista estructural completa de las aplicaciones y sus siete bases lógicas. Las colaboraciones, mensajería y archivos se detallan en C2-B y C2-C.

```mermaid
flowchart TB
    U["Turista / Proveedor / Administrador<br/>[Personas de C1]"]
    subgraph LY["LlegueYa — límite del sistema de software"]
      WEB["WEB · Aplicación web<br/>[Contenedor: HTML/CSS/JavaScript*]<br/>Tarjetas, detalle, muro, calendario y paneles"]
      GW["GW · Entrada API<br/>[Contenedor: Nginx*]<br/>Enruta solicitudes y limita tráfico"]
      I["I · Identidad y acceso<br/>[Contenedor API: Python/FastAPI*]<br/>Cuenta, sesión y roles"]
      C["C · Catálogo y proveedores<br/>[Contenedor API: Python/FastAPI*]<br/>Lugares, negocios, ofertas y categorías"]
      M["M · Comunidad y contenido<br/>[Contenedor API: Python/FastAPI*]<br/>Experiencias, fotos, likes e hilos"]
      E["E · Eventos y notificaciones<br/>[Contenedor API: Python/FastAPI*]<br/>Calendario, propuestas y avisos"]
      P["P · Publicidad y planes<br/>[Contenedor API: Python/FastAPI*]<br/>Gratuidad, pagos revisados y campañas"]
      R["R · Recomendaciones y paquetes<br/>[Contenedor API: Python/FastAPI*]<br/>Compatibilidad familiar y presupuesto"]
      A["A · Asistente turístico<br/>[Contenedor API: Python/FastAPI*]<br/>Conversación y contexto autorizado"]
      DI[("DI · BD Identidad<br/>[Contenedor de datos: PostgreSQL*]<br/>Usuarios, credenciales, roles y sesiones")]
      DC[("DC · BD Catálogo<br/>[Contenedor de datos: PostgreSQL*]<br/>Destinos, negocios, ofertas, propuestas y categorías")]
      DM[("DM · BD Comunidad<br/>[Contenedor de datos: PostgreSQL*]<br/>Publicaciones, fotos, likes, comentarios y moderación")]
      DE[("DE · BD Eventos<br/>[Contenedor de datos: PostgreSQL*]<br/>Eventos, suscripciones, tareas y notificaciones")]
      DP[("DP · BD Publicidad<br/>[Contenedor de datos: PostgreSQL*]<br/>Políticas, beneficios, planes, pagos, campañas y métricas")]
      DR[("DR · BD Recomendaciones<br/>[Contenedor de datos: PostgreSQL*]<br/>Proyecciones y propuestas personales guardadas")]
      DA[("DA · BD Asistente<br/>[Contenedor de datos: PostgreSQL*]<br/>Conversaciones y conocimiento autorizado")]
      WEB -->|"Solicita operaciones / HTTPS + JSON"| GW
      GW -->|"Enruta cuenta y sesión / HTTPS + JSON"| I
      GW -->|"Enruta catálogo / HTTPS + JSON"| C
      GW -->|"Enruta muro e hilos / HTTPS + JSON"| M
      GW -->|"Enruta calendario y avisos / HTTPS + JSON"| E
      GW -->|"Enruta campañas y planes / HTTPS + JSON"| P
      GW -->|"Enruta planificación / HTTPS + JSON"| R
      GW -->|"Enruta conversación / HTTPS + JSON"| A
      I -->|"Lee y escribe datos propios / SQL*"| DI
      C -->|"Lee y escribe datos propios / SQL*"| DC
      M -->|"Lee y escribe datos propios / SQL*"| DM
      E -->|"Lee y escribe datos propios / SQL*"| DE
      P -->|"Lee y escribe datos propios / SQL*"| DP
      R -->|"Lee y escribe datos propios / SQL*"| DR
      A -->|"Lee y escribe datos propios / SQL*"| DA
    end
    U -->|"Explora o actúa con su rol / HTTPS"| WEB
    classDef app fill:#dbeafe,stroke:#21609c,color:#17243a;
    classDef data fill:#fff2cc,stroke:#927400,color:#17243a;
    class WEB,GW,I,C,M,E,P,R,A app;
    class DI,DC,DM,DE,DP,DR,DA data;
```

**Leyenda C2-A:** rectángulos azules = contenedores de aplicación; cilindros amarillos = contenedores de datos; marco = límite de LlegueYa; flecha continua = solicitud o acceso iniciado por el origen. Todos los servicios validan sesión, rol y propiedad. La entrada API no sustituye esa autorización.

### Inventario de almacenamiento

| ID | Dueño exclusivo | Información y restricciones |
|---|---|---|
| DI | Identidad y acceso | Credenciales protegidas, usuarios, roles y sesiones. Ningún otro servicio lee sus tablas. |
| DC | Catálogo y proveedores | Fichas, ofertas/paquetes comerciales, categorías acreditadas, favoritos y referencias a documentos privados. |
| DM | Comunidad y contenido | Publicaciones, metadatos de fotos, comentarios con padre/raíz, likes únicos y decisiones de moderación. |
| DE | Eventos y notificaciones | Propuestas, eventos/versiones, suscripciones, bandeja, recordatorios persistidos y entregas. |
| DP | Publicidad y planes | Política versionada, beneficio único por negocio, condiciones de contratación, pagos, campañas y cuotas. |
| DR | Recomendaciones y paquetes | Proyecciones de consulta y planes personales. No reemplaza el catálogo fuente. |
| DA | Asistente turístico | Conversaciones y conocimiento/indexación propios. No almacena una copia indiscriminada de expedientes. |
| BUS | Infraestructura de mensajería | Mensajes durables y reintentos. No sustituye bases ni autoriza campañas. |
| OBJ | Almacenamiento de objetos | Binarios de fotos, galerías y evidencias con ámbitos de acceso separados. Las bases guardan metadatos y referencias. |

DI-DA representan **siete bases lógicas propuestas**, no siete servidores obligatorios. El SDD decidirá si comparten una instancia física de PostgreSQL o usan instancias separadas. Se mantienen credenciales y permisos exclusivos, transacciones locales y ausencia de joins, claves foráneas o acceso directo entre bases. Compartir una instancia exige evaluar el riesgo operativo común. No existe una base principal compartida por todos los servicios.

## C2-B: colaboración síncrona e integraciones

Proyección de C2. Se omiten WEB, GW y las bases, visibles en C2-A; no se agregan componentes internos.

```mermaid
flowchart LR
    subgraph LY["LlegueYa — colaboración entre contenedores API"]
      A["A · Asistente turístico<br/>[Contenedor API: Python/FastAPI*]<br/>Respuestas y contexto autorizado"]
      R["R · Recomendaciones y paquetes<br/>[Contenedor API: Python/FastAPI*]<br/>Compatibilidad y cálculo"]
      P["P · Publicidad y planes<br/>[Contenedor API: Python/FastAPI*]<br/>Selección de patrocinio elegible"]
      C["C · Catálogo y proveedores<br/>[Contenedor API: Python/FastAPI*]<br/>Fuente de lugares y ofertas"]
      E["E · Eventos y notificaciones<br/>[Contenedor API: Python/FastAPI*]<br/>Fuente de eventos y avisos"]
      M["M · Comunidad y contenido<br/>[Contenedor API: Python/FastAPI*]<br/>Experiencias vinculadas"]
      A -->|"Pide opciones por grupo y presupuesto / HTTPS JSON"| R
      A -->|"Pide anuncios compatibles / HTTPS JSON"| P
      A -->|"Consulta calendario y estado / HTTPS JSON"| E
      R -->|"Consulta precios y ofertas vigentes / HTTPS JSON"| C
      R -->|"Solicita patrocinio para candidatos compatibles / HTTPS JSON"| P
      P -->|"Valida anunciante, oferta, paquete o lugar / HTTPS JSON"| C
      P -->|"Valida evento y organizador / HTTPS JSON"| E
      M -->|"Valida lugar o servicio vinculado / HTTPS JSON"| C
      M -->|"Valida evento vinculado / HTTPS JSON"| E
    end
    MAP["Mapas<br/>[Sistema externo]<br/>Proveedor por definir"]
    IA["IA<br/>[Sistema externo]<br/>Proveedor por definir"]
    MAIL["Correo<br/>[Sistema externo opcional]<br/>Proveedor por definir"]
    C -->|"Consulta cartografía y ubicación / HTTPS"| MAP
    A -->|"Solicita generación con contexto autorizado / HTTPS"| IA
    E -->|"Solicita aviso elegido / protocolo por definir"| MAIL
```

**Leyenda C2-B:** marco = sistema LlegueYa; rectángulo marcado API = contenedor propio; rectángulo marcado sistema externo = dependencia fuera del sistema; flecha continua = llamada iniciada por el origen. La respuesta queda implícita. Identidad emite la información de autenticación y cada API la valida según el contrato de sesión/token que definirá el SDD. No se presupone una llamada a Identidad en cada operación.

El navegador abre enlaces externos de entradas. El pago publicitario ocurre fuera y se revisa manualmente: no hay una llamada API desde LlegueYa al medio de pago. Esas relaciones humanas permanecen en C1.

## C2-C: eventos durables y archivos

Vista complementaria de los mismos contenedores. BUS y OBJ están bajo responsabilidad operativa de LlegueYa, aunque el SDD puede contratar servicios administrados.

```mermaid
flowchart LR
    subgraph LY["LlegueYa — integración asíncrona y medios"]
      C["C · Catálogo y proveedores<br/>[Contenedor API: Python/FastAPI*]"]
      M["M · Comunidad y contenido<br/>[Contenedor API: Python/FastAPI*]"]
      E["E · Eventos y notificaciones<br/>[Contenedor API: Python/FastAPI*]"]
      P["P · Publicidad y planes<br/>[Contenedor API: Python/FastAPI*]"]
      R["R · Recomendaciones y paquetes<br/>[Contenedor API: Python/FastAPI*]"]
      A["A · Asistente turístico<br/>[Contenedor API: Python/FastAPI*]"]
      BUS["BUS · Mensajería durable<br/>[Contenedor: RabbitMQ*]<br/>Transporta cambios versionados"]
      OBJ[("OBJ · Almacén de objetos<br/>[Contenedor de datos: tecnología por definir]<br/>Fotos públicas, galerías autorizadas y evidencias privadas")]
      WEB["WEB · Aplicación web<br/>[Contenedor: HTML/CSS/JavaScript*]"]
      C -.->|"Publica alta/retiro y elegibilidad / AMQP*"| BUS
      M -.->|"Publica moderación y retiro / AMQP*"| BUS
      E -.->|"Publica cambio/cancelación / AMQP*"| BUS
      P -.->|"Publica campaña y vencimiento / AMQP*"| BUS
      BUS -.->|"Entrega cambios para avisos / AMQP*"| E
      BUS -.->|"Entrega invalidaciones / AMQP*"| P
      BUS -.->|"Entrega cambios de proyección / AMQP*"| R
      BUS -.->|"Entrega cambios de conocimiento / AMQP*"| A
      C -->|"Guarda/lee galerías y expedientes en su ámbito / HTTPS"| OBJ
      M -->|"Guarda/lee fotos en su ámbito / HTTPS"| OBJ
      E -->|"Guarda/lee fotos de eventos en su ámbito / HTTPS"| OBJ
      P -->|"Guarda/lee comprobantes privados en su ámbito / HTTPS"| OBJ
      WEB -->|"Obtiene archivo autorizado con URL temporal / HTTPS"| OBJ
    end
    CDN["CDN contratado<br/>[Sistema externo por definir]<br/>Distribuye derivados públicos aprobados"]
    CDN -->|"Obtiene derivados públicos del origen / HTTPS"| OBJ
    WEB -->|"Solicita portadas públicas / HTTPS"| CDN
```

**Leyenda C2-C:** flechas discontinuas = publicación o entrega de mensajes, dirección productor-broker-consumidor; continuas = operación de archivos; cilindro = almacén. La entrega del broker presupone suscripción del consumidor. Los componentes de outbox/inbox pertenecen al interior de sus servicios y a sus bases locales, no son contenedores separados en esta vista.

La CDN es infraestructura de entrega y no una capacidad de negocio independiente en C1. Solo sirve derivados públicos aprobados. Una galería restringida necesita sesión y autorización mediante el servicio dueño antes de emitir URL temporal. Expedientes y comprobantes se entregan únicamente con autorización por rol/propiedad. El frontend no recibe credenciales del almacén.

Eventos y Publicidad incluyen tareas programadas persistidas y coordinación entre réplicas; no se presume un nuevo microservicio para cada tarea. Outbox transaccional, inbox, versiones e idempotencia toleran duplicados y desorden. Las consultas usan límites de tiempo. Si Publicidad no confirma elegibilidad actual, omite el anuncio.

El detalle de contratos y escenarios está en [arquitectura y diseño](../docs/04-especificacion-funcional/02-arquitectura-y-diseno.md). La distribución física pertenece a [despliegue e infraestructura](Despliegue-e-infraestructura.md). Referencias metodológicas: Mezzalira, pp. 8-11, 14-15 y 24-32; Diagramas C4, pp. 4-13.
