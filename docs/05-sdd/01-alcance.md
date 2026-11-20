# 01 · Alcance y reglas del diseño

[Índice](README.md) · [Siguiente: arquitectura](02-arquitectura-y-decisiones.md)

## 1.1 Propósito y lectores

El SDD traduce requisitos y decisiones de LlegueYa en responsabilidades, datos, contratos y comportamiento verificable. Sirve al equipo de desarrollo, responsable de operación, administrador del producto y docente. Los requisitos funcionales completos permanecen en [RF01–RF65](../01-analisis-de-sistema/03-requisitos-funcionales.md); no se renumeran los requisitos previos.

LlegueYa permite descubrir Ayacucho, leer experiencias, comparar servicios y planificar tanto un viaje independiente como uno basado en paquetes comerciales. El modelo de publicidad ayuda a difundir negocios elegibles y se presenta separado de opiniones y categorías acreditadas.

## 1.2 Capacidades incluidas

| Capacidad | Diseño previsto |
|---|---|
| Descubrimiento | Tarjetas públicas, búsqueda por destino/rubro y fichas completas con sesión. |
| Catálogo | Lugares, camping, actividades, hospedajes, restaurantes, artesanos y movilidad. |
| Comunidad | Experiencias, fotografías, reseñas, comentarios con fotos, respuestas, likes y reportes. |
| Perfil | Nombre visible, biografía, avatar, intereses y preferencias editables por el titular. |
| Lectura personal | Favoritos y colecciones privadas para guardar lugares y experiencias. |
| Movilidad independiente | Terminales y puntos de embarque, operadores y ofertas de traslado, sin obligación de comprar paquete. |
| Mapa | Arrastre, zoom, marcadores y selección de fichas. Coordenadas del catálogo revisadas. |
| Calendario | Eventos por mes/año/destino, propuestas y aprobación administrativa. |
| Publicidad | Un mes calendario gratuito inicial por defecto, configurable; planes y pagos externos revisados. |
| Asistente | Gemini con contexto autorizado, planificación estructurada y patrocinio identificado. |
| Operación | Siete servicios por negocio, Supabase, Docker y Cloudflare. |

## 1.3 Actores y visibilidad

Turista y visitante son el mismo actor. Sin sesión puede leer vistas previas, mapa con datos públicos y orientación general. Con sesión accede al detalle, galería completa, contacto, planificación, publicaciones e interacción. Proveedor es una cuenta con permisos sobre negocios propios; Administrador es un rol controlado que no puede autoconcederse al editar el perfil.

La portada del mapa no debe revelar direcciones privadas, números de contacto o campos restringidos. Los marcadores públicos muestran la posición pública aprobada de lugares o negocios abiertos al público y un resumen. La ficha detallada y los datos de contacto siguen exigiendo sesión. Las alertas de cancelación y la etiqueta «Patrocinado» permanecen visibles en la vista previa.

## 1.4 Reglas estables

1. Un registro no concede acceso a expedientes, pagos o conversaciones de otros usuarios.
2. Solo contenido aprobado participa en muro, catálogo, calendario o contexto del bot. Una edición sustancial vuelve a revisión; la versión modificada no reemplaza silenciosamente lo aprobado.
3. Likes y respuestas requieren sesión, objetivo visible y unicidad por usuario/objetivo. Una respuesta conserva raíz y padre; no se permite moverla de hilo.
4. La acreditación de estrellas o tenedores requiere evidencia y no se deriva de likes, reseñas o pago.
5. Publicidad valida anunciante, objetivo, vigencia, compatibilidad, beneficio/pago, cuota y frecuencia. Los planes no garantizan ventas o audiencia inexistente.
6. La gratuidad es única por negocio; empieza con la primera activación aprobada. Un mes se calcula como mes calendario en America/Lima, no treinta días.
7. El presupuesto se calcula con precios estructurados y moneda/unidad explícitas antes de solicitar texto a Gemini. Un precio ausente se comunica, no se completa por inferencia.
8. El mapa no usa GPS, `navigator.geolocation`, ubicación en segundo plano ni permisos de localización. No hay geocodificación ni cálculo de rutas en esta línea base.

## 1.5 Límites

No se implementan reservas, compra de entradas/pasajes, cobros a turistas, seguimiento de vehículos, navegación GPS, mensajería privada, video, WhatsApp o Telegram. Los contactos y enlaces externos verificados permiten continuar fuera de LlegueYa. El pago de publicidad ocurre fuera y administración revisa el comprobante.

La experiencia se inspira en lectura y fotografía de redes sociales, sin reproducir su infraestructura o prometer su escala. Se priorizan legibilidad, relevancia, control de avisos y navegación predecible. La retención de usuarios se evalúa por utilidad y facilidad, sin obligar a desplazamiento infinito o notificaciones invasivas.

## 1.6 Glosario de dominio

| Término | Significado |
|---|---|
| Destino | Zona de Ayacucho que agrupa lugares y actividades. |
| Oferta | Servicio comercial de un negocio, con precio/unidad/vigencia cuando se conocen. |
| Paquete comercial | Oferta agrupada de un proveedor. |
| Propuesta de viaje | Combinación estimada calculada para un usuario; no representa reserva. |
| Punto de movilidad | Terminal o lugar de embarque aprobado, vinculado a operadores y destinos atendidos. |
| Esquema de datos | Espacio de nombres y permisos dentro de PostgreSQL; no servidor ni base físicamente separada. |
| Patrocinio | Exposición comercial identificada y condicionada a elegibilidad. |
| Evidencia | Documento privado de verificación o pago, distinto de una foto pública. |
