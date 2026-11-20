# C4 del proyecto: C1, contexto de LlegueYa

![C4 del proyecto · C1: contexto](diagramas/c1-contexto.svg)

[Diagramas ampliables en navegador](diagramas/index.html) · [Archivo editable Draw.io](diagramas/LlegueYa-C4.drawio)

**Alcance:** un sistema de software para turismo, comunidad y publicidad en Ayacucho. **Público:** negocio y equipo técnico. **Estado:** diseño propuesto, sin implementación. C1 presenta personas y software externo, sin mostrar servicios internos ni bases de datos.

```mermaid
flowchart LR
    T["Turista<br/>[Persona]<br/>Explora sin cuenta; con sesión participa y personaliza"]
    PR["Proveedor turístico<br/>[Persona]<br/>Ofrece hospedaje, gastronomía, artesanía y actividades"]
    AD["Administrador / propietario<br/>[Persona]<br/>Aprueba contenido y gestiona promoción"]
    LY["LlegueYa<br/>[Sistema de software]<br/>Guía, catálogo, experiencias, eventos y publicidad"]
    MAP["Teselas OpenStreetMap<br/>[Sistema externo]<br/>Cartografía, sin GPS del usuario"]
    IA["Gemini API<br/>[Sistema externo]<br/>Generación de respuestas del asistente"]
    MAIL["Servicio de correo<br/>[Sistema externo opcional]<br/>Entrega avisos elegidos"]
    TK["Sitio de venta de entradas<br/>[Sistema externo]<br/>Gestiona su propia venta"]
    PAY["Medio de pago externo<br/>[Sistema externo por definir]<br/>Procesa pago fuera de LlegueYa"]
    T -->|"Consulta lugares y bot; comparte experiencias; propone eventos"| LY
    PR -->|"Publica ofertas y fotos; solicita campañas; presenta comprobante"| LY
    AD -->|"Modera; configura gratuidad, tarifas y revisa pagos"| LY
    LY -->|"Carga teselas para mapa interactivo / HTTPS"| MAP
    SA["Supabase Auth<br/>[Sistema externo gestionado]<br/>Autenticación técnica"]
    LY -->|"Autentica y renueva sesión / HTTPS"| SA
    LY -->|"Solicita respuesta con contexto autorizado / HTTPS"| IA
    LY -->|"Solicita entrega de aviso / protocolo por definir"| MAIL
    T -->|"Abre enlace verificado mostrado por LlegueYa / HTTPS"| TK
    PR -->|"Realiza pago publicitario fuera de la plataforma"| PAY
    classDef person fill:#fff2cc,stroke:#927400,color:#18232d;
    classDef system fill:#1168bd,stroke:#0b4884,color:#fff;
    classDef ext fill:#eeeeee,stroke:#666,color:#18232d;
    class T,PR,AD person;
    class LY system;
    class MAP,IA,MAIL,TK,PAY ext;
```

**Leyenda:** amarillo = persona; azul = sistema de interés; gris = sistema externo. La flecha nombra la interacción iniciada por el origen. Las respuestas quedan implícitas. Un único sistema en C1 no implica un monolito.

Turista y visitante son el mismo actor en distintos estados de autenticación. Sin sesión accede a vistas previas; el detalle, galerías completas, planificación personal, publicaciones, likes en fotos/comentarios y respuestas requieren sesión. Las propuestas de lugares, camping y eventos necesitan revisión administrativa antes de formar parte del catálogo o calendario.

LlegueYa no se integra automáticamente con el medio de pago ni vende entradas. El proveedor paga fuera y presenta evidencia privada; el administrador la revisa. La publicidad requiere elegibilidad y moderación, además de beneficio gratuito vigente o pago confirmado. Por defecto, el beneficio inicial dura un mes calendario, configurable por administración. El bot identifica el patrocinio y respeta destino, fechas, grupo y presupuesto.

No se dibuja una API de pago o venta inexistente. [C2](Nivel2-DiagramadeContenedores.md) muestra qué contenedores realizan las integraciones de mapas, IA y correo. Trazabilidad: RF01-RF65, ADR-001 a ADR-027 y [alcance](../docs/04-especificacion-funcional/01-analisis-y-alcance.md).

La infraestructura gestionada de PostgreSQL/Storage forma parte del despliegue de LlegueYa en C2; no se agrega como una persona o servicio de negocio en C1. Cloudflare es borde de entrega, no capacidad turística.
