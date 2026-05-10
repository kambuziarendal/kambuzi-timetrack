# TimeTrack

TimeTrack er en norsk timeføringsapp-prototype for små bedrifter. Den er laget for enkel registrering av arbeidstid, ansatte, arbeidsroller, rapporter og tekniske compliance-varsler knyttet til arbeidstid.

Dette er **ikke produksjonsklar programvare ennå**. Compliance-reglene er hjelperegler/varsler, ikke juridisk fasit.

## Hva som finnes nå

- Bedrift + admin-registrering
- Login med JWT
- Ansattregister
- Obligatorisk fødselsdato på ansatte, brukt for varsler om unge arbeidstakere
- Arbeidsroller, f.eks. Kokk, Servitør, Bartender
- Fargevalg for arbeidsroller med synlige fargeknapper
- Opprett arbeidsrolle direkte når du oppretter ansatt
- Timeføring med:
  - dagens dato forhåndsutfylt
  - kalenderfelt i web
  - “Fra klokken” / “Til klokken” i stedet for ISO-felt
  - raske vaktvalg
  - pause i minutter
  - live sum timer
- Arbeidsregler og compliance-side med forklaring og AML-referanser
- Rapporter med:
  - datovelger fra/til
  - periodesnarveier
  - ansattfilter
  - arbeidsrollefilter
  - summer per ansatt
  - total for alle valgte
  - markering av timer som utbetalt / ferdig behandlet
- Enkel CSV/PDF-eksport i backend, men ikke ferdig koblet til de nye rapportfiltrene

Se også:

- [`NOTES.md`](./NOTES.md) — mer detaljert notat om hva appen inneholder
- [`TODO.md`](./TODO.md) — gjenstående arbeid

## Stack

- Monorepo: `frontend` + `backend`
- Frontend: Expo, React Native Web, TypeScript, React Navigation, Zustand, React Native Paper
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma ORM
- Test/dev-database: PGlite
- Auth: JWT access-token + refresh-token, bcrypt
- Rapporter: PDFKit + json2csv

## Kom i gang lokalt

Installer dependencies:

```bash
npm install
```

Kopier env-filer:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generer Prisma-client:

```bash
npm --workspace backend run prisma:generate
```

Kjør backend:

```bash
npm run dev:backend
```

Kjør frontend:

```bash
npm run dev:frontend
```

## Demo-login

Etter seed/testoppsett:

- E-post: `admin@timetrack.no`
- Passord: `Passord123!`

## Viktig om compliance

Arbeidsreglene i appen bygger på arbeidstidskapitlet i arbeidsmiljøloven, men appen gjør bare tekniske kontroller. Før reell bruk må reglene kvalitetssikres mot:

- arbeidsmiljøloven
- tariffavtaler
- arbeidsavtaler
- eventuelle lokale ordninger og unntak

Appen skal hjelpe med å oppdage risiko, ikke erstatte juridisk vurdering.
