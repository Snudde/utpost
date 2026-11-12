import { Router } from 'express';
import { pool } from '../db/client.js';
import { config } from '../config.js';
import { requireUser } from '../lib/auth.js';
import { wrap } from '../lib/wrap.js';
import { validate } from '../lib/validate.js';
import { photoUploadSchema, idParam } from '../lib/schemas.js';

export const photosRouter = Router();

// Samma gräns som funktionen själv har. photoUploadSchema tar varje sida för sig (högst 20 000 px),
// men 20 000 × 20 000 är 400 MP – det är ytan som avgör hur mycket minne funktionen behöver.
const MAX_PIXELS = 50_000_000;

// M7 (skuld 8): bildbearbetningen ligger inte längre i request-tråden. Omskalningen till fyra
// storlekar och signaturerna görs av funktionen process-image (functions/) – lokalt i func start,
// i molnet i Azure Functions. API:et lämnar över jobbet, väntar på svaret och sparar raden först
// när funktionen lyckats – annars blir det en bild i databasen som inte har några varianter.
// M8 (skuld 9): bara inloggade får ladda upp, och bara på sin egen tur. Måtten valideras innan
// något sparas eller skickas till funktionen (photoUploadSchema: heltal, högst 20 000 px).
photosRouter.post(
  '/',
  requireUser,
  validate(photoUploadSchema),
  wrap(async (req, res) => {
    const started = Date.now();
    const { tourId, filename, width, height } = req.body;
    if (width * height > MAX_PIXELS) {
      return res.status(400).json({ error: 'bilden är för stor (högst 50 MP)' });
    }

    const tour = await pool.query('select user_id from tours where id = $1', [tourId]);
    if (!tour.rows[0]) return res.status(404).json({ error: 'turen finns inte' });
    if (tour.rows[0].user_id !== req.user.id && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'inte din tur' });
    }

    let processed;
    try {
      const response = await fetch(config.imageFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Funktionsnyckeln (authLevel: 'function'). Tom lokalt – func start kräver ingen nyckel.
          ...(config.imageFunctionKey && { 'x-functions-key': config.imageFunctionKey }),
        },
        body: JSON.stringify({ filename, width, height }),
        signal: AbortSignal.timeout(30_000), // en kallstart i molnet tar sekunder, inte en halv minut
      });
      const body = await response.json().catch(() => null);
      // 400 från funktionen = bilden går inte att bearbeta; det är anroparens fel, inte tjänstens.
      if (response.status === 400) {
        return res.status(400).json({ error: body?.error ?? 'bilden kan inte bearbetas' });
      }
      if (!response.ok || !Array.isArray(body?.variants)) throw new Error(`funktionen svarade ${response.status}`);
      processed = body;
    } catch (err) {
      // err.cause säger varför fetch misslyckades: ECONNREFUSED = ingen lyssnar (func start körs inte?).
      // Detaljerna går till loggen, inte till anroparen.
      console.error(`Bildtjänsten (${config.imageFunctionUrl}): ${err.message}${err.cause ? ` – ${err.cause.code ?? err.cause.message}` : ''}`);
      return res.status(502).json({ error: 'bildtjänsten svarar inte' });
    }

    const result = await pool.query(
      'insert into photos (tour_id, filename, width, height) values ($1,$2,$3,$4) returning *',
      [tourId, filename, width, height],
    );

    res.json({
      ...result.rows[0],
      variants: processed.variants,
      processingMs: processed.processingMs, // funktionens tid för själva bildarbetet
      coldStart: processed.coldStart,
      instance: processed.instance,
      node: processed.node,
      apiMs: Date.now() - started, // API:ets tid för hela anropet: databasen + funktionen + nätet
    });
  }),
);

photosRouter.get(
  '/tour/:tourId',
  wrap(async (req, res) => {
    const id = idParam.safeParse(req.params.tourId);
    if (!id.success) return res.status(400).json({ error: 'ogiltigt id' });
    const result = await pool.query('select * from photos where tour_id = $1', [id.data]);
    res.json(result.rows);
  }),
);
