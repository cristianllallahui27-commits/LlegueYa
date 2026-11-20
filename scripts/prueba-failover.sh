#!/usr/bin/env bash
# EQ-02 Disponibilidad: el Worker de Cloudflare (runtime real workerd vía wrangler dev) reparte entre dos
# backends; a los 20 s se apaga uno y k6 mide si los turistas notan el fallo.
#
#   bash scripts/prueba-failover.sh        (≈ 1 min; deja el resultado en reports/k6/failover.txt)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p reports/k6
CLAVE=prueba-failover
for p in 8031 8032; do
  APP_ORIGIN=http://127.0.0.1:8787 BORDE_CLAVE=$CLAVE python3 -m uvicorn tests.servidor_e2e:app --port $p --log-level warning --no-access-log &
  echo $! > /tmp/backend-$p.pid
done
(cd infra/cloudflare/borde && npx wrangler dev --port 8787 --var ORIGENES:http://127.0.0.1:8031,http://127.0.0.1:8032 \
  --var BORDE_CLAVE:$CLAVE > /tmp/wrangler-failover.log 2>&1) &
WR=$!
until curl -sf http://127.0.0.1:8787/__borde/salud > /dev/null; do sleep 1; done
( sleep 20; echo ">> Apagando el backend 1 (puerto 8031)"; kill "$(cat /tmp/backend-8031.pid)" ) &
k6 run -e BASE_URL=http://127.0.0.1:8787 -e PERFIL=humo -e ASISTENTE=0 -e VUS=100 -e DURACION=60s \
  --summary-export reports/k6/failover.json tests/carga/k6-plataforma.js | tee reports/k6/failover.txt
echo ">> Salud del borde al final:" | tee -a reports/k6/failover.txt
curl -s http://127.0.0.1:8787/__borde/salud | tee -a reports/k6/failover.txt; echo
kill "$(cat /tmp/backend-8032.pid)" $WR 2>/dev/null || true
pkill -f "wrangler dev --port 8787" 2>/dev/null || true
