import { Router } from 'express';
import { pool } from '../db/client.js';
import { requireUser } from '../lib/auth.js';

export const toursRouter = Router();

toursRouter.get('/', async (req, res) => {
  const tours = await pool.query('select * from tours order by started_at desc limit 50');

  const out = [];
  for (const tour of tours.rows) {
    const user = await pool.query('select * from users where id = $1', [tour.user_id]);
    const guide = tour.guide_id
      ? await pool.query('select * from guides where id = $1', [tour.guide_id])
      : { rows: [] };
    const photos = await pool.query('select * from photos where tour_id = $1', [tour.id]);
    const logs = await pool.query('select * from tour_logs where tour_id = $1 order by recorded_at', [tour.id]);
    out.push({ ...tour, user: user.rows[0], guide: guide.rows[0] || null, photos: photos.rows, logs: logs.rows });
  }

  res.json(out);
});

toursRouter.get('/latest', async (req, res) => {
  const result = await pool.query('select * from tours order by started_at desc limit 5');
  res.json(result.rows);
});

toursRouter.get('/:id', async (req, res) => {
  const tour = await pool.query('select * from tours where id = $1', [req.params.id]);
  if (!tour.rows[0]) return res.status(404).json({ error: 'hittades inte' });
  const logs = await pool.query('select * from tour_logs where tour_id = $1 order by recorded_at', [req.params.id]);
  const photos = await pool.query('select * from photos where tour_id = $1', [req.params.id]);
  res.json({ ...tour.rows[0], logs: logs.rows, photos: photos.rows });
});

toursRouter.post('/', requireUser, async (req, res) => {
  const { title, guideId, startedAt, distanceM, notes } = req.body;
  const result = await pool.query(
    `insert into tours (user_id, guide_id, title, started_at, distance_m, notes)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [req.user.id, guideId || null, title, startedAt, distanceM, notes],
  );
  res.json(result.rows[0]);
});

toursRouter.delete('/:id', async (req, res) => {
  await pool.query('delete from tour_logs where tour_id = $1', [req.params.id]);
  await pool.query('delete from tours where id = $1', [req.params.id]);
  res.json({ ok: true });
});
