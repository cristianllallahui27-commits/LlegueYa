# 03 - Requisitos funcionales

LlegueYa reúne orientación turística, comunidad, catálogo visual, calendario y publicidad de servicios. Turista es un actor con dos modalidades de acceso: sin registro y con cuenta. Las vistas previas son públicas; el detalle requiere autenticación. Todos los requisitos describen comportamiento previsto, sin acreditar implementación.

| ID | Requisito funcional |
|---|---|
| RF01 | El sistema debe permitir registrar usuarios e iniciar sesión según su rol. |
| RF02 | El sistema debe permitir consultar los sitios arqueológicos con su distancia, tiempo y forma de acceso. |
| RF03 | El sistema debe mostrar en un mapa la ubicación de los sitios y de sus puntos de venta presencial. |
| RF04 | El sistema debe redirigir al enlace del sitio de venta virtual de cada sitio arqueológico. |
| RF05 | El sistema debe permitir consultar y comparar hospedajes, restaurantes y transportistas verificados con sus precios y ubicación en el mapa. |
| RF06 | El sistema debe permitir a un usuario registrado puntuar y comentar un servicio. |
| RF07 | El sistema debe mostrar la puntuación y los comentarios de cada servicio. |
| RF08 | El sistema debe permitir a un usuario registrado subir fotos de su experiencia. |
| RF09 | El sistema debe permitir consultar las fotos de experiencias. |
| RF10 | El sistema debe permitir consultar historias y fotografías de personas del lugar o la festividad. |
| RF11 | El sistema debe permitir consultar libros con información turística del lugar o la festividad. |
| RF12 | El sistema debe notificar a los usuarios cuando se publique una nueva historia, fotografía o libro. |
| RF13 | El sistema debe permitir armar paquetes (movilidad, hospedaje y restaurantes) según los días y el presupuesto, con el enlace al sitio de venta de la entrada. |
| RF14 | El chatbot debe recomendar un paquete o precios de hospedaje según el presupuesto indicado. |
| RF15 | El chatbot debe recomendar el mejor mes para viajar según la temporada y las festividades. |
| RF16 | El chatbot debe sugerir restaurantes y transportistas verificados cercanos a cada sitio. |
| RF17 | El sistema debe permitir a un proveedor registrar su oferta y cargar sus documentos. |
| RF18 | El sistema debe permitir al administrador verificar, aprobar, rechazar o suspender proveedores según su documentación. |
| RF19 | El sistema debe permitir al administrador registrar y actualizar sitios, sus puntos de venta, enlaces de venta y ubicación. |
| RF20 | El sistema debe permitir al administrador publicar, actualizar y retirar historias, fotografías y libros. |
| RF21 | El sistema debe permitir al administrador moderar reseñas y fotos de experiencias. |
| RF22 | El turista registrado puede crear una publicación con relato, consejos opcionales, destino o servicio relacionado y fotos opcionales; debe incluir texto o al menos una foto. |
| RF23 | El sistema muestra un muro paginado de publicaciones aprobadas, ordenadas por fecha de publicación, con filtros por destino o servicio. |
| RF24 | El turista registrado puede comentar publicaciones aprobadas con texto y/o fotos; el comentario conserva autor, publicación y fecha. |
| RF25 | El autor puede editar o retirar su contenido; los usuarios pueden reportarlo y el administrador aprobarlo, rechazarlo o retirarlo con motivo. Una edición requiere nueva aprobación. |
| RF26 | El administrador puede crear, actualizar, publicar y retirar destinos y categorías turísticas; el proveedor gestiona sus ofertas bajo la verificación existente. |
| RF27 | El administrador publica y gestiona eventos con lugar, inicio, fin, zona horaria, categoría, fuente y foto; puede crear eventos propios o aprobar propuestas de turistas/proveedores. El calendario se consulta por mes, año y lugar. |
| RF28 | El usuario registrado puede suscribirse a destinos, categorías o eventos, configurar recordatorios y desactivar futuras notificaciones. |
| RF29 | El sistema genera avisos en la web de eventos publicados, recordatorios y cambios/cancelaciones para destinatarios suscritos; conserva estado leído y evita duplicados. El correo es opcional y pendiente de confirmación. |
| RF30 | El administrador puede crear y desactivar planes de promoción con precio, moneda, duración y ubicación publicitaria; un cambio de tarifa no modifica campañas ya contratadas. |
| RF31 | El anunciante autorizado solicita una campaña para una oferta, paquete, evento o lugar aprobado; se conservan condiciones y se valida el beneficio gratuito o pago confirmado antes de activar. |
| RF32 | El sistema muestra publicidad identificada como «Patrocinado» únicamente mientras la campaña esté vigente, disponga de beneficio gratuito válido o pago confirmado, y el proveedor/oferta sean elegibles. |
| RF33 | El proveedor y administrador pueden consultar estado, condiciones, pago, vigencia y motivos de suspensión de las campañas correspondientes a sus permisos. |
| RF34 | Paquetes y chatbot aceptan fechas, cantidad de adultos/menores, días y presupuesto, indicando si es total o por persona y mostrando un desglose estimado. |
| RF35 | El chatbot consulta catálogo, eventos y ofertas elegibles; distingue recomendaciones por afinidad y opciones patrocinadas, respeta presupuesto y grupo, y comunica datos ausentes o sin confirmar. |
| RF36 | El proveedor puede crear su perfil comercial y publicar ofertas, paquetes propios y galerías de fotos; se aplican permisos por propiedad, verificación y moderación. |
| RF37 | El administrador puede gestionar categorías de proveedores y requisitos de publicación/promoción por actividad, incluidos artesanos y prestadores de experiencias. |
| RF38 | El administrador puede configurar, activar o desactivar el beneficio gratuito inicial, su duración, unidad, fecha de aplicación y condiciones, conservando un historial de cambios. |
| RF39 | El sistema asigna a cada negocio elegible un periodo gratuito inicial, propuesto por defecto de un mes calendario, y registra inicio, fin y copia de la política aplicada. |
| RF40 | El sistema avisa del vencimiento gratuito y permite solicitar un plan pagado; sin un beneficio vigente cesa la difusión publicitaria, mientras la ficha orgánica elegible permanece. |
| RF41 | El administrador puede configurar planes con tarifa, duración, ubicaciones, segmentación, cuota de exposición, frecuencia por turista y prioridad patrocinada del chatbot. |
| RF42 | El sistema entrega avisos y sugerencias patrocinadas según plan, intereses y contexto turístico, respetando cupos, filtros de compatibilidad y límites de frecuencia. |
| RF43 | El proveedor puede consultar impresiones, turistas únicos alcanzados y clics de sus campañas, diferenciando publicidad en el muro y exposición patrocinada en el chatbot. |
| RF44 | El sistema reevalúa requisitos, estado del proveedor, contenido aprobado y beneficio vigente antes de mostrar publicidad o sugerencias patrocinadas; un pago por sí solo no basta. |
| RF45 | El chatbot puede aumentar la exposición de negocios y paquetes con un plan de mayor prioridad en espacios patrocinados, entre candidatos compatibles, identificando la publicidad y conservando opciones orgánicas. |
| RF46 | El mismo actor Turista explora vistas previas sin cuenta y, al iniciar sesión, accede a fichas completas, participación, favoritos, propuestas, preferencias, historial y suscripciones. |
| RF47 | El bot ofrece orientación general sin cuenta y solicita registro/inicio de sesión para detalle, comparación personalizada, planificación familiar, guardado e historial. |
| RF48 | El administrador gestiona tipos, clases, categorías acreditables y atributos por servicio; el proveedor propone su clasificación y evidencia para revisión. |
| RF49 | El sistema muestra categorías verificadas y puntuaciones de usuarios de manera diferenciada y permite filtrar por categorías aplicables al rubro. |
| RF50 | Destinos, servicios, actividades y eventos presentan portada y galería moderadas, con autoría y descripciones. |
| RF51 | El turista registrado o proveedor puede proponer eventos con lugar, fechas, organizador y foto; el administrador solicita información, aprueba/publica, rechaza o retira. |
| RF52 | El turista registrado puede proponer lugares y actividades de camping, caminata o aventura con fotos; el administrador valida su incorporación al catálogo y registra condiciones conocidas o sin confirmar. |
| RF53 | El sistema muestra vistas previas públicas y exige sesión para fichas detalladas, galerías completas y funciones personales, retomando la ficha tras autenticación. |
| RF54 | El administrador puede destacar editorialmente eventos/lugares aprobados y autorizar campañas comerciales con anunciante elegible, respetando el estado de cada objetivo. |
| RF55 | El sistema conserva autoría, evidencia, decisiones y versiones de propuestas; bloquea difusión de propuestas pendientes y detiene anuncios de objetivos cancelados o retirados. |
| RF56 | Un usuario registrado con sesión válida puede dar o retirar un like en una foto aprobada y accesible; se permite un solo like activo por usuario y foto. |
| RF57 | Un usuario registrado con sesión válida puede dar o retirar un like en un comentario o respuesta aprobados y accesibles, sin duplicados por usuario y objetivo. |
| RF58 | Un usuario registrado con sesión válida puede comentar fotos y responder a comentarios/respuestas dentro del mismo hilo; cada intervención conserva autoría, fecha y referencia al padre. |
| RF59 | El sistema verifica sesión y visibilidad en cada interacción, aplica moderación y paginación al hilo, evita ciclos y oculta respuestas/adjuntos cuyo contexto haya sido retirado o deje de ser accesible. |

Especificación: [alcance](../04-especificacion-funcional/01-analisis-y-alcance.md), [publicidad](../04-especificacion-funcional/03-publicidad-y-periodo-gratuito.md), [acceso](../04-especificacion-funcional/04-acceso-del-turista.md), [catálogo, eventos y actividades](../04-especificacion-funcional/05-catalogo-eventos-y-actividades.md) e [interacción social](../04-especificacion-funcional/06-interaccion-social.md).
