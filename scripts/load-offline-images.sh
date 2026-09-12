#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
archive=${1:-}
[ -n "$archive" ] && [ -f "$archive" ] || { echo 'Oppgi imagearkiv fra releasepakken.' >&2; exit 1; }
sha_file="$archive.sha256"
if [ -f "$sha_file" ]; then
  (cd "$(dirname "$archive")" && sha256sum -c "$(basename "$sha_file")")
fi
gzip -t "$archive"
docker load -i "$archive"
echo 'Offlineimages er lastet inn lokalt.'
