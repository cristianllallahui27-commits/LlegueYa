create table asistente.conversacion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, titulo varchar(160) not null, estado text not null default 'activa' check(estado in ('activa','cerrada','eliminada')), vence_retencion timestamptz not null, check(vence_retencion>creado_en)
);

create table asistente.mensaje (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  conversacion_id uuid not null references asistente.conversacion(id), rol text not null check(rol in ('usuario','asistente')), texto text not null, fuentes jsonb not null default '[]' check(jsonb_typeof(fuentes)='array'), modelo text
);

create table asistente.documento_conocimiento (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  fuente_tipo text not null, fuente_id uuid not null, version_fuente bigint not null check(version_fuente>0), visibilidad text not null check(visibilidad in ('publica','registrados')), contenido_reducido text not null, estado text not null check(estado in ('aprobado','retirado')), unique(fuente_tipo,fuente_id)
);

create table asistente.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table asistente.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function asistente.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function asistente.actualizar_version() from public;
create trigger actualizar_version before update on asistente.conversacion for each row execute function asistente.actualizar_version();
alter table asistente.conversacion enable row level security;
alter table asistente.conversacion force row level security;
create trigger actualizar_version before update on asistente.mensaje for each row execute function asistente.actualizar_version();
alter table asistente.mensaje enable row level security;
alter table asistente.mensaje force row level security;
create trigger actualizar_version before update on asistente.documento_conocimiento for each row execute function asistente.actualizar_version();
alter table asistente.documento_conocimiento enable row level security;
alter table asistente.documento_conocimiento force row level security;
create trigger actualizar_version before update on asistente.auditoria for each row execute function asistente.actualizar_version();
alter table asistente.auditoria enable row level security;
alter table asistente.auditoria force row level security;
alter table asistente.inbox enable row level security;
alter table asistente.inbox force row level security;
revoke all on all tables in schema asistente from public;
alter default privileges in schema asistente revoke all on tables from public;
alter default privileges in schema asistente revoke execute on functions from public;
