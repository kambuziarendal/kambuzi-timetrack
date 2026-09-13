#!/usr/bin/env bash
set -euo pipefail

locale_root="$(mktemp -d)"
trap 'rm -rf -- "$locale_root"' EXIT

localedef -i nb_NO -f UTF-8 "$locale_root/nb_NO.UTF-8"

LOCPATH="$locale_root" \
LANG=nb_NO.UTF-8 \
LC_ALL=nb_NO.UTF-8 \
npx playwright test "$@"
