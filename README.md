# Kambuzi Timeføring

Gratis selvhostet timeføring for små virksomheter. Én installasjon tilhører én virksomhet. Ingen telemetri, reklame eller skytjeneste fra Kambuzi er nødvendig.

## Dette får du

- ansatte fører dato, start, slutt, pause og notat fra mobil eller PC
- vakter over midnatt håndteres automatisk
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

Dette er et registrerings- og dokumentasjonsverktøy. Det beregner ikke lønn, skatt eller juridisk etterlevelse.

## Installer fra release

Standardinstallasjon krever Docker Engine og Docker Compose v2 på Ubuntu 24.04 eller Debian 12. Den krever ikke Git, Node.js, Python, Buildx eller lokalt bygg.

1. Last ned kildepakken, checksumfilen og riktig offlineimage for `amd64` eller `arm64` fra samme release.
2. Kontroller SHA-256 mot releasechecksummene.
3. Pakk ut kildepakken og gå inn i mappen.
4. Kjør `./scripts/load-offline-images.sh ../kambuzi-timeforing-images-<sha>-<arch>.tar.gz`.
5. Kjør `./scripts/install.sh`. Første kjøring lager `.env` og stopper.
6. Sett `APP_URL`, `IMAGE_TAG=<release-commit-sha>` og eventuelt `HTTP_PORT` i `.env`.
7. Kjør `./scripts/install.sh` igjen.
8. Opprett første administrator via lokal tilgang før reverse proxy åpnes offentlig.
9. Legg Caddy eller annen HTTPS-proxy foran `127.0.0.1:4080`.

Se [docs/INSTALLASJON.md](docs/INSTALLASJON.md) for 10-15 minutters installasjon, domenemodell og avansert nginx-undermappe. Se [docs/DRIFT.md](docs/DRIFT.md) for status, backup, restore, oppgradering, rollback, flytting og recovery.

## Releaseinnhold

Hver offentlig beta.3-release skal ha:

- kildearkiv fra eksakt tag/commit
- SHA-256 for kildearkiv, SBOM, manifest og imagearkiver
- CycloneDX-SBOM
- ferdigbygde låste `linux/amd64`- og `linux/arm64`-imagearkiver med app + `postgres:17.7-bookworm`
- signerte checksums eller signert releaseattest med publisert nøkkel/fingerprint

Ingen installasjonssteg bruker `latest`.

## Lisens

Kambuzi Timeføring er fri programvare under [GNU Affero General Public License v3.0 eller nyere](LICENSE). Programmet leveres uten garanti. Se [NOTICE](NOTICE).
