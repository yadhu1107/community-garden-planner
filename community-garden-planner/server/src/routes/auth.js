import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import RefreshSession from '../models/RefreshSession.js';
import User from '../models/User.js';
import { requireAuth, requireCsrfHeader, requireTrustedOrigin } from '../middleware/auth.js';
import { cookieOptions } from '../security.js';

const router = Router();
const refreshCookieName = 'plot_petal_refresh';
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-in attempts. Wait a little while and try again.' }
});

const normalizedEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
const publicUser = user => ({ id: user._id.toString(), fullName: user.fullName, email: user.email });
const hashToken = token => createHash('sha256').update(token).digest('hex');

function setRefreshCookie(res, token) {
  const options = cookieOptions();
  const attributes = [
    `${refreshCookieName}=${encodeURIComponent(token)}`,
    `Path=${options.path}`,
    'HttpOnly',
    `SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`,
    `Max-Age=${Math.floor(options.maxAge / 1000)}`
  ];
  if (options.secure) attributes.push('Secure');
  if (options.partitioned) attributes.push('Partitioned');
  res.append('Set-Cookie', attributes.join('; '));
}

function clearRefreshCookie(res) {
  const options = cookieOptions();
  const attributes = [`${refreshCookieName}=`, `Path=${options.path}`, 'HttpOnly', `SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`, 'Max-Age=0'];
  if (options.secure) attributes.push('Secure');
  if (options.partitioned) attributes.push('Partitioned');
  res.append('Set-Cookie', attributes.join('; '));
}

function createAccessToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m', issuer: 'plot-and-petal' });
}

async function createSession(user, res) {
  const refreshToken = randomBytes(48).toString('base64url');
  await RefreshSession.create({ userId: user._id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + refreshLifetimeMs) });
  setRefreshCookie(res, refreshToken);
  return { accessToken: createAccessToken(user), user: publicUser(user) };
}

router.use(requireTrustedOrigin);
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const email = normalizedEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const passwordConfirmation = typeof req.body.passwordConfirmation === 'string' ? req.body.passwordConfirmation : '';
    if (fullName.length < 2 || fullName.length > 80) return res.status(400).json({ message: 'Enter your full name (2 to 80 characters).' });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ message: 'Choose a password between 12 and 72 bytes.' });
    if (password !== passwordConfirmation) return res.status(400).json({ message: 'The passwords do not match.' });

    const existing = await User.exists({ email });
    if (existing) return res.status(409).json({ message: 'An account with that email already exists. Sign in instead.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash });
    res.status(201).json(await createSession(user, res));
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: 'An account with that email already exists. Sign in instead.' });
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = normalizedEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ message: 'Enter your email address and password.' });
    const user = await User.findOne({ email }).select('+passwordHash');
    const correct = user && await bcrypt.compare(password, user.passwordHash);
    if (!correct) return res.status(401).json({ message: 'Email or password is incorrect.' });
    res.json(await createSession(user, res));
  } catch (err) { next(err); }
});

router.post('/refresh', requireCsrfHeader, async (req, res, next) => {
  try {
    const token = req.cookies?.[refreshCookieName];
    if (!token) { clearRefreshCookie(res); return res.status(401).json({ message: 'Sign in to continue.' }); }
    const session = await RefreshSession.findOne({ tokenHash: hashToken(token) }).select('+tokenHash').populate('userId');
    if (!session || session.expiresAt <= new Date() || !session.userId) {
      if (session) await session.deleteOne();
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
    }
    await session.deleteOne();
    res.json(await createSession(session.userId, res));
  } catch (err) { next(err); }
});

router.post('/logout', requireCsrfHeader, async (req, res, next) => {
  try {
    const token = req.cookies?.[refreshCookieName];
    if (token) await RefreshSession.deleteOne({ tokenHash: hashToken(token) });
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('fullName email');
    if (!user) return res.status(401).json({ message: 'Your sign-in has expired. Please sign in again.' });
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

export default router;
