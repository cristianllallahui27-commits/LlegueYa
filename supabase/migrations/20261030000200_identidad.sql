create table identidad.objeto (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, bucket text not null, clave_aleatoria text not null, mime_validado text, bytes bigint check(bytes>0), hash_integridad text, estado text not null default 'pendiente' check(estado in ('pendiente','validado','rechazado','retirado')), visibilidad text not null default 'privada' check(visibilidad in ('privada','publica')), padre_tipo text not null, padre_id uuid not null, unique(bucket,clave_aleatoria), check(visibilidad='privada' or estado='validado')
);

create table identidad.perfil (
  usuario_id uuid primary key, nombre_visible varchar(80) not null check(length(trim(nombre_visible))>0), biografia varchar(300) not null default '', avatar_id uuid references identidad.objeto(id), estado text not null default 'activo' check(estado in ('activo','suspendido','cerrado')), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0)
);

create table identidad.asignacion_rol (
  usuario_id uuid references identidad.perfil(usuario_id), rol text check(rol in ('turista','proveedor','administrador')), otorgado_por uuid not null, otorgado_en timestamptz not null default now(), primary key(usuario_id,rol)
);

create table identidad.preferencia (
  usuario_id uuid primary key references identidad.perfil(usuario_id), idioma varchar(10) not null default 'es', intereses jsonb not null default '[]' check(jsonb_typeof(intereses)='array'), perfil_visible boolean not null default false
);

create table identidad.sesion_refresh (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null references identidad.perfil(usuario_id), secreto_cifrado text not null check(length(secreto_cifrado)>0), vence_en timestamptz not null, revocada_en timestamptz, check(vence_en>creado_en)
);

create table identidad.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create function identidad.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function identidad.actualizar_version() from public;
create trigger actualizar_version before update on identidad.objeto for each row execute function identidad.actualizar_version();
alter table identidad.objeto enable row level security;
alter table identidad.objeto force row level security;
create trigger actualizar_version before update on identidad.perfil for each row execute function identidad.actualizar_version();
alter table identidad.perfil enable row level security;
alter table identidad.perfil force row level security;
alter table identidad.asignacion_rol enable row level security;
alter table identidad.asignacion_rol force row level security;
alter table identidad.preferencia enable row level security;
alter table identidad.preferencia force row level security;
create trigger actualizar_version before update on identidad.sesion_refresh for each row execute function identidad.actualizar_version();
alter table identidad.sesion_refresh enable row level security;
alter table identidad.sesion_refresh force row level security;
create trigger actualizar_version before update on identidad.auditoria for each row execute function identidad.actualizar_version();
alter table identidad.auditoria enable row level security;
alter table identidad.auditoria force row level security;
revoke all on all tables in schema identidad from public;
alter default privileges in schema identidad revoke all on tables from public;
alter default privileges in schema identidad revoke execute on functions from public;
