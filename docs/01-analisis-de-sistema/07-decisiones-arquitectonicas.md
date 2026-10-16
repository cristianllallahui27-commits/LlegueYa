# Decisiones arquitectónicas

Registro de decisiones de diseño de LlegueYa. No acredita implementación ni despliegue.

| ID | Decisión | Justificación y consecuencias |
|---|---|---|
| ADR-001 | Servicios de negocio independientes | Separar Identidad, Catálogo, Comunidad, Eventos/avisos, Publicidad, Recomendaciones y Asistente permite desplegar y escalar según demanda; introduce fallos de red y operación distribuida. |
| ADR-002 | Clean Architecture por servicio | Dominio y aplicación dependen de contratos; infraestructura implementa adaptadores. |
| ADR-003 | Cachés y proyecciones de lectura | Reducen consultas repetidas; se invalidan al retirar contenido o suspender negocios. No autorizan publicidad por sí solas. |
| ADR-004 | Archivos externos y CDN | Derivados aprobados y portadas públicas separados de originales pendientes, documentos y galerías restringidas. |
| ADR-005 | Integraciones mediante puertos | Mapas, IA, archivos y correo se reemplazan sin cambiar reglas de dominio. |
| ADR-006 | Entradas mediante enlaces verificados | La venta permanece externa y el navegador abre el enlace; publicidad usa registro de pago externo, sin pasarela automática. |
| ADR-007 | Elegibilidad por actividad | Catálogo revisa requisitos y evidencia del negocio; solo servicios elegibles aparecen comercialmente. |
| ADR-008 | Moderación y autoría | Publicaciones, comentarios, fotos y propuestas requieren revisión según su flujo; retirar un padre revoca visibilidad de hijos. |
| ADR-009 | Autenticación y autorización por recurso | Turista único con modalidades de acceso; API y archivos restringen detalle y datos personales. |
| ADR-010 | Agrupación por capacidades de negocio | Calendario/avisos comparten servicio; experiencias/reseñas/contenido comparten Comunidad. Evita un servicio por entidad. |
| ADR-011 | Publicación social con adjuntos | Un relato o comentario reúne texto/fotos; comentarios no modifican puntuación de servicios. |
| ADR-012 | Avisos persistidos e idempotentes | Versiones de eventos y claves únicas evitan recordatorios duplicados u obsoletos. |
| ADR-013 | Publicidad con tarifa administrativa | Planes, pagos y campañas tienen estados separados, evidencia privada y condiciones contratadas persistidas. |
| ADR-014 | Recomendaciones estructuradas | Se calcula presupuesto y compatibilidad antes de redactar con IA; precios ausentes se comunican. |
| ADR-015 | Datos propios por despliegue | Cada servicio posee sus almacenes, credenciales y transacciones; no lee ni escribe tablas ajenas. |
| ADR-016 | Beneficio gratuito inicial configurable | Un mes calendario por defecto desde primera activación aprobada; uno por negocio, política versionada y ajustes auditados. |
| ADR-017 | Mayor exposición patrocinada por plan | Cuotas, segmentación, frecuencia y prioridad entre candidatos compatibles; patrocinio identificado y métricas agregadas. |
| ADR-018 | REST y eventos durables | Consultas inmediatas por REST; cambios con outbox/inbox, versiones, deduplicación y conciliación. |
| ADR-019 | Categorías turísticas con respaldo | Clase/categoría acreditada separada de tipo, atributos y valoración de viajeros; evidencia privada revisada. |
| ADR-020 | Propuestas comunitarias de eventos y lugares | Usuarios registrados aportan fotos/ubicación; administrador publica; promoción consulta el estado del objetivo en su servicio dueño. |
| ADR-021 | Descubrimiento público y detalle autenticado | Tarjetas públicas; fichas completas y galerías requieren sesión. API y acceso a archivos cumplen la misma política. |
| ADR-022 | Interacción social autenticada en Comunidad | Likes únicos por usuario/objetivo y comentarios con respuestas en hilos sin ciclos. Comunidad valida visibilidad con el dueño de la foto; moderación y retiro de padres ocultan hijos. |

## Alternativas consideradas

Una unidad única de despliegue simplifica operación pero acopla capacidades; se eligen siete servicios agrupados por negocio. Crear un servicio por entidad agrega coordinación sin beneficio demostrado. Compartir tablas simplifica consultas pero rompe propiedad de datos. Se prefieren contratos y proyecciones controladas.

El patrocinio sin etiquetas, las categorías autodeclaradas como acreditadas y los eventos publicados sin revisión contradicen la confianza buscada. Ocultar campos únicamente en la interfaz no protege el detalle: se controla en el servidor y en la entrega de archivos.

## Trazabilidad

[Drivers](06-drivers-arquitectonicos.md), [RF01-RF59](03-requisitos-funcionales.md), [diseño de servicios](../04-especificacion-funcional/02-arquitectura-y-diseno.md) y [catálogo/eventos](../04-especificacion-funcional/05-catalogo-eventos-y-actividades.md).