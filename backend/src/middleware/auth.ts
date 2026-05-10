import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { verifyAccessToken, type JwtUser } from '../services/authService.js';

declare global { namespace Express { interface Request { user?: JwtUser } } }
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Du må logge inn.' });
  try { req.user = verifyAccessToken(header.slice(7)); next(); }
  catch { return res.status(401).json({ message: 'Sesjonen er utløpt. Logg inn på nytt.' }); }
}
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Du må logge inn.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Du har ikke tilgang til dette.' });
    next();
  };
}
