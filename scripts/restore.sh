#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
[ "${CONFIRM_RESTORE:-}" = 'YES' ] || { echo 'Sett CONFIRM_RESTORE=YES for å bekrefte gjenoppretting.' >&2; exit 1; }
archive=${1:-}
[ -n "$archive" ] && [ -f "$archive" ] || { echo 'Oppgi en eksisterende .dump-fil.' >&2; exit 1; }
[ ! -f "$archive.sha256" ] || sha256sum -c "$archive.sha256"
case "$(realpath "$archive")" in "$(realpath backups)"/*) ;; *) echo 'Arkivet må ligge i backups/.' >&2; exit 1;; esac
[ ! -f ".sha256" ] || sha256sum -c ".sha256"
./scripts/backup.sh
compose stop app
restore_failed=0
compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"' || restore_failed=1
compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$POSTGRES_DB"' || restore_failed=1
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$POSTGRES_DB"' < "$archive" || restore_failed=1
compose up -d --no-build app
[ "$restore_failed" -eq 0 ] || { echo 'Restore feilet. Bruk pre-restore-backupen som nettopp ble laget.' >&2; exit 1; }
attempt=0
until compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 45 ] || { echo 'Restore er utført, men appen ble ikke klar. Bruk pre-restore-backupen.' >&2; exit 1; }
  sleep 2
done
echo 'Restore er fullført og readiness er grønn.'
