# 10 · Trazabilidad, validación y pendientes

[Índice](README.md) · [Anterior](09-despliegue-y-operacion.md)

## 10.1 Cobertura funcional

La matriz cubre RF01–RF65 sin renumerar requisitos históricos. Las historias HU01–HU46 motivan esos requisitos. Los contratos se describen en el capítulo 05 y los esquemas en el 04. Los escenarios siguientes son especificaciones para pruebas futuras, no resultados ejecutados.

| Requisitos | Servicio y componente | Datos principales | Contrato de referencia | Validación |
|---|---|---|---|---|
| RF01, RF46, RF53, RF60 | I / Auth / Perfil | identidad.perfil; sesion_refresh | /auth/*; /perfil | VA01, VA02, VA03, VA04 |
| RF02, RF03, RF19, RF26, RF52, RF63 | C / Catálogo y mapa | catalogo.lugar; propuesta_lugar | /catalogo/*; /propuestas/lugares | VA05, VA06, VA07 |
| RF04 | C / Enlaces verificados | catalogo.lugar | /catalogo/fichas/{id} | VA08 |
| RF05, RF17, RF18, RF36, RF37, RF48, RF49, RF50 | C / Ofertas y revisión | catalogo.negocio; oferta; categoria_acreditada; evidencia | /negocios; /ofertas; /archivos/* | VA09, VA10, VA11 |
| RF06, RF07, RF21 | M / Reseñas y moderación | comunidad.resena; reporte | /comunidad/negocios/{id}/resena; /admin/moderacion | VA12 |
| RF08, RF09, RF22, RF23, RF24, RF25 | M / Publicaciones e hilos | comunidad.publicacion; comentario; objeto | /comunidad/muro; /comunidad/publicaciones/* | VA13, VA14 |
| RF10, RF11, RF20 | M / Contenido cultural | comunidad.contenido_cultural | /admin/contenido-cultural; /comunidad/muro | VA15 |
| RF12, RF27, RF28, RF29, RF51 | E / Calendario y avisos | eventos.evento; propuesta; suscripcion; tarea_recordatorio; notificacion | /eventos/*; /suscripciones; /notificaciones | VA16, VA17 |
| RF13, RF34, RF47 | R y A / Planificación | recomendaciones.viaje; proyeccion_oferta | /recomendaciones/viajes; /asistente/consultas | VA18, VA19 |
| RF14, RF15, RF16, RF35 | A / Contexto y Gemini | asistente.conversacion; mensaje; documento_conocimiento | /asistente/consultas | VA19, VA20 |
| RF30, RF31, RF32, RF33, RF38, RF39, RF40, RF41 | P / Gestión comercial | publicidad.politica_gratuita; beneficio; plan; contratacion; pago; campania | /campanias; /admin/planes; /admin/pagos/* | VA21, VA22, VA23 |
| RF42, RF43, RF44, RF45, RF54, RF55 | P / Selección y métricas, C/E / elegibilidad | publicidad.reserva_cuota; medicion; auditoria | /internal/anuncios/seleccion; /campanias/{id}/metricas | VA23, VA24, VA25 |
| RF56, RF57, RF58, RF59 | M / Likes y respuestas | comunidad.like; comentario | /comunidad/objetivos/{tipo}/{id}/* | VA26, VA27 |
| RF61, RF62 | C / Movilidad independiente | catalogo.punto_movilidad; tramo_movilidad; oferta | /movilidad/*; /catalogo/mapa | VA28 |
| RF64 | M / Colecciones y lectura | comunidad.coleccion; elemento_coleccion | /colecciones/* | VA29 |
| RF65 | WEB / Acceso e identidad visual | Logo original, sin datos de autenticación | Vista de acceso y movimiento reducido | VA34, VA35 |

ADR-001/002/015/018 fijan distribución, capas, propiedad y comunicación. ADR-023 a ADR-027 precisan Supabase, Docker/Cloudflare, Gemini, mapa y perfil/movilidad. [Registro ADR](../01-analisis-de-sistema/07-decisiones-arquitectonicas.md).

## 10.2 Escenarios de aceptación

| ID | Preparación | Acción | Resultado esperado |
|---|---|---|---|
| VA01 | Cuenta registrada, confirmada y activa | Ingresar y renovar sesión | Perfil propio y token válido; refresh nunca accesible en JS ni logs. |
| VA02 | Dos usuarios distintos | Solicitar perfil, colección o conversación ajenos | 403/404 sin campos privados ni diferencias que permitan enumerar información. |
| VA03 | Usuario intenta enviar rol=administrador al editar perfil | PATCH perfil | 422/403; rol no cambia; evento de seguridad sin copiar el secreto o cuerpo completo. |
| VA04 | Cuenta suspendida con JWT no vencido | Operación protegida | Se deniega por estado actual. Tarjetas públicas independientes siguen disponibles. |
| VA05 | Usuario sin sesión solicita ficha y galería | Abrir detalle desde tarjeta | Solicita ingreso y retoma destino interno válido; API no entrega detalle oculto. |
| VA06 | Mapa abierto sin permisos del dispositivo | Arrastrar, zoom y seleccionar marcador | Mapa cambia de región y abre tarjeta; ninguna llamada a geolocation ni solicitud de permiso. |
| VA07 | Propuesta de camping pendiente o fuente insuficiente | Consultar catálogo y bot | No figura como lugar aprobado ni se presenta el camping como permitido. |
| VA08 | Enlace externo no aprobado o retorno manipulable | Solicitar redirección | Se rechaza; no se vende ni cobra entrada dentro de LlegueYa. |
| VA09 | Proveedor de otro negocio intenta editar oferta | Modificar oferta/evidencia | Denegación en API y política de datos; no basta ocultar el botón. |
| VA10 | Estrellas/tenedores declarados sin evidencia | Consultar ficha y filtros | No se muestran como acreditados. Puntuación de reseñas permanece separada. |
| VA11 | Carga con formato simulado, exceso o EXIF | Confirmar carga | Rechaza formato/tamaño o genera derivado saneado antes de publicar; original pendiente privado. |
| VA12 | Reseña con puntuación fuera de rango y edición moderada | Guardar reseña | Valida 1–5 y nueva revisión; no cambia una categoría oficial. |
| VA13 | Publicación pendiente, aprobada y luego editada | Consultar muro paginado | Solo versión aprobada; cursor estable sin duplicados por inserción concurrente. |
| VA14 | Padre retirado con comentarios/fotos descendientes | Leer hilo e interactuar | Hijos ocultos y nuevas interacciones denegadas aunque se retrase el evento de retiro. |
| VA15 | Contenido cultural aprobado con suscriptores | Publicar e intentar reentrega | Acceso respeta derechos/visibilidad y un solo aviso lógico por clave. |
| VA16 | Evento confirmado con suscripción activa | Consultar mes y ejecutar recordatorio | Fecha/zona/fuente correctas; solo destinatario y preferencia elegibles. |
| VA17 | Evento cancelado tras programar tareas | Ejecutar mensajes repetidos o antiguos | No hay recordatorio vigente de versión obsoleta ni regresión de estado. |
| VA18 | Familia con presupuesto total y precios por distintas unidades | Calcular viaje | Desglose decimal con moneda/unidad y fuentes; faltantes no se sustituyen por cero. |
| VA19 | Gemini no disponible o devuelve ids/cifras inventados | Solicitar recomendación | Salida inválida descartada; respuesta determinista disponible y alternativas orgánicas. |
| VA20 | Relato contiene instrucciones para revelar datos | Incluirlo en contexto de IA | No concede acceso, no revela secretos ni ejecuta herramientas arbitrarias. |
| VA21 | Dos activaciones simultáneas para mismo negocio | Asignar gratuidad | Un beneficio y condiciones copiadas; mes calendario calculado correctamente en fin de mes. |
| VA22 | Admin cambia tarifa/política después de contratar | Consultar contrato vigente | Conserva condiciones antiguas; nueva versión solo afecta nuevas asignaciones salvo ajuste auditado. |
| VA23 | Pago pendiente o confirmado con negocio suspendido | Seleccionar anuncio | Pago no habilita por sí solo; no hay nueva autorización si la elegibilidad no puede confirmarse. |
| VA24 | Cuota casi agotada, varias solicitudes concurrentes | Reservar cuota y registrar impresión | No excede cuota/frecuencia; solicitudes no cuentan como impresión; entrega_id deduplica. |
| VA25 | Proveedor consulta métricas de campaña ajena | GET métricas | Deniega; propia devuelve agregados sin conversaciones ni identidad de turistas. |
| VA26 | Dos PUT de like del mismo usuario/objetivo | Insertar y retirar | Un like activo, retirada idempotente y contador coherente. |
| VA27 | Respuesta con padre ajeno, ciclo o raíz distinta | Crear intervención | Rechaza; solo mismo hilo/objetivo y profundidad admitida. |
| VA28 | Turista elige viaje sin paquete | Buscar terminal y traslado | Obtiene puntos y ofertas verificadas con fuente; sin reserva ni ubicación del turista. |
| VA29 | Colección privada con recurso después retirado | Consultar guardados desde dos cuentas | Solo propietario; elemento retirado no expone copia privada del contenido. |
| VA30 | Cloudflare delante de dos sesiones | Repetir API/galería/perfil con caché | Ninguna respuesta privada compartida; derivados públicos sí siguen política. |
| VA31 | Rol SQL de un servicio y pool reutilizado | Acceder a otro esquema o con contexto anterior | Deniega otro esquema y no hereda identidad de conexión anterior. |
| VA32 | Copia de base y archivos de prueba | Restaurar en entorno aislado | Objetos y metadatos conciliados; no reactivar beneficio vencido o avisos duplicados. |
| VA33 | Documento/configuración candidatos al commit | Revisar rastreados, ignorados e historial | Cero secretos funcionales detectados en candidatos; valores reales nunca se imprimen. |
| VA34 | Preferencia de movimiento reducido | Abrir vista de acceso con logo | Logo intacto y estático, formulario accesible y sin retraso obligatorio. |
| VA35 | Acceso con teclado y pantalla móvil | Completar tareas de lectura/perfil/mapa | Foco visible, alternativas en lista, textos legibles y estados de error comprensibles. |

## 10.3 Estrategia de comprobación

El [plan de pruebas y calidad](11-pruebas-y-calidad.md) establece niveles, integraciones IT01–IT08, criterios de bloqueo y cobertura mínima del 90 % de líneas y ramas por servicio. Todas las pruebas obligatorias deben aprobarse. Las pruebas ejecutables del lector y prototipo se conservan en `tests/`; no acreditan el backend.

El diseño se revisa con trazabilidad, enlaces, límites C4, dirección de dependencias y ausencia de secretos. Al implementar: pruebas unitarias de reglas con Reloj/repositorios dobles; pruebas de contrato para SQL/IA/archivos; integración local de Auth, roles y Storage con datos ficticios; pruebas de concurrencia en likes, cuotas y beneficios; pruebas de API/seguridad; tareas y reentregas; carga de lectura y pruebas de usabilidad.

Las metas EQ existentes se evalúan en un entorno definido, con carga y conjunto de datos documentados. No se deduce rendimiento real de elegir Docker o Supabase. La evaluación de Gemini usa preguntas en español sobre catálogo, datos faltantes, presupuesto, movilidad y ataques de instrucciones; se registran respuestas inválidas, fidelidad de fuentes, latencia y costo sin datos personales.

## 10.4 Riesgos y decisiones pendientes

| ID | Tema y responsable | Acción necesaria antes de producción |
|---|---|---|
| DP01 | Modelo Gemini · equipo técnico/propietario | Evaluar modelo disponible, cuotas, costo, privacidad y región. El proveedor está decidido; el modelo exacto no. |
| DP02 | Hosting Docker · propietario/operación | Elegir capacidad y presupuesto, TLS de origen, red y recuperación. No se contrata recurso en esta entrega. |
| DP03 | Proveedor de teselas · equipo técnico | Piloto de bajo volumen sujeto a política OSM; revisar proveedor al crecer. No prometer gratuidad ilimitada. |
| DP04 | Tarifas y exposición · administrador | Definir importes, cuota, frecuencia y condiciones comerciales sin alterar contratos previos. |
| DP05 | Versiones y capacidad · equipo técnico | Fijar versiones compatibles/digests, pools y recursos tras prueba local. |
| DP06 | Conservación y tratamiento · propietario | Confirmar retenciones, información al usuario y tratamiento por proveedores; no asumir un plazo legal inventado. |
| DP07 | Correo · propietario | Mantener bandeja web como base; definir si se habilita correo y con qué proveedor. |
| DP08 | Recuperación · operación | Validar RPO/RTO propuestos y restaurar base y archivos por separado. |

Riesgos: base y proyecto Supabase compartidos concentran disponibilidad; siete servicios aumentan operación; consultas de elegibilidad agregan latencia; caché incorrecta puede filtrar detalle; el mapa depende de un proveedor sin SLA en piloto; una IA puede responder incorrectamente. Mitigaciones: aislamiento de permisos, límites de tiempo, respuestas alternativas, controles de caché y validación determinista de fuentes/precios.

## 10.5 Criterio de suficiencia del SDD

El diseño se considera listo para iniciar implementación por capacidad cuando el equipo puede identificar: requisito, dueño, datos, permiso, contrato, estados, fallos y escenario de comprobación. Un pendiente comercial o de contratación debe estar identificado y no sustituirse por un valor ficticio. La línea base se actualiza mediante cambios revisables en Git, sin duplicar versiones «final».

Esta entrega no contiene secretos reales, no crea cuentas ni servicios externos y no realiza commit/push. La aplicación, pruebas de ejecución y despliegue permanecen por desarrollar.
