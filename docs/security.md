# Säkerhet – Utpost

**Datum:** 2026-11-17  
**Hotbilden i en mening:** Obehörig manipulation av användares turer, GPS-loggar och redaktionens guider via öppna API-endpoints, samt automatiserade skannrar som letar efter kända sårbarheter eller läckande autentiseringsuppgifter.

## Autentiseringen (M8)

- **Lösenord:** Lösenorden lagras som scrypt-hash med salt (`api/src/lib/password.js`) i formatet `scrypt:<salt hex>:<hash hex>`, verifieras med `timingSafeEqual` och rensas alltid bort ur API-svar (`publicUser` i `api/src/lib/auth.js`).
- **Token:** JWT signerad med `JWT_SECRET` (`api/src/lib/auth.js`) och algoritmen HS256. Payload innehåller `{ id, email, role }` och har en giltighetstid på **1 timme** (`expiresIn: '1h'`). Token skickas i headern `Authorization: Bearer <token>` och lagras enbart i JavaScript-minnet (`client/src/lib/token.ts`), aldrig i `localStorage`. Vid sidomladdning töms minnet och användaren loggas ut, eftersom refresh-token i httpOnly-cookie är ett framtida steg.
- **Skyddade skrivande routes & ägarkontroll:**
  - `POST /api/tours`: kräver inloggning (`requireUser`) och sätter `user_id = req.user.id`.
  - `PATCH /api/tours/:id`: kräver inloggning, valideras med Zod (`updateTourSchema`) och har ägarkontroll mot raden i databasen (`tour.user_id === req.user.id || req.user.role === 'editor'`), annars 403.
  - `DELETE /api/tours/:id`: kräver inloggning och ägarkontroll mot raden i databasen (`tour.user_id === req.user.id || req.user.role === 'editor'`), annars 403.
  - `POST /api/photos`: kräver inloggning, valideras med `photoUploadSchema` (max 50 MP) och kontrollerar att användaren äger turen (eller är editor), annars 403.
  - `PUT /api/guides/:id`: kräver inloggning samt rollen `editor` (`requireRole('editor')`), valideras med `guideUpdateSchema`, annars 401/403.
  - `mutation createTour`: GraphQL-mutation som kräver inloggad användare via context (`UNAUTHENTICATED` om token saknas).
  - Kontrollerna sitter på servern före databasanrop och kan inte kringgås genom att anropa API:et direkt utanför klientens router.

## OWASP Top 10 – genomgång

| # | Risk | Gäller oss? | Vad vi hittade (fil, endpoint) | Vad vi gjorde (PR) | Kontroll (testet som var rött före fixen, eller curl) |
|---|---|---|---|---|---|
| A01 | Broken Access Control | Ja | `PUT /api/guides/:id` i `api/src/routes/guides.ts` saknade behörighetskontroll. Vem som helst kunde anropa och ändra redaktionens guider. Dessutom saknade `DELETE /api/tours/:id` och `PATCH /api/tours/:id` ägarkontroll (skuld #3). | Lade till `requireUser` och rollkontroll (`requireRole('editor')`) för guider, samt ägarkontroll mot databasraden för `DELETE` och `PATCH` på turer i PR. | Tester i `api/src/routes/routes.test.js`: <br>• `PUT /api/guides/:id utan token ger 401`<br>• `en medlem får inte ändra guider (403) – bara rollen editor`<br>• `en redaktör kan ändra – och får en validerad guide tillbaka`<br>• `DELETE /api/tours/:id utan token ger 401 och turen finns kvar`<br>• `en medlem kan inte ta bort någon annans tur (403)`<br>• `en medlem kan inte ändra någon annans tur (403)`<br>Rött före fixen i [PR #80](https://github.com/Snudde/utpost/pull/80) – se *Röda tester före fixen* nedan. |
| A02 | Security Misconfiguration | Ja | 1. API:et tillät alla origins via `app.use(cors())`.<br>2. Containers kördes som root (`api/Dockerfile` och `client/Dockerfile` gav Trivy `DS-0002`).<br>3. ZAP baseline larmade på saknad CSP (10038), saknad X-Content-Type-Options (10021), iframe-inbäddning (10020) och exponerad serverversion (10036). | 1. Tog bort CORS helt från API:et (klienten anropar via Nginx reverse proxy).<br>2. Lade till `USER node` och rensade `npm/npx` i `api/Dockerfile`. Nginx som root i `client/Dockerfile` motiverades i `.trivyignore`.<br>3. Säkerhetsheaders sattes i `client/security-headers.conf` och `server_tokens off;` i `client/nginx.conf.template`. | Test i `routes.test.js`: `API:et skickar ingen Access-Control-Allow-Origin – ingen annan sajt får läsa svaren`; ZAP baseline (10038, 10021, 10020, 10036 = FAIL i `.zap/rules.tsv`); `curl -I http://localhost:3001/` visar headrarna.<br>Röd körning bekräftad i PR. |
| A03 | Software Supply Chain Failures | Ja | Kända sårbarheter i beroenden (bl.a. `proxy-addr` GHSA-jqcg-44mw-7w3h och `drizzle-orm` GHSA-gpj5-g38j-94v9). | Uppdaterade `drizzle-orm` till `^0.45.4` i `api/package.json` och körde `npm audit fix`. Lade till automatisk scanning i CI med `npm audit --omit=dev --audit-level=high`, Trivy (repo och image) samt ZAP baseline. | CI-jobbet *Säkerhet* fångade sårbarheterna och var rött i [PR #79](https://github.com/Snudde/utpost/pull/79) ([röd körning](https://github.com/Snudde/utpost/actions/runs/44063209144): `npm audit`, 3 high) före fixarna. |
| A04 | Cryptographic Failures | Ja | Lösenord lagrades i klartext i databasen (`plaintext:...`, skuld #5) och JWT_SECRET var hårdkodad i `api/src/config.js` (skuld #1). | Lösenord hashas med `scrypt` och unikt salt (`api/src/lib/password.js`). JWT signeras med `JWT_SECRET` från miljövariabel med 1h giltighetstid. Trivy skannar efter committade secrets. | Tester i `routes.test.js`: `lösenordet i databasen är hashat, inte klartext` och `svaret på en lyckad inloggning innehåller token och användaren – men aldrig password_hash`. |
| A05 | Injection | Ja | Sökfunktionen på guider (`/api/guides/search?q=...`) konkatenerade `q` direkt in i SQL-strängen vilket gav SQL injection (skuld #2). | Parametriserade frågor (`$1, $2`) med `pg` i alla databasanrop, samt Zod-validering av query-parametern `q` (`searchSchema`). | Tester i `routes.test.js`: `ett citattecken i sökordet ger 200 och en tom lista, inte 500` och `en vanlig sökning hittar guider i landskapet`. Rött före fixen i [PR #80](https://github.com/Snudde/utpost/pull/80). |
| A06 | Insecure Design | Delvis | Avsaknad av auktoriseringsarkitektur på servern och oskyddad resursallokering (skuld #4, ovaliderade bilddimensioner). | RBAC (editor vs member) och ägarkontroll implementerad på servern, token enbart i minnet, samt storlekstak (max 50 MP) före anrop till bildbearbetning. | Tester i `routes.test.js` och `photos.test.js` verifierar att obehöriga eller orimliga anrop nekas tidigt. |
| A07 | Authentication Failures | Ja | `POST /api/auth/login` läckte tidigare `password_hash` i svaret. Risk för användaruppräkning och timing-attacker vid felaktiga inloggningar (skuld #5). Svaga lösenord tilläts vid registrering. | Generiska felmeddelanden (`401 'fel e-post eller lösenord'`), dummy-hash vid okänd användare för konstant jämförelsetid (`timingSafeEqual`), samt `publicUser()` som strippar känsliga fält. Zod kräver minst 8 tecken vid registrering. | Tester i `routes.test.js`: `fel lösenord och okänd e-post ger samma svar (401, samma text)` och `registrering med för kort lösenord ger 400 med vad som var fel`. |
| A08 | Software or Data Integrity Failures | Delvis | Risk för manipulerade beroenden eller osäkra containerbasavbilder. | Deterministiska byggen med låsta versioner via `package-lock.json` (`npm ci`), specifika taggar för basavbilder (Alpine) och Trivy-skanning av repot och `utpost-api`-imagen. | Trivy-stegen i CI-jobbet *Säkerhet* kontrollerar integritet och kända sårbarheter. |
| A09 | Security Logging & Alerting Failures | Delvis | Behov av att logga säkerhets- och prestandahändelser utan att logga känslig data. | Inloggnings- och GraphQL-anrop loggas på servern utan att inkludera lösenord eller tokens. GraphQL loggar antal databasfrågor per anrop. Fel loggas med metod och URL. | Granskning av loggutskrifter vid integrationstester och containerkörning. |
| A10 | Mishandling of Exceptional Conditions | Ja | Trasig JSON eller ogiltiga parameterformat orsakade 500-fel eller svaldes tyst av `unhandledRejection` så att anrop hängde utan svar (skuld #9). | Central felhanterare i `api/src/app.js` som returnerar 400 Bad Request för `ZodError` och `entity.parse.failed`, 413 för för stora requests, samt 500 utan känslig stacktrace i produktion. | Tester i `routes.test.js`: `ett id som inte är ett tal ger 400, inte ett ohanterat fel` och `trasig JSON ger 400 med ett svar – inte ett anrop som hänger`. Rött före fixen i [PR #80](https://github.com/Snudde/utpost/pull/80). |

## Röda tester före fixen

Varje lagat hål har ett test som var rött utan fixen. I [PR #80](https://github.com/Snudde/utpost/pull/80) togs tre fixar bort i en commit och lades tillbaka i nästa – samma tre tester gick från rött till grönt, och inga andra påverkades.

| Hål | Testet i `api/src/routes/routes.test.js` | Utan fixen | Rött | Grönt |
|---|---|---|---|---|
| A05 Injection | `ett citattecken i sökordet ger 200 och en tom lista, inte 500` | 500 | [körning](https://github.com/Snudde/utpost/actions/runs/44071973957) | [körning](https://github.com/Snudde/utpost/actions/runs/44072426377) |
| A01 Broken Access Control | `en medlem kan inte ändra någon annans tur (403)` | 200 | [körning](https://github.com/Snudde/utpost/actions/runs/44071973957) | [körning](https://github.com/Snudde/utpost/actions/runs/44072426377) |
| A10 Mishandling of Exceptional Conditions | `ett id som inte är ett tal ger 400, inte ett ohanterat fel` | 500 | [körning](https://github.com/Snudde/utpost/actions/runs/44071973957) | [körning](https://github.com/Snudde/utpost/actions/runs/44072426377) |

## Validering av indata

Valideringen sitter centralt i `api/src/lib/schemas.js` och tillämpas konsekvent före rutt-logiken i API-routerna med hjälp av middleware-funktionen `validate(schema)` (`api/src/lib/validate.js`). Vi använder **Zod**-scheman för att validera indata (bodies och query/params):
- `loginSchema`: giltig e-postadress, lösenord 1–200 tecken.
- `registerSchema`: e-postadress, lösenord minst 8 tecken, displayName 1–80 tecken, roll (`member` eller `editor`).
- `createTourSchema`: titel 1–120 tecken, startedAt (ISO-8601), distanceM (0–1 000 000 meter).
- `updateTourSchema`: titel och/eller anteckningar.
- `photoUploadSchema`: tourId (positivt heltal), filnamn, bredd/höjd 1–20 000 px (samt tak på 50 MP i routern).
- `guideUpdateSchema`: titel, region, svårighetsgrad (`lätt` | `medel` | `svår`), längd, bodyHtml, published.
- `searchSchema`: query-parameter `q` (max 100 tecken).

Vid ogiltig indata svarar API:et med statuskod `400 Bad Request` och en enhetlig struktur med `issues`:
```json
{
  "error": "ogiltig indata",
  "issues": [
    { "path": "password", "message": "minst 8 tecken" }
  ]
}
```

## Headers vi sätter (nginx)

Konfigurerade i `client/security-headers.conf` och inkluderade i varje `location`-block i `client/nginx.conf.template`:
- `Content-Security-Policy`: `"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"` – förhindrar XSS och begränsar externa resurser.
- `X-Content-Type-Options`: `"nosniff"` – hindrar webbläsaren från att MIME-sniffa filer.
- `X-Frame-Options`: `"DENY"` – skyddar mot clickjacking genom att förbjuda inbäddning i iframes.
- `Referrer-Policy`: `"strict-origin-when-cross-origin"`.
- `Permissions-Policy`: `"camera=(), microphone=(), geolocation=()"`.
- `server_tokens off;` i `nginx.conf.template` – döljer Nginx versionsnummer.
- `Cache-Control: "no-store"` på `/api/` och `/graphql` – förhindrar att personuppgifter och tokens cachas i webbläsare eller mellanliggande proxys.

## Skanning i pipelinen

I jobbet **Säkerhet** (`.github/workflows/ci.yml`) körs följande verktyg på varje PR och push:
1. **`npm audit --omit=dev --audit-level=high` (SCA):** Skannar produktionsberoenden efter kända sårbarheter på sekunder.
2. **Trivy (fs):** Skannar repots filer efter hemligheter (tokens/lösenord), kända sårbarheter i `package-lock.json` och felkonfigurationer i Dockerfiles (t.ex. root-användare `DS-0002`). Undantag dokumenteras i `.trivyignore`.
3. **Docker Compose:** Bygger imagerna och startar hela applikationen (`docker compose up -d --build --wait`).
4. **Trivy (image):** Skannar den byggda imagen `utpost-api` för att hitta sårbarheter i Alpine OS, Node och installerade paket.
5. **OWASP ZAP Baseline (DAST):** Anropar den körande appen (`http://localhost:3001`) som en extern angripare för att upptäcka saknade säkerhetsheaders, CORS-fel och exponerad serverinformation. Konfigureras via `.zap/rules.tsv`.

Jobbet tar cirka **1–2 minuter** att köra. Om något verktyg hittar oacceptabla fel avslutas steget med exit code 1 och blockerar merge.

## Kända brister (medvetet kvar)

- **Utloggning vid sidomladdning:** JWT-token lagras enbart i JavaScript-minnet för maximalt skydd mot stöld via XSS (ingen lagring i `localStorage`). Då refresh-token i en httpOnly-cookie inte är implementerat än loggas användaren ut om sidan laddas om.
- **Client Dockerfile kör Nginx som root initialt:** Nginx officiella Alpine-image startar som root för att binda port 80, men byter själv till processanvändaren `nginx` för arbetsprocesserna. Detta är ett motiverat undantag i `.trivyignore` (`DS-0002`).
- **HTML-innehåll i guider (`v-html`):** Redaktionens guider innehåller formaterad HTML (`body_html`) som renderas i klienten. Risken för script-injektion neutraliseras via Nginx strikta `Content-Security-Policy` som förbjuder inline-skript.
