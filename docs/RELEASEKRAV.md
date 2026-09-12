# Releasekrav

Denne filen skiller teknisk ferdig kode fra en release som kan anbefales til andre virksomheter.

## Hver beta

En beta kan publiseres når:

- eksakt commit er pushet og hosted CI er grønn
- backend-, komponent-, mobil-, desktop- og tilgjengelighetstestene består
- begge dependency-auditer har null funn over de definerte tersklene
- kildearkiv, manifest, SBOM og offlinepakker har SHA-256 og GitHub-attestasjon
- offlinepakker for `amd64` og `arm64` starter uten registrykontakt
- ny installasjon oppretter admin lokalt før offentlig eksponering
- første backup og isolert restore består
- oppgradering fra forrige støttede beta prøves på databasekopi og kan rulles tilbake
- dokumentasjon og nettside beskriver samme versjon og samme faktiske funksjoner

Beta betyr at programmet er egnet for kontrollert pilotbruk, ikke at alle eksterne driftsmiljøer er prøvd.

## Release candidate

RC krever i tillegg:

- minst to installasjoner utført av andre enn utvikleren uten direkte utviklerinngrep
- dokumenterte funn og rettinger fra disse installasjonene
- fysisk test på iPhone/Safari og Android/Chrome
- offentlig hurtigstart fulgt ordrett fra en tom støttet server
- oppgradering og rollback prøvd mot den offentlig publiserte forrige releasen

## Stabil 1.0.0

Stabil release krever i tillegg:

- minst én reell kryptert off-server-backup som er gjenopprettet på separat server
- ferdig støtte-/sikkerhetskontakt og dokumentert responshåndtering
- ingen åpne funn med høy eller kritisk risiko
- tydelig støttet OS-, arkitektur- og versjonsmatrise

## Bevisst utenfor produktet

Timeføring beregner ikke lønn, skatt, automatisk overtid eller om en arbeidstidsordning er lovlig. Det er heller ikke et kontrakts- eller personalsystem. Disse grensene skal stå tydelig i app, dokumentasjon og salgsside.
