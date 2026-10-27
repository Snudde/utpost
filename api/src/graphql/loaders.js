import DataLoader from 'dataloader';

// M5: N+1-lösningen. En DataLoader samlar alla .load(id) som görs under samma tick
// och gör EN databasfråga för hela listan: `where id = any($1)` i stället för en fråga per rad.
// Loaders skapas per anrop (i context), aldrig globalt – annars läcker cachen mellan användare.
//
// Kontraktet för en batch-funktion: in = lista med nycklar, ut = lista med svar i SAMMA ordning
// och SAMMA längd (saknas raden: null). Därför grupperas raderna med en Map först.
const byId = (rows, ids) => {
  const map = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => map.get(id) ?? null);
};

const groupBy = (rows, key, ids) => {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row[key])) map.set(row[key], []);
    map.get(row[key]).push(row);
  }
  return ids.map((id) => map.get(id) ?? []);
};

export const createLoaders = ({ query, mongoFind }) => ({
  // Tour.user: 50 turer → EN fråga, inte 50
  user: new DataLoader(async (ids) =>
    byId((await query('select * from users where id = any($1)', [ids])).rows, ids),
  ),
  guide: new DataLoader(async (ids) =>
    byId((await query('select * from guides where id = any($1)', [ids])).rows, ids),
  ),
  // Tour.photos: en-till-många – gruppera på tour_id
  photos: new DataLoader(async (tourIds) =>
    groupBy(
      (await query('select * from photos where tour_id = any($1) order by id', [tourIds])).rows,
      'tour_id',
      tourIds,
    ),
  ),
  // Tour.logs: mätpunkterna ligger kvar i Postgres (tour_logs) tills de migreras till MongoDB.
  // Samma mönster som photos: en fråga för alla turer i svaret.
  logs: new DataLoader(async (tourIds) => {
    const ids = tourIds.map(Number);
    const docs = await mongoFind('tours', { tour_id: { $in: ids } }, { tour_id: 1, logs: 1 });
    const map = new Map(docs.map((d) => [d.tour_id, d.logs ?? []]));
    return ids.map((id) => map.get(id) ?? []);
  }),
});