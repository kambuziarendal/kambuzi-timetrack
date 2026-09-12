#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
umask 077
command -v docker >/dev/null 2>&1 || { echo 'Docker mangler.' >&2; exit 1; }
compose version >/dev/null
if [ ! -f .env ]; then
  command -v openssl >/dev/null 2>&1 || { echo 'OpenSSL mangler.' >&2; exit 1; }
  openssl rand -hex 32 | awk '
    FILENAME == "-" { secret = $0; next }
    { gsub("BYTTES_AUTOMATISK_AV_INSTALLASJONEN", secret); print }
  ' - .env.example > .env
  chmod 600 .env
  echo 'Opprettet .env. Sett APP_URL før tjenesten startes.'
  exit 2
fi
mkdir -p backups
touch backups/.kambuzi-timeforing-backups
chmod 700 backups
compose config --quiet
compose build --pull
compose up -d
attempt=0
until compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { compose ps; echo 'Appen ble ikke klar. Se: docker compose logs app' >&2; exit 1; }
  sleep 2
done
compose ps
echo 'Åpne APP_URL og fullfør førstegangsoppsettet.'
