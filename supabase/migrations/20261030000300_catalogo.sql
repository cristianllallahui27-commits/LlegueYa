create table catalogo.objeto (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, bucket text not null, clave_aleatoria text not null, mime_validado text, bytes bigint check(bytes>0), hash_integridad text, estado text not null default 'pendiente' check(estado in ('pendiente','validado','rechazado','retirado')), visibilidad text not null default 'privada' check(visibilidad in ('privada','publica')), padre_tipo text not null, padre_id uuid not null, unique(bucket,clave_aleatoria), check(visibilidad='privada' or estado='validado')
);

create table catalogo.destino (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  nombre varchar(120) not null, descripcion text not null default '', zona varchar(120) not null, estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), unique(nombre,zona)
);

create table catalogo.lugar (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  destino_id uuid not null references catalogo.destino(id), tipo text not null check(tipo in ('arqueologico','natural','cultural','camping','aventura','otro')), nombre varchar(120) not null, descripcion text not null, lat numeric(9,6) check(lat between -90 and 90), lon numeric(9,6) check(lon between -180 and 180), check ((lat is null) = (lon is null)), estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), fuente_url text, revisado_en timestamptz, condiciones_camping jsonb, check(estado<>'publicado' or revisado_en is not null)
);

create table catalogo.negocio (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  propietario_id uuid not null, rubro text not null check(rubro in ('hospedaje','restaurante','artesania','transporte','operador','otro')), nombre varchar(120) not null, contacto jsonb not null default '{}' check(jsonb_typeof(contacto)='object'), estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado'))
);

create table catalogo.oferta (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null references catalogo.negocio(id), tipo text not null, descripcion text not null, precio numeric(12,2) check(precio>=0), moneda char(3) not null check(moneda ~ '^[A-Z]{3}$'), unidad text not null check(unidad in ('persona','noche','tramo','grupo','paquete','producto')), vigencia_inicio timestamptz not null, vigencia_fin timestamptz not null, estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), check(vigencia_fin>vigencia_inicio)
);

create table catalogo.requisito_rubro (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  rubro text not null, nombre varchar(120) not null, obligatorio boolean not null default true, version_politica integer not null check(version_politica>0), unique(rubro,nombre,version_politica)
);

create table catalogo.evidencia (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null references catalogo.negocio(id), requisito_id uuid references catalogo.requisito_rubro(id), objeto_id uuid not null references catalogo.objeto(id), estado text not null default 'pendiente' check(estado in ('pendiente','verificado','rechazado','vencido')), motivo_revision text, unique(negocio_id,id)
);

create table catalogo.categoria_acreditada (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  negocio_id uuid not null references catalogo.negocio(id), clase text not null check(clase in ('estrellas','tenedores','otra')), categoria varchar(80) not null, autoridad varchar(160) not null, evidencia_id uuid not null, estado text not null default 'pendiente' check(estado in ('pendiente','verificado','rechazado','vencido')), revisado_en timestamptz, vigente_hasta timestamptz, foreign key(negocio_id,evidencia_id) references catalogo.evidencia(negocio_id,id), check(estado<>'verificado' or revisado_en is not null)
);

create table catalogo.punto_movilidad (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  destino_id uuid not null references catalogo.destino(id), lugar_id uuid references catalogo.lugar(id), tipo text not null check(tipo in ('terminal','punto_embarque')), nombre varchar(120) not null, direccion_publica text not null, lat numeric(9,6) check(lat between -90 and 90), lon numeric(9,6) check(lon between -180 and 180), check ((lat is null) = (lon is null)), fuente text not null, revisado_en timestamptz, estado text not null default 'borrador' check(estado in ('borrador','en_revision','publicado','rechazado','retirado')), check(estado<>'publicado' or revisado_en is not null)
);

create table catalogo.tramo_movilidad (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  oferta_id uuid not null references catalogo.oferta(id), origen_id uuid not null references catalogo.punto_movilidad(id), destino_lugar_id uuid references catalogo.lugar(id), destino_texto text, horario_texto text not null, verificado_en timestamptz, check(destino_lugar_id is not null or length(trim(destino_texto))>0)
);

create table catalogo.propuesta_lugar (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  autor_id uuid not null, datos jsonb not null check(jsonb_typeof(datos)='object'), estado text not null default 'en_revision' check(estado in ('en_revision','aprobado','rechazado')), revisor_id uuid, motivo text, check(estado='en_revision' or revisor_id is not null)
);

create table catalogo.favorito (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  usuario_id uuid not null, objetivo_tipo text not null check(objetivo_tipo in ('lugar','negocio','oferta')), objetivo_id uuid not null, unique(usuario_id,objetivo_tipo,objetivo_id)
);

create table catalogo.auditoria (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  actor_id uuid, accion text not null, objetivo_id uuid, campos_afectados text[] not null default '{}', motivo text, instante timestamptz not null default now(), request_id uuid
);

create table catalogo.outbox (
  id uuid primary key default gen_random_uuid(), creado_en timestamptz not null default now(), actualizado_en timestamptz not null default now(), version bigint not null default 1 check(version>0),
  tipo text not null, aggregate_id uuid not null, aggregate_version bigint not null check(aggregate_version>0), schema_version integer not null check(schema_version>0), payload jsonb not null check(jsonb_typeof(payload)='object'), ocurrido_en timestamptz not null default now(), publicado_en timestamptz, intentos integer not null default 0 check(intentos>=0)
);

create table catalogo.inbox (
  evento_id uuid primary key, recibido_en timestamptz not null default now(), procesado_en timestamptz
);

create function catalogo.actualizar_version() returns trigger language plpgsql set search_path='' as $$ begin new.actualizado_en=now(); new.version=old.version+1; return new; end $$;
revoke all on function catalogo.actualizar_version() from public;
create trigger actualizar_version before update on catalogo.objeto for each row execute function catalogo.actualizar_version();
alter table catalogo.objeto enable row level security;
alter table catalogo.objeto force row level security;
create trigger actualizar_version before update on catalogo.destino for each row execute function catalogo.actualizar_version();
alter table catalogo.destino enable row level security;
alter table catalogo.destino force row level security;
create trigger actualizar_version before update on catalogo.lugar for each row execute function catalogo.actualizar_version();
alter table catalogo.lugar enable row level security;
alter table catalogo.lugar force row level security;
create trigger actualizar_version before update on catalogo.negocio for each row execute function catalogo.actualizar_version();
alter table catalogo.negocio enable row level security;
alter table catalogo.negocio force row level security;
create trigger actualizar_version before update on catalogo.oferta for each row execute function catalogo.actualizar_version();
alter table catalogo.oferta enable row level security;
alter table catalogo.oferta force row level security;
create trigger actualizar_version before update on catalogo.requisito_rubro for each row execute function catalogo.actualizar_version();
alter table catalogo.requisito_rubro enable row level security;
alter table catalogo.requisito_rubro force row level security;
create trigger actualizar_version before update on catalogo.evidencia for each row execute function catalogo.actualizar_version();
alter table catalogo.evidencia enable row level security;
alter table catalogo.evidencia force row level security;
create trigger actualizar_version before update on catalogo.categoria_acreditada for each row execute function catalogo.actualizar_version();
alter table catalogo.categoria_acreditada enable row level security;
alter table catalogo.categoria_acreditada force row level security;
create trigger actualizar_version before update on catalogo.punto_movilidad for each row execute function catalogo.actualizar_version();
alter table catalogo.punto_movilidad enable row level security;
alter table catalogo.punto_movilidad force row level security;
create trigger actualizar_version before update on catalogo.tramo_movilidad for each row execute function catalogo.actualizar_version();
alter table catalogo.tramo_movilidad enable row level security;
alter table catalogo.tramo_movilidad force row level security;
create trigger actualizar_version before update on catalogo.propuesta_lugar for each row execute function catalogo.actualizar_version();
alter table catalogo.propuesta_lugar enable row level security;
alter table catalogo.propuesta_lugar force row level security;
create trigger actualizar_version before update on catalogo.favorito for each row execute function catalogo.actualizar_version();
alter table catalogo.favorito enable row level security;
alter table catalogo.favorito force row level security;
create trigger actualizar_version before update on catalogo.auditoria for each row execute function catalogo.actualizar_version();
alter table catalogo.auditoria enable row level security;
alter table catalogo.auditoria force row level security;
create trigger actualizar_version before update on catalogo.outbox for each row execute function catalogo.actualizar_version();
alter table catalogo.outbox enable row level security;
alter table catalogo.outbox force row level security;
alter table catalogo.inbox enable row level security;
alter table catalogo.inbox force row level security;
revoke all on all tables in schema catalogo from public;
alter default privileges in schema catalogo revoke all on tables from public;
alter default privileges in schema catalogo revoke execute on functions from public;
