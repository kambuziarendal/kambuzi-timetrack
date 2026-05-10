# TimeTrack — notat om nåværende innhold

TimeTrack er en norsk timeføringsapp-prototype for små bedrifter. Den er bygget som monorepo med Expo/React Native Web frontend og Express/Prisma backend.

## Hva appen inneholder nå

### Innlogging og auth

- Registrering av bedrift + admin.
- Login med JWT access-token og refresh-token.
- Demo-login i testdata:
  - `admin@timetrack.no`
  - `Passord123!`

### Ansatte

- Opprette ansatte.
- E-post trimmes automatisk, så mellomrom før/etter e-post ødelegger ikke.
- Fødselsdato er obligatorisk fordi appen skal kunne varsle på arbeidstidsregler for unge arbeidstakere.
- Ansatte kan knyttes til arbeidsrolle.
- Ny arbeidsrolle kan opprettes direkte fra ansatt-skjemaet.

### Arbeidsroller

Tidligere kalt “stillinger” i prototypen. UI bruker nå “arbeidsroller”.

- Opprette arbeidsroller som Kokk, Servitør, Bartender osv.
- Velge farge med fargede knapper, ikke hex-kode.
- Farge brukes i UI/rapportvisning.

### Timeføring

- Brukervennlig skjema for registrering av tid.
- Dato er forhåndsutfylt med dagens dato.
- Dato velges med kalenderfelt i web.
- Tid velges som “Fra klokken” og “Til klokken”, ikke ISO-format.
- Hurtigvalg for vanlige vakter:
  - 08–16
  - 10–16
  - 16–22
  - 17–23
- Pause i minutter.
- Live beregning av sum timer.
- Vakter over midnatt håndteres ved at sluttid tidligere enn starttid tolkes som neste dag.

### Arbeidsregler og compliance

- Egen side for arbeidsregler/compliance.
- Forklarer at reglene styrer varsler, ikke selve loven.
- Refererer til arbeidsmiljøloven kapittel 10, særlig:
  - § 10-4
  - § 10-6
  - § 10-8
  - § 10-11
- Har egne felt for unge arbeidstakere.
- Viser tydelig advarsel om at grenser ikke bør settes mildere for å skjule avvik.

### Rapporter

- Velge periode med datovelgere.
- Snarveier:
  - denne måneden
  - forrige måned
  - 1.–15. denne måneden
  - 16.–siste denne måneden
- Velge alle/ingen/enkeltansatte.
- Filtrere på arbeidsrolle.
- Rapporten viser per ansatt:
  - dato
  - tidsrom
  - timer
  - sum per ansatt
- Nederst vises totalsum for alle valgte.
- Timer kan markeres som “utbetalt / ferdig behandlet”.
- Markerte timer vises med hake i rapporten.

### Rapporteksport

- Backend har enkel CSV/PDF eksport.
- Eksporten er ikke ferdig koblet til de nye rapportfiltrene ennå.

## Viktige avgrensninger

- Dette er prototype/testversjon, ikke produksjonsklar app.
- Compliance-reglene er tekniske varsler, ikke juridisk fasit.
- Arbeidsmiljøloven, tariffavtaler og lokale avtaler må kvalitetssikres før reell bruk.
- Testoppsettet bruker PGlite/lokal testdatabase for enkel utvikling.
- Produksjon bør bruke ordentlig PostgreSQL, HTTPS, backup og sikker drift.
