# 01 - Actores

| Actor | Necesidades y permisos |
|---|---|
| Turista | Explorar vistas previas sin cuenta. Con sesión: acceder a detalle, usar planificación personalizada, guardar favoritos/viajes, recibir avisos, compartir experiencias, dar/retirar likes en fotos y comentarios, comentar con fotos, responder en hilos y puntuar y proponer eventos/lugares/actividades. |
| Proveedor | Gestionar negocios propios, servicios, paquetes, galerías, clasificación declarada y evidencia; proponer eventos y contratar campañas con beneficio gratuito o plan pagado. Incluye hospedajes, restaurantes, artesanos y otras actividades. |
| Administrador / propietario | Verificar negocios y categorías, moderar contenido, aprobar propuestas, gestionar catálogo/calendario, destacar lugares/eventos y definir gratuidad, tarifas, campañas y revisión de pagos. |

Turista sin registro y turista registrado son modalidades del mismo actor. «Visitante» puede usarse coloquialmente para un turista, pero no constituye otro actor o rol. La categoría de negocio tampoco es un rol. Una cuenta puede disponer de permisos de proveedor cuando corresponda, sin perder sus funciones turísticas.

## Sistemas externos

Mapas proporciona ubicación; IA ayuda a redactar respuestas con contexto propio; CDN distribuye únicamente derivados autorizados; un medio externo de pago genera evidencia para revisión administrativa. El correo es un canal opcional por definir. Los sitios externos de venta reciben al turista cuando abre un enlace verificado.

Permisos por recurso y modalidad: [acceso del turista](../04-especificacion-funcional/04-acceso-del-turista.md). Flujos de contribución: [eventos y actividades](../04-especificacion-funcional/05-catalogo-eventos-y-actividades.md).