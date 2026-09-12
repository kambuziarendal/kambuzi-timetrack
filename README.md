# Kambuzi Timeføring

Et enkelt, gratis og selvhostet system for timeføring i små virksomheter. Én installasjon tilhører én virksomhet. Ingen telemetri, reklame eller skytjeneste fra Kambuzi er nødvendig.

## Dette får du

- ansatte fører dato, start, slutt, pause og notat fra mobil eller PC
- vakt over midnatt håndteres automatisk
- utkast kan redigeres, slettes og sendes inn
- leder kan godkjenne, sende tilbake og låse perioder
- lønnsbehandlede registreringer kan merkes og spores
- rapporter filtreres på periode, ansatt, arbeidsrolle, status og behandling
- samme filter brukes for skjerm, CSV og PDF
- ansatt-, arbeidsrolle- og virksomhetsadministrasjon
- auditlogg for sikkerhets- og dataendringer
- lyst og mørkt tema med systemvalg og manuell overstyring
- komplett dataeksport
- verifisert PostgreSQL-backup og kontrollert restore
- administrator-recovery fra serverkonsollen

Dette er et registrerings- og dokumentasjonsverktøy. Det beregner ikke lønn, skatt eller juridisk etterlevelse og erstatter ikke regnskapsfører eller arbeidsrettslig vurdering.

## Krav

- Linux-server eller NAS med Docker Engine og Docker Compose v2
- en HTTPS-reverse proxy, for eksempel Caddy, nginx eller Traefik
- minst 1 GB RAM og ca. 2 GB ledig disk i tillegg til egne data/backuper
- en offentlig eller intern adresse du kontrollerer

## Installer

1. Pakk ut releasen og gå inn i mappen.
2. Kjør `./scripts/install.sh`.
3. Første kjøring oppretter `.env` og stopper. Endre minst `APP_URL`.
4. Kjør `./scripts/install.sh` på nytt.
5. Legg HTTPS-proxy foran `127.0.0.1:4080`.
6. Åpne adressen og opprett virksomheten og første administrator.

Se [docs/INSTALLASJON.md](docs/INSTALLASJON.md) for komplette eksempler og [docs/DRIFT.md](docs/DRIFT.md) for backup, restore, oppgradering og recovery.

Appen kan også ligge under en egen sti, for eksempel `/timetest/`. Da settes
`APP_URL`, `VITE_BASE_PATH` og `COOKIE_PATH` som vist i
[installasjonsveiledningen](docs/INSTALLASJON.md#installasjon-i-undermappe).

## Sikkerhetsmodell

- én virksomhet per installasjon; ingen tenantvelger eller offentlig registrering etter oppsett
- opaque, hash-lagrede økter i `HttpOnly; SameSite=Strict`-cookie
- CSRF-verifisering på alle autentiserte skrivekall
- aktive brukere og roller kontrolleres på hvert kall
- passord hashes med bcrypt, og startpassord vises bare én gang
- deaktivering og rolleendring tilbakekaller aktive økter
- siste aktive administrator kan ikke deaktiveres
- persondata og passordhash eksponeres aldri av bruker-API-et
- appcontaineren er read-only og databasen eksponeres ikke på hostport

Se [SECURITY.md](SECURITY.md) for rapportering og driftsansvar.

## Utvikling

Krever Node.js 22.

```bash
npm ci
npm run check
npm run test:e2e
```

Backend-tester bruker PGlite i minnet. Produksjon bruker PostgreSQL 17.

## Lisens

Kambuzi Timeføring er fri programvare under
[GNU Affero General Public License v3.0 eller nyere](LICENSE). Du kan bruke,
studere, endre og dele programmet etter vilkårene i lisensen. Dersom du tilbyr
en endret versjon som nettjeneste, må brukerne få tilgang til den tilsvarende
kildekoden.

Programmet leveres uten garanti. Se [LICENSE](LICENSE) og [NOTICE](NOTICE).
