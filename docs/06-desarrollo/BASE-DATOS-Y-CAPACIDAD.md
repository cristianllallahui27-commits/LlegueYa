# Base de datos, capacidad y siguientes pasos

## 1. Estado de la base en Supabase

Revisado desde el SQL Editor del proyecto `zbpghcmxsxjngwbdehyh`:

| Qué | Resultado |
|---|---|
| Esquemas | 7, uno por servicio: `identidad`, `catalogo`, `comunidad`, `eventos`, `publicidad`, `recomendaciones`, `asistente` |
| Tablas | 66, todas con RLS activado, incluidas `catalogo.foto_externa` y `comunidad.autor` |
| Migraciones | Todas las de `supabase/migrations/` aplicadas, incluidas `20261117000100_plataforma_social`, `20261118000100_administracion` y `20261118000200_catalogo_admin` |
| Políticas RLS | 29 en `catalogo` y `comunidad`. Administración crea, edita y retira lugares solo con `app.es_admin` activo |
| Índices de lectura | `publicacion_muro`, `comentario_objetivo`, `like_objetivo`, `foto_externa_lugar` |
| Datos | Catálogo de demostración: 4 destinos, 8 lugares y 12 fotos con autor y licencia |
| Roles | `svc_*` sin login; `svc_catalogo` solo lee el catálogo publicado y gestiona favoritos propios |
| Logins de servicio | `llegueya_catalogo` y `llegueya_comunidad` se crean con `supabase/manual/crear-logins-servicios.sql` (paso 2) |

Sin `DB_*_DSN` en el `.env`, el backend usa los repositorios en memoria con los mismos casos de uso; con ellas, usa PostgreSQL. Es la misma sustitución de adaptadores que describe la arquitectura.

## 2. Conectar el backend a la base (lo haces tú, una sola vez)

1. Abre `supabase/manual/crear-logins-servicios.sql`, reemplaza cada `<<CONTRASEÑA_…>>` por una contraseña larga de tu gestor y ejecútalo en Supabase → SQL Editor. No guardes el archivo con las contraseñas.
2. En el `.env` completa (Session pooler, IPv4):

   ```
   DB_CATALOGO_DSN=postgresql://llegueya_catalogo.zbpghcmxsxjngwbdehyh:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   DB_COMUNIDAD_DSN=postgresql://llegueya_comunidad.zbpghcmxsxjngwbdehyh:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

3. Reinicia `iniciar-llegueya.bat`. El catálogo vendrá de Supabase y lo que publique la comunidad quedará guardado.

Nunca uses el usuario `postgres` ni la clave `service_role` en el backend: los logins `llegueya_*` solo heredan su rol `svc_*` y la RLS sigue aplicando.

## 3. Administración

El correo de administración es el que figura en `ADMIN_CORREOS` del `.env` (en desarrollo, el correo institucional del dueño del proyecto Supabase). Esa cuenta ve la pestaña **Administración** con: Lugares (agregar, editar, retirar y volver a publicar, con ubicación en el mapa y fotos con licencia), Moderación, Reportes, Fotos y publicaciones, Cuentas (incluida la baja masiva), Negocios y Planes. Para sumar otro administrador se agrega su correo separado por coma y se reinicia el servidor.

**Modo de pruebas:** en Supabase la opción «Confirm email» está desactivada, así que cualquier correo que se registre queda activo al instante y se puede usar sin costo. **Para usuarios reales:** se configura un SMTP gratuito (Brevo o Resend) en Authentication → Emails → SMTP Settings y se vuelve a activar «Confirm email». Sin SMTP propio, Supabase solo envía correos a los miembros del equipo del proyecto.

## 4. ¿Necesitamos otra base de datos?

No para reemplazar a PostgreSQL: es la correcta para este proyecto (relaciones entre lugares, publicaciones, comentarios y likes; RLS por usuario; transacciones). Lo que sí conviene es sumar almacenes para tres cosas que hoy no escalan:

| Problema actual | Recomendación | Por qué | Costo |
|---|---|---|---|
| Las fotos de la comunidad se guardan en el disco de cada backend: con 2 backends no se ven entre sí y se pierden al redeplegar | **Cloudflare R2** (o Supabase Storage) | Almacén de objetos compartido, sin costo de salida en R2 y servido desde la CDN | R2 tiene 10 GB gratis al mes |
| Las sesiones viven en memoria del backend: obligan a afinidad y se pierden al reiniciar | **Redis** (Upstash) o una tabla `identidad.sesion_refresh` cifrada (ya existe en el modelo) | Cualquier backend valida cualquier sesión y el balanceo puede ser libre | Upstash tiene plan gratuito; la tabla no cuesta nada |
| El límite de intentos es por backend | El mismo Redis, o la regla de *Rate limiting* del WAF de Cloudflare | Límite global, no por réplica | WAF: 1 regla gratis |

Lo que **no** recomiendo: Cloudflare D1 o una base NoSQL. Partiría los datos en dos lugares sin ganar nada, y D1 no se usa desde un backend Python fuera de Workers.

## 5. Capacidad aproximada

| Capa | Límite del plan gratuito | Qué significa para LlegueYa |
|---|---|---|
| Cloudflare Workers | 100 000 peticiones/día a `/api` (estáticos ilimitados) | Unos 1 000–2 000 usuarios activos al día con uso normal; el catálogo cacheado no gasta backend |
| Supabase Free | 500 MB de base, 1 GB de archivos, 50 000 usuarios activos al mes, se pausa tras 7 días sin uso | Texto de miles de publicaciones cabe en 500 MB; **las fotos no**: van a R2 |
| Backend (1 réplica pequeña) | En una máquina de 2 CPU, ≈ 750 peticiones/s y p95 ≤ 2 s hasta unos 1 000 usuarios ([mediciones](../07-sprint2/07-validacion-atributos-calidad.md#eq-03-escalabilidad)); en el hosting elegido se repite con `tests/carga/k6-plataforma.js` | Con 2 réplicas detrás del Worker el rendimiento sube un 43 % |

Antes de la presentación conviene abrir el proyecto Supabase o hacer una consulta para que no esté pausado.

Cuándo subir de plan: si la base pasa de 400 MB, si se necesitan copias diarias o si el proyecto no puede pausarse (Supabase Pro), y si `/api` pasa de 100 000 peticiones diarias (Workers Paid, 5 USD al mes).

## 6. Otras mejoras que suman en la rúbrica

1. **Fotos en R2** con URL firmada para subir y CDN para mostrar (el adaptador `AlmacenLocal` ya está aislado detrás de un puerto; solo cambia la infraestructura).
2. **Sesiones en la base**, para quitar la afinidad y permitir balanceo libre.
3. **Copias de seguridad**: un `pg_dump` semanal programado desde GitHub Actions a un bucket R2 privado.
4. **Monitoreo**: Workers Logs (incluido) para el borde y `/api/v1/health` revisado por un *Health Check* de Cloudflare o por UptimeRobot.
5. **Pasarela de pago** (Culqi o Mercado Pago) en el módulo de Publicidad, reemplazando el registro manual del pago.
