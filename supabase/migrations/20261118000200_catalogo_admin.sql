-- LlegueYa · Administración del catálogo: crear, editar, retirar y volver a publicar lugares.
-- Igual que en Comunidad, el backend activa app.es_admin solo después de verificar que la
-- sesión pertenece a un correo de ADMIN_CORREOS. Sin ese contexto estas políticas no aplican
-- y svc_catalogo sigue limitado a leer lo publicado.

grant insert, update (nombre, zona, estado, actualizado_en) on catalogo.destino to svc_catalogo;
grant insert, update (destino_id, tipo, nombre, descripcion, lat, lon, estado, fuente_url, revisado_en, slug, zona,
                      resumen, como_llegar, recomendaciones, altitud_m, actualizado_en, version)
  on catalogo.lugar to svc_catalogo;
grant insert, delete on catalogo.foto_externa to svc_catalogo;

create policy destino_admin on catalogo.destino for all to svc_catalogo
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true');

-- Administración ve también lo retirado (para poder volver a publicarlo).
create policy lugar_admin on catalogo.lugar for all to svc_catalogo
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true' and estado in ('publicado', 'retirado'));

create policy foto_admin on catalogo.foto_externa for all to svc_catalogo
  using (current_setting('app.es_admin', true) = 'true')
  with check (current_setting('app.es_admin', true) = 'true');
