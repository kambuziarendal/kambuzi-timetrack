#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
[ "${CONFIRM_RESTORE:-}" = 'YES' ] || { echo 'Sett CONFIRM_RESTORE=YES for å bekrefte gjenoppretting.' >&2; exit 1; }
archive=${1:-}
[ -n "$archive" ] && [ -f "$archive" ] || { echo 'Oppgi en eksisterende .dump-fil.' >&2; exit 1; }
case "$(realpath "$archive")" in "$(realpath backups)"/*) ;; *) echo 'Arkivet må ligge i backups/.' >&2; exit 1;; esac
[ -f "$archive.sha256" ] || { echo "Checksumfil mangler: $archive.sha256" >&2; exit 1; }
if grep -q '  backups/' "$archive.sha256"; then
  sha256sum -c "$archive.sha256"
else
  (cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256")
fi

wait_ready() {
  attempt=0
  until compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; do
    attempt=$((attempt + 1))
    [ "$attempt" -lt 45 ] || return 1
    sleep 2
  done
}

trial_db="timeforing_restore_trial_$(date -u +%Y%m%d%H%M%S)_$$"
cleanup_trial() { compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$1"' sh "$trial_db" >/dev/null 2>&1 || true; }
trap cleanup_trial EXIT INT TERM
compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$trial_db"
if ! compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$1"' sh "$trial_db" < "$archive"; then
  echo 'Arkivet kunne ikke gjenopprettes i prøvedatabasen. Aktiv database er urørt.' >&2
  exit 1
fi
compose exec -T db sh -c 'psql -U "$POSTGRES_USER" --dbname="$1" --tuples-only --command="SELECT count(*) FROM schema_migrations;"' sh "$trial_db" >/dev/null
cleanup_trial
trap - EXIT INT TERM

backup_line=$(./scripts/backup.sh | tail -n 1)
pre_restore_backup=$(printf '%s' "$backup_line" | sed -n 's/^Verifisert backup: //p')
[ -n "$pre_restore_backup" ] && [ -f "$pre_restore_backup" ] || { echo 'Fant ikke verifisert pre-restore-backup.' >&2; exit 1; }

compose stop app
restore_active() {
  selected=$1
  compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"' &&
    compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$POSTGRES_DB"' &&
    compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$POSTGRES_DB"' < "$selected"
}

if ! restore_active "$archive"; then
  echo 'Restore feilet. Gjenoppretter automatisk pre-restore-backup.' >&2
  restore_active "$pre_restore_backup" || { echo 'KRITISK: Automatisk database-rollback feilet.' >&2; exit 1; }
  compose up -d --no-build app
  wait_ready || { echo 'KRITISK: Databasen ble rullet tilbake, men appen ble ikke klar.' >&2; exit 1; }
  echo "Automatisk rollback fullført med $pre_restore_backup." >&2
  exit 1
fi

compose up -d --no-build app
if ! wait_ready; then
  echo 'Readiness feilet etter restore. Gjenoppretter automatisk pre-restore-backup.' >&2
  compose stop app
  restore_active "$pre_restore_backup" || { echo 'KRITISK: Automatisk database-rollback feilet.' >&2; exit 1; }
  compose up -d --no-build app
  wait_ready || { echo 'KRITISK: Databasen ble rullet tilbake, men appen ble ikke klar.' >&2; exit 1; }
  echo "Automatisk rollback fullført med $pre_restore_backup." >&2
  exit 1
fi
echo "Restore er fullført og readiness er grønn. Pre-restore-backup: $pre_restore_backup"
