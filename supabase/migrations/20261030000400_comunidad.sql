create table comunidad.objeto (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, bucket text not null, clave_aleatoria text not null, mime_validado text, bytes bigint check(bytes>0), hash_integridad text, estado text not null default 'pendiente' check(estado in ('pendiente','validado','rechazado','retirado')), visibilidad text not null default 'privada' check(visibilidad in ('privada','publica')), padre_tipo text not null, padre_id uuid not null, unique(bucket,clave_aleatoria), check(visibilidad='privada' or estado='validado')
);

create table comunidad.publicacion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  autor_id uuid not null, destino_id uuid, objetivo_tipo text, objetivo_id uuid, texto text not null default '' check(length(texto)<=10000), estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), publicado_en timestamptz, check((objetivo_tipo is null)=(objetivo_id is null)), check(estado<>'publicado' or publicado_en is not null)
);

create table comunidad.comentario (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  autor_id uuid not null, objetivo_tipo text not null, objetivo_id uuid not null, padre_id uuid references comunidad.comentario(id), raiz_id uuid references comunidad.comentario(id), profundidad smallint not null default 0 check(profundidad between 0 and 5), texto text not null check(length(trim(texto)) between 1 and 3000), estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), check(padre_id is null or padre_id<>id), check(raiz_id is null or raiz_id<>id), check((padre_id is null and raiz_id is null and profundidad=0) or (padre_id is not null and raiz_id is not null and profundidad>0))
);

create table comunidad.like (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, objetivo_tipo text not null check(objetivo_tipo in ('foto','comentario','respuesta')), objetivo_id uuid not null, unique(usuario_id,objetivo_tipo,objetivo_id)
);

create table comunidad.resena (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, negocio_id uuid not null, puntuacion smallint not null check(puntuacion between 1 and 5), texto text not null, estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado'))
);

create table comunidad.reporte (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  autor_id uuid not null, objetivo_tipo text not null, objetivo_id uuid not null, motivo text not null, estado text not null default 'pendiente' check(estado in ('pendiente','resuelto','desestimado')), decision_administrativa text
);

create table comunidad.contenido_cultural (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  tipo text not null check(tipo in ('historia','fotografia','libro','referencia')), titulo varchar(160) not null, cuerpo text, referencia text, autor_fuente text not null, destino_id uuid, estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), check(cuerpo is not null or referencia is not null)
);

create table comunidad.coleccion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, nombre varchar(80) not null check(length(trim(nombre))>0), descripcion text
);

create table comunidad.elemento_coleccion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  coleccion_id uuid not null references comunidad.coleccion(id), objetivo_tipo text not null, objetivo_id uuid not null, agregado_en timestamptz not null default now(), unique(coleccion_id,objetivo_tipo,objetivo_id)
);

create table comunidad.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table comunidad.outbox (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  tipo text not null, aggregate_id uuid not null, aggregate_version bigint not null check(aggregate_version>0), schema_version integer not null check(schema_version>0), payload jsonb not null check(jsonb_typeof(payload)='object'), ocurrido_en timestamptz not null default now(), publicado_en timestamptz, intentos integer not null default 0 check(intentos>=0)
);

create table comunidad.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function comunidad.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function comunidad.actualizar_version() from public;
create trigger actualizar_version before update on comunidad.objeto for each row execute function comunidad.actualizar_version();
alter table comunidad.objeto enable row level security;
alter table comunidad.objeto force row level security;
create trigger actualizar_version before update on comunidad.publicacion for each row execute function comunidad.actualizar_version();
alter table comunidad.publicacion enable row level security;
alter table comunidad.publicacion force row level security;
create trigger actualizar_version before update on comunidad.comentario for each row execute function comunidad.actualizar_version();
alter table comunidad.comentario enable row level security;
alter table comunidad.comentario force row level security;
create trigger actualizar_version before update on comunidad.like for each row execute function comunidad.actualizar_version();
alter table comunidad.like enable row level security;
alter table comunidad.like force row level security;
create trigger actualizar_version before update on comunidad.resena for each row execute function comunidad.actualizar_version();
alter table comunidad.resena enable row level security;
alter table comunidad.resena force row level security;
create trigger actualizar_version before update on comunidad.reporte for each row execute function comunidad.actualizar_version();
alter table comunidad.reporte enable row level security;
alter table comunidad.reporte force row level security;
create trigger actualizar_version before update on comunidad.contenido_cultural for each row execute function comunidad.actualizar_version();
alter table comunidad.contenido_cultural enable row level security;
alter table comunidad.contenido_cultural force row level security;
create trigger actualizar_version before update on comunidad.coleccion for each row execute function comunidad.actualizar_version();
alter table comunidad.coleccion enable row level security;
alter table comunidad.coleccion force row level security;
create trigger actualizar_version before update on comunidad.elemento_coleccion for each row execute function comunidad.actualizar_version();
alter table comunidad.elemento_coleccion enable row level security;
alter table comunidad.elemento_coleccion force row level security;
create trigger actualizar_version before update on comunidad.auditoria for each row execute function comunidad.actualizar_version();
alter table comunidad.auditoria enable row level security;
alter table comunidad.auditoria force row level security;
create trigger actualizar_version before update on comunidad.outbox for each row execute function comunidad.actualizar_version();
alter table comunidad.outbox enable row level security;
alter table comunidad.outbox force row level security;
alter table comunidad.inbox enable row level security;
alter table comunidad.inbox force row level security;
revoke all on all tables in schema comunidad from public;
alter default privileges in schema comunidad revoke all on tables from public;
alter default privileges in schema comunidad revoke execute on functions from public;
