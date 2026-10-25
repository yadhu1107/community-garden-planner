import jwt from 'jsonwebtoken';
import { allowedOrigins } from '../security.js';

export function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ message: 'This site is not allowed to use the account service.' });
  }
  next();
}

export function requireCsrfHeader(req, res, next) {
  if (req.get('x-requested-with') !== 'PlotPetal') {
    return res.status(403).json({ message: 'Refresh the page and try that account action again.' });
  }
  next();
}

export function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  if (!match) return res.status(401).json({ message: 'Sign in to continue.' });
  try {
    const claims = jwt.verify(match[1], process.env.JWT_ACCESS_SECRET, { issuer: 'plot-and-petal' });
    req.user = { id: claims.sub };
    next();
  } catch {
    return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
  }
}
