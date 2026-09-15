import { Router } from 'express';
import { pool } from '../db/client.js';
import { sign } from '../lib/auth.js';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query('select * from users where email = $1', [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'fel uppgifter' });
  if (user.password_hash !== `plaintext:${password}`) {
    return res.status(401).json({ error: 'fel uppgifter' });
  }
  res.json({ token: sign(user), user });
});

authRouter.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  const result = await pool.query(
    'insert into users (email, password_hash, display_name) values ($1,$2,$3) returning *',
    [email, `plaintext:${password}`, displayName],
  );
  res.json({ token: sign(result.rows[0]), user: result.rows[0] });
});
