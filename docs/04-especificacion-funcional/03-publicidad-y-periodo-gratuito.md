# Publicidad turística, periodo gratuito y alcance comercial

La plataforma permite publicar servicios y paquetes turísticos y difundirlos mediante beneficio gratuito o planes pagados, con verificación, moderación y condiciones administrables.

## 1. Producto y actores

LlegueYa combina guía turística, comunidad de viajeros y promoción de negocios de Ayacucho. Hospedajes, restaurantes, artesanos, transportistas, guías, operadores de aventuras y otros prestadores pueden tener un perfil comercial, publicar fotos de sus servicios y presentar ofertas o paquetes propios. El administrador gestiona categorías y los requisitos aplicables a cada actividad.

Se mantienen turista, proveedor y administrador como roles. Turista sin registro y turista registrado son modalidades del mismo actor; ver [acceso del turista](04-acceso-del-turista.md). Artesano es una categoría de proveedor, no un nuevo rol. El usuario puede consultar fichas, fotos, precios informados y medios de contacto, y compartir experiencias. El sistema orienta hacia el negocio; no incorpora reservas ni venta de entradas.

| Elemento | Autor y finalidad | Visibilidad |
|---|---|---|
| Experiencia de viaje | Turista: relato, recomendaciones y fotos. | Muro comunitario con moderación. |
| Ficha y oferta comercial | Proveedor: servicios, ubicación, horarios, precios, galería y contacto. | Catálogo orgánico mientras cumpla requisitos. |
| Paquete del proveedor | Proveedor: conjunto de servicios que ofrece, precio, unidad, vigencia, inclusiones y condiciones. | Catálogo; no equivale a una reserva o a una compra en LlegueYa. |
| Aviso publicitario | Proveedor: creativo, oferta/paquete relacionado y campaña. | Espacios identificados como «Publicidad» o «Patrocinado» según beneficio gratuito o plan pagado. |
| Paquete sugerido | Servicio de Recomendaciones: combina ofertas compatibles para un viajero. | Respuesta estimada, diferenciada del paquete comercial de un proveedor. |

## 2. Requisitos de publicidad

| ID | Requisito |
|---|---|
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

Una campaña se habilita mediante beneficio gratuito válido **o** pago confirmado de un plan, además de verificación y vigencia. El bot presenta publicidad pertinente y de mayor exposición según el plan.

| ID | Historia de usuario | RF |
|---|---|---|
| HU28 | Como proveedor quiero publicar mis servicios, paquetes y fotos para atraer turistas. | RF36, RF37 |
| HU29 | Como propietario quiero ofrecer inicialmente un mes gratis y poder cambiar su duración y condiciones. | RF38, RF39 |
| HU30 | Como proveedor quiero conocer el vencimiento del beneficio y contratar continuidad publicitaria. | RF40 |
| HU31 | Como propietario quiero definir tarifas y alcance de cada plan para gestionar la publicidad. | RF41 |
| HU32 | Como proveedor quiero mayor difusión y recomendaciones patrocinadas según mi plan y conocer sus resultados. | RF42, RF43, RF45 |
| HU33 | Como turista quiero que las opciones anunciadas sean pertinentes y estén verificadas. | RF44, RF45 |

## 3. Periodo gratuito configurable

El valor inicial propuesto es **un mes calendario**, modificable por el administrador. La política se aplica por negocio verificado, no por cada publicación ni por cada cuenta que cree su propietario. El beneficio empieza con la primera activación publicitaria aprobada, no durante el tiempo de revisión de documentos. Al cambiar de mes se conserva día y hora cuando existe ese día; en otro caso se usa el último día del mes destino. Se calcula con zona America/Lima y se persiste el instante exacto del vencimiento. No se confunde un mes calendario con treinta días.

| Configuración administrativa | Regla |
|---|---|
| Beneficio habilitado | Permite detener su asignación a negocios nuevos. |
| Duración y unidad | Valor positivo; por defecto un mes calendario. Puede cambiarse a días u otros meses. |
| Elegibilidad | Categorías incluidas, verificación requerida y beneficio único por negocio. |
| Alcance gratuito | Ubicaciones, cuota, prioridad patrocinada y frecuencia del plan gratuito, visibles para el proveedor. |
| Fecha de aplicación | Nueva versión para asignaciones futuras; no cambia beneficios ya otorgados. |
| Ajuste excepcional | Administrador puede ampliar o reducir un beneficio individual con motivo, auditoría y aviso al proveedor. No es un efecto silencioso de editar la política general. |

Estados del beneficio: disponible, activo, vencido, suspendido o revocado. Publicar más fotos, renovar documentos o abrir otra cuenta vinculada al mismo negocio no reinicia el mes. La suspensión interrumpe la difusión, pero no prorroga el periodo automáticamente; cualquier extensión debe registrarse explícitamente.

La política inicial propone una promoción básica durante el mes gratis. Al terminar, conservar la misma difusión requiere contratar un plan de continuidad; un plan superior habilita mayor alcance permitido. El administrador puede definir precios, cuotas y promociones posteriores. No se exige que el proveedor pague para conservar su ficha orgánica verificada.

## 4. Planes, tarifa y mayor alcance

Los nombres siguientes son ejemplos de estructura comercial, sin precios ni cuotas inventados:

| Modalidad | Condición | Beneficio |
|---|---|---|
| Inicial gratuita | Negocio elegible con beneficio inicial activo. | Publicidad básica durante el periodo asignado. |
| Continuidad | Plan pagado, requisitos vigentes y campaña aprobada. | Mantener el nivel de difusión indicado en el contrato. |
| Mayor alcance | Plan superior pagado, requisitos vigentes y campaña aprobada. | Más cuota de exposición, ubicaciones o segmentación habilitadas, y mayor prioridad/frecuencia en sugerencias patrocinadas compatibles del chatbot. |

El plan define precio, moneda, duración, cuota de impresiones, frecuencia máxima por turista, ubicaciones, destinos/categorías de segmentación y peso de rotación patrocinada. El administrador establece que el plan superior ofrezca beneficios mayores y publica esas condiciones antes de contratar. Se conserva una copia de condiciones por contratación; modificar un plan no altera retroactivamente la campaña.

«Mayor alcance» significa más oportunidades y capacidad de exposición dentro de la audiencia compatible disponible; no garantiza ventas, reservas ni una cantidad de turistas que la plataforma todavía no tenga. La cuota es un límite o capacidad contratada; cualquier garantía mínima comercial requeriría condiciones separadas y no se presume aquí. En las pantallas del proveedor se muestran estas condiciones y el consumo medido.

La mayor prioridad se aplica en la selección y rotación de espacios publicitarios. Las reseñas y puntuaciones nunca se compran. Se evita saturar al turista mediante frecuencia máxima y rotación entre negocios elegibles; no se envían campañas como notificaciones masivas no solicitadas.

## 5. Reglas del chatbot y paquetes

1. Recomendaciones consulta destino, fechas, grupo, presupuesto, tipo de actividad y disponibilidad conocida. Descarta ofertas inelegibles o incompatibles antes de considerar publicidad.
2. Publicidad evalúa beneficio gratuito o plan pagado vigente, contenido aprobado, segmentación, cuotas y frecuencia. Entre los candidatos compatibles aplica el peso de cada plan y rotación; así un plan superior puede aparecer ante más turistas y con mayor frecuencia permitida.
3. Chatbot muestra el resultado patrocinado con etiqueta, precio informado, condiciones y motivo de adecuación. Conserva alternativas orgánicas y no afirma que un anuncio es objetivamente «el mejor» por haber pagado.
4. El texto generado no puede aumentar cuotas ni habilitar una campaña. El servicio de Publicidad decide su elegibilidad; el servicio de Recomendaciones calcula compatibilidad y presupuesto.
5. Un paquete comercial aprobado puede promocionarse como unidad. Una propuesta que combina negocios distintos conserva las etiquetas de sus elementos patrocinados; no se marca como comprado todo el paquete por incluir un anuncio.

## 6. Publicaciones comerciales y fotos

Cada negocio tiene ficha, galería y publicaciones comerciales con descripción, servicios, ubicación, contacto, precios opcionales con unidad y vigencia, y referencia a oferta/paquete. El proveedor mantiene sus contenidos; el administrador verifica y modera. No se permite cambiar de negocio propietario para eludir revisión o reiniciar beneficios.

Los archivos pasan por carga privada, validación y aprobación; las portadas son públicas y las galerías del detalle requieren sesión. Fotos, anuncios y reseñas se vinculan al negocio/oferta sin duplicar expedientes privados. Editar la creatividad requiere nueva revisión y suspende su difusión hasta aprobación. Una campaña puede vencer conservando el contenido en el perfil orgánico si sigue aprobado y elegible.

Los requisitos se configuran según actividad: no se atribuye automáticamente a un artesano la misma documentación de un hospedaje. El administrador registra requisitos aplicables y evidencia revisada; una campaña no se activa mientras falte alguno obligatorio.

## 7. Medición y privacidad

Una impresión se registra al confirmar la visualización según un criterio uniforme de visibilidad que se acordará al implementar; solicitar un anuncio no cuenta automáticamente como impresión. Alcance es el número de turistas únicos medidos en la campaña y periodo; clic es una interacción identificada con el aviso. Se documentará cómo se mide a turistas sin registro y cuándo una medición es estimada. Los contadores deduplican eventos de entrega/visualización y separan canal web y chatbot.

El proveedor recibe agregados de sus propias campañas, sin listas de identidades, conversaciones privadas ni expedientes de turistas. Se guardan las referencias mínimas necesarias para frecuencia, deduplicación y análisis; retención, ventana de frecuencia y tratamiento de turistas sin registro quedan pendientes de definición antes de implementar.

## 8. Criterios de aceptación

| Situación | Resultado esperado |
|---|---|
| Artesano cumple los requisitos de su categoría y publica fotos aprobadas | Puede activar el beneficio gratuito si nunca lo usó para ese negocio. |
| Administrador fija un mes gratuito | El inicio y vencimiento exactos quedan visibles y persistidos al activar la primera campaña. |
| Administrador cambia la política a dos meses para nuevas altas | Los beneficios futuros usan dos meses; los ya otorgados conservan su fecha salvo ajuste explícito. |
| Vence el beneficio sin contratar plan | Cesan anuncios y refuerzo patrocinado; la ficha orgánica elegible permanece. |
| Proveedor adjunta un comprobante sin aprobación | No se activa el plan pagado; un beneficio gratuito todavía válido puede seguir funcionando. |
| Se confirma un plan de mayor alcance | Obtiene la cuota y prioridad contratadas; solo se muestra a turistas compatibles y dentro de los límites de frecuencia. |
| Pago vigente pero documentación vencida | Se bloquea publicidad y recomendación comercial de esa oferta hasta regularización y revisión. |
| Proveedor crea otra publicación o cuenta para el mismo negocio | No obtiene otro periodo gratuito. |
| El chatbot recomienda un paquete patrocinado | Lo identifica como publicidad y respeta presupuesto, fechas y grupo. |
| Publicidad no responde | La guía, calendario, experiencias y recomendaciones orgánicas siguen disponibles; se omiten anuncios. |

## 9. Parámetros comerciales

Los perfiles, fotos, lectura y anuncios se integran con el [diseño de servicios](02-arquitectura-y-diseno.md). También pueden difundirse [eventos y lugares aprobados](05-catalogo-eventos-y-actividades.md), con validación del objetivo y autorización del anunciante.

Pendientes comerciales: valores de tarifas y cuotas, nivel de publicidad gratuita, frecuencia máxima, condiciones de continuidad, medio externo de pago, política de suspensión y devoluciones. Ninguno requiere desarrollar código en esta entrega.


## 10. Objetivos y acceso a la publicidad

Las campañas pueden difundir ofertas, paquetes comerciales, eventos y lugares aprobados. Se verifica anunciante y estado del objetivo en Catálogo o Eventos según corresponda. Una propuesta pendiente no puede anunciarse. La difusión editorial administrativa no equivale a campaña pagada ni consume el beneficio de un negocio. Las tarjetas publicitarias son vistas previas; la ficha completa y galería requieren sesión como el resto del catálogo. Ver [catálogo, eventos y actividades](05-catalogo-eventos-y-actividades.md).