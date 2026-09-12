#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
app_dir=$(pwd)
command -v crontab >/dev/null 2>&1 || { echo 'crontab mangler.' >&2; exit 1; }
line="17 3 * * * cd '$app_dir' && ./scripts/backup.sh --retention-days 30 >> backups/backup.log 2>&1"
tmp=$(mktemp)
trap 'rm -f "$tmp" "$tmp.new"' EXIT INT TERM
crontab -l > "$tmp" 2>/dev/null || true
grep -Fv "cd '$app_dir' && ./scripts/backup.sh" "$tmp" > "$tmp.new" || true
printf '%s\n' "$line" >> "$tmp.new"
crontab "$tmp.new"
echo 'Daglig restore-verifisert backup er lagt i crontab kl. 03:17.'
