// M5: migreringen av turloggarna från Postgres (tour_logs, en rad per mätpunkt) till MongoDB
// (collectionen tours, ett dokument per tur med mätpunkterna inbäddade i `logs`).
// Dokumentmodellen beslutades i M3 (docs/decisions/databas.md) och provades i mongo-smoke.js –
// det här är samma dokument, för alla turer, plus en kontroll av att inget tappades på vägen.
//
// Kör:  npm run migrate:logs   (Postgres seedad, Mongo igång). Går att köra om: replaceOne + upsert.
import { pool } from './client.js';
import { mongo, toursCollection } from './mongo.js';

const run = async () => {
  const t0 = Date.now();
  const tours = (await pool.query('select * from tours order by id')).rows;
  const logs = (await pool.query('select * from tour_logs order by tour_id, recorded_at')).rows;
  if (tours.length === 0) throw new Error('Inga turer i Postgres – kör npm run seed först');

  // Gruppera mätpunkterna per tur i minnet (två frågor totalt, inte en per tur).
  const logsByTour = new Map();
  for (const l of logs) {
    if (!logsByTour.has(l.tour_id)) logsByTour.set(l.tour_id, []);
    logsByTour.get(l.tour_id).push({
      t: l.recorded_at,
      lat: l.lat,
      lon: l.lon,
      elevation_m: l.elevation_m,
      heart_rate: l.heart_rate,
      note: l.note,
    });
  }

  await mongo.connect();
  const col = toursCollection();
  await col.createIndex({ tour_id: 1 }, { unique: true });

  const ops = tours.map((tour) => {
    const points = logsByTour.get(tour.id) ?? [];
    return {
      replaceOne: {
        filter: { tour_id: tour.id },
        replacement: {
          tour_id: tour.id, // Postgres-id:t är nyckeln – API:et slår upp på det
          user_id: tour.user_id,
          guide_id: tour.guide_id,
          title: tour.title,
          started_at: tour.started_at,
          distance_m: tour.distance_m,
          notes: tour.notes,
          logs: points,
          stats: { points: points.length },
        },
        upsert: true,
      },
    };
  });
  const result = await col.bulkWrite(ops, { ordered: false });

  // Verifiering: lika många dokument som turer, lika många mätpunkter som rader i tour_logs.
  const docs = await col.countDocuments();
  const [{ points }] = await col
    .aggregate([{ $group: { _id: null, points: { $sum: '$stats.points' } } }])
    .toArray();

  console.log(`Postgres: ${tours.length} turer, ${logs.length} rader i tour_logs`);
  console.log(`MongoDB:  ${docs} dokument i tours (${result.upsertedCount} nya, ${result.modifiedCount} ersatta), ${points} mätpunkter`);
  console.log(`Tid: ${Date.now() - t0} ms`);
  if (docs !== tours.length || points !== logs.length) {
    throw new Error('Migreringen stämmer inte – antalet dokument eller mätpunkter avviker');
  }
  console.log('Verifierat: inget tappades på vägen.');
  await mongo.close();
  await pool.end();
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});