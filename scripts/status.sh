#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
[ -f .env ] || { echo '.env mangler.' >&2; exit 1; }
compose ps
if compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/live >/dev/null; then
  echo 'live: ok'
else
  echo 'live: error' >&2
  exit 1
fi
if compose exec -T app curl --fail --silent http://127.0.0.1:4000/health/ready >/dev/null; then
  echo 'ready: ok'
else
  echo 'ready: error' >&2
  exit 1
fi
expected_release=$(sed -n 's/^IMAGE_TAG=//p' .env | tail -n 1)
actual_release=$(compose exec -T app curl --fail --silent http://127.0.0.1:4000/version | sed -n 's/.*"release":"\([^"]*\)".*/\1/p')
[ -n "$actual_release" ] && [ "$actual_release" = "$expected_release" ] || { echo "release: mismatch (forventet $expected_release, fikk ${actual_release:-ukjent})" >&2; exit 1; }
echo "release: ok ($actual_release)"
setup_required=$(compose exec -T app curl --fail --silent http://127.0.0.1:4000/api/setup/status | sed -n 's/.*"required":\(true\|false\).*/\1/p')
echo "setup_required: ${setup_required:-unknown}"
[ "$setup_required" = 'false' ] || { echo 'Førstegangsoppsettet er ikke lukket.' >&2; exit 1; }
latest=$(sed -n '1p' backups/LAST_VERIFIED 2>/dev/null || true)
if [ -z "$latest" ] || [ ! -f "backups/$latest" ] || [ ! -f "backups/$latest.sha256" ]; then
  echo 'backup: missing' >&2
  exit 1
fi
(cd backups && sha256sum -c "$latest.sha256" >/dev/null)
if find "backups/$latest" -mmin +2160 -print | grep -q .; then
  echo "backup: stale ($latest)" >&2
  exit 1
fi
echo "backup: ok ($latest)"
