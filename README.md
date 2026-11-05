# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Förutsättningar
- [Node.js](https://nodejs.org/) v22 eller senare
- [Docker & Docker Desktop](https://www.docker.com/) igång

## Kom igång

### 1. Kör allt i Docker

1. **Starta och bygg alla containrar:**
    ```bash
    docker compose up --build -d
    ```
2. **Skapa tabeller, seeda data och migrera mätpunkter till MongoDB:**
    ```bash
    docker compose exec api npm run seed
    docker compose exec api npm run migrate:logs
    ```
  *Klient: http://localhost:3001 | API: http://localhost:4000*

### 2. Lokal utveckling
1. **Installera beroenden:**
   ```bash
   npm install
   ```
2. **Starta enbart databaserna i Docker:**
   ```bash
   docker compose up -d postgres mongo
   ```
3. **Skapa tabeller, seeda data och migrera mätpunkter:**
   ```bash
   npm run seed
   npm run migrate:logs
   ```
4. **Kör integrationstester:**
   ```bash
   npm run test:api
   ```
5. **Starta applikationen lokalt:**
   - För **React**-appen (`web`) + API:
     ```bash
     npm run dev
     ```
     *Webb: http://localhost:3000 | API: http://localhost:4000*
   - För **Vue**-klienten (`client`) + API:
     ```bash
     npm run client
     ```
     *Klient: http://localhost:3001 | API: http://localhost:4000*

## Databaser & Docker
Projektet använder en **hybridarkitektur (polyglot persistence)** med två databaser:
| Databas | Port på värd | Databasnamn | Användare / Lösen | Användningsområde |
|---|---|---|---|---|
| **PostgreSQL 16** | `5433` | `utpost` | `utpost` / `utpost` | Användare, guider, foton (relationsdata & integritet) |
| **MongoDB 8** | `27017` | `utpost` | `utpost` / `utpost` | Turer & inbäddade GPS-loggar (dokumentmodell) |
> Se arkitekturbeslut i [docs/decisions/databas.md](docs/decisions/databas.md).

### Docker-kommandon
- **Stoppa alla containrar:**
  ```bash
  docker compose down
  ```
- **Nollställ databaserna (raderar volymer och all data):**
  ```bash
  docker compose down -v
  ```
- **Kontrollera containerstatus:**
  ```bash
  docker compose ps
  ```
- **Se loggar:**
  ```bash
  docker compose logs -f
  ```


### Docker Images & Multi-stage Build (M4)
Klienten (`client/Dockerfile`) använder en multi-stage build där Node.js och `node_modules` enbart används i byggsteget, och de statiska filerna därefter serveras av `nginx:1.27-alpine`:

| Image | Storlek före M4 (Node dev-image) | Storlek efter M4 (Multi-stage Nginx) | Minskning |
|---|---|---|---|
| **utpost-client** | ~539 MB | **~73.8 MB** (under målet på 100 MB) | **-86 %** |
| **utpost-api** | ~333 MB | ~333 MB | ~333 MB (samma) |
| **nginx** | - | ~74.5MB |


- **Nginx routing & proxy:** `client/nginx.conf` hanterar Single Page Application-routing via `try_files $uri $uri/ /index.html;` samt proxar `/api/` och `/graphql` internt till API-containern (`http://api:4000`).
- **Nätverkssäkerhet:** API:ets port 4000 exponeras inte externt på värddatorn i `compose.yml`. Klienten nås på port 3001 och skickar alla anrop via relativa sökvägar.

## Mätning före/efter (M5)

Turlistan och turdetaljer i GraphQL mätt på seedad dev-databas och migrerad MongoDB. Siffran kommer från `extensions.databasfragor` i svaret.

| Mätning | Före (M4) | Efter (M5, DataLoader & Mongo) |
| ---------------------------------------------------------- | --------- | ------------------------------ |
| **Turlistan (50 turer, utan logs)**<br>`tours(limit: 50) { id title distanceM user { displayName } guide { title } photos { id } }` | 139 | **4** (Postgres) |
| **Turlistan (50 turer, med logs)**<br>`tours(limit: 50) { id title user { displayName } guide { title } photos { id } logs { recordedAt } }` | 189 | **5** (4 Postgres + 1 Mongo) |
| **Turdetalj (en tur med alla mätpunkter)**<br>`tour(id: 1) { id title logs { recordedAt lat elevationM } }` | 2 | **2** (1 Postgres + 1 Mongo) |

- **Turlistan utan logs:**
  - **Före:** 1 + 50 user + 38 guide + 50 photos = 139 frågor – en fråga per tur och relation (N+1).
  - **Efter:** 1 tours + 1 user + 1 guide + 1 photos = 4 frågor – varje loader samlar alla id:n i en `where … = any($1)`.
- **Turlistan med logs:**
  - **Före:** 139 + 50 frågor mot Postgres `tour_logs` = 189 frågor.
  - **Efter:** 4 frågor i Postgres + 1 batchfråga i MongoDB (`mongoFind('tours', { tour_id: { $in: [...] } })`) = 5 frågor.
- **Turdetalj:**
  - 1 fråga i Postgres (`select * from tours where id = $1`) + 1 fråga i MongoDB via DataLoader (`mongoFind` på turen med inbäddade loggar).

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` - Vue + Vite
- `shared/` - Delade TypeScript-typer / API-kontrakt (@utpost/shared)
- `compose.yml` – Docker Compose-konfiguration för hela stacken


## CI/CD Pipeline

Projektet använder GitHub Actions (`main-protection`) med fem samverkande jobb för automatisk validering vid Pull Requests och automatisk driftsättning vid push mot `main`:

* **Miljö:** Node.js 22 (Ubuntu)
* **Jobb:**
  1. **Kvalitet (`quality`)**: Statisk kodanalys (`npm run lint` & `npm run format:check`), typkontroll med GraphQL Codegen (`npm run typecheck` för både API och Vue-klienten) och enhetstester (`npm test`).
  2. **Integration (`integration`)**: Kör integrationstester mot API:et (`npm run test:api`) mot riktiga PostgreSQL 16- och MongoDB 8.2-databaser (körda som container services i CI). Databaserna seedas (`npm run seed`) och GPS-loggarna migreras (`npm run migrate:logs`) innan testerna körs.
  3. **Bygg (`build`)**: Bygger Vue-klientens produktionsfiler (`npm run build`).
  4. **Image (`image`)**: Docker image-bygge (multi-stage) och publicering till GitHub Packages (`ghcr.io`) vid push till `main`. Körs efter att `build` är godkänt (`needs: [build]`).
  5. **Deploy (`deploy`)**: Automatisk driftsättning till **Azure Container Apps** (`azure-staging`) vid push till `main`. Körs först när både `image` och `integration` är godkända (`needs: [image, integration]`).

Se fullständig arkitektur och flödesdiagram i [docs/pipeline.md](docs/pipeline.md).

## Deploy (Azure Staging)

Vid push/merge till `main` driftsätts applikationen automatiskt till Azure Container Apps i miljön `azure-staging`.

- **Sidecar-arkitektur i Container Apps:**
  Hela stacken driftsätts som en gemensam Azure Container App med fyra containrar (sidecars) som delar `localhost`:
  - `client`: Nginx (`:80`), tar emot all extern trafik, levererar de statiska SPA-filerna och proxar `/api/` samt `/graphql` internt.
  - `api`: Node.js 22 Express (`:4000`), GraphQL- och REST-backend. Kör automatisk seedning vid uppstart (`SEED_ON_START=1`).
  - `postgres` (PostgreSQL 16) & `mongo` (MongoDB 8.2): Isolerade databaser för staging.
- **Skalning till noll:** Applikationen är konfigurerad för att kunna skala ner till 0 repliker vid inaktivitet för att spara resurser inom gratiskvoten.
- **Lösenordsfri autentisering (OIDC):** Driftsättningen loggar in mot Azure med GitHubs OpenID Connect-identitet (`azure/login@v3`). Inga Azure-lösenord eller client secrets sparas i GitHub – endast icke-känsliga miljövariabler (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RG`, `AZURE_APP`, `AZURE_URL`).
- **Deterministiska revisioner:** Varje deploy uppdaterar `api` och `client` med unika revision-suffix (`sha-<commit>-api` och `sha-<commit>`), vilket gör varje driftsättning spårbar till exakt git-commit.
- **Köade deployer (`concurrency`):** `group: deploy-staging` med `cancel-in-progress: false` säkerställer att deployer ställs i kö och aldrig avbryter varandra mitt i en revision.
- **Hälsokontroll & Röktest:** Pipelinen pollar `/api/health` tills den nya revisionen är aktiv, följt av ett röktest mot `/graphql` genom Nginx-proxyn för att verifiera att hela datakedjan (Nginx → API → Postgres) svarar korrekt med data ur databasen.
- **Infrastruktur & Setup:** Skript och YAML-mallar finns under `infra/azure/`:
  - `infra/azure/skapa-staging.sh`: Skapar resursgrupp, Container Apps-miljö och driftsätter appen ur `staging.yaml`.
  - `infra/azure/identitet.sh`: Skapar Service Principal med federerad OIDC-inloggning och konfigurerar GitHub-miljön `azure-staging`.
  - `infra/azure/staging.yaml`: Deklarativ specifikation för Container Appen och dess sidecars.

## Branchstrategi

Vi använder två huvudbranches – `main`, och `dev` – samt kortlivade feature-branches för enskilda uppgifter.

- **`main`** – Slutgiltig branch för produkten, den som är live för användare. Alltid skyddad.

- **`dev`** – Säker miljö för att testa pushad kod, skyddad från `main`. Använder dummy-data och en separat databas så att den skarpa databasen aldrig påverkas.
- **Feature-branches** – Varje uppgift utvecklas i en egen branch utgående från `dev`, för att kunna fördela arbetet i teamet utan att krocka med varandra.

**Varför den här strategin?**

Den följer etablerad branch-standard och fail-safe-metodik, och passar projektets och teamets storlek. `main` hålls alltid skyddad och stabil, medan `dev` fungerar som en labbmiljö där vi kan testa och felsöka pushad kod utan risk för produktionen.

## Working agreement

Så här jobbar vi tillsammans i teamet.

**Pushfrekvens**
Efter varje avslutad delfunktion.

**Vad krävs för att godkänna en PR?**
- Minst 1 godkännande
- CI/tester ska vara gröna (quality, integration och build)
- PR-mallen ska vara ifylld

**Hur når vi varandra?**
- Discord & Slack, främst Discord.
- Förväntad svarstid: inom 2h på varddagar.
- Okej att ringa? Ja

**Vad gör vi när någon fastnar?**
Fråga i Discord när som helst, boka in en snabb pardev-session.

