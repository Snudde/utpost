import jwt from 'jsonwebtoken';
import { config } from '../config.js';

// M8: en timme, inte 30 dagar. En token som läcker (loggar, en skärmdump, ett skript på sidan)
// ska vara värdelös snart. Klienten håller den i minnet – en omladdning loggar ut, och det är
// priset vi betalar den här veckan (refresh-token i httpOnly-cookie är nästa steg, se klipp 1).
export const sign = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    expiresIn: '1h',
    algorithm: 'HS256',
  });

// Det som får lämna API:et om en användare. password_hash finns på raden – aldrig i ett svar.
export const publicUser = (row) => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name,
  role: row.role,
  created_at: row.created_at,
});

// Skyddet sitter här, inte i klientens router. Utan giltig token: 401, och routen körs aldrig.
// jwt.verify får bara godta HS256 – annars kan en token som säger "alg: none" gå igenom.
export const requireUser = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'inloggning krävs' });
  try {
    req.user = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    next();
  } catch {
    res.status(401).json({ error: 'ogiltig eller utgången token' });
  }
};

// Inloggad räcker inte alltid: redaktionens routes kräver rollen editor. 403 = vi vet vem du är,
// men du får inte. (401 = vi vet inte vem du är.)
export const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) return res.status(403).json({ error: `kräver rollen ${role}` });
  next();
};