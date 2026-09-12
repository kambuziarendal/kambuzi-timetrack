# Drift, backup og recovery

## Status

```bash
./scripts/status.sh
```

Scriptet viser Compose-status, `live`, `ready` og om førstegangsoppsett fortsatt er åpent.

## Daglig backup

Manuell backup:

```bash
./scripts/backup.sh
```

Automatisk daglig backup kl. 03:17:

```bash
./scripts/install-backup-cron.sh
```

Backup lages med `pg_dump` i custom-format, checksum skrives, og arkivet gjenopprettes i en isolert midlertidig PostgreSQL-database før suksess. Med retention:

```bash
./scripts/backup.sh --retention-days 30
```

Retention sletter aldri backupen som står i `backups/LAST_VERIFIED`.

## Kryptert off-server-backup med restic/S3

Installer restic på serveren og sett opp repository hos en leverandør du stoler på. Ikke legg hemmeligheter i shellhistorikk eller supportlogger. Eksempel på daglig kommando når restic-miljøet allerede er sikkert satt opp:

```bash
restic backup backups --tag kambuzi-timeforing
restic forget --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune
restic check --read-data-subset=1/20
```

Test restore på separat maskin minst månedlig.

## Restore

```bash
CONFIRM_RESTORE=YES ./scripts/restore.sh backups/timeforing-ÅÅÅÅMMDDTHHMMSSZ.dump
```

Scriptet kontrollerer checksum når `.sha256` finnes, tar først ny verifisert pre-restore-backup, stopper appen, gjenoppretter databasen og krever grønn readiness.

## Oppgradering

1. Last ned release og riktig offlineimage.
2. Kontroller SHA-256 og GitHub-attestasjon når GitHub CLI er tilgjengelig.
3. Last image med `./scripts/load-offline-images.sh`.
4. Kjør:

```bash
./scripts/upgrade.sh <eksakt-release-commit-sha> <forventet-image-sha256>
```

Oppgraderingen nekter `latest`, tar restore-verifisert backup, prøver migrasjon på databasekopi, bytter `IMAGE_TAG`, aktiverer, krever readiness og kjører status. Ved aktiverings- eller readinessfeil forsøker scriptet automatisk rollback til forrige image-tag og pre-upgrade-backup.

## Manuell rollback

```bash
./scripts/rollback.sh backups/timeforing-ÅÅÅÅMMDDTHHMMSSZ.dump <forrige-image-tag>
```

## Flytting til ny server

1. Installer samme release eller nyere på ny server uten offentlig proxy.
2. Kopier ønsket `.dump` og `.sha256` til `backups/`.
3. Last samme app- og PostgreSQL-images.
4. Kjør restore.
5. Kontroller `./scripts/status.sh`.
6. Flytt DNS/proxy først etter innlogging og rapportvisning er testet.

## Administrator-recovery

Kjør bare fra serverkonsollen:

```bash
docker compose exec app node backend/dist/resetAdmin.js admin@eksempel.no
```

Midlertidig passord vises én gang og må byttes ved neste innlogging.

## Feilsøking

```bash
docker compose logs --tail=200 app
docker compose logs --tail=200 db
```

Ikke legg `.env`, databasepassord, backupfiler eller midlertidige passord i supportsaker.
