# TODO — TimeTrack

## Høy prioritet

- [ ] Koble CSV/PDF-eksport til samme filtre som rapportvisningen:
  - periode
  - valgte ansatte
  - arbeidsrolle
  - behandlet/utbetalt-status
- [ ] Lage redigeringsflyt for ansatte:
  - fødselsdato
  - arbeidsrolle
  - aktiv/inaktiv
  - timelønn
- [ ] Gjøre faste lønnsperioder konfigurerbare per bedrift.
- [ ] Legge inn tydelig status for timer:
  - registrert
  - sendt inn
  - godkjent
  - låst
  - utbetalt / ferdig behandlet
- [ ] Polere mobilvisning for rapporter og tabeller.

## Compliance / arbeidsmiljøloven

- [ ] Kvalitetssikre reglene mot arbeidsmiljøloven, tariff/avtaler og relevante unntak.
- [ ] Legge inn bedre forklaring på unge arbeidstakere og fødselsdato.
- [ ] Lage varsel når eksisterende ansatte mangler fødselsdato.
- [ ] Legge inn lenker til Lovdata/Arbeidstilsynet på relevante steder.

## Teknisk

- [ ] Bytte fra lokal testdatabase til ordentlig PostgreSQL-oppsett for staging.
- [ ] Lage migrations i stedet for manuell testdatabase-upgrade.
- [ ] Legge inn flere backend-tester.
- [ ] Legge inn frontend-tester for hovedflyter.
- [ ] Rydde dependency-audit og Expo-varsler før produksjon.
- [ ] Legge inn autentisering hardening:
  - refresh-token rotation
  - rate limiting
  - bedre audit logg
- [ ] Bedre feilmeldinger fra backend til frontend.

## Før reell bruk

- [ ] Avklare GDPR/personvern for ansattdata.
- [ ] Avklare juridisk status: appen er varslingshjelp, ikke juridisk fasit.
- [ ] Lage backup-rutine.
- [ ] Kjøre full test med faktisk restaurantflyt.
