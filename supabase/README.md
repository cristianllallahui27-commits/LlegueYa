# Base de datos de LlegueYa

Línea base inicial: **64 tablas**, siete esquemas privados y diez migraciones SQL ordenadas. Incluye identidad, catálogo/proveedores/movilidad, comunidad, eventos, publicidad, recomendaciones y asistente, además de objetos, auditoría, inbox y outbox locales. No crea usuarios reales, contraseñas, planes de pago ni información turística ficticia.

Proyecto indicado por el propietario: `zbpghcmxsxjngwbdehyh`. Conexión IPv4 verificada mediante Session Pooler (`aws-0-us-east-1.pooler.supabase.com:5432`). **Estado: 64 tablas creadas y verificadas en el proyecto remoto con RLS completo y roles de servicio configurados.**

## Etapa plataforma social · 17/11/2026

Nueva migración `migrations/20261117000100_plataforma_social.sql` (no modifica las anteriores):

- Catálogo: columnas `slug`, `zona`, `resumen`, `como_llegar`, `recomendaciones`, `altitud_m` en `lugar`; tabla `foto_externa` (fotos con licencia libre, autor y fuente); lectura de lo publicado y favoritos propios para `svc_catalogo`.
- Comunidad: tabla `autor` (nombre y avatar entregados por Identidad), `lugar_slug` y `foto_id` en `publicacion`, likes también sobre publicaciones, índices del muro y políticas RLS por `app.usuario_id`.
- Total: **66 tablas**, todas con RLS forzado.

Orden para aplicarla en Supabase (SQL Editor):

1. Pegar y ejecutar `migrations/20261117000100_plataforma_social.sql`.
2. Pegar y ejecutar `seed/catalogo-demostracion.sql` (8 lugares de demostración; se regenera con `python scripts/generar-seed-catalogo.py`).
3. Abrir `manual/crear-logins-servicios.sql`, reemplazar las contraseñas **en el editor** (no en el archivo) y ejecutarlo.
4. En tu `.env`: `DB_CATALOGO_DSN` y `DB_COMUNIDAD_DSN` con esos logins por el Session pooler.

`tests/test_postgres.py` prueba todo esto contra un PostgreSQL 16 desechable (migraciones, seed, RLS por usuario, likes idempotentes, hilos y guardados).

Migración `20261118000100_administracion.sql`: políticas de moderación para `svc_comunidad`, activas solo cuando el backend fija `app.es_admin` tras validar que la sesión es de un administrador.

## Archivos y flujo

- `migrations/`: fuente SQL versionada, en orden de nombre. No editar una migración después de aplicarla; todo cambio posterior lleva otro archivo.
- `tests/validar-base.mjs`: ejecución en PostgreSQL embebido PGlite con base nueva y datos ficticios, cerrada al terminar.
- `scripts/preparar-sql-supabase.py`: genera un único instalador en `reports/instalar-supabase.sql`, ignorado por Git. La fuente sigue siendo `migrations/`.
- `scripts/generar-base-inicial.py`: generador de esta primera línea base. No volver a ejecutarlo sobre una base publicada; no aplica SQL remoto.

La estructura de archivos usa nombres de migración compatibles con la convención temporal de Supabase, pero **no se ha inicializado ni utilizado Supabase CLI**. Ejecutar el instalador en SQL Editor no registra automáticamente el historial del CLI. Antes de adoptar `db push`, hacer `db pull` y conciliar la línea base; nunca volver a ejecutar estas tablas a ciegas.

## Crear las tablas en Supabase sin compartir contraseña

1. Confirmar que estás en el proyecto indicado y que es nuevo/vacío, como confirmó el propietario.
2. Generar el instalador desde la raíz: `python scripts/preparar-sql-supabase.py`. Ya se generó una copia para esta entrega.
3. Abrir `reports/instalar-supabase.sql` en VS Code y copiar **todo** su contenido.
4. En Supabase → SQL Editor → nueva consulta, pegar y ejecutar como propietario de migración. La transacción crea todo o revierte todo. No contiene DROP ni altera esquemas gestionados por Supabase.
5. Ejecutar la consulta de verificación siguiente. El resultado esperado es 64 tablas, todas con RLS habilitado y forzado.
6. En Table Editor, seleccionar cada esquema privado en el selector; no buscar las tablas únicamente en `public`. No añadir estos esquemas a los expuestos por Data API.

```sql
select n.nspname as esquema,
       count(*) as tablas,
       bool_and(c.relrowsecurity and c.relforcerowsecurity) as rls_completo
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname in
 ('identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente')
group by n.nspname order by n.nspname;
```

Si ya existe un esquema o un rol reservado `svc_*`, el instalador se detiene. No borres tablas ni cambies a `IF NOT EXISTS` para ocultar discrepancias: revisar primero. Ante un error, compartir solo el código SQLSTATE y el nombre del archivo/objeto, nunca credenciales.

## Distribución

| Esquema | Tablas |
|---|---:|
| identidad | 6 |
| catalogo | 15 |
| comunidad | 12 |
| eventos | 10 |
| publicidad | 12 |
| recomendaciones | 4 |
| asistente | 5 |

## Seguridad y límites

- UUID, fechas UTC, importes decimales, restricciones de moneda/estados/fechas/coordenadas y claves únicas de likes, reseñas activas, gratuidad y entregas lógicas.
- Solo FK dentro del esquema propietario, con índices de soporte. Identificadores externos se validarán por API; no hay trigger invasivo sobre `auth.users`.
- Roles `svc_*` sin login ni privilegios de superusuario, propietarios o BYPASSRLS. Los logins de conexión se crearán por servicio en una etapa posterior con credenciales privadas y membresía mínima; la aplicación no debe usar `postgres`.
- RLS habilitado y forzado en todas las tablas. `anon`, `authenticated`, `service_role` y PUBLIC sin concesiones a estos esquemas. Esto no restringe al administrador de la base y no reemplaza la configuración de Data API.
- Única política runtime inicial: `svc_identidad` puede consultar su perfil y editar nombre/bio propios con contexto transaccional de usuario validado por API; no cambiar estado/roles. Las otras operaciones siguen denegadas hasta implementar sus políticas y servicios. Nunca establecer ese contexto a partir de un UUID enviado libremente por el navegador.
- Crear tablas no conecta automáticamente la API actual: la sesión continúa en memoria. Alta de perfil, sesión cifrada persistente, rotación, permisos administrativos y Storage requieren la etapa 02. Los buckets y sus políticas aún no se crean.
- La unicidad de la medición se define como `(entrega_id, evento_tipo)` para permitir distinguir impresión y clic de una misma entrega. Ese ajuste se recoge en el diccionario SDD.
- Las transiciones de publicación, validación de fotos, referencias polimórficas, presupuesto, reserva atómica de cuotas y revisión de pagos deben implementarse en sus servicios con pruebas. Una restricción SQL no equivale a esos casos de uso completos.

## Validación realizada

27 comprobaciones aprobadas en PostgreSQL embebido: diez aplicaciones SQL y controles de tablas/RLS, aislamiento de esquemas, permisos, contexto transaccional, unicidad, hilos, fechas y gratuidad. No es una prueba de Google, Supabase Auth, Storage, Data API, concurrencia bajo carga ni PostgreSQL remoto.

Para repetir: instalar `@electric-sql/pglite` en un entorno de herramientas y ejecutar `node supabase/tests/validar-base.mjs`; `PGLITE_MODULE` puede apuntar a su `dist/index.js` si está fuera del repositorio. Node se usa solo como herramienta de validación. Docker se intentó, pero el motor no estuvo disponible; no se declara validación Docker.

## Si deseas que el agente aplique la base mediante conexión

Configura la contraseña exclusivamente en el `.env` local como `PGPASSWORD`, nunca en mensajes, comandos ni la cadena rastreada. Faltan contraseña y comprobación de conexión TLS. El acceso directo indicado requiere soporte IPv6; si tu red no lo tiene, copiar desde Connect la configuración **Session pooler**, sin inventar su host/región/usuario. No usar transaction pooler para migraciones. Configurar un cliente de migración separado antes de ejecutar; ningún script de esta entrega usa todavía esas credenciales.

Para el inicio con Google también faltan la clave `SUPABASE_PUBLISHABLE_KEY` y habilitar el proveedor Google con su Client ID/Secret en el panel. Esa contraseña PostgreSQL y la clave Gemini no reemplazan las credenciales OAuth. Ver [guía de Google](../docs/06-desarrollo/GOOGLE-SUPABASE.md).

## Referencias

[Supabase: conexión PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [migraciones](https://supabase.com/docs/guides/local-development/cli-workflows), [skills oficiales](https://github.com/supabase/agent-skills). Consulta 30/10/2026. Se instalaron `supabase` y `supabase-postgres-best-practices` en Codex; estarán disponibles automáticamente desde el próximo turno. Sus archivos no se copian al proyecto.
