-- Índices locales de todas las FK (PostgreSQL no los crea automáticamente).
do $$
declare r record;
begin
 for r in
   select c.oid, n.nspname, t.relname,
     string_agg(quote_ident(a.attname), ',' order by k.ord) as columnas
   from pg_constraint c join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   cross join lateral unnest(c.conkey) with ordinality k(attnum,ord)
   join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
   where c.contype='f' and n.nspname in
     ('identidad','catalogo','comunidad','eventos','publicidad','recomendaciones','asistente')
   group by c.oid,n.nspname,t.relname
 loop
   execute format('create index %I on %I.%I (%s)', 'fk_'||substr(md5(r.relname||':'||r.columnas),1,24), r.nspname,r.relname,r.columnas);
 end loop;
end $$;

create index perfil_estado_idx on identidad.perfil(estado);
create index sesion_vigente_idx on identidad.sesion_refresh(usuario_id,vence_en) where revocada_en is null;
create index lugar_busqueda_idx on catalogo.lugar(estado,destino_id,tipo);
create index lugar_mapa_idx on catalogo.lugar(lat,lon) where estado='publicado';
create index negocio_propietario_idx on catalogo.negocio(propietario_id);
create index oferta_negocio_estado_idx on catalogo.oferta(negocio_id,estado);
create index feed_idx on comunidad.publicacion(estado,publicado_en desc,id desc);
create index comentario_hilo_idx on comunidad.comentario(objetivo_tipo,objetivo_id,raiz_id,creado_en,id);
create unique index resena_activa_unique on comunidad.resena(usuario_id,negocio_id) where estado<>'retirado';
create index coleccion_propietario_idx on comunidad.coleccion(propietario_id);
create index evento_calendario_idx on eventos.evento(estado,inicio,lugar_id);
create index recordatorio_pendiente_idx on eventos.tarea_recordatorio(ejecutar_en) where estado='pendiente';
create index bandeja_idx on eventos.notificacion(usuario_id,creado_en desc,id);
create index campania_vigencia_idx on publicidad.campania(estado,inicio,fin);
create index reserva_expiracion_idx on publicidad.reserva_cuota(vence_en) where estado='reservada';
create index viaje_propietario_idx on recomendaciones.viaje(propietario_id,creado_en desc);
create index conversacion_propietario_idx on asistente.conversacion(propietario_id,creado_en desc);
create index mensajes_orden_idx on asistente.mensaje(conversacion_id,creado_en,id);

do $$
declare s text;
begin
 foreach s in array array['catalogo','comunidad','eventos','publicidad'] loop
   execute format('create index outbox_pendiente_idx on %I.outbox(ocurrido_en,id) where publicado_en is null',s);
 end loop;
end $$;

-- Invariantes de hilo: padre inmutable, misma raíz/objetivo y profundidad <= 5.
create function comunidad.validar_hilo() returns trigger language plpgsql set search_path='' as $$
declare padre comunidad.comentario;
begin
 if tg_op='UPDATE' and
   (new.padre_id,new.raiz_id,new.objetivo_tipo,new.objetivo_id,new.autor_id,new.profundidad)
   is distinct from
   (old.padre_id,old.raiz_id,old.objetivo_tipo,old.objetivo_id,old.autor_id,old.profundidad)
 then raise exception 'La identidad y el enlace del comentario son inmutables' using errcode='23514'; end if;
 if new.padre_id is not null then
   select * into padre from comunidad.comentario where id=new.padre_id;
   if not found then raise exception 'Padre inexistente' using errcode='23503'; end if;
   if (new.objetivo_tipo,new.objetivo_id) is distinct from (padre.objetivo_tipo,padre.objetivo_id)
     or new.raiz_id<>coalesce(padre.raiz_id,padre.id)
     or new.profundidad<>padre.profundidad+1
   then raise exception 'Hilo, raíz o profundidad incorrectos' using errcode='23514'; end if;
 end if;
 return new;
end $$;
revoke all on function comunidad.validar_hilo() from public;
create trigger validar_hilo before insert or update on comunidad.comentario for each row execute function comunidad.validar_hilo();

-- CHECK rechaza explícitamente ambos destinos ausentes (NULL no equivale a false).
alter table catalogo.tramo_movilidad add constraint destino_presente
 check(destino_lugar_id is not null or coalesce(length(trim(destino_texto))>0,false));

-- La política comercial inicial no inventa tarifas: un mes calendario gratuito.
insert into publicidad.politica_gratuita(version_politica,habilitada,duracion,unidad,condiciones,aplica_desde)
values (1,true,1,'meses','{"tipo":"inicial_unico_por_negocio","requiere_aprobacion":true}',now());
