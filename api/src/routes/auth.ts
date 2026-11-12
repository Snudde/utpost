import { Router, type Request, type Response } from 'express';
import { pool } from '../db/client.js';
import { sign, publicUser, requireUser } from '../lib/auth.js';
import { wrap } from '../lib/wrap.js';
import { validate } from '../lib/validate.js';
import { loginSchema, registerSchema } from '../lib/schemas.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

// requireUser lägger den verifierade tokenens innehåll på req.user – Express typer känner inte till det.
type TokenUser = { id: number; email: string; role: 'member' | 'editor' };
type AuthedRequest = Request & { user: TokenUser };

export const authRouter = Router();

// M8 (A07, Authentication Failures): samma svar och ungefär samma tid vare sig e-posten finns
// eller lösenordet är fel – annars kan man lista vilka konton som finns. Och svaret innehåller
// bara det klienten behöver: token och den publika användaren. Förut: hela raden, med password_hash.
authRouter.post(
  '/login',
  validate(loginSchema),
  wrap(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await pool.query('select * from users where email = $1', [email]);
    const user = result.rows[0];
    // verifyPassword räknar även när användaren saknas (mot en dummy-hash) – så tar "okänd e-post" lika lång tid som "fel lösenord".
    const ok = await verifyPassword(password, user?.password_hash);
    if (!user || !ok) return res.status(401).json({ error: 'fel e-post eller lösenord' });
    res.json({ token: sign(user), user: publicUser(user) });
  }),
);

authRouter.post(
  '/register',
  validate(registerSchema),
  wrap(async (req: Request, res: Response) => {
    const { email, password, displayName, role = 'member' } = req.body;
    const exists = await pool.query('select 1 from users where email = $1', [email]);
    if (exists.rows[0]) return res.status(409).json({ error: 'e-postadressen används redan' });
    const result = await pool.query(
      'insert into users (email, password_hash, display_name, role) values ($1,$2,$3,$4) returning *',
      [email, await hashPassword(password), displayName, role],
    );
    res.status(201).json({ token: sign(result.rows[0]), user: publicUser(result.rows[0]) });
  }),
);

// Vem är jag? Klienten frågar här när den har en token i minnet (och får 401 när den gått ut).
authRouter.get('/me', requireUser, (req: Request, res: Response) => {
  const { id, email, role } = (req as AuthedRequest).user;
  res.json({ user: { id, email, role } });
});
