# Installasjon

Denne veiledningen er laget for Ubuntu 24.04 og Debian 12 på `amd64` eller `arm64`. Normal installasjon bruker ferdigbygde releaseimages og krever ikke Git, Node.js, Python, Buildx eller lokalt bygg.

## 1. Før du starter

Du trenger:

- Docker Engine med Docker Compose v2
- minst 1 GB RAM
- minst 2 GB ledig disk pluss plass til egne data/backuper
- et domene eller intern adresse du kontrollerer
- HTTPS foran appen før den brukes av ansatte

Anbefalt modell er eget subdomene, for eksempel `timer.eksempel.no`, med Caddy foran appen. nginx-undermappe fungerer, men er mer følsomt for feil i path og cookies og er derfor avansert.

## 2. Last ned og kontroller release

Last ned fra samme GitHub-release:

- `kambuzi-timeforing-<versjon>-<commit>-source.tar.gz`
- tilhørende `.sha256`
- `kambuzi-timeforing-images-<commit>-amd64.tar.gz` eller `...-arm64.tar.gz`
- tilhørende `.sha256`
- SBOM og release-manifest

Kontroller filene:

```bash
sha256sum -c kambuzi-timeforing-*.sha256
sha256sum -c kambuzi-timeforing-images-*.sha256
```

Verifiser også GitHub-attestasjonen når GitHub CLI er tilgjengelig: `gh attestation verify <fil> --repo kambuziarendal/kambuzi-timetrack`. Offlineinstallasjon kan fortsatt kontrollere SHA-256 uten GitHub-tilgang.

## 3. Pakk ut og last images

```bash
tar -xzf kambuzi-timeforing-1.0.0-beta.3-<commit>-source.tar.gz
cd kambuzi-timeforing-1.0.0-beta.3
./scripts/load-offline-images.sh ../kambuzi-timeforing-images-<commit>-amd64.tar.gz
```

Bytt til `arm64`-filen på ARM-server.

## 4. Opprett konfigurasjon

```bash
./scripts/install.sh
```

Første kjøring oppretter `.env` og `backups/`, setter sikre filrettigheter og stopper. Rediger `.env`:

```dotenv
IMAGE_TAG=<eksakt-release-commit-sha>
APP_URL=https://timer.eksempel.no
HTTP_PORT=4080
SECURE_COOKIES=true
TRUST_PROXY=1
```

`IMAGE_TAG` skal være eksakt commit-SHA fra release-manifestet. Ikke bruk `latest`.

## 5. Start internt og opprett første administrator

```bash
./scripts/install.sh
```

Appen lytter bare på `127.0.0.1:4080`. Ikke åpne reverse proxy offentlig før første administrator er opprettet. Bruk lokal nettleser på serveren eller SSH-tunnel:

```bash
ssh -L 4080:127.0.0.1:4080 server
```

Åpne `http://127.0.0.1:4080`, opprett virksomheten og første administrator, og kontroller deretter:

```bash
./scripts/status.sh
```

`setup_required` skal være `false` før offentlig eksponering.

## 6. Caddy med eget domene

```caddyfile
timer.eksempel.no {
  reverse_proxy 127.0.0.1:4080
}
```

Kontroller etterpå:

```bash
curl --fail https://timer.eksempel.no/health/ready
```

## 7. Avansert: nginx i undermappe

For `https://eksempel.no/timetest/`:

```dotenv
APP_URL=https://eksempel.no/timetest
VITE_BASE_PATH=/timetest/
COOKIE_NAME=tt_timetest_session
COOKIE_PATH=/timetest/
HTTP_PORT=4080
SECURE_COOKIES=true
TRUST_PROXY=1
```

Frontend-basepath bygges inn i app-imaget. Bruk derfor bare releaseimage som er bygget for samme basepath, eller bygg eksplisitt i eget utviklingsløp. nginx må strippe prefikset:

```nginx
location = /timetest {
    return 308 /timetest/;
}

location /timetest/ {
    proxy_pass http://127.0.0.1:4080/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

Bruk alltid avsluttende skråstrek i `VITE_BASE_PATH` og `COOKIE_PATH`.
