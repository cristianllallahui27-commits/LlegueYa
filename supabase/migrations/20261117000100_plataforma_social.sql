-- LlegueYa · Etapa plataforma social (Catálogo de lectura + Comunidad)
-- Nuevo archivo: las migraciones 2026103000xxxx ya están aplicadas y no se editan.
-- Concede a svc_catalogo y svc_comunidad SOLO lo que usan sus casos de uso,
-- con RLS: el usuario lo fija la API en app.usuario_id dentro de la transacción.

-- ---------------------------------------------------------------- Catálogo
alter table catalogo.lugar
  add column slug varchar(80) unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add column zona varchar(120),
  add column resumen varchar(280),
  add column como_llegar text,
  add column recomendaciones text[] not null default '{}',
  add column altitud_m integer check (altitud_m between 0 and 7000);

-- Fotos con licencia libre alojadas fuera (p. ej. Wikimedia Commons). Se guardan
-- autor, licencia y página de origen para mostrar la atribución.
create table catalogo.foto_externa (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(),
  lugar_id uuid not null references catalogo.lugar(id), orden smallint not null default 0,
  url text not null check (url like 'https://%'), autor text not null, licencia text not null,
  fuente_url text not null check (fuente_url like 'https://%'), descripcion text not null default '',
  unique (lugar_id, orden)
);
create index foto_externa_lugar on catalogo.foto_externa(lugar_id);
alter table catalogo.foto_externa enable row level security;
alter table catalogo.foto_externa force row level security;
revoke all on catalogo.foto_externa from public;

grant select on catalogo.destino, catalogo.lugar, catalogo.foto_externa to svc_catalogo;
grant select, insert, delete on catalogo.favorito to svc_catalogo;

create policy destino_publicado on catalogo.destino for select to svc_catalogo using (estado = 'publicado');
create policy lugar_publicado on catalogo.lugar for select to svc_catalogo using (estado = 'publicado');
create policy foto_de_lugar_publicado on catalogo.foto_externa for select to svc_catalogo
  using (exists (select 1 from catalogo.lugar l where l.id = lugar_id and l.estado = 'publicado'));
create policy favorito_propio on catalogo.favorito for all to svc_catalogo
  using (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid)
  with check (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);

-- ---------------------------------------------------------------- Comunidad
-- Proyección local del autor (nombre y avatar que entrega Identidad). Evita
-- consultar el esquema identidad desde Comunidad.
create table comunidad.autor (
  usuario_id uuid primary key, nombre_visible varchar(100) not null,
  avatar_url text check (avatar_url is null or avatar_url like 'https://%'),
  actualizado_en timestamptz not null default now()
);
alter table comunidad.autor enable row level security;
alter table comunidad.autor force row level security;
revoke all on comunidad.autor from public;

alter table comunidad.publicacion
  add column lugar_slug varchar(80),
  add column foto_id uuid references comunidad.objeto(id);
create index publicacion_muro on comunidad.publicacion(estado, creado_en desc);
create index comentario_objetivo on comunidad.comentario(objetivo_tipo, objetivo_id, creado_en);
create index like_objetivo on comunidad.like(objetivo_tipo, objetivo_id);

-- Likes también sobre publicaciones (además de fotos y comentarios).
alter table comunidad.like drop constraint like_objetivo_tipo_check;
alter table comunidad.like add constraint like_objetivo_tipo_check
  check (objetivo_tipo in ('foto', 'comentario', 'respuesta', 'publicacion'));

grant select, insert, update on comunidad.autor to svc_comunidad;
grant select, insert on comunidad.publicacion, comunidad.comentario, comunidad.objeto to svc_comunidad;
grant select, insert, delete on comunidad.like to svc_comunidad;
grant select, insert on comunidad.coleccion to svc_comunidad;
grant select, insert, delete on comunidad.elemento_coleccion to svc_comunidad;

create policy autor_lectura on comunidad.autor for select to svc_comunidad using (true);
create policy autor_propio_alta on comunidad.autor for insert to svc_comunidad
  with check (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);
create policy autor_propio_cambio on comunidad.autor for update to svc_comunidad
  using (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid)
  with check (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);

-- Se ve lo publicado y lo propio en revisión; nadie ve borradores ajenos.
create policy publicacion_visible on comunidad.publicacion for select to svc_comunidad
  using (estado = 'publicado' or autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid);
create policy publicacion_propia on comunidad.publicacion for insert to svc_comunidad
  with check (autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid
              and estado in ('en_revision', 'publicado'));

create policy comentario_visible on comunidad.comentario for select to svc_comunidad
  using (estado = 'publicado' or autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid);
create policy comentario_propio on comunidad.comentario for insert to svc_comunidad
  with check (autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid
              and estado in ('en_revision', 'publicado'));

create policy like_lectura on comunidad.like for select to svc_comunidad using (true);
create policy like_propio_alta on comunidad.like for insert to svc_comunidad
  with check (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);
create policy like_propio_baja on comunidad.like for delete to svc_comunidad
  using (usuario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);

create policy objeto_visible on comunidad.objeto for select to svc_comunidad
  using (propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid
         or exists (select 1 from comunidad.publicacion p where p.foto_id = objeto.id));
create policy objeto_propio on comunidad.objeto for insert to svc_comunidad
  with check (propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);

create policy coleccion_propia on comunidad.coleccion for all to svc_comunidad
  using (propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid)
  with check (propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid);
create policy elemento_propio on comunidad.elemento_coleccion for all to svc_comunidad
  using (exists (select 1 from comunidad.coleccion k where k.id = coleccion_id
         and k.propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid))
  with check (exists (select 1 from comunidad.coleccion k where k.id = coleccion_id
         and k.propietario_id = nullif(current_setting('app.usuario_id', true), '')::uuid));
