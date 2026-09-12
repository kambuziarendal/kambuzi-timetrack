# Drift, backup og recovery

## Helse

```bash
docker compose ps
curl --fail http://127.0.0.1:4080/health/live
curl --fail http://127.0.0.1:4080/health/ready
```

`ready` er først grønn når databasekontakt og minst én migrasjon er verifisert.

## Backup

```bash
./scripts/backup.sh
```

Backupen lages med `pg_dump` i PostgreSQL custom-format. Scriptet validerer arkivet, gjenoppretter det i en midlertidig database og kontrollerer migrasjonstabellen før det skriver SHA-256-fil og rapporterer suksess.

Kopier ferdige `.dump`- og `.sha256`-filer kryptert til en annen fysisk maskin eller skytjeneste. En backup på samme server beskytter ikke mot diskhavari, tyveri eller ransomware. Scriptet sletter aldri eldre backup automatisk.

## Restore

Restore erstatter aktiv database og krever eksplisitt bekreftelse:

```bash
CONFIRM_RESTORE=YES ./scripts/restore.sh backups/timeforing-ÅÅÅÅMMDDTHHMMSSZ.dump
```

Scriptet tar først en ny, verifisert pre-restore-backup, stopper appen, gjenoppretter databasen og krever grønn readiness. Ved feil beholdes pre-restore-backupen for manuell recovery.

## Administrator-recovery

Kjør bare fra serverkonsollen:

```bash
docker compose exec app node backend/dist/resetAdmin.js admin@eksempel.no
```

Kommandoen lager et tilfeldig midlertidig passord, aktiverer kontoen som administrator og tilbakekaller eksisterende økter. Passordet vises én gang i terminalen og må byttes ved neste innlogging.

## Logg og feilsøking

```bash
docker compose logs --tail=200 app
docker compose logs --tail=200 db
```

Ikke legg `.env`, databasepassord, backupfiler eller midlertidige passord i supportsaker.

## Anbefalt kontrollplan

- daglig: automatisert `backup.sh`, kopiert ut av serveren
- ukentlig: kontroller siste SHA-256 og ledig disk
- månedlig: restore-prøve på separat maskin
- ved hver oppgradering: les release-notat, kjør `upgrade.sh`, verifiser login, registrering, rapport og backup
