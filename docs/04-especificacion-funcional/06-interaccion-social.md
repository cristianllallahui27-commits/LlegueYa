# Likes, comentarios y respuestas

## Participación con cuenta

Solo los usuarios registrados con sesión válida pueden dar o retirar likes, comentar y responder a comentarios. Sin sesión, las vistas previas permiten descubrir el contenido autorizado; al intentar participar se solicita registro/inicio de sesión y se conserva la referencia al contenido. Tras autenticarse, el usuario confirma la acción: iniciar sesión no publica un comentario ni aplica un like automáticamente.

Los permisos se comprueban en la API y en el servicio Comunidad y contenido, no únicamente en los botones de la web. Una cuenta no habilita interacción con contenido pendiente, rechazado, retirado o inaccesible para ese usuario.

## Likes en fotos y comentarios

Las fotografías aprobadas de lugares, galerías y experiencias pueden recibir likes. Los comentarios y sus respuestas aprobadas también pueden recibirlos. Cada usuario mantiene como máximo un like por objetivo; puede retirarlo y volver a darlo. El contador representa likes activos de usuarios distintos y no se mezcla con estrellas acreditadas, tenedores, puntuación de reseñas ni alcance publicitario.

Crear un like ya existente conserva uno solo; retirar uno ausente mantiene cero. Las solicitudes repetidas o concurrentes no duplican contadores ni alternan el estado de manera inesperada. Se registra identidad desde la sesión y una restricción única usuario + tipo de objetivo + id de objetivo.

## Comentarios y respuestas

Un usuario registrado puede comentar una foto de lugar o una publicación aprobada con texto y/o fotos según las reglas de adjuntos. Puede responder a un comentario o a otra respuesta del mismo hilo. Cada intervención conserva autor, fecha, estado, versión, raíz del hilo y referencia al comentario padre cuando existe.

Las respuestas se presentan debajo de su comentario, paginadas y con autor identificado. No pueden asociarse a otro hilo, a sí mismas ni a un descendiente, evitando ciclos. La profundidad y el tamaño de página se configuran al implementar; no se crean nuevos roles para responder.

El autor puede editar o retirar su intervención y administración puede moderarla. Las intervenciones y fotos pasan por el flujo de aprobación antes de ser públicas; una edición vuelve a revisión. Si un padre deja de ser visible, sus respuestas y adjuntos tampoco aparecen, hasta que el contexto vuelva a estar aprobado y accesible. Retirar un like no retira un comentario.

## Responsabilidades y datos

Comunidad y contenido posee Like, Comentario y Respuesta. Like contiene usuarioId, objetivoTipo, objetivoId y fecha; no usa una tabla compartida con Catálogo o Eventos. Comentario contiene referencia de foto/publicación y raíz del hilo; una respuesta usa además comentarioPadreId. Una respuesta es una intervención del mismo modelo, no un servicio independiente.

Las fotos permanecen en su servicio dueño: Catálogo, Comunidad o Eventos. Comunidad valida su existencia, estado y visibilidad mediante contratos públicos autorizados. El identificador de una imagen no equivale a su URL de archivo ni concede acceso a una galería restringida. El retiro del objetivo invalida interacción y contadores visibles; las consultas también comprueban el estado vigente. Si no puede validarse el objetivo, no se acepta una interacción nueva.

Casos de uso conceptuales: DarLike, RetirarLike, ComentarFoto, ComentarPublicacion, ResponderComentario, ConsultarHilo y ModerarIntervencion. Se mantienen Clean Architecture, datos propios y eventos idempotentes para propagar cambios cuando corresponda. No se incorpora código en esta especificación.

## Requisitos y trazabilidad

| ID | Requisito |
|---|---|
| RF56 | Un usuario registrado con sesión válida puede dar o retirar un like en una foto aprobada y accesible; se permite un solo like activo por usuario y foto. |
| RF57 | Un usuario registrado con sesión válida puede dar o retirar un like en un comentario o respuesta aprobados y accesibles, sin duplicados por usuario y objetivo. |
| RF58 | Un usuario registrado con sesión válida puede comentar fotos y responder a comentarios/respuestas dentro del mismo hilo; cada intervención conserva autoría, fecha y referencia al padre. |
| RF59 | El sistema verifica sesión y visibilidad en cada interacción, aplica moderación y paginación al hilo, evita ciclos y oculta respuestas/adjuntos cuyo contexto haya sido retirado o deje de ser accesible. |

| ID | Historia | RF |
|---|---|---|
| HU40 | Como usuario registrado quiero dar y retirar likes en fotos y comentarios para expresar qué contenido me gusta. | RF56, RF57 |
| HU41 | Como usuario registrado quiero comentar fotos y responder a otros usuarios para compartir consejos y conversar sobre los lugares. | RF58, RF59 |

Se relaciona con RF01, RF21-RF25, RF46 y RF53; ADR-008/ADR-009 y el [diseño de servicios](02-arquitectura-y-diseno.md).

## Criterios de aceptación

| Caso | Resultado esperado |
|---|---|
| Usuario sin sesión intenta dar like, comentar o responder, incluso por API | Se exige autenticación y no se modifica contenido ni contadores. |
| Usuario registrado da like dos veces a la misma foto/comentario | Se conserva un único like activo. |
| Dos solicitudes simultáneas dan like al mismo objetivo con la misma cuenta | La unicidad impide contadores duplicados. |
| Usuario retira su like | Disminuye su aportación una vez; no afecta likes ajenos. |
| Usuario responde a un comentario de otra persona | Conserva autoría y padre y se muestra dentro del hilo tras aprobación. |
| Se intenta vincular una respuesta a un hilo diferente o formar un ciclo | La operación se rechaza sin modificar el hilo. |
| Se retira la foto/publicación o un comentario padre | No se admiten nuevas interacciones sobre ese contexto ni se exponen sus respuestas o adjuntos. |
| Usuario conoce la URL de una galería restringida | No obtiene acceso ni puede interactuar sin sesión y permisos. |
