#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
backup=${1:-}
previous_tag=${2:-}
[ -n "$backup" ] && [ -f "$backup" ] || { echo 'Bruk: ./scripts/rollback.sh backups/timeforing-...dump <forrige-image-tag>' >&2; exit 1; }
[ -n "$previous_tag" ] || { echo 'Oppgi forrige IMAGE_TAG.' >&2; exit 1; }
case "$previous_tag" in *[!0-9a-f]*) echo 'Forrige image-tag må være en eksakt commit-SHA.' >&2; exit 1;; esac
[ "${#previous_tag}" -eq 40 ] || { echo 'Forrige image-tag må være en full 40-tegns commit-SHA.' >&2; exit 1; }
cp .env ".env.rollback.$(date -u +%Y%m%dT%H%M%SZ)"
awk -v tag="$previous_tag" 'BEGIN{done=0} /^IMAGE_TAG=/{print "IMAGE_TAG=" tag; done=1; next} {print} END{if(!done) print "IMAGE_TAG=" tag}' .env > .env.next
chmod 600 .env.next
mv .env.next .env
CONFIRM_RESTORE=YES ./scripts/restore.sh "$backup"
./scripts/status.sh
echo 'Rollback er aktiv med oppgitt image-tag og restore-verifisert database.'
