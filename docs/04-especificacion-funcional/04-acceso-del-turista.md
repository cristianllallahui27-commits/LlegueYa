# Acceso del turista

## 1. Actor y modalidades

**Turista es un único actor**, con acceso sin registro o con cuenta. La cuenta habilita detalle, participación y opciones personales. Proveedor y Administrador tienen permisos adicionales propios; un plan de publicidad no es un pago exigido al turista.

| Capacidad | Sin registro | Con registro e inicio de sesión |
|---|---|---|
| Lugares y actividades | Tarjeta con portada, nombre, tipo, zona y resumen. | Ficha completa, acceso detallado, condiciones, galería, favoritos y propuestas de nuevos lugares/camping. |
| Servicios | Vista previa y categoría acreditada si existe; valoración diferenciada. | Descripción completa, servicios, tarifas disponibles, capacidad, contacto, galería y comparación. |
| Eventos | Resumen, lugar general, fecha, portada y estado/cancelación. | Detalle, organizador/contacto público autorizado, condiciones, suscripción y propuesta de eventos. |
| Comunidad | Resúmenes aprobados y miniaturas. | Relatos completos, fotos autorizadas, likes en fotos/comentarios, comentarios, respuestas en hilos, reseñas, publicación y reportes. |
| Bot | Orientación general con información de vista previa. | Detalle, criterios familiares, comparación por presupuesto, guardado e historial. |
| Publicidad | Identificación visible y resumen contextual. | Ficha objetivo completa y contexto personal voluntario; sin ocultar patrocinio. |
| Avisos e información personal | Sin bandeja, favoritos o historial de cuenta. | Preferencias, suscripciones, bandeja, favoritos y viajes/conversaciones propios. |

## 2. Solicitud de registro

Al pulsar «Ver detalle», abrir galería completa, solicitar información detallada al bot o usar funciones personales, se muestra registro/inicio de sesión. Tras autenticarse se retoma la ficha o acción solicitada, con enlace de retorno interno validado. El catálogo permite explorar vistas previas antes de crear cuenta.

La API usa respuestas diferentes para vista previa y detalle. No envía al navegador campos restringidos para ocultarlos con estilos. Los archivos completos del detalle requieren acceso autorizado; las portadas y miniaturas públicas se entregan separadamente. El bot aplica la misma política y no revela detalle mediante una consulta alternativa sin sesión.

Alertas relevantes, cancelaciones y etiquetas de publicidad permanecen visibles en la vista previa. La cuenta no concede acceso a expedientes, comprobantes, conversaciones de otras personas ni datos administrativos.

## 3. Participación

Solo usuarios registrados con sesión válida publican experiencias, comentan fotos/publicaciones, dan o retiran likes en fotos/comentarios y responden en hilos. También pueden puntuar y proponer eventos o lugares/actividades. Cada contenido conserva autor y estado. Las propuestas del catálogo y calendario requieren aprobación de administración; no se publican automáticamente por tener cuenta.

Los permisos por propiedad se comprueban en el servicio dueño. Un turista puede modificar contenido propio dentro de su flujo, pero no aprobarlo ni cambiar los datos oficiales de un negocio ajeno. El proveedor administra sus servicios y evidencia bajo revisión.

## 4. Sesión y privacidad

Identidad valida la cuenta; Catálogo guarda favoritos; Recomendaciones, viajes; Asistente, conversaciones; Eventos, suscripciones/avisos; Comunidad, participación. Cada servicio conserva sus datos y permisos.

Al cerrar sesión dejan de mostrarse historiales privados. Una conversación pública no se asocia automáticamente a una cuenta: el turista decide si desea conservarla tras autenticarse. Límites del bot, retención y borrado se configuran al implementar, sin prometer uso ilimitado. Los anunciantes solo reciben métricas agregadas de sus campañas.

## 5. Criterios de aceptación

| Situación | Resultado |
|---|---|
| Turista entra sin cuenta | Explora vistas previas de lugares, servicios, experiencias y eventos. |
| Solicita detalle por web o bot | Se pide registro/inicio de sesión y se retoma el contexto permitido. |
| Intenta obtener detalle directamente por API o URL de galería | No accede a campos/archivos restringidos sin sesión. |
| Inicia sesión | Accede a detalle y opciones personales sin contratar publicidad. |
| Propone un evento o camping | Se registra con autoría y queda sujeto a aprobación. |
| Solicita historial ajeno | Se deniega acceso desde el servicio dueño. |

Trazabilidad: RF01, RF46, RF47, RF51-RF53, RF56-RF59, HU34, HU40-HU41, HU36-HU38 y ADR-009/ADR-021. Ver [catálogo y actividades](05-catalogo-eventos-y-actividades.md).