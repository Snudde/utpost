import { Router } from 'express';
import { pool } from '../db/client.js';
import { config } from '../config.js';

export const photosRouter = Router();

const MAX_PIXELS = 50_000_000;

/** Anropar bildfunktionen (Azure Functions lokalt eller i molnet) och returnerar varianter + mätdata. */
const callImageFunction = async ({ filename, width, height }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (config.imageFunctionKey) {
    headers['x-functions-key'] = config.imageFunctionKey;
  }

  let fnRes;
  try {
    fnRes = await fetch(config.imageFunctionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filename, width, height }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    const error = new Error(`Kunde inte nå bildfunktionen: ${err.message}`);
    error.status = 502;
    throw error;
  }

  const body = await fnRes.json().catch(() => null);
  if (!fnRes.ok || !body || !Array.isArray(body.variants)) {
    const error = new Error(body?.error ?? `Bildfunktionen svarade ${fnRes.status}`);
    error.status = fnRes.status === 400 ? 400 : 502;
    throw error;
  }

  return body;
};

photosRouter.post('/', async (req, res) => {
  const { tourId, filename, width, height } = req.body ?? {};
  const parsedTourId = Number(tourId);

  if (
    !Number.isInteger(parsedTourId) ||
    parsedTourId < 1 ||
    typeof filename !== 'string' ||
    !filename.trim() ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > MAX_PIXELS
  ) {
    return res.status(400).json({
      error: 'Skicka tourId, filename samt positiva heltal för width och height (högst 50 MP).',
    });
  }

  const started = Date.now();
  let processed;
  try {
    processed = await callImageFunction({ filename: filename.trim(), width, height });
  } catch (err) {
    return res.status(err.status ?? 502).json({ error: err.message });
  }

  const result = await pool.query(
    'insert into photos (tour_id, filename, width, height) values ($1,$2,$3,$4) returning *',
    [parsedTourId, filename.trim(), width, height],
  );

  const apiMs = Date.now() - started;
  const { variants, processingMs, coldStart, instance, node } = processed;

  res.json({
    ...result.rows[0],
    variants,
    processingMs,
    coldStart,
    instance,
    node,
    apiMs,
  });
});

photosRouter.get('/tour/:tourId', async (req, res) => {
  const result = await pool.query('select * from photos where tour_id = $1', [req.params.tourId]);
  res.json(result.rows);
});
