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

1. Last ned offline-installasjonspakken for `amd64` eller `arm64` og tilhørende checksum fra samme release.
2. Kontroller SHA-256 og pakk ut arkivet.
3. Kjør `./scripts/bootstrap.sh offline/kambuzi-timeforing-images-*.tar.gz`.
4. Legg Caddy eller nginx med HTTPS foran `127.0.0.1:4080`.
5. Kontroller `./scripts/status.sh` og den offentlige readiness-adressen.

Se [docs/HURTIGSTART.md](docs/HURTIGSTART.md) for 10–15 minutters installasjon. Se [docs/INSTALLASJON.md](docs/INSTALLASJON.md) for manuell installasjon, domenemodell og avansert nginx-undermappe. Se [docs/DRIFT.md](docs/DRIFT.md) for status, backup, restore, oppgradering, rollback, flytting og recovery.

Se [docs/RELEASEKRAV.md](docs/RELEASEKRAV.md) for skillet mellom beta, release candidate og stabil 1.0.0.

## Releaseinnhold

Hver offentlig release skal ha:

- kildearkiv fra eksakt tag/commit
- SHA-256 for kildearkiv, SBOM, manifest og imagearkiver
- CycloneDX-SBOM
- ferdigbygde låste `linux/amd64`- og `linux/arm64`-imagearkiver med app + `postgres:17.7-bookworm`
- én samlet offline-installasjonspakke per arkitektur
- GitHub Artifact Attestations for kildearkiv, SBOM, manifest og imagearkiver

Ingen installasjonssteg bruker `latest`.

## Lisens

Kambuzi Timeføring er fri programvare under [GNU Affero General Public License v3.0 eller nyere](LICENSE). Programmet leveres uten garanti. Se [NOTICE](NOTICE).
