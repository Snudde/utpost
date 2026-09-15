import { Router } from 'express';
import { pool } from '../db/client.js';

export const photosRouter = Router();

// Skalar om uppladdade bilder till fyra storlekar och räknar ut en enkel
// bildsignatur så att vi kan hitta dubbletter. Ligger i request-tråden.
const SIZES = [1600, 800, 400, 160];

const resize = (pixels, width, height, targetWidth) => {
  const scale = width / targetWidth;
  const targetHeight = Math.round(height / scale);
  const out = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const sx = Math.floor(x * scale);
      const sy = Math.floor(y * scale);
      const src = (sy * width + sx) * 4;
      const dst = (y * targetWidth + x) * 4;
      out[dst] = pixels[src];
      out[dst + 1] = pixels[src + 1];
      out[dst + 2] = pixels[src + 2];
      out[dst + 3] = pixels[src + 3];
    }
  }
  return { pixels: out, width: targetWidth, height: targetHeight };
};

const signature = (pixels) => {
  let hash = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000;
    hash = (hash * 31 + Math.round(gray)) % 2147483647;
  }
  return hash.toString(16);
};

photosRouter.post('/', async (req, res) => {
  const { tourId, filename, width, height } = req.body;

  // Klienten skickar inte pixeldata än, så vi genererar en platshållare
  // med samma dimensioner. Samma arbete, samma tid.
  const pixels = new Uint8Array(width * height * 4).fill(128);

  const started = Date.now();
  const variants = SIZES.map((size) => {
    const scaled = resize(pixels, width, height, size);
    return { size, signature: signature(scaled.pixels) };
  });
  const ms = Date.now() - started;

  const result = await pool.query(
    'insert into photos (tour_id, filename, width, height) values ($1,$2,$3,$4) returning *',
    [tourId, filename, width, height],
  );

  res.json({ ...result.rows[0], variants, processingMs: ms });
});

photosRouter.get('/tour/:tourId', async (req, res) => {
  const result = await pool.query('select * from photos where tour_id = $1', [req.params.tourId]);
  res.json(result.rows);
});
