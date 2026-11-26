-- LlegueYa · Nuevas categorías (gastronomía y artesanía), baja definitiva de lugares y fotos subidas por administración.

alter table catalogo.lugar drop constraint if exists lugar_tipo_check;
alter table catalogo.lugar add constraint lugar_tipo_check
  check (tipo in ('arqueologico','natural','cultural','gastronomia','artesania','camping','aventura','otro'));

-- Las fotos que sube administración se guardan en el propio sitio (/api/v1/catalogo/fotos/…), no en una web externa.
alter table catalogo.foto_externa drop constraint if exists foto_externa_url_check;
alter table catalogo.foto_externa add constraint foto_externa_url_check
  check (url like 'https://%' or url like '/api/v1/catalogo/fotos/%');
alter table catalogo.foto_externa drop constraint if exists foto_externa_fuente_url_check;
alter table catalogo.foto_externa add constraint foto_externa_fuente_url_check
  check (fuente_url like 'https://%' or fuente_url like '/api/v1/catalogo/fotos/%' or fuente_url = '');

-- Eliminar un lugar de forma definitiva (la política lugar_admin ya limita esto a administración).
grant delete on catalogo.lugar to svc_catalogo;
