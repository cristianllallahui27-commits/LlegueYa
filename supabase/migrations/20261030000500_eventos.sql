create table eventos.objeto (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, bucket text not null, clave_aleatoria text not null, mime_validado text, bytes bigint check(bytes>0), hash_integridad text, estado text not null default 'pendiente' check(estado in ('pendiente','validado','rechazado','retirado')), visibilidad text not null default 'privada' check(visibilidad in ('privada','publica')), padre_tipo text not null, padre_id uuid not null, unique(bucket,clave_aleatoria), check(visibilidad='privada' or estado='validado')
);

create table eventos.propuesta (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  autor_id uuid not null, organizador text not null, lugar_id uuid not null, inicio timestamptz not null, fin timestamptz not null, zona_horaria text not null default 'America/Lima', check(inicio<fin), fuente text not null, imagen_id uuid references eventos.objeto(id), estado text not null default 'en_revision' check(estado in ('en_revision','aprobado','rechazado')), motivo text
);

create table eventos.evento (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propuesta_id uuid references eventos.propuesta(id), titulo varchar(160) not null, organizador text not null, lugar_id uuid not null, inicio timestamptz not null, fin timestamptz not null, zona_horaria text not null default 'America/Lima', check(inicio<fin), estado text not null default 'borrador' check(estado in ('borrador','confirmado','cancelado','finalizado')), version_publica bigint not null default 1 check(version_publica>0)
);

create table eventos.suscripcion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, tipo_objetivo text not null, objetivo_id uuid not null, recordatorio_config jsonb not null default '{}' check(jsonb_typeof(recordatorio_config)='object'), activa boolean not null default true, unique(usuario_id,tipo_objetivo,objetivo_id)
);

create table eventos.tarea_recordatorio (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, tipo text not null, objetivo_tipo text not null, objetivo_id uuid not null, version_objetivo bigint not null check(version_objetivo>0), ejecutar_en timestamptz not null, estado text not null default 'pendiente' check(estado in ('pendiente','procesando','enviado','cancelado','fallido')), lease_hasta timestamptz, unique(usuario_id,objetivo_tipo,objetivo_id,tipo,version_objetivo)
);

create table eventos.notificacion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, tipo text not null, objetivo_tipo text not null, objetivo_id uuid not null, version_objetivo bigint not null check(version_objetivo>0), texto_resumen text not null, leida_en timestamptz, unique(usuario_id,objetivo_tipo,objetivo_id,tipo,version_objetivo)
);

create table eventos.entrega (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  notificacion_id uuid not null references eventos.notificacion(id), canal text not null check(canal in ('web','correo')), intento integer not null check(intento>0), estado text not null check(estado in ('pendiente','entregado','fallido')), error_tipado text, unique(notificacion_id,canal,intento)
);

create table eventos.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table eventos.outbox (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  tipo text not null, aggregate_id uuid not null, aggregate_version bigint not null check(aggregate_version>0), schema_version integer not null check(schema_version>0), payload jsonb not null check(jsonb_typeof(payload)='object'), ocurrido_en timestamptz not null default now(), publicado_en timestamptz, intentos integer not null default 0 check(intentos>=0)
);

create table eventos.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function eventos.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function eventos.actualizar_version() from public;
create trigger actualizar_version before update on eventos.objeto for each row execute function eventos.actualizar_version();
alter table eventos.objeto enable row level security;
alter table eventos.objeto force row level security;
create trigger actualizar_version before update on eventos.propuesta for each row execute function eventos.actualizar_version();
alter table eventos.propuesta enable row level security;
alter table eventos.propuesta force row level security;
create trigger actualizar_version before update on eventos.evento for each row execute function eventos.actualizar_version();
alter table eventos.evento enable row level security;
alter table eventos.evento force row level security;
create trigger actualizar_version before update on eventos.suscripcion for each row execute function eventos.actualizar_version();
alter table eventos.suscripcion enable row level security;
alter table eventos.suscripcion force row level security;
create trigger actualizar_version before update on eventos.tarea_recordatorio for each row execute function eventos.actualizar_version();
alter table eventos.tarea_recordatorio enable row level security;
alter table eventos.tarea_recordatorio force row level security;
create trigger actualizar_version before update on eventos.notificacion for each row execute function eventos.actualizar_version();
alter table eventos.notificacion enable row level security;
alter table eventos.notificacion force row level security;
create trigger actualizar_version before update on eventos.entrega for each row execute function eventos.actualizar_version();
alter table eventos.entrega enable row level security;
alter table eventos.entrega force row level security;
create trigger actualizar_version before update on eventos.auditoria for each row execute function eventos.actualizar_version();
alter table eventos.auditoria enable row level security;
alter table eventos.auditoria force row level security;
create trigger actualizar_version before update on eventos.outbox for each row execute function eventos.actualizar_version();
alter table eventos.outbox enable row level security;
alter table eventos.outbox force row level security;
alter table eventos.inbox enable row level security;
alter table eventos.inbox force row level security;
revoke all on all tables in schema eventos from public;
alter default privileges in schema eventos revoke all on tables from public;
alter default privileges in schema eventos revoke execute on functions from public;
