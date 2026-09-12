#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
umask 077
command -v docker >/dev/null 2>&1 || { echo 'Docker mangler.' >&2; exit 1; }
compose version >/dev/null
arch=$(uname -m)
case "$arch" in x86_64|aarch64|arm64) ;; *) echo "Ustøttet arkitektur: $arch" >&2; exit 1;; esac
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
[ "$mem_kb" -ge 900000 ] || { echo 'Minst 1 GB RAM anbefales og kreves av installasjonsscriptet.' >&2; exit 1; }
avail_kb=$(df -Pk . | awk 'NR==2 {print $4}')
[ "$avail_kb" -ge 2097152 ] || { echo 'Minst 2 GB ledig disk kreves i installasjonskatalogen.' >&2; exit 1; }
getent hosts postgres >/dev/null 2>&1 || true
if [ ! -f .env ]; then
  command -v openssl >/dev/null 2>&1 || { echo 'OpenSSL mangler.' >&2; exit 1; }
  openssl rand -hex 32 | awk '
    FILENAME == "-" { secret = $0; next }
    { gsub("BYTTES_AUTOMATISK_AV_INSTALLASJONEN", secret); print }
  ' - .env.example > .env
  chmod 600 .env
  mkdir -p backups
  touch backups/.kambuzi-timeforing-backups
  chmod 700 backups
  echo 'Opprettet .env og backups/. Sett APP_URL, IMAGE_TAG og last releaseimages før ny kjøring.'
  exit 2
fi
mkdir -p backups
[ -f backups/.kambuzi-timeforing-backups ] || touch backups/.kambuzi-timeforing-backups
chmod 700 backups
compose config --quiet
image_tag=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1)
[ -n "$image_tag" ] || { echo 'IMAGE_TAG mangler i .env.' >&2; exit 1; }
if [ "${ALLOW_LOCAL_BUILD:-0}" = '1' ]; then
  compose build --pull
  compose up -d
else
  docker image inspect "kambuzi-timeforing:$image_tag" >/dev/null 2>&1 || { echo "Mangler lokalt image kambuzi-timeforing:$image_tag. Kjør scripts/load-offline-images.sh eller sett ALLOW_LOCAL_BUILD=1 for utviklerbygg." >&2; exit 1; }
  docker image inspect "postgres:17.7-bookworm" >/dev/null 2>&1 || { echo 'Mangler lokalt image postgres:17.7-bookworm fra offlinepakken.' >&2; exit 1; }
  compose up -d --no-build
fi
attempt=0
until compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 45 ] || { compose ps; echo 'Appen ble ikke klar. Se: docker compose logs app' >&2; exit 1; }
  sleep 2
done
compose ps
setup_required=$(compose exec -T app curl --fail --silent http://127.0.0.1:4000/api/setup/status | sed -n 's/.*"required":\(true\|false\).*/\1/p')
if [ "$setup_required" = 'true' ]; then
  echo 'Første administrator er ikke opprettet. Hold reverse proxy stengt, åpne lokal tunnel/localhost og fullfør oppsettet før offentlig eksponering.'
else
  echo 'Installasjonen er klar og førstegangsoppsett er lukket.'
fi
