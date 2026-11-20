# 05 · Contratos de API e integraciones

[Índice](README.md) · [Anterior](04-datos-y-supabase.md) · [Siguiente](06-flujos-y-estados.md)

## 5.1 Convenciones comunes

Base lógica `/api/v1`. JSON UTF-8, fechas ISO 8601 con zona, UUID y moneda/unidad explícitas. Las listas devuelven `items`, `next_cursor` y `has_more`; límite propuesto 20, máximo 50. Cursor opaco derivado de fecha/id evita duplicaciones al insertar nuevos elementos. Toda respuesta incluye `request_id`. Se validan campos permitidos y se rechazan propiedades administrativas en DTO de perfil o publicación.

Autenticación: access JWT en `Authorization: Bearer ...`, obtenido de I; el token real nunca aparece en ejemplos. I conserva refresh cifrado en el servidor y entrega cookie opaca HttpOnly/Secure/SameSite con ruta de autenticación. El access token se mantiene en memoria de WEB; al recargar se recupera mediante refresh autorizado. No se guarda en URL ni en almacenamiento persistente del navegador. Las operaciones con cookie exigen comprobación de Origin y defensa CSRF.

Las APIs validan firma/issuer/audience/expiración del JWT con la configuración de Auth y comprueban estado/permisos actuales con I para datos autenticados. Una cuenta suspendida no conserva permisos por tener un JWT aún válido. Las llamadas internas transportan identidad validada y credencial de servicio de alcance mínimo. Los endpoints `/internal/` no son accesibles desde el proxy público.

## 5.2 Catálogo de operaciones

Público = vista previa. Titular = sesión y propiedad. Admin = autorización administrativa actual. El servicio dueño realiza la comprobación, aunque GW haya admitido la solicitud.

| Servicio | Método y recurso | Permiso | Entrada/salida y efecto |
|---|---|---|---|
| I | POST `/auth/registro`, `/auth/sesion` | Público con controles de abuso | Datos de cuenta hacia Supabase Auth; no permite rol administrativo. Registro puede requerir confirmación. |
| I | POST `/auth/refresh`, `/auth/salir` | Cookie válida y CSRF | Renueva o revoca sesión; no expone refresh al frontend. |
| I | POST `/auth/recuperacion` | Público limitado | Respuesta uniforme para evitar enumerar correos. |
| I | GET/PATCH `/perfil` | Titular | Perfil propio; solo nombre, biografía, avatar autorizado e intereses permitidos. |
| I | PATCH `/preferencias` | Titular | Idioma y visibilidad; notificaciones se coordinan con E, sin escribir sus tablas. |
| I | GET `/internal/contexto` | Servicio autorizado | Cuenta activa y permisos vigentes para el sujeto validado. |
| C | GET `/catalogo/tarjetas` | Público | Filtros destino, tipo, categoría y cursor; devuelve solo campos de vista previa. |
| C | GET `/catalogo/fichas/{id}` | Sesión | Detalle según tipo, galería autorizada, acceso y contacto. |
| C | GET `/catalogo/mapa` | Público | `bbox=west,south,east,north`, zoom, tipo/destino; GeoJSON limitado de puntos públicos aprobados. |
| C | GET `/movilidad/puntos`, `/movilidad/ofertas` | Público para tarjeta; detalle con sesión | Terminal, embarque y traslados por origen/destino sin exigir paquete. |
| C | POST/PATCH `/negocios`, `/ofertas/{id}` | Proveedor titular | Datos comerciales y evidencia; revisión según estado. |
| C | POST `/propuestas/lugares` | Sesión | Datos/fotos de lugar o camping, fuente y condiciones; queda pendiente. |
| C | POST `/admin/revisiones/{id}` | Admin | Decisión, motivo y versión; publica o solicita información. |
| C | PUT/DELETE `/favoritos/{tipo}/{id}` | Titular | Agrega o retira favorito de forma idempotente. |
| C | GET `/internal/elegibilidad/{tipo}/{id}` | Servicio autorizado | Estado actual, anunciante autorizado y versión de fuente. |
| M | GET `/comunidad/muro` | Público/resumen o sesión | Publicaciones aprobadas, destino/servicio, orden reciente, cursor. |
| M | GET `/comunidad/publicaciones/{id}` | Sesión para detalle | Contenido e hilos visibles sin expedientes. |
| M | POST/PATCH/DELETE `/comunidad/publicaciones/{id}` | Titular | Crear, editar con revisión o retirar; POST usa recurso colección sin id. |
| M | GET/POST `/comunidad/objetivos/{tipo}/{id}/comentarios` | Sesión | Texto/fotos, padre opcional y raíz; valida acceso del objetivo. |
| M | PUT/DELETE `/comunidad/objetivos/{tipo}/{id}/like` | Sesión | Un like activo por sujeto; repetir no duplica ni produce error artificial. |
| M | PUT `/comunidad/negocios/{id}/resena` | Sesión | Puntuación y texto propios, con moderación. |
| M | POST `/comunidad/reportes` | Sesión | Motivo y objetivo visible; identidad del reportante protegida. |
| M | POST/PATCH `/colecciones`, `/colecciones/{id}` | Titular | Colecciones privadas y nombre/descripcion. |
| M | PUT/DELETE `/colecciones/{id}/elementos/{tipo}/{objetivo}` | Titular | Guardado idempotente con validación de acceso. |
| M | POST `/admin/contenido-cultural`, `/admin/moderacion/{id}` | Admin | Publicar historia/foto/libro o revisar contenido con motivo y versión. |
| E | GET `/eventos/calendario` | Público/resumen | Mes, año y destino; fechas concretas, estado y fuente. |
| E | POST `/eventos/propuestas` | Sesión | Título, organizador, lugar, inicio/fin, fuente y foto. |
| E | POST `/admin/eventos/{id}/decision` | Admin | Aprobar, rechazar, pedir cambios o cancelar con versión y motivo. |
| E | PUT/DELETE `/suscripciones/{tipo}/{id}` | Titular | Activa/desactiva preferencia y recordatorio. |
| E | GET `/notificaciones`; PATCH `/notificaciones/{id}` | Titular | Bandeja y leído; propiedad del destinatario. |
| E | GET `/internal/eventos/{id}/elegibilidad` | Servicio autorizado | Estado, fecha, organizador y versión vigentes. |
| P | GET/POST/PATCH `/admin/planes`, `/admin/politica-gratuita` | Admin | Configura precio, cuota, duración y versión de aplicación. |
| P | POST `/campanias`; PATCH `/campanias/{id}` | Proveedor autorizado | Objetivo, creatividad y fuente de financiación; edición reabre revisión. |
| P | POST `/contrataciones`; POST `/pagos/evidencias` | Titular | Contrato congelado y comprobante privado; no cobra una tarjeta. |
| P | POST `/admin/pagos/{id}/revision` | Admin | Confirmación/rechazo con monto/referencia verificados y motivo. |
| P | GET `/campanias/{id}/metricas` | Titular/Admin | Agregados propios por periodo/canal; no lista identidades de turistas. |
| P | POST `/internal/anuncios/seleccion` | Servicio autorizado | Candidatos/contexto e idempotencia; devuelve anuncios autorizados y entrega_id. |
| P | POST `/anuncios/{entrega_id}/mediciones` | Contexto de entrega validado | Impresión/clic deduplicados, sin confiar en identidad arbitraria del cuerpo. |
| R | POST `/recomendaciones/viajes` | Sesión | Grupo, fechas, destino y presupuesto; devuelve desglose compatible, estimado y fuentes. |
| R | GET/POST `/viajes-guardados` | Titular | Guardar/consultar propuesta propia; no reserva. |
| A | POST `/asistente/consultas` | Público general; sesión para detalle | Pregunta y contexto limitado; respuesta validada con fuentes o solicitud de inicio de sesión. |
| A | GET/DELETE `/asistente/conversaciones/{id}` | Titular | Historial propio y solicitud de eliminación según retención. |
| Dueño | POST `/archivos/solicitudes`; POST `/archivos/{id}/confirmacion` | Sesión/propiedad | Autoriza carga concreta y confirma vínculo, formato, tamaño y estado. La ruta se enruta según tipo de padre. |
| Dueño | GET `/archivos/{id}/contenido` | Según visibilidad actual | Sirve binario autorizado con `private, no-store` para galería/evidencia. |

Las rutas con varios verbos son familias de contrato, no una implementación existente. El OpenAPI ejecutable se elaborará al implementar las APIs y deberá conservar esta semántica y su trazabilidad.

## 5.3 DTO y validaciones

| Contrato | Campos y condiciones |
|---|---|
| PerfilEditable | nombre_visible 2–80, biografia 0–300, avatar_id propio aprobado o pendiente, intereses ids válidos. `rol`, `estado` y `usuario_id` ajenos rechazados. |
| PublicacionEntrada | texto 0–5000, foto_ids propios hasta 10, referencia opcional; exige texto o foto. Límites propuestos configurables. |
| ComentarioEntrada | texto 0–1500, foto_ids hasta 3, padre_id opcional inmutable; mismo objetivo/raíz, profundidad máxima propuesta 5. |
| MapaFiltro | bbox válida, zoom acotado, categorías existentes. Máximo propuesto 200 puntos; `truncated=true` obliga a refinar vista o filtro. No recibe posición de usuario. |
| MovilidadDetalle | punto, operador, destinos, horarios y precio/unidad si confirmados, revisado_en y fuente. Diferencia desconocido de no disponible. |
| CriteriosViaje | destino, fechas válidas, adultos >=1, menores >=0, presupuesto positivo, moneda, modalidad total/por_persona, días y preferencias. |
| EventoEntrada | inicio < fin, zona IANA, organizador, fuente y objeto_foto válido. Proponer no acredita autorización comercial del organizador. |
| SeleccionAnuncios | solicitud_id, usuario/contexto validado, objetivo/candidatos, canal, instante servidor. No acepta cuotas o elegibilidad decididas por cliente. |
| ArchivoEntrada | foto JPEG/PNG/WebP hasta 8 MiB propuesta; evidencia PDF hasta 10 MiB propuesta. Extensión no sustituye detección de formato. Rechazar SVG/HTML activos en cargas de usuario. |

Éxitos: 200 consulta/actualización, 201 creación, 202 trabajo pendiente, 204 retirada idempotente. Errores: 400 formato, 401 sesión ausente/expirada, 403 sin permiso, 404 recurso no visible o inexistente, 409 versión/unicidad conflictiva, 413 tamaño, 415 formato, 422 validación, 429 límite y 503 dependencia necesaria no verificable. La respuesta usa `error.codigo`, `mensaje`, `campos` opcionales y `request_id`, sin SQL ni secretos.

Las escrituras de creación/revisión usan `Idempotency-Key` con ámbito sujeto+ruta y hash del cuerpo. Misma clave y cuerpo devuelve resultado previo; misma clave con otro cuerpo devuelve 409. Ediciones/revisiones usan versión esperada o If-Match. Una reserva fallida no genera impresión.

## 5.4 Eventos y conciliación

Envelope: `event_id`, `event_type`, `schema_version`, `aggregate_id`, `aggregate_version`, `occurred_at`, `producer`, `correlation_id`, `payload`. El payload contiene ids/estado/versiones mínimos, no contraseñas, comprobantes o conversaciones. El tipo del evento es estable; un cambio incompatible incrementa versión de esquema.

| Productor | Evento | Consumidores y efecto |
|---|---|---|
| C | CatalogoPublicado, ObjetivoRetirado, NegocioSuspendido | P invalida elegibilidad; R actualiza proyección; A retira conocimiento; E genera aviso solo a suscritos pertinentes. |
| M | ContenidoAprobado, ContenidoRetirado | E avisa según suscripción; A actualiza solo material autorizado; contadores y derivados se invalidan. |
| E | EventoPublicado, EventoModificado, EventoCancelado | P impide nuevas entregas; R/A actualizan información; E invalida/reprograma recordatorios locales. |
| P | CampaniaActivada, CampaniaSuspendida, BeneficioPorVencer | E avisa al negocio autorizado; R/A invalidan proyecciones publicitarias que mantengan. |
| I | PerfilActualizado, CuentaSuspendida, CuentaCerrada | Consumidores autorizados actualizan proyecciones de autor público y coordinan retención; permisos se revalidan en I, no solo por evento. |

El procesamiento confirma broker después de transacción local con inbox. Duplicados no repiten efectos; versiones viejas no pisan nuevas. Reintentos propuestos 5 con retroceso y jitter; fallo persistente pasa a cola de revisión. La conciliación compara versiones y pendientes sin reclamar entrega exactamente una vez.

## 5.5 Gemini y presupuesto

A llama a Gemini mediante GeneradorRespuesta exclusivamente desde servidor. `GEMINI_MODEL` es configurable; se seleccionará un modelo disponible mediante evaluación de respuestas en español, latencia, límites y costo. La clave se inyecta como secreto. Contexto: extractos permitidos, referencias de fuente y precios calculados; no se envían credenciales, expediente, correo, comprobante ni historial completo innecesario.

Salida lógica exigida: `texto`, `fuentes[{tipo,id,version}]`, `opciones[{objetivo_id,costo_estimado,moneda,patrocinado}]`, `datos_no_confirmados` y `requiere_sesion`. Se valida estructura y que cada id/precio provenga del contexto. No se acepta un total distinto al calculado por R. Una respuesta inválida se descarta y se devuelve una plantilla con datos estructurados. El texto se escapa antes de renderizar; instrucciones dentro de relatos no modifican las reglas del sistema.

Límites propuestos: pregunta 2000 caracteres, contexto acotado por configuración, 15 segundos por llamada y reintento solo cuando no duplique una operación de negocio. Un fallo no bloquea catálogo ni movilidad. No se habilitan herramientas arbitrarias, ejecución de código ni acceso a base de datos por el modelo.

## 5.6 Mapa y Cloudflare

La API de mapa devuelve GeoJSON `FeatureCollection`, con `geometry` Point `[lon,lat]` y propiedades públicas `id`, `tipo`, `titulo`, `resumen`, `ficha_path`. Seleccionar un marcador abre tarjeta; detalle exige sesión. El cliente descarta resultados de viewport anteriores para no reemplazar una consulta más reciente. HTML de terceros no se inyecta en popups.

Cloudflare entrega recursos estáticos y derivados públicos definidos por reglas explícitas. Se omite caché compartida para `/api/`, sesiones, perfil, conversaciones y contenido privado. El origen valida HTTPS, host y encabezados de proxy confiables. La CDN propia no se usa para replicar las teselas de OpenStreetMap sin permiso y política compatible.
