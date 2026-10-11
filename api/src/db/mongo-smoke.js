// Röktest för dokumentmodellen: hämtar EN tur ur Postgres med alla sina mätpunkter,
// skriver den som ETT dokument i MongoDB och läser tillbaka den.
// Kör:  npm run mongo:smoke --workspace=api   (Postgres måste vara seedad, Mongo måste köra)
import { BSON } from 'mongodb';
import { pool } from './client.js';
import { mongo, toursCollection } from './mongo.js';

const tourId = Number(process.argv[2] ?? 1);

const run = async () => {
  const tour = (await pool.query('select * from tours where id = $1', [tourId])).rows[0];
  if (!tour) throw new Error(`Ingen tur med id ${tourId} i Postgres – kör npm run seed först`);
  const logs = (
    await pool.query('select * from tour_logs where tour_id = $1 order by recorded_at', [tourId])
  ).rows;

  // Relationsmodellen: 1 rad i tours + ~300 rader i tour_logs, ihopkopplade med tour_id.
  // Dokumentmodellen: allt som läses ihop ligger ihop.
  const doc = {
    tour_id: tour.id, // Postgres-id:t följer med tills migreringen är klar (M5)
    user_id: tour.user_id,
    guide_id: tour.guide_id,
    title: tour.title,
    started_at: tour.started_at,
    distance_m: tour.distance_m,
    notes: tour.notes,
    logs: logs.map((l) => ({
      t: l.recorded_at,
      lat: l.lat,
      lon: l.lon,
      elevation_m: l.elevation_m,
      heart_rate: l.heart_rate,
      note: l.note,
    })),
    stats: { points: logs.length },
  };

  await mongo.connect();
  const tours = toursCollection();
  await tours.createIndex({ tour_id: 1 }, { unique: true });
  await tours.replaceOne({ tour_id: tour.id }, doc, { upsert: true });

  // Läs tillbaka – bara de två första punkterna, resten vill vi inte ha över tråden.
  const back = await tours.findOne({ tour_id: tour.id }, { projection: { logs: { $slice: 2 } } });

  console.log(`Postgres: 1 rad i tours + ${logs.length} rader i tour_logs`);
  console.log(`MongoDB:  1 dokument, ${(BSON.calculateObjectSize(doc) / 1024).toFixed(1)} kB`);
  console.log(`Dokument i collectionen tours: ${await tours.countDocuments()}`);
  console.log(JSON.stringify(back, null, 2));
  await mongo.close();
  await pool.end();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
