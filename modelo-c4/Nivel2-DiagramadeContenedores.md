# C4 del proyecto: C2, contenedores de LlegueYa

![C4 del proyecto · C2-A: aplicaciones y bases de datos](diagramas/c2a-aplicaciones-datos.svg)
![C4 del proyecto · C2-B: colaboración e integraciones](diagramas/c2b-colaboraciones.svg)
![C4 del proyecto · C2-C: mensajería y archivos](diagramas/c2c-mensajeria-archivos.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

**Alcance:** aplicaciones y almacenes dentro de LlegueYa y sus integraciones. **Público:** arquitectura y desarrollo. **Estado:** diseño sin implementación. El estilo es distribuido orientado a servicios de negocio; Clean Architecture se aplica dentro de cada API de negocio. C2 no mezcla componentes internos ni servidores físicos.

Supabase, Docker, Cloudflare y Gemini integran la línea base. (*) distingue propuestas técnicas complementarias documentadas en el SDD. Un contenedor C4 es una unidad de aplicación o un almacén de datos; Docker es una opción de despliegue distinta.

## C2-A: aplicaciones y propiedad de bases de datos

Vista estructural completa de las aplicaciones y una base Supabase con siete esquemas. Las colaboraciones, mensajería y archivos se detallan en C2-B y C2-C.

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
      DB[("DB · Supabase PostgreSQL<br/>[Contenedor de datos gestionado]<br/>Esquemas identidad, catalogo, comunidad, eventos,<br/>publicidad, recomendaciones y asistente")]
      WEB -->|"Solicita operaciones / HTTPS + JSON"| GW
      GW -->|"Enruta cuenta y sesión / HTTPS + JSON"| I
      GW -->|"Enruta catálogo / HTTPS + JSON"| C
      GW -->|"Enruta muro e hilos / HTTPS + JSON"| M
      GW -->|"Enruta calendario y avisos / HTTPS + JSON"| E
      GW -->|"Enruta campañas y planes / HTTPS + JSON"| P
      GW -->|"Enruta planificación / HTTPS + JSON"| R
      GW -->|"Enruta conversación / HTTPS + JSON"| A
      I -->|"Lee/escribe solo esquema identidad / SQL TLS"| DB
      C -->|"Lee/escribe solo esquema catalogo / SQL TLS"| DB
      M -->|"Lee/escribe solo esquema comunidad / SQL TLS"| DB
      E -->|"Lee/escribe solo esquema eventos / SQL TLS"| DB
      P -->|"Lee/escribe solo esquema publicidad / SQL TLS"| DB
      R -->|"Lee/escribe solo esquema recomendaciones / SQL TLS"| DB
      A -->|"Lee/escribe solo esquema asistente / SQL TLS"| DB
    end
    U -->|"Explora o actúa con su rol / HTTPS"| WEB
    classDef app fill:#dbeafe,stroke:#21609c,color:#17243a;
    classDef data fill:#fff2cc,stroke:#927400,color:#17243a;
    class WEB,GW,I,C,M,E,P,R,A app;
    class DB data;
```

**Leyenda C2-A:** rectángulos azules = contenedores de aplicación; cilindros amarillos = contenedores de datos; marco = límite de LlegueYa; flecha continua = solicitud o acceso iniciado por el origen. Todos los servicios validan sesión, rol y propiedad. La entrada API no sustituye esa autorización.

### Inventario de almacenamiento

| ID | Dueño exclusivo | Información y restricciones |
|---|---|---|
| DI | Identidad y acceso | Perfil, roles y sesiones; contraseñas gestionadas exclusivamente por Supabase Auth. Ningún otro servicio lee sus tablas. |
| DC | Catálogo y proveedores | Fichas, ofertas/paquetes comerciales, categorías acreditadas, favoritos y referencias a documentos privados. |
| DM | Comunidad y contenido | Publicaciones, metadatos de fotos, comentarios con padre/raíz, likes únicos y decisiones de moderación. |
| DE | Eventos y notificaciones | Propuestas, eventos/versiones, suscripciones, bandeja, recordatorios persistidos y entregas. |
| DP | Publicidad y planes | Política versionada, beneficio único por negocio, condiciones de contratación, pagos, campañas y cuotas. |
| DR | Recomendaciones y paquetes | Proyecciones de consulta y planes personales. No reemplaza el catálogo fuente. |
| DA | Asistente turístico | Conversaciones y conocimiento/indexación propios. No almacena una copia indiscriminada de expedientes. |
| BUS | Infraestructura de mensajería | Mensajes durables y reintentos. No sustituye bases ni autoriza campañas. |
| OBJ | Almacenamiento de objetos | Binarios de fotos, galerías y evidencias con ámbitos de acceso separados. Las bases guardan metadatos y referencias. |

DB es un contenedor C4 de datos PostgreSQL gestionado por Supabase. DI–DA se conservan solo como referencia a propiedad por esquema, no como siete bases independientes. Se usan cuentas técnicas exclusivas, sin joins/FK de negocio entre esquemas ni transacciones globales. El proyecto comparte disponibilidad y capacidad; una separación física futura requiere otra decisión. [Datos, permisos y diccionario](../docs/05-sdd/04-datos-y-supabase.md).

## C2-B: colaboración síncrona e integraciones

Proyección de C2. Se omiten GW y la base, visibles en C2-A; WEB aparece por su relación con las teselas; no se agregan componentes internos.

```mermaid
flowchart LR
    subgraph LY["LlegueYa — colaboración entre contenedores API"]
      A["A · Asistente turístico<br/>[Contenedor API: Python/FastAPI*]<br/>Respuestas y contexto autorizado"]
      R["R · Recomendaciones y paquetes<br/>[Contenedor API: Python/FastAPI*]<br/>Compatibilidad y cálculo"]
      P["P · Publicidad y planes<br/>[Contenedor API: Python/FastAPI*]<br/>Selección de patrocinio elegible"]
      C["C · Catálogo y proveedores<br/>[Contenedor API: Python/FastAPI*]<br/>Fuente de lugares y ofertas"]
      E["E · Eventos y notificaciones<br/>[Contenedor API: Python/FastAPI*]<br/>Fuente de eventos y avisos"]
      M["M · Comunidad y contenido<br/>[Contenedor API: Python/FastAPI*]<br/>Experiencias vinculadas"]
      I["I · Identidad y acceso<br/>[Contenedor API: Python/FastAPI*]<br/>Perfil, sesión y permisos"]
      WEB["WEB · Aplicación web<br/>[Contenedor: Leaflet*]<br/>Mapa interactivo sin GPS"]
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
    SA["Supabase Auth<br/>[Sistema externo gestionado]<br/>Autenticación técnica"]
    I -->|"Autentica y renueva sesión / HTTPS"| SA
    MAP["Teselas OpenStreetMap<br/>[Sistema externo]<br/>Piloto sujeto a política"]
    IA["Gemini API<br/>[Sistema externo]<br/>Modelo configurable"]
    MAIL["Correo<br/>[Sistema externo opcional]<br/>Proveedor por definir"]
    WEB -->|"Carga teselas / HTTPS"| MAP
    A -->|"Solicita generación con contexto autorizado / HTTPS"| IA
    E -->|"Solicita aviso elegido / protocolo por definir"| MAIL
```

**Leyenda C2-B:** marco = sistema LlegueYa; rectángulo marcado API = contenedor propio; rectángulo marcado sistema externo = dependencia fuera del sistema; flecha continua = llamada iniciada por el origen. La respuesta queda implícita. Cada API valida el JWT y consulta el contexto vigente de I para operaciones protegidas, según el capítulo 05 del SDD. Esa relación transversal de autorización se describe aquí sin repetir todas las flechas en la proyección de colaboraciones de negocio; las vistas públicas no requieren esa consulta.

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
      OBJ[("OBJ · Supabase Storage<br/>[Contenedor de archivos gestionado]<br/>Fotos públicas, galerías autorizadas y evidencias privadas")]
      WEB["WEB · Aplicación web<br/>[Contenedor: HTML/CSS/JavaScript*]"]
      I["I · Identidad y acceso<br/>[Contenedor API: Python/FastAPI*]"]
      I -.->|"Publica cambios de perfil/cuenta / AMQP*"| BUS
      C -.->|"Publica alta/retiro y elegibilidad / AMQP*"| BUS
      M -.->|"Publica moderación y retiro / AMQP*"| BUS
      E -.->|"Publica cambio/cancelación / AMQP*"| BUS
      P -.->|"Publica campaña y vencimiento / AMQP*"| BUS
      BUS -.->|"Entrega cambios de cuenta para conciliación / AMQP*"| C
      BUS -.->|"Entrega cambios de autor y cuenta / AMQP*"| M
      BUS -.->|"Entrega cambios para avisos / AMQP*"| E
      BUS -.->|"Entrega invalidaciones / AMQP*"| P
      BUS -.->|"Entrega cambios de proyección / AMQP*"| R
      BUS -.->|"Entrega cambios de conocimiento / AMQP*"| A
      C -->|"Guarda/lee galerías y expedientes en su ámbito / HTTPS"| OBJ
      M -->|"Guarda/lee fotos en su ámbito / HTTPS"| OBJ
      E -->|"Guarda/lee fotos de eventos en su ámbito / HTTPS"| OBJ
      P -->|"Guarda/lee comprobantes privados en su ámbito / HTTPS"| OBJ
      WEB -->|"Ejemplo: pide galería de Catálogo con sesión / HTTPS"| C
    end
    CDN["Cloudflare CDN<br/>[Sistema externo elegido]<br/>Distribuye derivados públicos aprobados"]
    CDN -->|"Obtiene derivados públicos del origen / HTTPS"| OBJ
    WEB -->|"Solicita portadas públicas / HTTPS"| CDN
```

**Leyenda C2-C:** flechas discontinuas = publicación o entrega de mensajes, dirección productor-broker-consumidor; continuas = operación de archivos; cilindro = almacén. La entrega del broker presupone suscripción del consumidor. Los componentes de outbox/inbox pertenecen al interior de sus servicios y a sus bases locales, no son contenedores separados en esta vista.

La CDN es infraestructura de entrega y no una capacidad de negocio independiente en C1. Solo sirve derivados públicos aprobados. Una galería restringida se transmite por el servicio dueño tras validar sesión y estado; no se publica una URL reutilizable de acceso directo al original. Expedientes y comprobantes se entregan únicamente con autorización por rol/propiedad. El frontend no recibe credenciales del almacén.

La flecha de galería hacia C ilustra el caso de Catálogo. Galerías de Comunidad y Eventos usan el mismo contrato de acceso con M o E respectivamente, según la propiedad del objeto; no se enrutan mediante Catálogo para eludir esos límites.

Eventos y Publicidad incluyen tareas programadas persistidas y coordinación entre réplicas; no se presume un nuevo microservicio para cada tarea. Outbox transaccional, inbox, versiones e idempotencia toleran duplicados y desorden. Las consultas usan límites de tiempo. Si Publicidad no confirma elegibilidad actual, omite el anuncio.

El detalle de contratos y escenarios está en [arquitectura y diseño](../docs/04-especificacion-funcional/02-arquitectura-y-diseno.md). La distribución física pertenece a [despliegue e infraestructura](Despliegue-e-infraestructura.md). Referencias metodológicas: Mezzalira, pp. 8-11, 14-15 y 24-32; Diagramas C4, pp. 4-13.

[SDD: arquitectura](../docs/05-sdd/02-arquitectura-y-decisiones.md), [seguridad](../docs/05-sdd/08-seguridad.md) y [operación](../docs/05-sdd/09-despliegue-y-operacion.md).
