# 2. Especificaciones SDD de las funcionalidades implementadas

Cada funcionalidad de esta primera versión tiene su historia de usuario ([HU del Sprint 1](../01-analisis-de-sistema/02-historias-de-usuario.md)), sus criterios de aceptación en formato **Dado / Cuando / Entonces**, las tareas técnicas que la hicieron posible y las pruebas automatizadas que la comprueban. Los criterios son los mismos que ejecutan las pruebas: si una prueba falla, el criterio no se cumple.

Convención de pruebas: `pytest` = `tests/test_*.py`, `jest-api` = `tests/jest/api/*.test.mjs`, `jest-unidad` = `tests/jest/unidad/*.test.mjs`, `e2e` = paso de `tests/web-navegador.mjs`.

---

## F01 · Cuenta con correo o Google y recuperación de clave

**HU01** · Como turista, quiero registrarme e iniciar sesión para comentar, puntuar y conversar con Willaq Uma. · **RF01, RF46** · Servicio: Identidad

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** un correo válido y una clave de 8 a 72 caracteres con letras y números, **cuando** me registro, **entonces** quedo con sesión iniciada (cookie `ly_session` HttpOnly) | jest-api `identidad` · e2e «Registro con correo institucional» |
| CA2 | **Dado** una clave corta o sin números, **cuando** me registro, **entonces** recibo 422 con el motivo en español y no se crea la cuenta | jest-api `identidad` · jest-unidad `problemaClave` |
| CA3 | **Dado** un correo ya registrado, **cuando** intento registrarlo otra vez, **entonces** recibo 409 | jest-api `identidad` |
| CA4 | **Dado** una clave equivocada, **cuando** inicio sesión, **entonces** recibo 401 con el mismo mensaje exista o no el correo (no se revelan cuentas) | jest-api `identidad` |
| CA5 | **Dado** 10 intentos fallidos desde una IP en un minuto, **cuando** hago el siguiente, **entonces** recibo 429 y otras IP siguen funcionando | jest-api `identidad` · pytest `test_cuentas` |
| CA6 | **Dado** que olvidé mi clave, **cuando** pido recuperarla y abro el enlace en el mismo navegador, **entonces** puedo crear una clave nueva y entrar con ella | e2e «recuperación de clave» · pytest `test_cuentas` |
| CA7 | **Dado** que Google está activo en Supabase, **cuando** elijo «Continuar con Google», **entonces** vuelvo con sesión mediante PKCE | e2e «Acceso con Google (doble)» · pytest `test_identidad` |
| CA8 | **Dado** una petición de escritura sin el `Origin` del sitio, **entonces** se rechaza con 403 (CSRF) | jest-api `identidad` |

Tareas técnicas: puerto `ProveedorIdentidad` y adaptador `Supabase` (signup, token, recover, PKCE) · reglas `validar_correo/clave/nombre` en el dominio · códigos HTTP por tipo de fallo (`ESTADOS_HTTP`) · `LimiteSimple` por IP · cookies `ly_session` (path `/api`) y `ly_flow` · diálogo de acceso con pestañas Entrar, Crear cuenta y Recuperar · vista `#/nueva-clave`.

## F02 · Explorar lugares, ficha y mapa

**HU02, HU03** · Como turista, quiero consultar los lugares con su forma de acceso y verlos en el mapa para planificar mi visita. · **RF02-RF05** · Servicio: Catálogo

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** que no inicié sesión, **cuando** abro una ficha, **entonces** veo la vista previa (`requiere_sesion: true`) sin «cómo llegar» y la respuesta no se guarda en cachés compartidas | jest-api `catalogo` · e2e «Ficha sin sesión» |
| CA2 | **Dado** que inicié sesión, **cuando** abro la ficha, **entonces** veo cómo llegar, recomendaciones y galería con autor y licencia | jest-api `catalogo` |
| CA3 | **Dado** un texto o un tipo, **cuando** busco, **entonces** solo aparecen lugares publicados que coinciden; un tipo inexistente da 422 | jest-api `catalogo` · e2e «Explorar filtra» |
| CA4 | **Dado** la lista pública, **cuando** la pido dos veces con `If-None-Match`, **entonces** recibo 304 y `Cache-Control` con `s-maxage` | jest-api `catalogo` |
| CA5 | **Dado** el mapa, **cuando** toco un pin, **entonces** veo el lugar, su tipo por color y un enlace «Cómo llegar» a Google Maps, sin que LlegueYa pida mi ubicación | e2e «Mapa con capas» · jest-unidad `enlaceComoLlegar` |

Tareas técnicas: `Catalogo.buscar/ficha` con paginación · `RepositorioEnCache` (TTL) sobre `RepositorioPostgres` · ETag y `Cache-Control` diferenciados · mapa Leaflet con capas Mapa, Satélite y Relieve, pines SVG por tipo y escala.

## F03 · Gestión de lugares por administración

**HU17, HU22** · Como administrador, quiero registrar lugares con su ubicación para guiar al turista al lugar correcto. · **RF26, RF52** · Servicio: Catálogo

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** que soy administración, **cuando** creo un lugar con su punto en el mapa, **entonces** aparece en Explorar, el mapa y Willaq Uma con un enlace propio (slug) | jest-api `catalogo` · e2e «Administración agrega, edita y retira» |
| CA2 | **Dado** un punto fuera de Ayacucho, una foto sin autor o licencia, o un tipo inválido, **entonces** recibo 422 con el motivo | jest-api `catalogo` · pytest `test_administracion` |
| CA3 | **Dado** un lugar retirado, **cuando** un visitante lo abre, **entonces** recibe 404; al volver a publicarlo, reaparece | jest-api `catalogo` |
| CA4 | **Dado** una cuenta sin rol de administración, **cuando** intenta crear o retirar, **entonces** recibe 403 y nada cambia | jest-api `permisos` · pytest `test_catalogo_admin_con_rls` |

Tareas técnicas: `Catalogo.guardar_lugar/cambiar_estado_lugar` · `construir_lugar` con validaciones · migración `20261118000200_catalogo_admin.sql` (políticas RLS condicionadas a `app.es_admin`) · pestaña «Lugares» con selector de ubicación.

## F04 · Comunidad: publicar, moderar, me gusta y comentarios

**HU07, HU08, HU20, HU21** · Como turista, quiero publicar mi experiencia con fotos y comentar para orientar a otros viajeros. · **RF06-RF12** · Servicio: Comunidad

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** que no inicié sesión, **cuando** intento publicar, comentar o dar me gusta, **entonces** recibo 401 y la web me pide entrar | jest-api `permisos` · e2e «Me gusta sin sesión» |
| CA2 | **Dado** que publico, **entonces** la publicación queda «en revisión» y solo aparece en el muro cuando administración la aprueba | jest-api `comunidad` |
| CA3 | **Dado** una foto, **entonces** solo se aceptan JPEG, PNG o WebP de hasta 5 MB (se revisa el contenido, no la extensión) | pytest `test_plataforma` |
| CA4 | **Dado** que doy me gusta varias veces, **entonces** el contador sube una sola vez (idempotente) | jest-api `comunidad` · e2e «Me gusta optimista» |
| CA5 | **Dado** un comentario, **cuando** alguien responde, **entonces** forma un hilo; no se puede responder a lo que sigue en revisión | jest-api `comunidad` · e2e «Comentar y responder» |

## F05 · Reportes, moderación y cuentas

**HU19, HU21** · Como administrador, quiero moderar contenido y dar de baja cuentas falsas para mantener una comunidad confiable. · **RF20-RF25, RF55** · Servicios: Comunidad, Identidad y Administración

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** una publicación ajena, **cuando** la reporto con un motivo de la lista, **entonces** llega a la bandeja de administración; no puedo reportar lo mío ni dos veces lo mismo | jest-api `comunidad` · pytest `test_administracion` |
| CA2 | **Dado** un reporte, **cuando** administración decide retirar, desestimar o retirar y suspender al autor, **entonces** el muro lo refleja de inmediato | jest-api `comunidad` · e2e «Administración resuelve reportes» |
| CA3 | **Dado** una foto inadecuada, **cuando** administración la quita, **entonces** la publicación sigue sin la foto y el archivo se elimina | pytest `test_reportes_quitar_foto_y_retirar` · e2e |
| CA4 | **Dado** una cuenta suspendida, **entonces** pierde la sesión, no puede volver a entrar y su contenido se oculta | jest-api `permisos` |
| CA5 | **Dado** varias cuentas marcadas, **cuando** administración aplica la baja masiva, **entonces** se suspenden todas excepto la propia | pytest `test_http_reportes_contenido_y_suspension_masiva` · e2e |
| CA6 | **Dado** cualquier ruta de `/api/v1/admin/*`, **entonces** sin sesión da 401 y sin rol da 403 | jest-api `permisos` (11 rutas) |

## F06 · Willaq Uma y plan de viaje

**HU13, HU14, HU27** · Como turista, quiero que el guía me recomiende y organice mi viaje según lo que me gusta. · **RF14-RF16, RF35, RF47** · Servicios: Asistente y Recomendaciones

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** que es mi primera conversación, **entonces** Willaq Uma se presenta («Bienvenido, soy Willaq Uma…»); si vuelvo, saluda según la hora; si la conversación es seguida, no repite el saludo | jest-unidad `tipoDeSaludo` · pytest `test_plataforma` |
| CA2 | **Dado** cualquier pregunta, **entonces** solo cita lugares y eventos publicados en LlegueYa; lo que no existe lo dice, no lo inventa | jest-api `asistente` (5 preguntas, incluida «Machu Picchu y Máncora») |
| CA3 | **Dado** «arma un viaje de N días», **entonces** propone un plan por días que puedo aceptar y queda en «Mi viaje» | jest-api `asistente` · pytest `test_willaq_propone_plan…` |
| CA4 | **Dado** un plan alterado con lugares que no existen, **cuando** intento guardarlo, **entonces** recibo 422 | jest-api `asistente` |
| CA5 | **Dado** que no inicié sesión, **cuando** escribo a Willaq Uma, **entonces** me pide entrar (401) | jest-api `permisos` |

## F07 · Negocios verificados: Servicios y artesanía

**HU04, HU15, HU16, HU25, HU26, HU28** · Como proveedor, quiero registrar mi negocio con su ubicación y ofertas, y como administrador verificarlo, para que el turista vea opciones confiables. · **RF30-RF33, RF38-RF45** · Servicio: Publicidad

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** una solicitud, **cuando** administración intenta aprobarla sin todos los requisitos del rubro, **entonces** recibe 422 | jest-api `publicidad` |
| CA2 | **Dado** un negocio aprobado, **entonces** aparece en Servicios y artesanía con su pin en el mapa y sus ofertas «desde S/» | jest-api `publicidad` · e2e «Servicios sin sesión» |
| CA3 | **Dado** que no inicié sesión, **entonces** veo el negocio pero no su contacto | jest-api `publicidad` · e2e |
| CA4 | **Dado** una ubicación fuera de Ayacucho, más de 8 ofertas o un precio negativo, **entonces** la solicitud se rechaza | jest-api `publicidad` · pytest `test_directorio…` |

## F08 · Calendario de festividades

**HU23, HU24** · Como turista, quiero ver las actividades por mes y suscribirme. · **RF27-RF29** · Servicio: Eventos

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** el calendario, **entonces** los eventos se agrupan por mes y se ven sin sesión | jest-unidad `agruparPorMes` · pytest |
| CA2 | **Dado** que no inicié sesión, **cuando** quiero suscribirme, **entonces** recibo 401 | jest-api `permisos` |

## F09 · Borde en Cloudflare: CDN, caché y balanceo

**Driver DA01 / ADR-001** (escalabilidad y disponibilidad) · Infraestructura

| # | Criterio de aceptación | Prueba |
|---|---|---|
| CA1 | **Dado** la web, **entonces** se sirve como archivos estáticos desde la CDN sin llamar al backend | jest-unidad `borde` |
| CA2 | **Dado** una lectura pública del catálogo sin sesión, **entonces** la primera vez es MISS y la siguiente HIT, sin llamar al backend | jest-unidad `borde` · `wrangler dev` |
| CA3 | **Dado** un backend caído, **entonces** las lecturas pasan al otro y el caído sale 30 s de la rotación; una escritura nunca se repite | jest-unidad `borde` |
| CA4 | **Dado** una petición que no viene del Worker, **entonces** el backend la rechaza con 403 (candado de origen) | jest-api `identidad` · pytest `test_candado_de_origen…` |
