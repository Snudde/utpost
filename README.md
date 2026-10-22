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
2. **Skapa tabeller och seeda data:**
    ```bash
    docker compose exec api npm run seed
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
3. **Skapa tabeller och seeda data i databaser:**
   ```bash
   npm run seed
   ```
4. **Starta applikationen lokalt:**
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

Turlistan i GraphQL, `tours(limit: 50) { id title distanceM user { displayName } guide { title } photos { id } }`,
mätt på seedad dev-databas med API:et i compose. Siffran kommer från `extensions.databasfragor` i svaret.

| Mätning                  | Före (M4) | Efter (M5, DataLoader) |
| ------------------------ | --------- | ---------------------- |
| Databasfrågor, turlistan | 139       | 4                      |

- **Före:** 1 + 50 user + 38 guide + 50 photos – en fråga per tur och relation (N+1).
- **Efter:** 1 tours + 1 user + 1 guide + 1 photos – varje loader samlar alla id:n i en `where … = any($1)`.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` - Vue + Vite
- `shared/` - Delade TypeScript-typer / API-kontrakt (@utpost/shared)
- `compose.yml` – Docker Compose-konfiguration för hela stacken


## CI/CD Pipeline

Projektet använder GitHub Actions (`main-protection`) för automatisk validering vid push och PR mot `main`:

* **Miljö:** Node.js 22 (Ubuntu)
* **Steg:**
  1. Kodkontroll (`npm run lint` & `npm run format:check`)
  2. Tester (`npm test`)
  3. Bygge (`npm run build`)
  4. Docker image-bygge & publicering till GHCR (`ghcr.io`) vid push till `main` (se [docs/pipeline.md](docs/pipeline.md))

## Deploy

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
- CI/tester ska vara gröna (inga på plats i nuläget)
- PR-mallen ska vara ifylld

**Hur når vi varandra?**
- Discord & Slack, främst Discord.
- Förväntad svarstid: inom 2h på varddagar.
- Okej att ringa? Ja

**Vad gör vi när någon fastnar?**
Fråga i Discord när som helst, boka in en snabb pardev-session.

