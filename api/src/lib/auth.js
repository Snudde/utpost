import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const sign = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '30d' });

// Används på vissa routes. Inte alla än.
export const requireUser = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'no token' });
  try {
    req.user = jwt.verify(header.replace('Bearer ', ''), config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'bad token' });
  }
};
