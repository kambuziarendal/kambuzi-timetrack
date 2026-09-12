#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
set -a
. ./.env
set +a
[ "${CONFIRM_RESTORE:-}" = 'YES' ] || { echo 'Sett CONFIRM_RESTORE=YES for å bekrefte gjenoppretting.' >&2; exit 1; }
archive=${1:-}
[ -n "$archive" ] && [ -f "$archive" ] || { echo 'Oppgi en eksisterende .dump-fil.' >&2; exit 1; }
[ -f backups/.kambuzi-timeforing-backups ] || { echo 'Backupkatalogen mangler eierskapsmerke.' >&2; exit 1; }
case "$(realpath "$archive")" in "$(realpath backups)"/*) ;; *) echo 'Arkivet må ligge i backups/.' >&2; exit 1;; esac
./scripts/backup.sh
docker compose stop app
restore_failed=0
docker compose run --rm --no-deps app dropdb --if-exists "$POSTGRES_DB" || restore_failed=1
docker compose run --rm --no-deps app createdb "$POSTGRES_DB" || restore_failed=1
docker compose run --rm --no-deps app pg_restore --no-owner --no-acl --dbname="$POSTGRES_DB" "/backups/$(basename "$archive")" || restore_failed=1
docker compose up -d app
[ "$restore_failed" -eq 0 ] || { echo 'Restore feilet. Bruk pre-restore-backupen som nettopp ble laget.' >&2; exit 1; }
attempt=0
until docker compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { echo 'Restore er utført, men appen ble ikke klar. Bruk pre-restore-backupen.' >&2; exit 1; }
  sleep 2
done
echo 'Restore er fullført og readiness er grønn.'
