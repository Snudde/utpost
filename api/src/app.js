import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.ts';
import { guidesRouter } from './routes/guides.ts';
import { toursRouter } from './routes/tours.js';
import { photosRouter } from './routes/photos.js';
import { pool } from './db/client.js';
import { mongo } from './db/mongo.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Svarar med om databaserna nås. Compose och molnet frågar hit för att veta om API:et lever.
app.get('/api/health', async (req, res) => {
  const check = async (fn) => {
    try {
      await fn();
      return 'ok';
    } catch (err) {
      return `fel: ${err.message}`;
    }
  };
  const postgres = await check(() => pool.query('select 1'));
  const mongodb = await check(async () => {
    await mongo.connect(); // gör inget om klienten redan är ansluten
    await mongo.db().command({ ping: 1 });
  });
  const ok = postgres === 'ok' && mongodb === 'ok';
  res.status(ok ? 200 : 503).json({ ok, version: '1.4.2', postgres, mongodb });
});

app.use('/api/auth', authRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/tours', toursRouter);
app.use('/api/photos', photosRouter);
