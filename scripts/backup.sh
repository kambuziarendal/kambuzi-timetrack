#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f backups/.kambuzi-timeforing-backups ] || { echo 'Backupkatalogen mangler eierskapsmerke.' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="timeforing-$stamp.dump"
verify_db="timeforing_verify_$(date -u +%Y%m%d%H%M%S)"
docker compose exec -T app pg_dump --format=custom --no-owner --no-acl --file="/backups/$name"
docker compose exec -T app pg_restore --list "/backups/$name" >/dev/null
cleanup() { docker compose exec -T app dropdb --if-exists "$verify_db" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
docker compose exec -T app createdb "$verify_db"
docker compose exec -T app pg_restore --no-owner --no-acl --dbname="$verify_db" "/backups/$name"
docker compose exec -T app psql --dbname="$verify_db" --tuples-only --command="SELECT count(*) FROM schema_migrations;" >/dev/null
docker compose exec -T app sha256sum "/backups/$name" > "backups/$name.sha256"
cleanup
trap - EXIT INT TERM
chmod 600 "backups/$name" "backups/$name.sha256"
echo "Verifisert backup: backups/$name"
