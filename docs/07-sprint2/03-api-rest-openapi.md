# 3. API REST documentada con OpenAPI / Swagger

La API de LlegueYa tiene **80 operaciones REST** en 8 grupos, uno por servicio de la arquitectura más Administración. El contrato **se genera desde el código**: FastAPI lo deriva de las rutas y de los modelos Pydantic de entrada, así que no puede quedar desactualizado respecto a lo que se ejecuta.

## 3.1 Dónde verla

| Recurso | URL con el servidor local | Uso |
|---|---|---|
| **Swagger UI** | <http://127.0.0.1:8000/api/docs> | Explorar y probar cada endpoint («Try it out») desde el navegador |
| Contrato OpenAPI 3 | <http://127.0.0.1:8000/api/openapi.json> | Importar en Postman, Insomnia o generadores de clientes |
| Copia versionada | [`api/openapi.json`](api/openapi.json) | Entregable del sprint; el CI comprueba que coincide con el código (`python scripts/exportar-openapi.py --check`) |

Swagger UI se sirve desde `apps/web/vendor/swagger-ui`, sin CDN externos. Así cumple la misma política de seguridad de contenido (CSP) que el resto del sitio.

Para probar endpoints con sesión en Swagger, primero inicia sesión en la web en la misma pestaña o usa `POST /api/v1/auth/entrar` desde Swagger. El navegador guarda la cookie `ly_session` y Swagger la envía sola.

## 3.2 Convenciones

| Tema | Regla |
|---|---|
| Versionado | Todo bajo `/api/v1/…`. Un cambio incompatible abriría `/api/v2` sin romper la web actual |
| Recursos | Sustantivos en español y plural (`/lugares`, `/publicaciones`, `/comentarios`). Las acciones que no son CRUD usan un subrecurso (`/estado`, `/decision`, `/quitar-foto`) |
| Métodos | `GET` lee sin efectos · `POST` crea o ejecuta una acción · `PUT` fija un estado idempotente (favorito, me gusta, suscripción, requisito) · `DELETE` elimina |
| Autenticación | Cookie `ly_session` HttpOnly, SameSite=Lax y `Path=/api`. En Swagger se declara como esquema `sesion` (apiKey en cookie) |
| CSRF | Toda escritura debe traer el `Origin` del sitio; si no, responde 403 |
| Errores | Siempre `{"detail": "mensaje en español para la persona"}` |
| Códigos | 200/201 éxito · 304 sin cambios (ETag) · 401 falta sesión · 403 sin permiso, cuenta suspendida o CSRF · 404 no existe o no es visible · 409 conflicto (correo ya registrado) · 413 archivo demasiado grande · 422 datos inválidos o regla de negocio · 429 demasiados intentos o cuenta bloqueada · 503 servicio externo no disponible |
| Paginación | `?desde=0&limite=24` con límites máximos por recurso (48 lugares, 30 publicaciones) |
| Caché | Lecturas públicas con `Cache-Control: public, max-age, s-maxage, stale-while-revalidate` y `ETag`. Respuestas con sesión: `private, no-store` |

Cada operación del contrato indica en su descripción quién puede llamarla: **Pública**, **Sesión** (401 sin ella) o **Admin** (401 sin sesión, 403 sin rol). La prueba `tests/jest/api/permisos.test.mjs` recorre esa matriz contra el servidor real.

## 3.3 Endpoints

### Identidad (12)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/health` | Estado del servicio y métodos de acceso activos | Pública |
| `POST` | `/api/v1/auth/registro` | Crear cuenta con correo y clave | Pública |
| `POST` | `/api/v1/auth/verificar` | Activar la cuenta con el código enviado al correo | Pública |
| `POST` | `/api/v1/auth/reenviar` | Reenviar el código de verificación | Pública |
| `POST` | `/api/v1/auth/entrar` | Iniciar sesión con correo y clave | Pública |
| `POST` | `/api/v1/auth/recuperar` | Pedir enlace para recuperar la clave | Pública |
| `GET` | `/api/v1/auth/recuperacion` | Volver del enlace de recuperación (redirección) | Pública |
| `POST` | `/api/v1/auth/clave` | Cambiar la clave de la sesión actual | Sesión |
| `POST` | `/api/v1/auth/google` | Iniciar sesión con Google (redirección PKCE) | Pública |
| `GET` | `/api/v1/auth/callback` | Volver de Google o de la confirmación de correo | Pública |
| `GET` | `/api/v1/auth/me` | Datos de la sesión actual (incluye si es admin) | Sesión |
| `POST` | `/api/v1/auth/logout` | Cerrar sesión | Sesión |

### Catálogo (21)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/catalogo/lugares` | Buscar lugares (texto, tipo, destino) con paginación | Pública |
| `GET` | `/api/v1/catalogo/lugares/{slug}` | Ficha de un lugar: vista previa sin sesión, completa con sesión | Pública |
| `GET` | `/api/v1/catalogo/geo/buscar` | Buscar puntos de referencia (OpenStreetMap/Photon, gratis) | Pública |
| `GET` | `/api/v1/catalogo/geo/ruta` | Ruta, distancia y tiempo entre dos puntos (OSRM, gratis) | Pública |
| `GET` | `/api/v1/catalogo/transporte` | Paraderos, pasaje y tiempo aproximados para llegar a cada destino | Pública |
| `GET` | `/api/v1/catalogo/terminales` | Terminales y paraderos de autos y buses (referencia para viajar por cuenta propia) | Pública |
| `POST` | `/api/v1/catalogo/admin/terminales` | Crear un terminal o paradero | Admin |
| `PUT` | `/api/v1/catalogo/admin/terminales/{tid}` | Corregir un terminal o paradero | Admin |
| `DELETE` | `/api/v1/catalogo/admin/terminales/{tid}` | Eliminar un terminal o paradero | Admin |
| `GET` | `/api/v1/catalogo/mapa` | Puntos del mapa | Pública |
| `GET` | `/api/v1/catalogo/destinos` | Destinos con cantidad de lugares | Pública |
| `PUT` | `/api/v1/catalogo/favoritos/{slug}` | Guardar o quitar un lugar de favoritos | Sesión |
| `GET` | `/api/v1/catalogo/favoritos` | Mis lugares favoritos | Sesión |
| `GET` | `/api/v1/catalogo/admin/lugares` | Todos los lugares, también los retirados | Admin |
| `POST` | `/api/v1/catalogo/admin/lugares` | Crear un lugar turístico | Admin |
| `PUT` | `/api/v1/catalogo/admin/lugares/{slug}` | Editar un lugar turístico | Admin |
| `DELETE` | `/api/v1/catalogo/admin/lugares/{slug}` | Eliminar un lugar de forma definitiva | Admin |
| `POST` | `/api/v1/catalogo/admin/lugares/{slug}/estado` | Retirar o volver a publicar un lugar | Admin |
| `DELETE` | `/api/v1/catalogo/admin/demostracion` | Eliminar todos los lugares de demostración | Admin |
| `POST` | `/api/v1/catalogo/admin/fotos` | Subir una foto (JPG, PNG o WebP, máx. 5 MB) para un lugar | Admin |
| `GET` | `/api/v1/catalogo/fotos/{nombre}` | Foto de un lugar subida por administración | Pública |

### Comunidad (11)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/comunidad/muro` | Muro de publicaciones (paginado) | Pública |
| `GET` | `/api/v1/comunidad/destacados` | Viajeros con más me gusta recibidos | Pública |
| `POST` | `/api/v1/comunidad/publicaciones` | Publicar una experiencia con foto opcional | Sesión |
| `POST` | `/api/v1/comunidad/likes` | Dar o quitar me gusta (idempotente) | Sesión |
| `GET` | `/api/v1/comunidad/publicaciones/{pid}/comentarios` | Comentarios en hilo de una publicación | Pública |
| `POST` | `/api/v1/comunidad/publicaciones/{pid}/comentarios` | Comentar o responder | Sesión |
| `PUT` | `/api/v1/comunidad/guardados/{pid}` | Guardar una publicación en mi colección | Sesión |
| `GET` | `/api/v1/comunidad/motivos-reporte` | Motivos válidos para reportar | Pública |
| `POST` | `/api/v1/comunidad/publicaciones/{pid}/reportes` | Reportar una publicación | Sesión |
| `GET` | `/api/v1/comunidad/yo` | Mis publicaciones y guardados | Sesión |
| `GET` | `/api/v1/comunidad/fotos/{fid}` | Foto de una publicación visible | Pública |

### Eventos (6)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/eventos` | Próximos eventos y festividades | Pública |
| `GET` | `/api/v1/eventos/admin` | Todos los eventos, también los pasados | Admin |
| `POST` | `/api/v1/eventos/admin` | Crear un evento del calendario (con foto opcional) | Admin |
| `PUT` | `/api/v1/eventos/admin/{eid}` | Editar un evento o cambiar su foto | Admin |
| `DELETE` | `/api/v1/eventos/admin/{eid}` | Eliminar un evento | Admin |
| `PUT` | `/api/v1/eventos/{eid}/suscripcion` | Suscribirme o no a un evento | Sesión |

### Publicidad (14)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/publicidad/rubros` | Rubros y requisitos de verificación | Pública |
| `GET` | `/api/v1/publicidad/planes` | Planes activos y comparación de niveles Básico, Plus y Premium | Pública |
| `POST` | `/api/v1/publicidad/fotos` | Subir una foto de mi negocio (según el plan) | Sesión |
| `GET` | `/api/v1/publicidad/fotos/{nombre}` | Foto de un negocio | Pública |
| `GET` | `/api/v1/publicidad/anuncios` | Anuncios patrocinados vigentes | Pública |
| `GET` | `/api/v1/publicidad/directorio` | Directorio de servicios y artesanía (contacto solo con sesión) | Pública |
| `POST` | `/api/v1/publicidad/solicitudes` | Registrar mi negocio y pedir promoción | Sesión |
| `GET` | `/api/v1/publicidad/mis-solicitudes` | Mis solicitudes de negocio | Sesión |
| `GET` | `/api/v1/publicidad/admin/solicitudes` | Todas las solicitudes de negocios | Admin |
| `POST` | `/api/v1/publicidad/admin/planes` | Crear un plan de promoción | Admin |
| `PUT` | `/api/v1/publicidad/admin/planes/{pid}` | Editar precio, moneda y duración de un plan, o activarlo/desactivarlo | Admin |
| `PUT` | `/api/v1/publicidad/admin/solicitudes/{sid}/requisitos` | Marcar un requisito como cumplido | Admin |
| `POST` | `/api/v1/publicidad/admin/solicitudes/{sid}/pago` | Registrar el pago manual | Admin |
| `POST` | `/api/v1/publicidad/admin/solicitudes/{sid}/decision` | Aprobar o rechazar un negocio | Admin |

### Recomendaciones (3)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/recomendaciones/viajes` | Mis viajes aceptados | Sesión |
| `POST` | `/api/v1/recomendaciones/viajes` | Aceptar el plan de viaje de Willaq Uma | Sesión |
| `DELETE` | `/api/v1/recomendaciones/viajes/{vid}` | Eliminar un viaje | Sesión |

### Asistente (2)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/asistente/presentacion` | Presentación de Willaq Uma | Pública |
| `POST` | `/api/v1/asistente/mensajes` | Conversar con Willaq Uma (respuestas basadas en la plataforma) | Sesión |

### Administración (11)

| Método | Ruta | Qué hace | Acceso |
|---|---|---|---|
| `GET` | `/api/v1/admin/resumen` | Cifras del panel de administración | Admin |
| `GET` | `/api/v1/admin/moderacion` | Contenido pendiente de revisión | Admin |
| `POST` | `/api/v1/admin/moderacion/{tipo}/{oid}` | Aprobar o rechazar una publicación o comentario | Admin |
| `GET` | `/api/v1/admin/reportes` | Reportes pendientes | Admin |
| `POST` | `/api/v1/admin/reportes/{rid}` | Resolver un reporte (retirar, desestimar, suspender autor) | Admin |
| `GET` | `/api/v1/admin/contenido` | Publicaciones visibles para revisar fotos | Admin |
| `POST` | `/api/v1/admin/publicaciones/{pid}/retirar` | Retirar una publicación | Admin |
| `POST` | `/api/v1/admin/publicaciones/{pid}/quitar-foto` | Quitar la foto de una publicación | Admin |
| `POST` | `/api/v1/admin/cuentas/suspension-masiva` | Suspender varias cuentas a la vez | Admin |
| `GET` | `/api/v1/admin/cuentas` | Cuentas conocidas y su estado | Admin |
| `POST` | `/api/v1/admin/cuentas/{uid}/suspension` | Suspender o reactivar una cuenta | Admin |

## 3.4 Cómo se comprueba que la documentación es cierta

- `tests/jest/api/contrato.test.mjs`: el contrato es OpenAPI 3, tiene los 8 grupos, cada operación tiene resumen y seguridad declarada, todos los `GET` públicos sin parámetros obligatorios responden y Swagger UI no usa CDN.
- `scripts/exportar-openapi.py --check` en el CI: falla si un endpoint no tiene resumen o si `api/openapi.json` no coincide con el código.
- `tests/test_plataforma.py` comprueba que `ENDPOINTS` (`services/compartido/documentacion.py`) declara exactamente las operaciones del contrato, con su nivel de acceso.
- La colección de Postman (`infra/postman/`) se genera desde el mismo contrato con `python scripts/generar_postman.py`.
- El resto de suites Jest de API (`identidad`, `catalogo`, `comunidad`, `asistente`, `publicidad`, `permisos`) ejercitan los mismos endpoints que describe Swagger, con sus códigos de respuesta.
