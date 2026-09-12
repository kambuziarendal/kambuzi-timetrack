#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
new_tag=${1:-}
expected_sha=${2:-}
[ -n "$new_tag" ] || { echo 'Bruk: ./scripts/upgrade.sh <eksakt-image-tag> [imagearkiv.sha256-verdi]' >&2; exit 1; }
case "$new_tag" in latest|*:latest|'') echo 'Oppgradering nekter latest eller tom versjon.' >&2; exit 1;; esac
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
compose config --quiet
if [ -n "$expected_sha" ]; then
  match=$(find . -maxdepth 3 -type f -name "*.tar.gz.sha256" -exec grep -l "$expected_sha" {} \; | head -n 1 || true)
  [ -n "$match" ] || { echo 'Forventet SHA-256 finnes ikke i lokale checksumfiler.' >&2; exit 1; }
fi
docker image inspect "kambuzi-timeforing:$new_tag" >/dev/null 2>&1 || { echo "Mangler lokalt image kambuzi-timeforing:$new_tag." >&2; exit 1; }
old_tag=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1)
backup_line=$(./scripts/backup.sh | tail -n 1)
backup_path=$(printf '%s' "$backup_line" | sed -n 's/^Verifisert backup: //p')
[ -n "$backup_path" ] && [ -f "$backup_path" ] || { echo 'Fant ikke verifisert backup fra pre-upgrade.' >&2; exit 1; }
trial_db="timeforing_upgrade_trial_$(date -u +%Y%m%d%H%M%S)"
cleanup() { compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$1"' sh "$trial_db" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$trial_db"
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$1"' sh "$trial_db" < "$backup_path"
compose run --rm --no-deps -e PGDATABASE="$trial_db" app sh -c 'DATABASE_URL="postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" node backend/dist/migrate.js'
cleanup
trap - EXIT INT TERM
cp .env ".env.pre-upgrade.$(date -u +%Y%m%dT%H%M%SZ)"
awk -v tag="$new_tag" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' .env > .env.next
chmod 600 .env.next
mv .env.next .env
if ! compose up -d --no-build; then
  echo 'Aktivering feilet. Forsøker automatisk rollback.' >&2
  awk -v tag="$old_tag" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' .env > .env.next
  chmod 600 .env.next && mv .env.next .env
  compose up -d --no-build || true
  CONFIRM_RESTORE=YES ./scripts/restore.sh "$backup_path" || true
  exit 1
fi
attempt=0
until compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 45 ]; then
    echo 'Readiness feilet etter oppgradering. Ruller tilbake.' >&2
    awk -v tag="$old_tag" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' .env > .env.next
    chmod 600 .env.next && mv .env.next .env
    compose up -d --no-build || true
    CONFIRM_RESTORE=YES ./scripts/restore.sh "$backup_path" || true
    exit 1
  fi
  sleep 2
done
./scripts/status.sh
echo "Oppgraderingen er aktiv. Pre-upgrade backup: $backup_path"
