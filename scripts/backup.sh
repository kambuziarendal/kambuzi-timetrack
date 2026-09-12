#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
retention_days=''
if [ "${1:-}" = '--retention-days' ]; then
  retention_days=${2:-}
  case "$retention_days" in ''|*[!0-9]*) echo 'Retention må være antall dager.' >&2; exit 1;; esac
fi
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
[ -f backups/.kambuzi-timeforing-backups ] || { echo 'Backupkatalogen mangler eierskapsmerke.' >&2; exit 1; }
lock_dir=backups/.backup-lock
mkdir "$lock_dir" 2>/dev/null || { echo 'En annen backup kjører allerede.' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="timeforing-$stamp.dump"
verify_db="timeforing_verify_$(date -u +%Y%m%d%H%M%S)_$$"
complete=0
cleanup() {
  compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$1"' sh "$verify_db" >/dev/null 2>&1 || true
  if [ "$complete" -ne 1 ]; then rm -f "backups/$name" "backups/$name.sha256"; fi
  rmdir "$lock_dir" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM
compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "backups/$name"
compose exec -T db pg_restore --list < "backups/$name" >/dev/null
compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$1"' sh "$verify_db" < "backups/$name"
compose exec -T db sh -c 'psql -U "$POSTGRES_USER" --dbname="$1" --tuples-only --command="SELECT count(*) FROM schema_migrations;"' sh "$verify_db" >/dev/null
(cd backups && sha256sum "$name" > "$name.sha256")
printf '%s\n' "$name" > backups/LAST_VERIFIED
complete=1
cleanup
trap - EXIT INT TERM
chmod 600 "backups/$name" "backups/$name.sha256" backups/LAST_VERIFIED
if [ -n "$retention_days" ]; then
  latest=$(cat backups/LAST_VERIFIED)
  find backups -maxdepth 1 -type f -name 'timeforing-*.dump' -mtime +"$retention_days" | while IFS= read -r old; do
    [ "$(basename "$old")" = "$latest" ] && continue
    rm -f "$old" "$old.sha256"
  done
fi
echo "Verifisert backup: backups/$name"
