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
