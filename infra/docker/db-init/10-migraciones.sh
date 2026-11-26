#!/bin/sh
# Se ejecuta SOLO la primera vez (volumen vacío): aplica las migraciones en orden y activa
# el login de los roles de servicio con contraseñas tomadas del entorno (nunca de Git).
set -eu
for f in /migraciones/*.sql; do
  echo ">> aplicando $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
alter role svc_catalogo login password '${DB_CATALOGO_PASSWORD}';
alter role svc_comunidad login password '${DB_COMUNIDAD_PASSWORD}';
SQL
# Lugares de demostración del catálogo (identificados como tales en la web).
for f in /semillas/*.sql; do
  [ -e "$f" ] || continue
  echo ">> semilla $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
echo ">> base lista"
