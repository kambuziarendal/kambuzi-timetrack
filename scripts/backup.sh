#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
[ -f backups/.kambuzi-timeforing-backups ] || { echo 'Backupkatalogen mangler eierskapsmerke.' >&2; exit 1; }
stamp=$(date -u +%Y%m%dT%H%M%SZ)
name="timeforing-$stamp.dump"
verify_db="timeforing_verify_$(date -u +%Y%m%d%H%M%S)"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "backups/$name"
docker compose exec -T db pg_restore --list < "backups/$name" >/dev/null
cleanup() { docker compose exec -T db sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$1"' sh "$verify_db" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" "$1"' sh "$verify_db"
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" --no-owner --no-acl --dbname="$1"' sh "$verify_db" < "backups/$name"
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" --dbname="$1" --tuples-only --command="SELECT count(*) FROM schema_migrations;"' sh "$verify_db" >/dev/null
sha256sum "backups/$name" > "backups/$name.sha256"
cleanup
trap - EXIT INT TERM
chmod 600 "backups/$name" "backups/$name.sha256"
echo "Verifisert backup: backups/$name"
