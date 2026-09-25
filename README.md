# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm start
npm run client - Kör igång både api och frontend för client
npm run dev - Kör igång både api och frontend för web
```

Appen ligger sen på http://localhost:3000 och API:et pa http://localhost:4000.

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

