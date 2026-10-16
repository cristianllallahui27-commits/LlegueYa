# Arquitectura general de LlegueYa

LlegueYa se organiza en siete servicios de negocio independientes: Identidad y acceso; Catálogo y proveedores; Comunidad y contenido; Eventos y notificaciones; Publicidad y planes; Recomendaciones y paquetes; Asistente turístico.

La web presenta tarjetas públicas y fichas detalladas con sesión. Catálogo reúne lugares, actividades y negocios con fotos y categorías acreditadas. Comunidad contiene experiencias y reseñas. Eventos acepta propuestas y administra publicación/calendario. Publicidad gestiona gratuidad, planes y objetivos aprobados. El asistente usa datos autorizados y distingue resultados orgánicos y patrocinados.

Cada servicio aplica Clean Architecture y posee datos y transacciones. Las consultas usan REST y los cambios relevantes se propagan con eventos durables. Publicidad revalida tanto al anunciante como al objetivo, por lo que cancelar un evento o retirar un lugar impide nuevas entregas.

## Vistas

- [Estilo arquitectónico](estilo-arquitectonico.md).
- [Componentes](componentes-arquitectonicos.md).
- [Clean Architecture](enfoque-arquitectonico.md).
- [Diseño y diagrama de servicios](../04-especificacion-funcional/02-arquitectura-y-diseno.md).
- [Modelo C4 de contenedores](../../modelo-c4/Nivel2-DiagramadeContenedores.md).

## Límites

Sin venta/cobro de entradas ni reservas; el navegador abre enlaces verificados. La publicidad puede usar beneficio gratuito o pago externo revisado. Los documentos privados y galerías autenticadas no se entregan como archivos públicos. Las tecnologías y el despliegue se definirán al implementar.