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
setup_required=$(compose exec -T app curl --fail --silent http://127.0.0.1:4000/api/setup/status | sed -n 's/.*"required":\(true\|false\).*/\1/p')
echo "setup_required: ${setup_required:-unknown}"
