# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Förutsättningar
- [Node.js](https://nodejs.org/) v22 eller senare
- [Docker & Docker Desktop](https://www.docker.com/) igång

## Kom igång

1. **Installera beroenden:**
   ```bash
   npm install
   ```
2. **Starta databaserna i Docker:**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
3. **Skapa tabeller och seeda data (PostgreSQL):**
   ```bash
   npm run seed
   ```
4. **Starta applikationen (välj frontend):**
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
- **Stoppa databaserna:**
  ```bash
  docker compose -f docker-compose.dev.yml down
  ```
- **Nollställ databaserna (raderar volymer och all data):**
  ```bash
  docker compose -f docker-compose.dev.yml down -v
  ```
- **Kontrollera containerstatus:**
  ```bash
  docker compose -f docker-compose.dev.yml ps
  ```

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` - Vue + Vite

## CI/CD Pipeline

Projektet använder GitHub Actions (`main-protection`) för automatisk validering vid push och PR mot `main`:

* **Miljö:** Node.js 22 (Ubuntu)
* **Steg:**
  1. Kodkontroll (`npm run lint` & `npm run format:check`)
  2. Tester (`npm test`)
  3. Bygge (`npm run build`)

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

