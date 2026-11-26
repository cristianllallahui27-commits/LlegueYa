# Despliegue e infraestructura de LlegueYa

![LlegueYa · infraestructura y despliegue propuestos](diagramas/despliegue.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

Vista complementaria a C4. Las mediciones de la primera versión (réplicas, caída de un backend y carga) están en [Sprint 2](../docs/07-sprint2/07-validacion-atributos-calidad.md). La ubicación física no cambia las responsabilidades de C2. Clean Architecture se mantiene dentro de cada servicio.

```mermaid
flowchart TB
    B["Dispositivo del usuario<br/>Navegador / aplicación WEB"]
    CF["Cloudflare<br/>Borde DNS, HTTPS, CDN público y protección según plan"]
    subgraph EDGE["Origen WEB y entrada API — alojamiento/capacidad por definir"]
      TLS["HTTPS y entrada API GW<br/>Nginx*; límites de tráfico y enrutamiento"]
      STATIC["Publicación de archivos WEB<br/>HTML/CSS/JavaScript*"]
    end
    subgraph APP["Red privada de aplicaciones — uno o más nodos por definir"]
      S["Procesos independientes I, C, M, E, P, R y A<br/>Python/FastAPI*; empaquetado Docker elegido<br/>Tareas persistidas dentro de E y P"]
    end
    subgraph DATA["Zona de datos — acceso restringido"]
      DB[("Supabase PostgreSQL gestionado<br/>Una base con siete esquemas privados<br/>Roles y pools limitados por servicio")]
      BUS["Mensajería BUS<br/>RabbitMQ* y almacenamiento durable"]
      OBJ[("Supabase Storage OBJ<br/>Fotos, galerías y evidencias con políticas separadas")]
      BACKUP[("Copias de seguridad cifradas<br/>Retención y recuperación por definir")]
    end
    OBS["Observabilidad de procesos y solicitudes<br/>Herramientas y alojamiento por definir"]
    EXT["Gemini y Supabase Auth<br/>Correo opcional por definir"]
    MAP["Teselas OpenStreetMap<br/>Proveedor configurable; sin GPS del usuario"]
    B -->|"Accede al dominio / HTTPS"| CF
    CF -->|"Entrega interfaz pública / HTTPS"| STATIC
    CF -->|"Enruta operaciones sin caché privada / HTTPS"| TLS
    B -->|"WEB carga cartografía / HTTPS"| MAP
    TLS -->|"Enruta al servicio solicitado / HTTPS JSON"| S
    S -->|"Cada servicio usa solo su esquema / SQL TLS"| DB
    S <-->|"Publicación y entrega / AMQP*"| BUS
    S -->|"Archivos según autorización / HTTPS"| OBJ
    S -->|"Exporta logs, métricas y trazas"| OBS
    S -->|"Solicita capacidades externas / HTTPS o protocolo acordado"| EXT
    DB -->|"Genera respaldo para recuperación"| BACKUP
    OBJ -->|"Respalda originales y evidencia según retención"| BACKUP
```

**Leyenda:** marco = zona de despliegue propuesta, no contenedor C4; caja = proceso o recurso operativo; cilindro = almacenamiento. (*) indica candidato. No representa un clúster ya implementado. Una instancia física inicial compartida implica un fallo común y no sustituye aislamiento de permisos. La alta disponibilidad requiere concretar réplicas, recuperación y presupuesto.

Cloudflare CDN distribuye únicamente derivados públicos de OBJ; galerías completas y evidencia privada se sirven mediante la API dueña con autorización actual. Las credenciales y claves se gestionan fuera de repositorios y del navegador. El SDD precisa topología y controles, con RPO/RTO propuestos y pendientes externos en sus capítulos 09–10.

## Razones de la propuesta

La carga de lectura, fotos y conversación es distinta: la separación permite replicar Comunidad o Asistente según demanda. El almacenamiento de objetos evita guardar binarios voluminosos en tablas transaccionales. El transporte durable desacopla cambios y recordatorios. Los esquemas y permisos propios evitan que una función modifique tablas de otra; la instancia gestionada conserva un riesgo común de disponibilidad. Esta elección exige más operación, contratos y manejo de fallos parciales; no implica adoptar la infraestructura de Facebook o Instagram.

[Diseño operativo y límites de caché](../docs/05-sdd/09-despliegue-y-operacion.md).
