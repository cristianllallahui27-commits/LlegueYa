-- LlegueYa · Terminales y paraderos de autos y buses (referencia para viajar por cuenta propia).
-- Administración los crea, corrige o elimina; el detalle (destinos, pasaje, horario, fuentes) va en jsonb.
create table if not exists catalogo.terminal (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  nombre text not null check (char_length(nombre) between 3 and 120),
  datos jsonb not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table catalogo.terminal enable row level security;
alter table catalogo.terminal force row level security;
revoke all on catalogo.terminal from public;
grant select, insert, update, delete on catalogo.terminal to svc_catalogo;

-- Cualquiera puede ver los terminales; solo administración (app.es_admin) puede cambiarlos.
drop policy if exists terminal_lectura on catalogo.terminal;
create policy terminal_lectura on catalogo.terminal for select to svc_catalogo using (true);
drop policy if exists terminal_admin on catalogo.terminal;
create policy terminal_admin on catalogo.terminal for all to svc_catalogo
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true');
