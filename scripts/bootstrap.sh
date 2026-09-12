#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
. ./scripts/compose-command.sh
umask 077

usage() {
  echo 'Bruk: ./scripts/bootstrap.sh <offline-imagearkiv>' >&2
  echo 'Med allerede lastede images: ./scripts/bootstrap.sh --image-tag <eksakt-commit-sha>' >&2
  echo 'Bare for CI/lokal test kan --insecure-local legges til.' >&2
  exit 1
}

archive=''
image_tag=''
insecure=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --image-tag) [ "$#" -ge 2 ] || usage; image_tag=$2; shift 2 ;;
    --insecure-local) insecure=1; shift ;;
    -*) usage ;;
    *) [ -z "$archive" ] || usage; archive=$1; shift ;;
  esac
done

if [ -n "$archive" ]; then
  [ -f "$archive" ] || { echo 'Offlineimage finnes ikke.' >&2; exit 1; }
  image_tag=$(basename "$archive" | sed -n 's/^kambuzi-timeforing-images-\([0-9a-f]\{40\}\)-\(amd64\|arm64\)\.tar\.gz$/\1/p')
  [ -n "$image_tag" ] || { echo 'Imagearkivet har ikke forventet releasefilnavn.' >&2; exit 1; }
  archive_arch=$(basename "$archive" | sed -n 's/.*-\(amd64\|arm64\)\.tar\.gz$/\1/p')
  machine=$(uname -m)
  case "$machine:$archive_arch" in x86_64:amd64|aarch64:arm64|arm64:arm64) ;; *) echo "Imagearkivet $archive_arch passer ikke serveren $machine." >&2; exit 1;; esac
  ./scripts/load-offline-images.sh "$archive"
fi
[ -n "$image_tag" ] || usage
case "$image_tag" in latest|*:latest|*[!0-9a-f]*) echo 'Image-tag må være en eksakt commit-SHA.' >&2; exit 1;; esac
[ "${#image_tag}" -eq 40 ] || { echo 'Image-tag må være en full 40-tegns commit-SHA.' >&2; exit 1; }

if [ ! -f .env ]; then
  if ./scripts/install.sh; then
    echo 'Forventet at første installasjonssteg skulle opprette .env.' >&2
    exit 1
  else
    code=$?
    [ "$code" -eq 2 ] || exit "$code"
  fi
fi

prompt() {
  label=$1
  default=${2:-}
  if [ -n "$default" ]; then printf '%s [%s]: ' "$label" "$default" >&2; else printf '%s: ' "$label" >&2; fi
  IFS= read -r answer
  if [ -z "$answer" ]; then answer=$default; fi
  printf '%s' "$answer"
}

secret_prompt() {
  label=$1
  printf '%s: ' "$label" >&2
  if [ -t 0 ]; then stty -echo; fi
  IFS= read -r answer
  if [ -t 0 ]; then stty echo; printf '\n' >&2; fi
  printf '%s' "$answer"
}

app_url=$(prompt 'Offentlig HTTPS-adresse' 'https://timer.eksempel.no')
app_url=${app_url%/}
if [ "$insecure" -eq 1 ]; then
  case "$app_url" in http://127.0.0.1:*|http://localhost:*) secure=false ;; *) echo '--insecure-local kan bare brukes med localhost.' >&2; exit 1;; esac
else
  case "$app_url" in https://*/*) echo 'Standardinstallasjonen krever eget domene uten undermappe.' >&2; exit 1;; https://*) secure=true ;; *) echo 'Adressen må starte med https://.' >&2; exit 1;; esac
fi
company_name=$(prompt 'Virksomhetsnavn')
org_number=$(prompt 'Organisasjonsnummer (valgfritt)')
first_name=$(prompt 'Administratorens fornavn')
last_name=$(prompt 'Administratorens etternavn')
admin_email=$(prompt 'Administratorens e-post')
[ "${#company_name}" -ge 2 ] || { echo 'Virksomhetsnavnet må ha minst to tegn.' >&2; exit 1; }
[ -n "$first_name" ] && [ -n "$last_name" ] && [ -n "$admin_email" ] || { echo 'Navn og e-post for administrator må fylles ut.' >&2; exit 1; }
password=$(secret_prompt 'Administratorpassord, minst 12 tegn')
password_again=$(secret_prompt 'Gjenta administratorpassordet')
[ "$password" = "$password_again" ] || { echo 'Passordene er ikke like.' >&2; exit 1; }
[ "${#password}" -ge 12 ] || { echo 'Passordet må ha minst 12 tegn.' >&2; exit 1; }

cp .env ".env.pre-bootstrap.$(date -u +%Y%m%dT%H%M%SZ)"
update_env() {
  key=$1
  value=$2
  awk -v key="$key" -v value="$value" 'BEGIN{done=0} index($0,key "=")==1{print key "=" value;done=1;next}{print} END{if(!done)print key "=" value}' .env > .env.next
  chmod 600 .env.next
  mv .env.next .env
}
update_env APP_URL "$app_url"
update_env IMAGE_TAG "$image_tag"
update_env VITE_BASE_PATH '/'
update_env COOKIE_PATH '/'
update_env SECURE_COOKIES "$secure"

./scripts/install.sh
setup_required=$(compose exec -T app curl --fail --silent http://127.0.0.1:4000/api/setup/status | sed -n 's/.*"required":\(true\|false\).*/\1/p')
[ "$setup_required" = 'true' ] || { echo 'Førstegangsoppsettet er allerede fullført. Bootstrap avbrytes.' >&2; exit 1; }
printf '%s\n' "$company_name" "$org_number" "$first_name" "$last_name" "$admin_email" "$password" | compose exec -T app node backend/dist/bootstrapAdmin.js
unset password password_again
./scripts/backup.sh --retention-days 30
if command -v crontab >/dev/null 2>&1; then
  if ! ./scripts/install-backup-cron.sh; then
    echo 'Daglig cron-backup kunne ikke installeres. Sett opp backup med serverens planlegger før ordinær bruk.' >&2
  fi
else
  echo 'crontab er ikke installert. Sett opp daglig kjøring av ./scripts/backup.sh --retention-days 30 med serverens planlegger.' >&2
fi
./scripts/status.sh
echo "Timeføring er installert på loopback. Sett opp HTTPS-proxy mot 127.0.0.1:4080 og åpne deretter $app_url."
