# Tidsbegrenset live-demo

Live-demoen er et valgfritt driftsmodus for en isolert testinstallasjon. Den er avslått som standard og skal ikke aktiveres i en ordinær kundeinstallasjon.

## Sikkerhetsmodell

- Én Timeføring-installasjon tilhører fortsatt én virksomhet. Demoen gjør ikke produktet flerfirma- eller multitenant.
- Hver besøkende får en egen midlertidig `EMPLOYEE`-bruker og ser bare sine egne timeføringer.
- Demoansatte har ikke tilgang til admin, andre brukere, rapporter eller godkjenning.
- Innlogging skjer med en engangslenke på e-post. Passord sendes ikke.
- Bare SHA-256-hash av engangstokenet lagres i databasen.
- Tokenet ligger i URL-fragmentet, som ikke sendes til webserveren eller vanlige proxylogger, og fjernes fra adresselinjen før innløsning.
- Lenken kan brukes én gang og utløper etter 20 minutter som standard.
- Økten kan aldri vare lenger enn demokontoens gjenværende levetid.
- Konto, økter, token, timeføringer og tilhørende auditdata slettes automatisk etter maksimalt 24 timer.
- En utløpt konto avvises umiddelbart selv om den periodiske oppryddingen ikke har kjørt ennå.
- Opprettelse er IP-begrenset, har skjult botfelt og et konfigurerbart tak på aktive brukere.

## Konfigurasjon

Legg dette i `.env` på den isolerte demovertens server. Ikke legg SMTP-passord i repo, chat eller supportlogg.

```dotenv
DEMO_MODE=true
DEMO_TTL_HOURS=24
DEMO_LOGIN_TOKEN_MINUTES=20
DEMO_CLEANUP_INTERVAL_MINUTES=15
DEMO_MAX_ACTIVE_USERS=100
SMTP_HOST=smtp.eksempel.no
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USERNAME=<lagres bare på serveren>
SMTP_PASSWORD=<lagres bare på serveren>
SMTP_FROM_EMAIL=timeforing@eksempel.no
SMTP_FROM_NAME=Kambuzi Timeføring
```

Når `DEMO_MODE=true`, nekter appen å starte uten `SMTP_HOST` og `SMTP_FROM_EMAIL`. Brukernavn og passord må enten begge være satt eller begge være tomme. TLS kreves som standard.

## Drift og kontroll

Readiness viser om demoen er aktiv samt antall aktive og maksimalt tillatte demobrukere. Appen rydder ved oppstart og deretter etter konfigurert intervall. Manuell, idempotent opprydding kan kjøres med:

```bash
docker compose exec app npm run demo-cleanup --workspace backend
```

SMTP-tilkobling, påkrevd TLS og eventuell autentisering kan kontrolleres uten å sende en melding:

```bash
docker compose exec app npm run demo-smtp-check --workspace backend
```

Kontroller etter aktivering:

1. SMTP-tilkobling og TLS/autentisering virker.
2. En reell mottaker får lenken, og URL-en peker til riktig offentlig `APP_URL`/undermappe.
3. Lenken virker én gang og er fjernet fra nettleseradressen etter innløsning.
4. To demobrukere kan ikke se hverandres timeføringer.
5. Admin- og rapportendepunkter gir 403 for demoansatte.
6. Tvungen utløp + opprydding sletter bruker, data, økter og token.

Demoen skal beholde `noindex`, egen database og egne cookies. Den skal aldri dele database med en betalende kunde eller Kambuzis operative timeføring.
