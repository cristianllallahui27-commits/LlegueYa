-- Logins de conexión por servicio (ejecutar UNA vez en Supabase → SQL Editor).
-- Reemplaza cada <<CONTRASEÑA_...>> por una contraseña larga generada en tu gestor
-- de contraseñas. NO guardes este archivo con contraseñas reales ni lo subas a Git.
-- Cada login solo hereda su rol svc_* (sin superusuario ni BYPASSRLS).

create role llegueya_catalogo login password '<<CONTRASEÑA_CATALOGO>>' noinherit;
grant svc_catalogo to llegueya_catalogo;

create role llegueya_comunidad login password '<<CONTRASEÑA_COMUNIDAD>>' noinherit;
grant svc_comunidad to llegueya_comunidad;

-- El backend hace «set local role svc_*» en cada transacción, así que el login
-- por sí solo no tiene permisos sobre tablas.
-- DSN en tu .env (Session pooler IPv4, usuario con sufijo del proyecto):
-- DB_CATALOGO_DSN=postgresql://llegueya_catalogo.<proyecto>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
-- DB_COMUNIDAD_DSN=postgresql://llegueya_comunidad.<proyecto>:<contraseña>@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
