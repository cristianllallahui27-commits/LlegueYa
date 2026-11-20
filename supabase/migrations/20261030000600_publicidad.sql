create table publicidad.objeto (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, bucket text not null, clave_aleatoria text not null, mime_validado text, bytes bigint check(bytes>0), hash_integridad text, estado text not null default 'pendiente' check(estado in ('pendiente','validado','rechazado','retirado')), visibilidad text not null default 'privada' check(visibilidad in ('privada','publica')), padre_tipo text not null, padre_id uuid not null, unique(bucket,clave_aleatoria), check(visibilidad='privada' or estado='validado')
);

create table publicidad.politica_gratuita (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  version_politica integer not null unique check(version_politica>0), habilitada boolean not null default true, duracion integer not null check(duracion>0), unidad text not null check(unidad in ('dias','meses')), condiciones jsonb not null check(jsonb_typeof(condiciones)='object'), aplica_desde timestamptz not null
);

create table publicidad.beneficio (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null unique, politica_version integer not null references publicidad.politica_gratuita(version_politica), condiciones_copiadas jsonb not null check(jsonb_typeof(condiciones_copiadas)='object'), inicio timestamptz not null, fin timestamptz not null, zona_horaria text not null default 'America/Lima', estado text not null check(estado in ('programado','activo','agotado','vencido','cancelado')), check(fin>inicio), unique(negocio_id,id)
);

create table publicidad.plan (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  nombre varchar(120) not null, tarifa numeric(12,2) not null check(tarifa>=0), moneda char(3) not null check(moneda ~ '^[A-Z]{3}$'), duracion integer not null check(duracion>0), unidad text not null check(unidad in ('dias','meses')), cuota bigint not null check(cuota>0), frecuencia integer not null check(frecuencia>0), peso_rotacion numeric(8,2) not null check(peso_rotacion>0), activo boolean not null default false
);

create table publicidad.contratacion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null, plan_id uuid not null references publicidad.plan(id), condiciones_copiadas jsonb not null check(jsonb_typeof(condiciones_copiadas)='object'), inicio timestamptz not null, fin timestamptz not null, estado text not null default 'pendiente' check(estado in ('pendiente','vigente','vencida','cancelada')), check(fin>inicio), unique(negocio_id,id)
);

create table publicidad.pago (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  contratacion_id uuid not null references publicidad.contratacion(id), referencia_normalizada text not null unique check(length(trim(referencia_normalizada))>0), monto numeric(12,2) not null check(monto>0), moneda char(3) not null check(moneda ~ '^[A-Z]{3}$'), objeto_id uuid not null references publicidad.objeto(id), estado text not null default 'pendiente' check(estado in ('pendiente','confirmado','rechazado')), revisor_id uuid, motivo text, check(estado='pendiente' or revisor_id is not null)
);

create table publicidad.campania (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null, objetivo_tipo text not null, objetivo_id uuid not null, beneficio_id uuid, contratacion_id uuid, estado text not null default 'borrador' check(estado in ('borrador','en_revision','activa','pausada','agotada','finalizada','rechazada')), inicio timestamptz not null, fin timestamptz not null, creatividad_version bigint not null default 1 check(creatividad_version>0), check(fin>inicio), check(num_nonnulls(beneficio_id,contratacion_id)=1), foreign key(negocio_id,beneficio_id) references publicidad.beneficio(negocio_id,id), foreign key(negocio_id,contratacion_id) references publicidad.contratacion(negocio_id,id)
);

create table publicidad.reserva_cuota (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  campania_id uuid not null references publicidad.campania(id), solicitud_id uuid not null, usuario_medicion text, ventana_frecuencia timestamptz not null, vence_en timestamptz not null, estado text not null default 'reservada' check(estado in ('reservada','confirmada','liberada','vencida')), unique(campania_id,solicitud_id), check(vence_en>creado_en)
);

create table publicidad.medicion (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  entrega_id uuid not null, campania_id uuid not null references publicidad.campania(id), canal text not null, evento_tipo text not null check(evento_tipo in ('solicitud','entrega','impresion','clic')), sujeto_seudonimo text, instante timestamptz not null default now(), unique(entrega_id,evento_tipo)
);

create table publicidad.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table publicidad.outbox (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  tipo text not null, aggregate_id uuid not null, aggregate_version bigint not null check(aggregate_version>0), schema_version integer not null check(schema_version>0), payload jsonb not null check(jsonb_typeof(payload)='object'), ocurrido_en timestamptz not null default now(), publicado_en timestamptz, intentos integer not null default 0 check(intentos>=0)
);

create table publicidad.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function publicidad.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function publicidad.actualizar_version() from public;
create trigger actualizar_version before update on publicidad.objeto for each row execute function publicidad.actualizar_version();
alter table publicidad.objeto enable row level security;
alter table publicidad.objeto force row level security;
create trigger actualizar_version before update on publicidad.politica_gratuita for each row execute function publicidad.actualizar_version();
alter table publicidad.politica_gratuita enable row level security;
alter table publicidad.politica_gratuita force row level security;
create trigger actualizar_version before update on publicidad.beneficio for each row execute function publicidad.actualizar_version();
alter table publicidad.beneficio enable row level security;
alter table publicidad.beneficio force row level security;
create trigger actualizar_version before update on publicidad.plan for each row execute function publicidad.actualizar_version();
alter table publicidad.plan enable row level security;
alter table publicidad.plan force row level security;
create trigger actualizar_version before update on publicidad.contratacion for each row execute function publicidad.actualizar_version();
alter table publicidad.contratacion enable row level security;
alter table publicidad.contratacion force row level security;
create trigger actualizar_version before update on publicidad.pago for each row execute function publicidad.actualizar_version();
alter table publicidad.pago enable row level security;
alter table publicidad.pago force row level security;
create trigger actualizar_version before update on publicidad.campania for each row execute function publicidad.actualizar_version();
alter table publicidad.campania enable row level security;
alter table publicidad.campania force row level security;
create trigger actualizar_version before update on publicidad.reserva_cuota for each row execute function publicidad.actualizar_version();
alter table publicidad.reserva_cuota enable row level security;
alter table publicidad.reserva_cuota force row level security;
create trigger actualizar_version before update on publicidad.medicion for each row execute function publicidad.actualizar_version();
alter table publicidad.medicion enable row level security;
alter table publicidad.medicion force row level security;
create trigger actualizar_version before update on publicidad.auditoria for each row execute function publicidad.actualizar_version();
alter table publicidad.auditoria enable row level security;
alter table publicidad.auditoria force row level security;
create trigger actualizar_version before update on publicidad.outbox for each row execute function publicidad.actualizar_version();
alter table publicidad.outbox enable row level security;
alter table publicidad.outbox force row level security;
alter table publicidad.inbox enable row level security;
alter table publicidad.inbox force row level security;
revoke all on all tables in schema publicidad from public;
alter default privileges in schema publicidad revoke all on tables from public;
alter default privileges in schema publicidad revoke execute on functions from public;
