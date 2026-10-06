# Teststrategi

**Datum:** 2026-10-06 · **Status:** Beslutad · **Beslutat av:** Kalle, Benjamin

## Beslut
Vi testar logik med enhetstester och användarflöden i klienten med komponenttester
(Vitest + Vue Testing Library). API:et mockas på fetch-nivå. Alla kontroller körs i CI
och måste vara gröna innan merge till main.

## Bakgrund
Klienten byggs om i Vue (client/) och ersätter React-klienten (web/). Vi vill kunna ändra koden utan att gamla buggar kommer tillbaka – t.ex. höjdberäkningen som räknade
mätpunkter utan höjd som havsnivå (docs/debt.md).

## Nivåer
| Nivå | Verktyg | Vad den fångar |
|---|---|---|
| Statisk | ESLint, Prettier, vue-tsc | Oanvända variabler, fel typer, kontraktsbrott mot shared/ |
| Enhet | Vitest | Ren logik i client/src/lib/ |
| Komponent | Vitest + Vue Testing Library + jsdom | Det användaren ser och gör |
| E2E | – (se "Medvetet inte") | |

## Karta: vad testas var
| Kod | Nivå | Testfil | Vad som skyddas |
|---|---|---|---|
| lib/tours.ts – elevationGain | Enhet | lib/tours.test.ts | Bara stigningar räknas, null-höjd hoppas över |
| views/GuidesView.vue – lista | Komponent | views/GuidesView.test.ts | Guiderna från API:et visas |
| views/GuidesView.vue – sök | Komponent | views/GuidesView.test.ts | Filtrering på landskap, tomt resultat |
| views/GuidesView.vue – fel | Komponent | views/GuidesView.test.ts | Felmeddelande när API:et inte svarar |
| components/GuideDetail.vue – hämtning | Komponent | components/GuideDetail.test.ts | Rätt guide hämtas utifrån slug |
| components/GuideDetail.vue – visning | Komponent | components/GuideDetail.test.ts | Titel, region och brödtext visas |
| shared/src/index.ts – API-kontrakt | Statisk | vue-tsc | Mockdata och komponenter följer kontraktet |
| components/GuideCard.vue | Komponent (indirekt) | views/GuidesView.test.ts | Täcks via listan, inget eget test |
| api/src/routes/* | Testas inte | – | Se "Medvetet inte" |
| router/index.js | Testas inte | – | Se "Medvetet inte" |

## Regler
- **Merge:** *En PR får mergas till main när CI-jobbet build (lint, format, typecheck, test, build) är grönt och minst en teammedlem har godkänt den. Det upprätthålls av rulesetet main-protection.*
- **Buggfix:** *kräver ett test som är rött före fixen och grönt efter.*
- **Mocka API:et:** *vi.stubGlobal('fetch', …) i testet. Mockdata typas med typerna i shared/ så att den inte kan glida isär från verkligheten.*
- **Täckningskrav:** *Inget procentuellt täckningskrav (t.ex. 80 %). Procentmått premierar ofta meningslösa tester av getters/boilerplate framför tester av komplex logik och kritiska användarflöden. Vi fokuserar i stället på att alla riskabla beräkningar och centrala användarinteraktioner är täckta.*
- **Meningsfullt test:** *Ett test ska bli rött om buggen det skyddar mot kommer tillbaka. Vi kontrollerar det genom att ta sönder koden med flit när testet skrivs.*

## Medvetet inte
- *API:et (api/) – Testas inte i detta skede då backend är relativt stabil och fokus ligger helt på migrationen till Vue-klienten. Integrations- eller kontraktstester för API:et införs när klientomskrivningen är driftsatt eller om backend-logiken byggs ut väsentligt.*
- *web/ – ska ersättas av client/.*
- *Routerns konfiguration och Vues egna funktioner – det testar Vue-teamet.*
- *CSS och utseende - Visuella regressionstester är för sköra och underhållstunga i tidiga migrationsfaser. Vi verifierar tillgängliga element, texter och interaktioner via DOM-strukturen.*

## Alternativ vi jämförde
| Alternativ | Varför inte (än) | 
|---|---|
| Vue Test Utils i stället för Testing Library | Testar lätt intern implementation (vm, props). Testing Library tvingar fram refaktoreringssäkra tester ur användarens perspektiv. |
| MSW (Mock Service Worker) i stället för att stubba fetch | Onödig boilerplate och extra beroenden just nu. vi.stubGlobal('fetch', …) ihop med typer från shared/ räcker. |
| E2E med Playwright i stället för komponenttester | För långsamt i CI och skört under aktiv omskrivning. Vitest + jsdom ger omedelbar feedback lokalt |
| Täckningskrav, t.ex. 80 % | Leder till meningslösa "gröna" tester för att jaga siffror. Vi prioriterar att testa rätt saker framför procent. |

## Konsekvenser
- **Bra:**
  - Extremt snabb testsvit i CI och lokalt tack vare Vitest och jsdom.
  - Hög refaktoreringssäkerhet i `client/` då komponenttester baseras på användarbeteende, inte implementationsdetaljer.
  - Delade TypeScript-typer i `shared/` säkerställer att frontend-mockarna förblir i synk med förväntade datamodeller.
- **Dåligt / risker vi accepterar:**
  - API:et kan gå sönder utan att något test blir rött (eftersom fetch mockas och backend saknar full täckning).
  - Webbläsarspecifika rendering- eller layoutbuggar fångas inte i jsdom.
