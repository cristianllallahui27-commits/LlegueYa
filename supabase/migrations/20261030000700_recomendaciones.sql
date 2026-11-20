create table recomendaciones.viaje (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, criterios jsonb not null check(jsonb_typeof(criterios)='object'), desglose jsonb not null check(jsonb_typeof(desglose)='array'), total_estimado numeric(12,2) check(total_estimado>=0), moneda char(3) not null check(moneda ~ '^[A-Z]{3}$'), generado_en timestamptz not null default now()
);

create table recomendaciones.proyeccion_oferta (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  oferta_id uuid not null unique, version_fuente bigint not null check(version_fuente>0), resumen jsonb not null check(jsonb_typeof(resumen)='object'), actualizada_en timestamptz not null default now()
);

create table recomendaciones.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table recomendaciones.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function recomendaciones.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function recomendaciones.actualizar_version() from public;
create trigger actualizar_version before update on recomendaciones.viaje for each row execute function recomendaciones.actualizar_version();
alter table recomendaciones.viaje enable row level security;
alter table recomendaciones.viaje force row level security;
create trigger actualizar_version before update on recomendaciones.proyeccion_oferta for each row execute function recomendaciones.actualizar_version();
alter table recomendaciones.proyeccion_oferta enable row level security;
alter table recomendaciones.proyeccion_oferta force row level security;
create trigger actualizar_version before update on recomendaciones.auditoria for each row execute function recomendaciones.actualizar_version();
alter table recomendaciones.auditoria enable row level security;
alter table recomendaciones.auditoria force row level security;
alter table recomendaciones.inbox enable row level security;
alter table recomendaciones.inbox force row level security;
revoke all on all tables in schema recomendaciones from public;
alter default privileges in schema recomendaciones revoke all on tables from public;
alter default privileges in schema recomendaciones revoke execute on functions from public;
