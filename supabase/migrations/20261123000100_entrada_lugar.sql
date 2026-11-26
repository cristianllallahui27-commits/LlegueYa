-- LlegueYa · Entrada a los lugares turísticos: costo de ingreso y dónde se compra (en el lugar o en una web).
alter table catalogo.lugar add column if not exists entrada_costo text not null default '';
alter table catalogo.lugar add column if not exists entrada_compra text not null default '';
alter table catalogo.lugar add column if not exists entrada_url text not null default '';

alter table catalogo.lugar drop constraint if exists lugar_entrada_compra_check;
alter table catalogo.lugar add constraint lugar_entrada_compra_check
  check (entrada_compra in ('', 'lugar', 'web', 'ambos'));
alter table catalogo.lugar drop constraint if exists lugar_entrada_url_check;
alter table catalogo.lugar add constraint lugar_entrada_url_check
  check (entrada_url = '' or entrada_url like 'https://%');
alter table catalogo.lugar drop constraint if exists lugar_entrada_costo_check;
alter table catalogo.lugar add constraint lugar_entrada_costo_check check (char_length(entrada_costo) <= 160);

-- Administración (svc_catalogo con app.es_admin) puede escribir estas columnas; la lectura ya estaba permitida.
grant insert, update (entrada_costo, entrada_compra, entrada_url) on catalogo.lugar to svc_catalogo;
