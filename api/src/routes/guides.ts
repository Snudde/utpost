import { Router, type Request, type Response } from 'express';
import type { Guide, ApiError } from '@utpost/shared';
import { pool } from '../db/client.js';
import { wrap } from '../lib/wrap.js';
import { validate } from '../lib/validate.js';
import { searchSchema, guideUpdateSchema, idParam } from '../lib/schemas.js';
import { requireUser, requireRole } from '../lib/auth.js';

export const guidesRouter = Router();

// Response<Guide[]> = kontraktet. Skickar vi något annat säger tsc ifrån
// – i CI, innan klienten någonsin ser det.
guidesRouter.get(
  '/',
  wrap(async (req: Request, res: Response<Guide[]>) => {
    const result = await pool.query<Guide>('select * from guides order by updated_at desc');
    res.json(result.rows);
  }),
);

guidesRouter.get(
  '/regions',
  wrap(async (req: Request, res: Response<string[]>) => {
    const result = await pool.query<{ region: string }>('select distinct region from guides order by region');
    res.json(result.rows.map((r) => r.region));
  }),
);

guidesRouter.get(
  '/popular',
  wrap(async (req: Request, res: Response<Guide[]>) => {
    const result = await pool.query<Guide>('select * from guides where published = true order by id desc limit 6');
    res.json(result.rows);
  }),
);

// M8 (A05, Injection): sökordet var inklistrat i SQL-strängen – `where title ilike '%${q}%'`.
// Ett citattecken i sökrutan gav 500, och rätt sökord hade gett vad som helst ur databasen.
// Nu är sökordet en parameter ($1): Postgres får frågan och värdet var för sig, och värdet
// kan aldrig bli en del av frågan. Mönstret är detsamma som i alla andra frågor i filen.
guidesRouter.get(
  '/search',
  validate(searchSchema, 'query'),
  wrap(async (req: Request, res: Response<Guide[]>) => {
    const { q } = (req as Request & { validQuery: { q: string } }).validQuery;
    // SABOTAGE (A05): sökordet inklistrat i SQL-strängen igen
    const result = await pool.query<Guide>(
      `select * from guides where title ilike '%${q}%' or region ilike '%${q}%' order by updated_at desc`,
    );
    res.json(result.rows);
  }),
);

guidesRouter.get(
  '/:slug',
  wrap(async (req: Request, res: Response<Guide | ApiError>) => {
    const result = await pool.query<Guide>('select * from guides where slug = $1', [req.params.slug]);
    const guide = result.rows[0];
    if (!guide) return res.status(404).json({ error: 'hittades inte' });
    res.json(guide);
  }),
);

// Redaktionen uppdaterar en guide. Byggd av byrån när redaktionen klagade; "auth kommer sen".
guidesRouter.put(
  '/:id',
  requireUser,
  requireRole('editor'),
  validate(guideUpdateSchema),
  wrap(async (req: Request, res: Response<Guide | ApiError>) => {
    const id = idParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'ogiltigt id' });
    const { title, region, difficulty, lengthKm, bodyHtml, published } = req.body;
    const result = await pool.query<Guide>(
      `update guides set title=$1, region=$2, difficulty=$3, length_km=$4, body_html=$5,
       published=$6, updated_at=now() where id=$7 returning *`,
      [title, region, difficulty, lengthKm, bodyHtml, published, id.data],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'hittades inte' });
    res.json(result.rows[0]);
  }),
);
