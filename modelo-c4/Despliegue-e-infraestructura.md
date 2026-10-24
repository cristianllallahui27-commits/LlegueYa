# Despliegue e infraestructura de LlegueYa

![LlegueYa · infraestructura y despliegue propuestos](diagramas/despliegue.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

Vista complementaria a C4. **Estado:** propuesta de diseño pendiente del SDD, sin servidores contratados ni mediciones. La ubicación física no cambia las responsabilidades de C2. Clean Architecture se mantiene dentro de cada servicio.

```mermaid
flowchart TB
    B["Dispositivo del usuario<br/>Navegador / aplicación WEB"]
    subgraph EDGE["Zona de acceso — proveedor y capacidad por definir"]
      TLS["HTTPS y entrada API GW<br/>Nginx*; límites de tráfico y enrutamiento"]
      STATIC["Publicación de archivos WEB<br/>HTML/CSS/JavaScript*"]
    end
    subgraph APP["Red privada de aplicaciones — uno o más nodos por definir"]
      S["Procesos independientes I, C, M, E, P, R y A<br/>Python/FastAPI*; empaquetado Docker* opcional<br/>Tareas persistidas dentro de E y P"]
    end
    subgraph DATA["Zona de datos — acceso restringido"]
      DB[("Motor relacional PostgreSQL*<br/>Bases lógicas DI, DC, DM, DE, DP, DR y DA<br/>Instancia compartida o separadas por decidir")]
      BUS["Mensajería BUS<br/>RabbitMQ* y almacenamiento durable"]
      OBJ[("Objetos OBJ<br/>Fotos, galerías y evidencias con políticas separadas")]
      BACKUP[("Copias de seguridad cifradas<br/>Retención y recuperación por definir")]
    end
    OBS["Observabilidad de procesos y solicitudes<br/>Herramientas y alojamiento por definir"]
    EXT["Mapas, IA y correo opcional<br/>Proveedores externos por definir"]
    B -->|"Descarga interfaz / HTTPS"| STATIC
    B -->|"Solicita operaciones / HTTPS"| TLS
    TLS -->|"Enruta al servicio solicitado / HTTPS JSON"| S
    S -->|"Cada servicio usa solo su base / SQL*"| DB
    S <-->|"Publicación y entrega / AMQP*"| BUS
    S -->|"Archivos según autorización / HTTPS"| OBJ
    S -->|"Exporta logs, métricas y trazas"| OBS
    S -->|"Solicita capacidades externas / HTTPS o protocolo acordado"| EXT
    DB -->|"Genera respaldo para recuperación"| BACKUP
    OBJ -->|"Respalda originales y evidencia según retención"| BACKUP
```

**Leyenda:** marco = zona de despliegue propuesta, no contenedor C4; caja = proceso o recurso operativo; cilindro = almacenamiento. (*) indica candidato. No representa un clúster ya implementado. Una instancia física inicial compartida implica un fallo común y no sustituye aislamiento de permisos. La alta disponibilidad requiere concretar réplicas, recuperación y presupuesto.

La CDN contratada distribuye únicamente derivados públicos de OBJ; galerías completas y evidencia privada requieren autorización. Las credenciales y claves se gestionan fuera de repositorios y del navegador. El equipo deberá definir ubicación, topología, cifrado, rotación de secretos, métricas, RPO/RTO y pruebas de restauración en el SDD.

## Razones de la propuesta

La carga de lectura, fotos y conversación es distinta: la separación permite replicar Comunidad o Asistente según demanda. El almacenamiento de objetos evita guardar binarios voluminosos en tablas transaccionales. El transporte durable desacopla cambios y recordatorios. Las bases propias evitan que una función modifique tablas de otra. Esta elección exige más operación, contratos y manejo de fallos parciales; no implica adoptar la infraestructura de Facebook o Instagram.
