#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain --untracked-files=normal)" ] || { echo 'Arbeidskopien må være ren før releasebygg.' >&2; exit 1; }
version=$(node -p "require('./package.json').version")
commit=$(git rev-parse --short=12 HEAD)
output=${1:-dist-release}
mkdir -p "$output"
archive="$output/kambuzi-timeforing-$version-$commit-source.tar.gz"
git archive --format=tar --prefix="kambuzi-timeforing-$version/" HEAD | gzip -n -9 > "$archive"
(cd "$output" && sha256sum "$(basename "$archive")" > "$(basename "$archive").sha256")
sbom="$output/kambuzi-timeforing-$version-$commit.sbom.json"
npm sbom --sbom-format cyclonedx > "$sbom"
node scripts/normalize-sbom.mjs "$sbom"
(cd "$output" && sha256sum "$(basename "$sbom")" > "$(basename "$sbom").sha256")
manifest="$output/kambuzi-timeforing-$version-$commit-release-manifest.txt"
{
  echo "name=Kambuzi Timeføring"
  echo "version=$version"
  echo "commit=$(git rev-parse HEAD)"
  echo "source=$(basename "$archive")"
  echo "source_sha256=$(cut -d ' ' -f 1 "$archive.sha256")"
  echo "sbom=$(basename "$sbom")"
  echo "sbom_sha256=$(cut -d ' ' -f 1 "$sbom.sha256")"
  echo "database_image=postgres:17.7-bookworm"
  echo "app_image=kambuzi-timeforing:$(git rev-parse HEAD)"
  echo "signing=Sign checksum files with cosign or minisign before public release; publish public key/fingerprint with the release."
} > "$manifest"
(cd "$output" && sha256sum "$(basename "$manifest")" > "$(basename "$manifest").sha256")
echo "$archive"
