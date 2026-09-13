# Endringslogg

## 1.0.0-beta.5 — 2026-09-13

- valgfri, isolert 24-timers live-demo med én midlertidig ansattbruker per e-postadresse
- engangslenke på e-post erstatter passordutsending; bare tokenhash lagres
- demobrukere ser bare egne registreringer og har ingen admin- eller rapporttilgang
- konto, økter, token, timeføringer og tilhørende auditdata slettes automatisk etter utløp
- økter avgrenses til kontoens gjenværende levetid, og utløpte kontoer avvises før opprydding
- IP-begrensning, botfelt, samtykke og konfigurerbart kapasitetstak på offentlig registrering
- dokumentert SMTP-/TLS-oppsett, manuell opprydding og særskilt drift av isolert demoinstallasjon

## 1.0.0-beta.4 — 2026-09-12

- lagt til én samlet offline-installasjonspakke og en veiviser som oppretter administrator lokalt før offentlig eksponering
- første installasjon tar og restore-verifiserer backup og installerer daglig backup når `crontab` finnes
- oppgraderingsprøven kjører nå kandidatens image og kontrollerer kandidatens nyeste migrasjon
- restore prøver arkivet isolert og ruller automatisk tilbake ved restore- eller readinessfeil
- stabile CSRF-token på tvers av faner og Origin-kontroll på mutasjoner
- serialisert overlappsjekk hindrer parallelle dobbeltføringer for samme ansatt
- innsendte og godkjente timer kan ikke slettes; auditspor inneholder før-/etterverdier
- rapportperioder og timelister er avgrenset mot ubegrensede uttrekk
- tilgjengelige bekreftelsesflater for sletting og avvisning erstatter nettleserdialoger
- readiness viser versjon, release, migrasjon og oppsettstatus
- lagt til driftsindekser, backupalder i status og detaljert hurtigstart

## 1.0.0-beta.3 — 2026-09-12

- standardinstallasjon bruker ferdigbygde releaseimages og nekter lokalt bygg uten eksplisitt utviklerflagg
- lagt til operatørkommandoer for status, offline image-load, daglig backup-cron, upgrade og rollback
- backup støtter retention uten å slette siste verifiserte backup
- restore kontrollerer checksum når den finnes og bruker no-build ved restart
- oppgradering krever eksakt image-tag, prøver migrasjon på databasekopi og ruller tilbake ved readinessfeil
- CI bygger og tester offline imagepakker for amd64 og arm64 med app + postgres:17.7-bookworm
- dokumentert signering, 10-15 minutters installasjon, Caddy, avansert nginx-undermappe, flytting, recovery og restic/S3-off-server-backup

## 1.0.0-beta.2 — 2026-09-12

- lisensiert som fri programvare under AGPL-3.0-or-later
- lagt til lyst og mørkt tema med systemvalg og lagret manuell overstyring
- lagt til sikker drift i undermappe, inkludert avgrenset API-base og cookie
- lagt til automatisk kontroll av releasebygg under `/timetest/`
- gjort checksum og CycloneDX-SBOM reproducerbare mellom byggemiljøer
- støttet både Docker Compose-plugin og frittstående `docker-compose`
- levert ferdig CI-bygget containerimage for servere som møter registry-rate limits
- erstattet shell-eksponering av generert databasepassord i installasjonsscriptet

## 1.0.0-beta.1 — 2026-09-12

- første verifiserte selvhostede betakandidat
- ansattføring, godkjenning, rapport, låsing og auditlogg
- Docker Compose-installasjon med PostgreSQL og verifisert backup/restore
