import { Router } from 'express';
import { pool } from '../db/client.js';
import { wrap } from '../lib/wrap.js';

export const usersRouter = Router();

// Användarlistan till redaktionens admin-sida. Admin-sidan kommer i nästa sprint – tills dess
// hämtar redaktionen listan direkt härifrån.
usersRouter.get(
  '/',
  wrap(async (req, res) => {
    const result = await pool.query('select id, email, display_name, role from users order by id');
    res.json(result.rows);
  }),
);