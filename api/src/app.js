import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config.js';
import { pool } from './db/client.js';
import { mongo } from './db/mongo.js';
import { authRouter } from './routes/auth.ts';
import { guidesRouter } from './routes/guides.ts';
import { toursRouter } from './routes/tours.js';
import { photosRouter } from './routes/photos.js';
import { usersRouter } from './routes/users.js';
import { yoga } from './graphql/server.js';

// M8 (skuld 9): appen byggs här och startas i index.js. Då går den att testa utan att lyssna
// på en fast port – routes.test.js startar den på en ledig port, anropar den och stänger den.
export const app = express();

app.use(cors());

// GraphQL (M4): en endpoint bredvid REST-routerna. Ligger före express.json() – yoga läser sin egen body.
app.use(yoga.graphqlEndpoint, yoga);

// M8: 1 MB räcker för allt API:et tar emot (bytes i uppladdningen går aldrig hit – M7). 50 MB var
// en inbjudan att fylla minnet med en enda request.
app.use(express.json({ limit: '1mb' }));

// Svarar med om databaserna nås. Compose och molnet frågar hit för att veta om API:et lever.
// M6: `sha` är commiten imagen byggdes från – pipelinen väntar på att molnet svarar med rätt sha.
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
  res.status(ok ? 200 : 503).json({ ok, version: '1.5.0', sha: config.gitSha, postgres, mongodb });
});

app.use('/api/auth', authRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/tours', toursRouter);
app.use('/api/photos', photosRouter);
app.use('/api/users', usersRouter);

// M8 (A10, Mishandling of Exceptional Conditions): ett fel ska bli ETT svar – 400 när det är
// anroparens fel (valideringen), annars 500 utan detaljer. Förut svalde process.on('unhandledRejection')
// felet och anropet fick inget svar alls; den som anropade satt och väntade tills browsern gav upp.
// Fyra argument = Express felhanterare. Felen kommer hit via wrap() i lib/wrap.js.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ogiltig indata',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ogiltig JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'för stor request' });
  console.error(`${req.method} ${req.originalUrl}: ${err.message}`);
  // stack med i svaret tills loggarna i Azure går att söka i – då slipper vi gissa vad som hände.
  res.status(500).json({ error: 'internt fel', stack: err.stack });
});
