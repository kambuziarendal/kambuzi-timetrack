#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain --untracked-files=normal)" ] || { echo 'Arbeidskopien må være ren før releasebygg.' >&2; exit 1; }
version=$(node -p "require('./package.json').version")
commit=$(git rev-parse --short=12 HEAD)
output=${1:-dist-release}
mkdir -p "$output"
archive="$output/kambuzi-timeforing-$version-$commit.tar.gz"
git archive --format=tar --prefix="kambuzi-timeforing-$version/" HEAD | gzip -n -9 > "$archive"
(cd "$output" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")
sbom="$output/kambuzi-timeforing-$version-$commit.sbom.json"
npm sbom --sbom-format cyclonedx > "$sbom"
node scripts/normalize-sbom.mjs "$sbom"
echo "$archive"
