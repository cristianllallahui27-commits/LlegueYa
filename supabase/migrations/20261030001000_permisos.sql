-- Defensa adicional: ningún rol de Data API accede a los esquemas de negocio.
-- No se toca public, auth, storage ni extensiones administradas por Supabase.
do $$
declare s text; r text;
begin
 foreach s in array array['identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente'] loop
   foreach r in array array['anon','authenticated','service_role'] loop
     if exists(select 1 from pg_roles where rolname=r) then
       execute format('revoke all on schema %I from %I',s,r);
       execute format('revoke all on all tables in schema %I from %I',s,r);
       execute format('revoke all on all functions in schema %I from %I',s,r);
       execute format('alter default privileges in schema %I revoke all on tables from %I',s,r);
       execute format('alter default privileges in schema %I revoke execute on functions from %I',s,r);
     end if;
   end loop;
 end loop;
end $$;

-- Capacidad mínima de I: leer y editar solo campos de presentación del perfil propio.
-- El contexto lo establecerá la API tras validar sesión, en una transacción.
-- No concede alta, suspensión, roles, sesiones ni acceso al resto de tablas.
grant select on identidad.perfil to svc_identidad;
grant update(nombre_visible,biografia) on identidad.perfil to svc_identidad;
create policy perfil_lectura_propia on identidad.perfil for select to svc_identidad
 using (usuario_id = nullif(current_setting('app.usuario_id',true),'')::uuid);
create policy perfil_edicion_propia on identidad.perfil for update to svc_identidad
 using (usuario_id = nullif(current_setting('app.usuario_id',true),'')::uuid and estado='activo')
 with check (usuario_id = nullif(current_setting('app.usuario_id',true),'')::uuid and estado='activo');

-- Los otros roles siguen sin permisos de tabla ni políticas permisivas.
-- Se habilitarán por operación en la etapa de cada servicio, con pruebas de aislamiento.
