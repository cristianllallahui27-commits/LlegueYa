-- LlegueYa · Moderación administrativa de Comunidad.
-- El backend activa app.es_admin solo después de verificar que la sesión es de un
-- administrador (ADMIN_CORREOS). Sin ese contexto, estas políticas no aplican.
grant update (estado, publicado_en) on comunidad.publicacion to svc_comunidad;
grant update (estado) on comunidad.comentario to svc_comunidad;

create policy publicacion_admin_lectura on comunidad.publicacion for select to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true');
create policy publicacion_admin_moderacion on comunidad.publicacion for update to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true' and estado in ('publicado', 'rechazado', 'retirado'));

create policy comentario_admin_lectura on comunidad.comentario for select to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true');
create policy comentario_admin_moderacion on comunidad.comentario for update to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true' and estado in ('publicado', 'rechazado', 'retirado'));

-- Reportes de faltas: cada usuario reporta con su identidad; administración los resuelve.
grant select, insert on comunidad.reporte to svc_comunidad;
grant update (estado, decision_administrativa, actualizado_en) on comunidad.reporte to svc_comunidad;
create policy reporte_propio on comunidad.reporte for insert to svc_comunidad
  with check (autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid and estado = 'pendiente');
create policy reporte_lectura on comunidad.reporte for select to svc_comunidad
  using (autor_id = nullif(current_setting('app.usuario_id', true), '')::uuid
         or current_setting('app.es_admin', true) = 'true');
create policy reporte_admin on comunidad.reporte for update to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true') with check (current_setting('app.es_admin', true) = 'true');

-- Quitar fotos: administración desvincula la foto y la marca como retirada.
grant update (foto_id) on comunidad.publicacion to svc_comunidad;
grant update (estado) on comunidad.objeto to svc_comunidad;
create policy objeto_admin on comunidad.objeto for update to svc_comunidad
  using (current_setting('app.es_admin', true) = 'true') with check (current_setting('app.es_admin', true) = 'true');
