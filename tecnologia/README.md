# Consideraciones tecnológicas de LlegueYa

El sistema se diseña con siete servicios de negocio independientes, API REST y eventos durables. Cada servicio aplica Clean Architecture y posee sus datos. No se seleccionan todavía lenguaje, framework, base de datos, nube o transporte de mensajería.

La infraestructura debe permitir almacenamiento privado de evidencias, entrega autorizada de galerías y CDN para portadas públicas; ejecución persistida de recordatorios y tareas comerciales; autorización por sesión/propiedad; outbox e idempotencia; observabilidad y aislamiento de fallos por servicio.

Este directorio no contiene implementación. Los contratos y clases de los documentos son elementos conceptuales. La elección tecnológica se evaluará respecto a [drivers](../docs/01-analisis-de-sistema/06-drivers-arquitectonicos.md), [escenarios de calidad](../docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md) y [diseño de servicios](../docs/04-especificacion-funcional/02-arquitectura-y-diseno.md).