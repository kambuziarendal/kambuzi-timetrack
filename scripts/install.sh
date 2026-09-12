#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
command -v docker >/dev/null 2>&1 || { echo 'Docker mangler.' >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo 'Docker Compose v2 mangler.' >&2; exit 1; }
if [ ! -f .env ]; then
  command -v openssl >/dev/null 2>&1 || { echo 'OpenSSL mangler.' >&2; exit 1; }
  db_password=$(openssl rand -hex 32)
  cp .env.example .env
  sed -i "s/BYTTES_AUTOMATISK_AV_INSTALLASJONEN/$db_password/" .env
  chmod 600 .env
  echo 'Opprettet .env. Sett APP_URL før tjenesten startes.'
  exit 2
fi
mkdir -p backups
touch backups/.kambuzi-timeforing-backups
chmod 700 backups
docker compose config --quiet
docker compose build --pull
docker compose up -d
attempt=0
until docker compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { docker compose ps; echo 'Appen ble ikke klar. Se: docker compose logs app' >&2; exit 1; }
  sleep 2
done
docker compose ps
echo 'Åpne APP_URL og fullfør førstegangsoppsettet.'
