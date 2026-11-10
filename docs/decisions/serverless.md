# Beslutsdokument: Serverless bildbearbetning (M7)

*Ett av teamets beslutsdokument. Skrivs i M7, hålls levande tillsammans med `hosting.md`, `api-stil.md`, `databas.md` och `testing.md`.*

**Datum:** 2026-11-10  
**Beslut:** Bildbearbetningen vid uppladdning bryts ut ur API:et (`api/src/routes/photos.js`) till en fristående funktion (`process-image` i `functions/`) som kör på **Azure Functions (Flex Consumption, Node 22)** i Sweden Central (`utpost-fn`), med `perInstanceConcurrency=1` och max `10` instanser. API:et anropar funktionen asynkront via `IMAGE_FUNCTION_URL` med nyckeln ur `IMAGE_FUNCTION_KEY`.

---

## Bakgrund (Skuld 6 och Skuld 4 i `docs/debt.md`)

Tidigare låg bildbearbetningen (`resize` och `signature`) synkront i request-tråden i `api/src/routes/photos.js` (**Skuld 6**, [issue #20](https://github.com/Snudde/utpost/issues/20): *CPU-tung bildbehandling blockerar servern*). Eftersom Node.js kör på en enda tråd blockerades hela event-loopen så fort flera bilder laddades upp samtidigt – även lätta anrop som `GET /api/health` fick vänta på bildarbetet.

Samtidigt fanns **Skuld 4** ([issue #18](https://github.com/Snudde/utpost/issues/18): *Ovaliderad bilddimension*), där `width` och `height` gick ovaliderade in i en `Uint8Array`-allokering. Både [`api/src/routes/photos.js`](../../api/src/routes/photos.js) och [`functions/src/process-image.js`](../../functions/src/process-image.js) validerar nu positiva heltal och max 50 MP (`50_000_000` pixlar).

Målet med M7 är att:
1. Flytta CPU-arbetet från API:ets event-loop till en funktion som kan skala ut per anrop.
2. Behålla själva bildkoden (`functions/src/image.js`) portabel utan Azure-beroenden.
3. Kunna deploya `functions/` automatiskt från CI/CD-pipelinen med samma OIDC-identitet som i M6.

---

## Mätning före och efter (lokalt)

Mätt lokalt på samma dator med [`scripts/mat-upload.mjs`](../../scripts/mat-upload.mjs): `10` samtidiga `POST /api/photos` (4000×3000) samtidigt som `GET /api/health` frågas var 100:e ms.

### Före (bildkoden i API:ets request-tråd, `main`)

| Vad | p50 | max | |
|---|---|---|---|
| Uppladdning (POST /api/photos) | 846 ms | 849 ms | 10/10 ok |
| Health (GET /api/health) | 405 ms | **696 ms** | 7 anrop |
| processingMs (bildarbetet) | 63 ms | 76 ms | |
| apiMs (API:ets totala tid) | – | – | saknas i svaret (före) |

Total tid: `853 ms` · kallstarter i svaren: `0`

### Efter (bildkoden i `functions/` via `func start`, `m7-implementations`)

| Vad | p50 | max | |
|---|---|---|---|
| Uppladdning (POST /api/photos) | 1432 ms | 1443 ms | 10/10 ok |
| Health (GET /api/health) | 6 ms | **8 ms** | 13 anrop |
| processingMs (bildarbetet) | 65 ms | 96 ms | |
| apiMs (API:ets totala tid) | 1372 ms | 1392 ms | |

Total tid: `1447 ms` · kallstarter i svaren: `1`

### Vad mätningen visar

- **`Health max` sjönk från `696 ms` till `8 ms` (~99 % lägre).** API:ets event-loop blockeras inte längre eftersom `POST /api/photos` väntar asynkront (`await fetch(...)`) på bildfunktionen, så `GET /api/health` svarar direkt under hela lasten.
- Lokalt kör `func start` i en enda process, så de 10 bilduppladdningarna köar ändå efter varandra där (`1447 ms` totalt inklusive en kallstart). Det flyttade arbetet till en egen process lokalt, och ger riktig parallell utskalning först när funktionen kör i Azure.

---

## Mätning i Azure (`utpost-fn`)

Direktanrop mot `https://utpost-fn.azurewebsites.net/api/process-image` (Flex Consumption, 2048 MB, `perInstanceConcurrency=1`, `MAX_INSTANCES=10`):

| Test | `coldStart` | `processingMs` | Total tid (`curl`) | Anteckning |
|---|---|---|---|---|
| Kallstart efter paus (mätvärde 1) | `true` | `78 ms` | `1,001 s` | Första anropet efter vila (`0--021a7064…`) |
| Kallstart efter paus (mätvärde 2) | `true` | `79 ms` | `0,949 s` | Ny instans ur poolen direkt efter (`0--eec19e7d…`) |
| Kallstart (8 första i 15-anropsloop) | `true` | `74–85 ms` | `0,84–1,13 s` | t.ex. `0,996 s` (`processingMs: 85`) |
| Varm instans (anrop 9–15) | `false` | `64–66 ms` | `0,15–0,23 s` | t.ex. `0,151 s` (`processingMs: 64`) |
| Utan `x-functions-key` | – | – | – | `401. Unauthorized access` |

Vid 15 snabba anrop i följd fördelade Azure trafiken över **8 separata instanser** (alla `coldStart: true`), innan anrop 9–15 roterade tillbaka till samma `instance`-id:n som varma (`coldStart: false`).

### Duger det? (Bedömning av kallstarten)

**Ja – för Utposts bilduppladdning duger det väl.**

- **Marginalen är liten i sammanhanget:** Efter en paus tog kallstarten **`1,001 s`** (och `0,949 s` på en andra ny instans) jämfört med **`0,151 s`** på en varm instans. Själva extra fördröjningen är alltså bara **~0,80–0,85 sekunder**, medan bildarbetet (`processingMs`) i sig ligger på `64–79 ms`.
- **Rätt typ av endpoint:** Att ladda upp en bild till en tur är en sällsynt, medveten användarhandling – inte en sidvisning, navigation eller sök-autocomplete där svarstider över ~100–200 ms stör flödet. ~1 s vid första uppladdningen efter vila upplevs som helt naturligt för bildbearbetning.
- **Skyddar resten av appen:** Till skillnad från före M7 (där 10 samtidiga uppladdningar blockerade API:ets `/api/health` upp till `696 ms` för *alla* användare) påverkar funktionens kallstart bara den enskilde användare som just laddar upp en bild.
- **Kostnad i relation till nytta:** Flex Consumption skalar ner till noll och kostar `0 kr` när ingen laddar upp bilder. Om det senare blir ett krav med <200 ms svarstid även efter lång vila går det att aktivera *Always Ready*-instanser i Azure Flex Consumption utan kodändring, mot en fast löpande kostnad.

---

## Alternativ vi jämförde

| Alternativ | Vad ändras i repot | För | Emot |
|---|---|---|---|
| **Azure Functions med plattformens verktyg – valt** | `functions/`, `infra/azure/skapa-funktion.sh`, jobbet `deploy-function` | Samma moln och OIDC-identitet som staging (`azure-staging`); skalar ut per anrop (`perInstanceConcurrency=1`) och skalar till 0 | Triggern (`process-image.js`), `host.json` och deploysteget är Azure-specifika |
| **Serverless Framework** | En `serverless.yml` och `sls deploy` | En fil för funktionen och allt runt den | v4 stöder bara AWS och kräver inloggning, v3 underhålls inte, Azure-pluginet är arkiverat |
| **Worker-container / kö i Container Apps** | Ny worker-tjänst i `compose.yml` och `staging.yaml`, egen kö/HTTP-hantering | Samma Docker-byggflöde som API och klient, ingen ny Azure-tjänst | Kräver extra container + kö för att skala parallellt, tar av Container Apps-kvoten och saknar snabb per-anrop-skalning från noll |

---

## Var koden bor och vad som låser

- **Var koden bor (`functions/` som eget paket):** All kod för bildfunktionen ligger i `functions/` med egen [`package.json`](../../functions/package.json) och [`package-lock.json`](../../functions/package-lock.json) – medvetet **utanför** rotens npm-`workspaces` (`api`, `client`, `shared`). På så sätt hamnar `@azure/functions` i `functions/node_modules/` och följer med i det självbärande zip-paketet till Azure i stället för i rotens `node_modules/`.
- **Portabel kärna (noll inlåsning):** [`functions/src/image.js`](../../functions/src/image.js) (`SIZES`, `resize`, `signature`, `processImage`) är ren JavaScript med bara `Uint8Array` – inga Azure-beroenden och inga native-paket (`sharp`). Samma kod kan köras i en Node-process, en annan molnfunktion (t.ex. AWS Lambda / Cloud Run Functions) eller en worker.
- **Det som låser oss till Azure:**
  - [`functions/src/process-image.js`](../../functions/src/process-image.js) (`@azure/functions`-triggern `app.http`, `authLevel: 'function'` och `WEBSITE_INSTANCE_ID`)
  - [`functions/host.json`](../../functions/host.json), [`functions/.funcignore`](../../functions/.funcignore) och beroendet `@azure/functions` i [`functions/package.json`](../../functions/package.json)
  - [`infra/azure/skapa-funktion.sh`](../../infra/azure/skapa-funktion.sh) och jobbet `deploy-function` (`Azure/functions-action@v1` + `az functionapp`) i [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- **API:ets koppling (inte låst):** [`api/src/routes/photos.js`](../../api/src/routes/photos.js) känner inte till Azure – det skickar bara ett vanligt HTTP `POST` med JSON till `IMAGE_FUNCTION_URL` (och valfri `x-functions-key` från `IMAGE_FUNCTION_KEY`). Skulle vi byta funktionstjänst ändras bara miljövariablerna.

---

## Konsekvenser

- **Oberoende deploy:** Jobben `Deploy → Azure staging` (M6) och `Deploy → Azure Functions` (M7) kör parallellt efter merge till `main` utan att bero på varandra.
- **Kallstart i HTTP-kedjan:** En kallstart i Flex Consumption lägger på ca `0,8–1,0 s` (`0,84–1,13 s` totalt i våra mätningar). API:et använder 60 s timeout i anropet till funktionen för att tåla kallstarter.
- **Nycklar utanför Git:** Funktionsnyckeln (`authLevel: 'function'`) läses ur miljön i API:et (`secretref:image-function-key` i `utpost-staging`) och hämtas temporärt med OIDC och `::add-mask::` vid röktestet i CI.
- **Skalning till noll och kvot:** Function-appen kostar inget när ingen laddar upp bilder och har `MAX_INSTANCES=10` som tak mot skenande kostnad.
