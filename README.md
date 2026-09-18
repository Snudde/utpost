# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm start
```

Appen ligger sen på http://localhost:3000 och API:et pa http://localhost:4000.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite

## Deploy

Fråga Marcus.

## Branchstrategi

3 huvudbranches: main, staging, dev
Main: Slutgiltig branch för produkten med användare.
Dev: För att testa pushad kod i en säker miljö skyddad från main. Tillåts använda dummy-data samt separat databas så att inte live databas påverkas.

Varför?
Vi har valt denna metod för att det följer branch-standard och använder fail-safe metodik samt att det passar projektet och teamets storlek. Denna strategi använder vi för att alltid hålla main skyddad. Dev-branchen blir som en labb-miljö för oss att testa koden vi pushat och fixa eventuella buggar. Vi håller delar alltid upp oss i feature-branches för att smidigt fördela arbetet.
