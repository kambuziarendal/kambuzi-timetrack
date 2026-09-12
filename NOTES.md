# Arkitekturnotat

- Browser-only React/Vite-klient; ingen uferdig mobilapp eller pushinfrastruktur.
- Express API og PostgreSQL 17.
- Én virksomhet per installasjon reduserer tenant- og tilgangsrisiko.
- Versjonerte SQL-migrasjoner kjøres transaksjonelt.
- Statusflyt: `DRAFT → SUBMITTED → APPROVED → LOCKED`, med `REJECTED` tilbake til utkast ved redigering.
- Låste registreringer er skrivebeskyttet og kan markeres lønnsbehandlet.
- Auditloggen er append-only gjennom applikasjonsrutene.
- Persondata er minimert til navn, e-post, rolle og timeføringsdata.
