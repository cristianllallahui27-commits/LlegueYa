# Base de datos de LlegueYa

Una base Supabase PostgreSQL con **siete esquemas privados**, uno por servicio (`identidad`, `catalogo`, `comunidad`, `eventos`, `publicidad`, `recomendaciones`, `asistente`): **67 tablas**, todas con RLS habilitado y forzado, y **33 políticas** de acceso. Incluye además objetos, auditoría, inbox y outbox locales. No crea usuarios reales, contraseñas ni planes de pago.

Proyecto Supabase del equipo: `zbpghcmxsxjngwbdehyh`, con conexión IPv4 por Session Pooler (`aws-0-us-east-1.pooler.supabase.com:5432`).

## Archivos

| Carpeta | Contenido |
|---|---|
| `migrations/` | Fuente SQL versionada, en orden de nombre. Una migración aplicada no se edita: cada cambio posterior lleva un archivo nuevo. |
| `seed/` | `catalogo-demostracion.sql`: lugares de demostración (se regenera con `python scripts/generar-seed-catalogo.py`). |
| `manual/` | `crear-logins-servicios.sql`: logins `llegueya_*` por servicio; las contraseñas se escriben en el editor de Supabase, nunca en el archivo. |
| `tests/` | `validar-base.mjs`: aplica todas las migraciones en PostgreSQL embebido (PGlite) y comprueba tablas, RLS, aislamiento y permisos. |

## Migraciones

| Migración | Qué agrega |
|---|---|
| `20261030000100` a `20261030001000` | Esquemas, tablas de los siete servicios, integridad, índices y permisos base (roles `svc_*`). |
| `20261117000100_plataforma_social` | Catálogo: `slug`, `zona`, `resumen`, `como_llegar`, `recomendaciones`, `altitud_m` y tabla `foto_externa`. Comunidad: tabla `autor`, likes sobre publicaciones, índices del muro y políticas RLS por `app.usuario_id`. |
| `20261118000100_administracion` | Políticas de moderación para `svc_comunidad`, activas solo con `app.es_admin` fijado por el backend tras validar la sesión. |
| `20261118000200_catalogo_admin` | Gestión de lugares por administración con RLS condicionada a `app.es_admin`. |
| `20261120000100_categorias_y_baja` | Categorías de gastronomía y artesanía, baja definitiva de lugares y fotos subidas por administración. |
| `20261123000100_entrada_lugar` | Costo de entrada, dónde se compra y enlace de compra (`entrada_*`). |
| `20261124000100_terminales` | Tabla `catalogo.terminal` (terminales y paraderos) con lectura pública y gestión de administración. |

Con Docker, `infra/docker/db-init/` aplica todas las migraciones y el seed la primera vez que se crea el volumen, y habilita el login de `svc_catalogo` y `svc_comunidad` con contraseñas del entorno.

## Aplicar en Supabase

1. Generar el instalador desde la raíz: `python scripts/preparar-sql-supabase.py` → `reports/instalar-supabase.sql` (ignorado por Git; la fuente sigue siendo `migrations/`).
2. En Supabase → SQL Editor → nueva consulta, pegar y ejecutar como propietario de migración. La transacción crea todo o revierte todo; no contiene DROP ni altera esquemas gestionados por Supabase. En un proyecto que ya tiene la base, ejecutar solo las migraciones nuevas, en orden.
3. Ejecutar `seed/catalogo-demostracion.sql` y `manual/crear-logins-servicios.sql`.
4. En el `.env` local: `DB_CATALOGO_DSN` y `DB_COMUNIDAD_DSN` con esos logins por el Session Pooler (no usar el transaction pooler para migraciones).
5. Verificar con la consulta siguiente: 67 tablas, todas con RLS habilitado y forzado. En Table Editor, elegir cada esquema privado en el selector (no están en `public`) y no añadirlos a los expuestos por Data API.

```sql
select n.nspname as esquema,
       count(*) as tablas,
       bool_and(c.relrowsecurity and c.relforcerowsecurity) as rls_completo
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname in
 ('identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente')
group by n.nspname order by n.nspname;
```

Si ya existe un esquema o un rol reservado `svc_*`, el instalador se detiene: revisar la discrepancia antes de continuar. Ante un error, compartir solo el código SQLSTATE y el nombre del archivo u objeto, nunca credenciales.

## Distribución

| Esquema | Tablas |
|---|---:|
| identidad | 6 |
| catalogo | 17 |
| comunidad | 13 |
| eventos | 10 |
| publicidad | 12 |
| recomendaciones | 4 |
| asistente | 5 |

## Seguridad

- UUID, fechas UTC, importes decimales, restricciones de moneda, estados, fechas y coordenadas, y claves únicas de likes, reseñas activas, gratuidad y entregas lógicas.
- Solo FK dentro del esquema propietario, con índices de soporte. Los identificadores de otros servicios se validan por API; no hay trigger sobre `auth.users`.
- Roles `svc_*` sin login ni privilegios de superusuario, propietario o BYPASSRLS. El backend se conecta con un login por servicio (`llegueya_*`) y hace `set local role svc_*` en cada transacción; nunca usa `postgres` ni la clave `service_role`.
- RLS habilitado y forzado en todas las tablas. `anon`, `authenticated`, `service_role` y PUBLIC no tienen concesiones sobre estos esquemas.
- El contexto `app.usuario_id` y `app.es_admin` lo fija el backend por transacción con `set_config(..., true)` tras validar la sesión; nunca a partir de un identificador enviado por el navegador.
- Las transiciones de publicación, validación de fotos, presupuesto y revisión de pagos viven en los casos de uso de cada servicio, con sus pruebas; las restricciones SQL son la segunda línea de defensa.

## Validación

- `node supabase/tests/validar-base.mjs`: aplica las 16 migraciones en PGlite y comprueba tablas y RLS, aislamiento entre esquemas, roles, contexto transaccional, unicidad, hilos, fechas y gratuidad. Requiere `@electric-sql/pglite` (o `PGLITE_MODULE` apuntando a su `dist/index.js`).
- `tests/test_postgres.py`: migraciones, seed, RLS por usuario y repositorios reales contra PostgreSQL 16 (en CI con `TEST_DATABASE_URL`).
- Comportamiento con volumen (20 000 publicaciones, índices y planes de ejecución): [Sprint 2 · Base de datos y caché](../docs/07-sprint2/04-base-de-datos-y-cache.md).

Credenciales: la contraseña PostgreSQL va solo en el `.env` local (`PGPASSWORD`), nunca en mensajes, comandos ni archivos versionados. Google se configura aparte: [guía de Google](../docs/06-desarrollo/GOOGLE-SUPABASE.md).

## Referencias

[Supabase: conexión PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [migraciones](https://supabase.com/docs/guides/local-development/cli-workflows). Consulta 30/10/2026.
