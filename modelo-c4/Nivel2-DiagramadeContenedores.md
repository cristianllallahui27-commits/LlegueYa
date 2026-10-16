# Nivel 2 - Diagrama de contenedores

Arquitectura distribuida orientada a servicios de negocio. Cada servicio tiene despliegue, almacenamiento y credenciales propios; puede compartir servidor físico de datos sin compartir tablas ni transacciones. La entrada API enruta; cada servicio ejecuta su lógica y valida permisos.

```mermaid
flowchart TB
    Web["Aplicación web"] --> Gateway["Entrada API"]
    Gateway --> I["Servicio Identidad"]
    Gateway --> C["Servicio Catálogo y proveedores"]
    Gateway --> M["Servicio Comunidad y contenido"]
    Gateway --> E["Servicio Eventos y notificaciones"]
    Gateway --> P["Servicio Publicidad y planes"]
    Gateway --> R["Servicio Recomendaciones y paquetes"]
    Gateway --> A["Servicio Asistente turístico"]
    I --> DI[("Datos Identidad")]
    C --> DC[("Datos Catálogo")]
    M --> DM[("Datos Comunidad")]
    E --> DE[("Datos Eventos")]
    P --> DP[("Datos Publicidad")]
    R --> DR[("Datos Recomendaciones")]
    A --> DA[("Datos Asistente / conocimiento")]
    A --> R
    A --> P
    A --> E
    A --> IA["Proveedor de IA"]
    R --> C
    P --> C
    P -->|Validar objetivo evento| E
    M --> C
    M -->|Validar fotos de eventos| E
    C --> Bus["Transporte durable de eventos"]
    M --> Bus
    E --> Bus
    P --> Bus
    Bus --> E
    Bus --> R
    Bus --> A
    Bus --> P
    C --> FC["Archivos Catálogo: galerías y expedientes separados"]
    M --> FM["Archivos Comunidad: portadas públicas y galerías autorizadas"]
    E --> FE["Archivos Eventos: fotos con acceso por estado y sesión"]
    P --> FP["Archivos Publicidad: comprobantes privados"]
    FC --> CDN["CDN: solo derivados públicos"]
    FM --> CDN
    FE --> CDN
    Web --> CDN
    C --> Mapas["Mapas"]
    E -.-> Correo["Correo opcional"]
```

Eventos y Publicidad incluyen ejecutores programados de tareas persistidas, con coordinación entre réplicas. Consultas inmediatas usan REST; cambios usan eventos con outbox, idempotencia y versiones. CDN sirve portadas públicas y derivados con autorización cuando pertenecen al detalle; nunca publica expedientes ni comprobantes. La API separa vista previa y ficha autenticada; el bot usa la misma política. La redirección de entradas se hace desde el navegador.

No se seleccionan tecnologías, nube ni orquestador. Esta distribución implica operación, seguridad y fallos de red por servicio. [Detalle de contratos y consistencia](../docs/04-especificacion-funcional/02-arquitectura-y-diseno.md).