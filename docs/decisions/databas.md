# Beslutsdokument: databasval

**Datum:** 2026-10-08

**Beslut**: Använda både Postgres och MongoDB. Postgeres sköter användare och guides och MongoDB för turer och tur-loggar. 

## Bakgrund
Vi ärvde en PostgreSQL-databas där turer och GPS-punkter var uppdelade i `tours` och `tour_logs`. 

Detta orsakade **skuld #8** (*N+1-queries i turlistan*): för att hämta 50 turer gör `api/src/routes/tours.js` hela **201 databasfrågor** ($1 + 50 \times 4$ anrop i en loop). Med ~300 mätpunkter per tur innebär det tiotusentals rader i `tour_logs` och ett svar på över 1 MB JSON som måste pusslas ihop i Node.js. 

Genom att flytta turer till MongoDB betalar vi av skuld #8 och ersätter 201 databasfrågor med ett enda snabbt anrop.

**Mätningar:**

Mätt 2026-10-08 på seedad dev-databas (`npm run seed`, Postgres 16 i compose):

| Mått | Värde | Hur vi mätte |
|---|---|---|
| Turer i `tours` | 200 | `select count(*) from tours` |
| Rader i `tour_logs` | **5 794** (576 kB på disk) | `select count(*) from tour_logs`, `pg_total_relation_size` |
| Punkter per tur | snitt 29, min 20, **max 39** (största tur: id 58) | `count(*) ... group by tour_id` |
| Databasfrågor per `GET /api/tours` | **201** | 1 + 4 per tur × 50 turer, läst ur `routes/tours.js` |
| Svarsstorlek `GET /api/tours` | **283 572 byte (≈ 277 kB)** | `curl -s -o /dev/null -w "%{size_download}"` |
| …varav mätpunkter | 1 456 punkter, **≈ 83 %** av svaret | svaret utan `logs` är 46 751 byte |
| Svarstid `GET /api/tours` | 0,21–0,28 s (lokalt, 3 anrop) | `curl -w "%{time_total}"` |
| Största tur som Mongo-dokument | **3,4 kB** | `npm run mongo:smoke --workspace=api -- 58` |

## Vad som flyttas till mongoDB

- **Turer och tur-loggar:** 
  - Dessa slås ihop till en enda collection (`tours`) där alla GPS-mätpunkter bäddas in som en array inuti tur-dokumentet.
  - **Varför?** 
    - **Allt läses ihop:** En användare vill se kartan, statistiken och höjdkurvan samtidigt. Att ha allt i ett dokument eliminerar N+1-problemet och gör att vi slipper slå ihop tusentals rader i minnet.
    - **Skrivs en gång:** En tur spelas in och sparas en enda gång. Det finns inga komplexa transaktioner eller relationer som kräver SQL.

## Dokumentmodellen för turer
**Bestämt fält**:

```json
{
  "_id": "6704fa4b8e21a...",
  "tour_id": 1,
  "user_id": 4,
  "guide_id": 12,
  "title": "Hällstigen runt",
  "started_at": "2026-09-01T08:00:00.000Z",
  "distance_m": 12500,
  "notes": "Bra underlag, soligt.",
  "logs": [
    {
      "t": "2026-09-01T08:00:00.000Z",
      "lat": 67.902,
      "lon": 18.511,
      "elevation_m": 120,
      "heart_rate": 138,
      "note": null
    }
  ],
  "stats": {
    "points": 300
  }
}
```

**Inbäddat eller refererat?**

- Vi använder oss av inbäddade relationer eftersom GPS-mätpunkterna inte har nåt liv utaför turen. När användare klickar på en tur vill man rita hela kartan och höjdkurvan direkt. Genom att bädda in datan kan servern hämta allt i ett enda anrop utan att göra joins eller databasfrågor.

Mätpunkter i tur:
- En tur har ca. 300 mätpunkter
- Varje mätpunkt tar runt 60-70 bytes. Detta motsvarar 20 kB på en tur med 300 punkter.

Max gräns:
- 16MB per dokument

Index: 
- Index för att hämta specifik tur (ex. { tour_id: 1 })
- Index för att hämta turlistan sorterad på senaste först (ex. { started_at: -1 } )
- Index för att filtrera användare: { user_id: 1 }

## Vad som stannar i Postgres

- Användare: Postgres ger mycket contraints vilket är bra eftersom inloggning kräver unik e-post och roller samt att data alltid är konsekvetnt. 
- Guider: Postgres har bra stöd för indexering och fulltextsökning vilket passar perfekt för guider då man vill ha sökfuntkion. Koppling till användare sker även enkelt med vanlig relationskoppling. 
- Foton: Genom att ha foton i en separat tabell kan varje bild sparas, tas bort eller ändras för sig själv, oberoende av själva turen. Bildraden behöver bara ha ett id (tours_id) som pekar på vilken tur den tillhör.


## Så här ska migreringen gå till (genomförs i M5)
*
1. **Migreringsskript (ETL):**
   - Ett skript läser alla turer från `tours` och deras mätpunkter från `tour_logs` i Postgres.
   - Skriptet transformerar varje tur till ett dokument med mätpunkterna inbäddade i en `logs`-array.
   - Dokumenten skrivs till MongoDB med `replaceOne({ tour_id }, doc, { upsert: true })` så att skriptet är idempotent och kan köras om utan dubbletter.
2. **Omkoppling av `/api/tours`:**
   - Endpointen byter datakälla från Postgres SQL-queries till `toursCollection().find()`.
   - Detta ersätter dagens 201 SQL-frågor (N+1-problemet, skuld #8) med ett enda snabbt dokumentanrop direkt mot MongoDB.
3. **Verifiering av dataintegritet:**
   - **Antal turer:** `SELECT COUNT(*) FROM tours` ska matcha `countDocuments()` i MongoDB.
   - **Antal mätpunkter:** `SELECT COUNT(*) FROM tour_logs` ska matcha totala antalet loggpunkter i alla MongoDB-dokument via en `aggregate`-summering.
   - **Stickprov:** Manuell jämförelse av 3 slumpmässiga turer fält för fält (koordinater, puls, tidsstämplar).
4. **Hantering av `tour_logs` efteråt:**
   - Tabellen lämnas orörd i Postgres (read-only) under en övergångsperiod som säkerhetsbackup.
   - När MongoDB bevisats stabil i drift körs en migrering med `DROP TABLE tour_logs;` för att frigöra databasutrymme och förenkla Postgres-backuper.

## Alternativ vi jämförde
*
1. **PostgreSQL:** 
   - Ha enbart en SQL-databas (PostgreSQL) för att lagra all data från hemsidan. Problemet är att `turer` kan vara stora dokument med hundratals rader. För att visa en tur
    krävs då stora och komplexa `JOIN`-operationer, vilket kan leda till prestandaproblem och exempelvis teknisk skuld **#8 (N+1 queries)**.

2. **PostgreSQL + MongoDB:** 
   - Använd PostgreSQL för den största delen av datan, men lagra schemat `turer` i MongoDB. Eftersom en hel tur kan sparas som ett stort dokument i MongoDB slipper vi de tunga `JOIN`-operationerna i PostgreSQL och kan samtidigt undvika teknisk skuld **#8 (N+1 queries)**.
*

## Konsekvenser
*
- Att använda både PostgreSQL och MongoDB innebär mer komplexitet i systemet. Vi behöver exempelvis hantera två anslutningssträngar i miljön, en för varje databas.
- docker-compose behöver konfigureras för att starta och koppla upp mot båda databaserna. 
- Pipelinen behöver kunna hantera installation, konfiguration och eventuella migreringar för två separata databaser. 
- I molnmiljön behöver vi dessutom hantera två databasinstanser, vilket kan innebära mer konfiguration, api koppling/kontohantering. 

-Allt detta gör databas kompligen mer komplex jämfört med att endast använda PostgreSQL, men om den hjälper med datahantering med turer så får vi göra det.
*

**Skrivet av:** *Oskar/Benjamin/Kalle*