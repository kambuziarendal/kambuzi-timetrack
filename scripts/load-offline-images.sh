#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
archive=${1:-}
[ -n "$archive" ] && [ -f "$archive" ] || { echo 'Oppgi imagearkiv fra releasepakken.' >&2; exit 1; }
sha_file="$archive.sha256"
[ -f "$sha_file" ] || { echo "Checksumfil mangler: $sha_file" >&2; exit 1; }
(cd "$(dirname "$archive")" && sha256sum -c "$(basename "$sha_file")")
gzip -t "$archive"
docker load -i "$archive"
echo 'Offlineimages er lastet inn lokalt.'
