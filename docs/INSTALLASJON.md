# Installasjon

## 1. Forbered serveren

Installer Docker Engine med Compose v2. Opprett en egen katalog og pakk ut Kambuzi Timeføring der. Ikke kjør appen direkte på internett uten HTTPS-proxy.

## 2. Opprett konfigurasjon

```bash
./scripts/install.sh
```

Første kjøring oppretter `.env` med et tilfeldig databasepassord og avslutter. Rediger filen:

```dotenv
APP_URL=https://timer.eksempel.no
HTTP_PORT=4080
SECURE_COOKIES=true
TRUST_PROXY=1
```

`APP_URL` må være den faktiske HTTPS-adressen. Behold `SECURE_COOKIES=true` i normal drift. `TRUST_PROXY=1` passer når nøyaktig én reverse proxy står foran appen.

## 3. Start

```bash
./scripts/install.sh
```

Tjenesten lytter bare på `127.0.0.1:4080`. Åpne den gjennom reverse proxy og fullfør førstegangsoppsettet i nettleseren.

## 4. Caddy-eksempel

```caddyfile
timer.eksempel.no {
  reverse_proxy 127.0.0.1:4080
}
```

## 5. nginx-eksempel

```nginx
server {
  listen 443 ssl http2;
  server_name timer.eksempel.no;
  location / {
    proxy_pass http://127.0.0.1:4080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

TLS-sertifikat og nginx-herding må håndteres på serveren. Kontroller etterpå:

```bash
curl --fail https://timer.eksempel.no/health/ready
```

## Installasjon i undermappe

For en isolert test eller intern installasjon under for eksempel
`https://eksempel.no/timetest/`, bruk:

```dotenv
APP_URL=https://eksempel.no/timetest
VITE_BASE_PATH=/timetest/
COOKIE_NAME=tt_timetest_session
COOKIE_PATH=/timetest/
HTTP_PORT=4080
SECURE_COOKIES=true
TRUST_PROXY=1
```

Bygg appen på nytt etter endring av `VITE_BASE_PATH`. nginx må fjerne
prefikset når forespørsler sendes til appen:

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

Eget `COOKIE_NAME` og `COOKIE_PATH` hindrer at testøkten kolliderer med andre
apper på samme domene. Bruk alltid avsluttende skråstrek i `VITE_BASE_PATH` og
`COOKIE_PATH`.

## Oppdatering

Pakk ut ny release i en ny katalog eller oppdater den eksisterende kildekatalogen. Behold `.env` og `backups/`. Kjør:

```bash
./scripts/upgrade.sh
```

Scriptet tar og restore-verifiserer backup før bygg og oppstart. Databasemigrasjoner er versjonerte og kjøres i transaksjon ved appstart.
