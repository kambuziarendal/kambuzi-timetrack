#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
./scripts/backup.sh
docker compose config --quiet
docker compose build --pull
docker compose up -d
attempt=0
until docker compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { echo 'Oppgradering startet, men readiness er rød. Kjør docker compose logs app.' >&2; exit 1; }
  sleep 2
done
echo 'Oppgraderingen er aktiv og readiness er grønn.'
