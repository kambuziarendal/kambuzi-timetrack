# Hurtigstart: egen server på 10–15 minutter

Dette er standardløpet for en ny Ubuntu 24.04- eller Debian 12-server. Timeføring kjører bare på serveren din. Ingen ansattdata sendes til Kambuzi.

## Før du starter

Du trenger:

- et subdomene som peker til serveren, for eksempel `timer.firma.no`
- Docker Engine og Docker Compose v2
- minst 1 GB RAM og 2 GB ledig disk, i tillegg til plass til data og backuper
- port 80 og 443 tilgjengelig for HTTPS-proxyen

Kontroller serveren:

```bash
docker version
docker compose version
uname -m
df -h .
```

Arkitektur `x86_64` bruker `amd64`-pakken. `aarch64` eller `arm64` bruker `arm64`-pakken.

## 1. Last ned én installasjonspakke

Fra den nyeste GitHub-releasen laster du ned:

- `kambuzi-timeforing-<versjon>-<commit>-<arkitektur>-offline.tar.gz`
- den tilhørende `.sha256`-filen

Legg begge filene i samme mappe og kontroller pakken:

```bash
sha256sum -c kambuzi-timeforing-*-offline.tar.gz.sha256
```

Fortsett bare når kontrollen sier `OK`.

## 2. Pakk ut og start veiviseren

```bash
tar -xzf kambuzi-timeforing-*-offline.tar.gz
cd kambuzi-timeforing-*
./scripts/bootstrap.sh offline/kambuzi-timeforing-images-*.tar.gz
```

Veiviseren:

1. kontrollerer serverressursene og releasefilene
2. laster ferdigbygde app- og PostgreSQL-images uten lokalt bygg
3. genererer databasepassord med sikre filrettigheter
4. ber om offentlig HTTPS-adresse og virksomhetsopplysninger
5. oppretter første administrator lokalt før offentlig eksponering
6. starter appen og kjører migrasjoner
7. tar en backup og gjenoppretter den i en isolert prøvedatabase
8. installerer daglig backup når `crontab` finnes
9. kjører sluttstatus

Administratorpassordet skrives maskert og lagres ikke i installasjonsloggen.

## 3. Legg HTTPS foran appen

Appen lytter bare på `127.0.0.1:4080`.

Anbefalt Caddy-oppsett:

```caddyfile
timer.firma.no {
  reverse_proxy 127.0.0.1:4080
}
```

nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name timer.firma.no;

    location / {
        proxy_pass http://127.0.0.1:4080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Bruk serverens vanlige, verifiserte TLS-/sertifikatoppsett. Ikke eksponer port 4080 i brannmuren.

## 4. Kontroller installasjonen

```bash
./scripts/status.sh
curl --fail https://timer.firma.no/health/ready
```

Status skal vise:

- app og database som kjørende
- `live: ok`
- `ready: ok`
- `release: ok` med samme commit som releasepakken
- `setup_required: false`
- `backup: ok`

Logg deretter inn, opprett én testansatt, før en testvakt, send den inn og godkjenn den. Slett testdataene før ordinær bruk hvis de ikke skal inngå i historikken.

## Stopp ved feil

Ikke åpne siden for ansatte hvis readiness eller backup er rød. Se først:

```bash
docker compose logs --tail=200 app
docker compose logs --tail=200 db
```

Se [INSTALLASJON.md](INSTALLASJON.md) for manuell installasjon og undermappe, og [DRIFT.md](DRIFT.md) for backup, restore, oppgradering, rollback og flytting.
