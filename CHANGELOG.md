# Endringslogg

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
