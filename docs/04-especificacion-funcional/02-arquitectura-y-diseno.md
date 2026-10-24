# Arquitectura y diseño de LlegueYa

## 1. Estilo y responsabilidades

Arquitectura distribuida orientada a servicios de negocio, con despliegues independientes y Clean Architecture dentro de cada servicio. El proyecto documenta diseño; no contiene aplicación. Las tecnologías se presentan como candidatas pendientes del SDD.

| Servicio | Responsabilidades | Propiedad de datos |
|---|---|---|
| Identidad y acceso | Cuenta, sesión, roles y validación de identidad. | Usuarios, credenciales y roles. |
| Catálogo y proveedores | Destinos, lugares, camping/actividades, propuestas de lugares, negocios, categorías acreditadas, requisitos por rubro, ofertas, paquetes, favoritos y galerías. | Fichas, propuestas, verificación, atributos y evidencia privada. |
| Comunidad y contenido | Relatos, fotos, likes, comentarios/respuestas en hilos, reseñas/puntuación, reportes, moderación y contenido cultural. | Publicaciones, adjuntos, likes únicos por usuario/objetivo, hilos, decisiones y contenido editorial. |
| Eventos y notificaciones | Propuestas de eventos, revisión/publicación, calendario, preferencias, suscripciones, bandeja y recordatorios. | Eventos/versiones, propuestas, tareas y entregas. |
| Publicidad y planes | Políticas gratuitas, beneficio único por negocio, planes, pagos externos revisados, campañas sobre ofertas/paquetes/eventos/lugares y métricas. | Condiciones, beneficios, pagos, campañas, cuotas y contadores. |
| Recomendaciones y paquetes | Compatibilidad, cálculos familiares, propuestas guardadas y clasificación orgánica. | Proyecciones de consulta y propuestas personales. |
| Asistente turístico | Orientación general y personal, conversación, conocimiento autorizado y adaptación al modelo IA. | Conversaciones y conocimiento/indexación propios. |

La cuenta habilita detalle y funciones personales, no acceso a expedientes administrativos. Cada servicio valida permisos por rol y propiedad. Las categorías acreditadas pertenecen al Catálogo, no al sistema de reseñas ni de publicidad.

## 2. Vista lógica

La [vista C2 del proyecto](../../modelo-c4/Nivel2-DiagramadeContenedores.md) es la representación canónica: C2-A identifica WEB, GW, las siete APIs y sus siete bases lógicas; C2-B detalla colaboraciones e integraciones; C2-C muestra mensajería y almacenamiento de fotos/evidencias. Todas declaran límites, tipos, responsabilidades, protocolos y estado tecnológico. El [inventario C4](../../modelo-c4/README.md) explica cómo ampliar cada nivel.

PostgreSQL es una opción de referencia para DI, DC, DM, DE, DP, DR y DA; cada base pertenece exclusivamente a su servicio. OBJ conserva los archivos binarios y las bases guardan sus metadatos. El SDD definirá el despliegue físico, que no se deduce de los contenedores C4.

Las portadas y miniaturas aprobadas de vistas previas son públicas. Galerías de fichas restringidas requieren sesión mediante acceso firmado de corta duración o entrega autorizada, según tecnología por definir. Documentos y comprobantes solo se entregan a actores autorizados; no se convierten en recursos públicos de CDN.

## 3. Entidades y contratos

| Propietario | Entidades y contratos conceptuales |
|---|---|
| Catálogo | Destino, Actividad, PropuestaLugar, Proveedor, Oferta, PaqueteComercial, ClaseServicio, CategoriaAcreditada, EvidenciaCategoria, Galeria y Favorito. ConsultarVistaPrevia, ObtenerFichaAutenticada, ProponerLugar, RevisarPropuesta, VerificarCategoria, ConsultarElegibilidad. |
| Comunidad | PublicacionExperiencia, Comentario con padre/raíz, Like, Reseña, Foto y Reporte. Publicar, ComentarConFotos, ResponderComentario, DarLike, RetirarLike, ConsultarHilo, PuntuarServicio y Moderar. |
| Eventos | PropuestaEvento, EventoTuristico, Revision, Suscripcion, Notificacion y Entrega. ProponerEvento, AprobarYPublicar, Cancelar, ConsultarCalendario, ValidarObjetivoPromocion y ProcesarRecordatorios. |
| Publicidad | PoliticaGratuita, BeneficioInicial, PlanPublicidad, Contratacion, Pago, Campaña, ObjetivoCampaña y Medicion. ConfigurarPolitica, AsignarBeneficio, ConfirmarPago, SeleccionarAnuncios y ConsultarMetricas. |
| Recomendaciones | CriteriosViaje, PropuestaEstimada y ViajeGuardado. EvaluarCompatibilidad y RecomendarPaquete. |
| Asistente | Conversacion y ContextoAutorizado. ConsultarGuia, SolicitarDetalle y GuardarConversacion. |

ObjetivoCampaña contiene tipo e identificador: oferta, paquete, evento o lugar. Validación se delega al servicio dueño del objetivo. La autoría de una propuesta no acredita propiedad comercial ni autorización para anunciar al organizador.

## 4. Datos y comunicación

Cada servicio tiene repositorios, credenciales y transacciones propios. Puede compartir un servidor físico con bases/esquemas aislados; no hay joins, claves foráneas ni acceso directo a tablas entre servicios. Se usan identificadores remotos y contratos versionados. Una categoría verificada mantiene documento privado, autoridad, fecha de revisión y vigencia aplicable.

Las consultas inmediatas usan REST con límites de tiempo y autorización. Los cambios se propagan mediante eventos con id, entidad, versión, instante y versión de esquema. Productor persiste cambio y outbox en la misma transacción local; consumidor deduplica en inbox. Versiones antiguas no sobrescriben estados nuevos. Hay reintentos acotados, conciliación y manejo de fallos persistentes; no se promete entrega exactamente una vez ni transacción global.

Las proyecciones sirven lecturas, pero no autorizan una campaña. Publicidad consulta elegibilidad actual del anunciante y del objetivo; si no puede comprobarla, omite la entrega. Cancelar un evento o retirar un lugar genera invalidación de anuncios y cachés. Las nuevas autorizaciones posteriores a la confirmación no pueden usar el estado cancelado; el contenido ya mostrado al usuario no se borra retrospectivamente.

## 5. Flujos y consistencia

**Proponer y publicar.** El usuario autenticado aporta evento o lugar con fotos, ubicación, fuente y datos necesarios. El servicio dueño guarda propuesta y adjuntos privados. Administración solicita información, rechaza o aprueba/publica. Solo lo publicado participa en catálogo, calendario, bot o difusión. Una experiencia del viajero se modera en Comunidad y no crea por sí sola una ficha ni una autorización de camping.

**Fotos y categorías.** La evidencia de estrellas/tenedores se revisa en Catálogo y se presenta separada de reseñas. Publicar una imagen requiere derechos y aprobación. Portada y galería tienen políticas distintas; obtener metadatos no permite leer archivos restringidos sin sesión. Retirar contenido oculta hijos e invalida derivados; una tarea limpia cargas sin vínculo.

**Gratuidad y planes.** Publicidad asigna una sola vez por negocio el periodo configurado, un mes calendario por defecto desde primera activación aprobada. Copia la política y persiste inicio/fin; una restricción única evita duplicados concurrentes. Cambios generales afectan nuevas asignaciones; ajustes individuales se auditan. Continuidad pagada exige revisión del pago; vencer el beneficio detiene anuncios, no la ficha orgánica elegible.

**Publicidad de eventos y lugares.** Administración puede destacar contenido editorialmente. Campañas comerciales requieren anunciante autorizado, objetivo aprobado y vigente, beneficio gratuito o pago válido, compatibilidad, cuota y frecuencia. Eventos valida fecha, estado y vínculo del organizador; Catálogo valida lugar, negocio y oferta. Pago o categoría acreditada no conceden aprobación automática del evento.

**Chatbot.** Sin sesión ofrece orientación general y vistas previas. Para detalle o planificación personal solicita iniciar sesión y conserva el destino solicitado de forma segura. Recomendaciones calcula con datos estructurados; Asistente no inventa tarifas ni permisos. Publicidad selecciona entre candidatos compatibles, con mayor exposición según plan y etiqueta visible. Se mantienen alternativas orgánicas.

**Avisos.** Eventos y Notificaciones conserva tareas persistidas. Antes de enviar revisa versión, estado y preferencias. Cambios y cancelaciones invalidan pendientes; clave usuario + entidad + tipo + versión evita avisos lógicos duplicados. La bandeja web no depende de que el correo esté disponible.

## 6. Disponibilidad y seguridad

Publicidad o IA pueden fallar sin detener tarjetas, comunidad o calendario. Se usan tiempos límite y circuitos de corte; no hay cascadas de reintentos. Cada servicio comprueba sesión y propiedad y registra decisiones administrativas. La entrada API enruta y limita tráfico, pero no reemplaza autorización de los servicios.

El detalle se restringe también en API, búsquedas e información suministrada al bot. Las vistas previas no incluyen campos ocultos solo mediante interfaz. El enlace de retorno tras autenticación se limita a destinos internos válidos. Las tareas programadas coordinan réplicas mediante bloqueo/concesión persistida.

## 7. Escenarios de calidad

Metas propuestas para validar, sin mediciones ejecutadas.

| ID | Estímulo y entorno | Respuesta | Medida |
|---|---|---|---|
| EQ-08 | 100 sesiones consultan el muro en pruebas acordadas. | Paginación de metadatos y miniaturas. | Percentil 95 de API menor o igual a 2 s; originales fuera de la lista. |
| EQ-09 | Reinicio de consumidor tras guardar un aviso. | Reprocesa de forma idempotente. | Cero avisos lógicos duplicados por clave. |
| EQ-10 | Suspensión/cancelación con anuncios y caché. | Revalida anunciante y objetivo. | Cero nuevas autorizaciones posteriores a confirmación del retiro. |
| EQ-11 | Manipulación de ids personales o administrativos. | Servicio dueño deniega acceso. | Cero lecturas/escrituras no autorizadas del conjunto de prueba. |
| EQ-12 | Retiro de fotos publicadas. | Revoca origen e invalida entrega. | Revocación al confirmar; propagación CDN con meta máxima propuesta de 60 s. |
| EQ-13 | Publicidad o IA no responde. | Consultas independientes continúan. | Ningún error causado por esa dependencia en el ensayo de consultas independientes. |
| EQ-14 | Dos solicitudes del beneficio para un negocio. | Unicidad local. | Un beneficio inicial con condiciones y fechas persistidas. |
| EQ-15 | Evento de dominio duplicado o desordenado. | Deduplica y respeta versión. | Cero regresiones o doble consumo por duplicado. |
| EQ-16 | Acceso sin sesión al detalle/API/galería. | Devuelve vista previa o solicita autenticación. | Cero campos/archivos restringidos expuestos en las pruebas. |
| EQ-17 | Turista propone evento o lugar y edita sus datos. | Conserva autoría y revisión administrativa. | Cero propuestas pendientes visibles como catálogo o anuncios. |

## 8. Modelo C4

[Contexto](../../modelo-c4/Nivel1-DiagramadeContextodelSistema.md) define actores e integraciones; [contenedores](../../modelo-c4/Nivel2-DiagramadeContenedores.md), despliegues y datos; [componentes](../../modelo-c4/Nivel3-DiagramadeComponentes.md), Publicidad y validación de objetivos; [clases conceptuales](../../modelo-c4/Nivel4-DiagramadeCodigo.md), reglas y contratos. Son vistas de diseño, no código implementado.

## 9. Parámetros de implementación

Se definirán stack, transporte durable, almacenamiento, tiempos límite, recuperación, retención, cuotas, tarifas, límites de fotos y requisitos por categoría. El [registro ADR](../01-analisis-de-sistema/07-decisiones-arquitectonicas.md), [publicidad](03-publicidad-y-periodo-gratuito.md), [acceso](04-acceso-del-turista.md) y [catálogo/eventos](05-catalogo-eventos-y-actividades.md) e [interacción social](06-interaccion-social.md) completan el diseño.