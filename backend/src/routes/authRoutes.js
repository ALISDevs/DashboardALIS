import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { publicUser, tokenHash, verifyPassword } from '../lib/security.js';
import { authenticate } from '../middlewares/auth.js';
import { signSession, sessionCookie, cookieOptions, sessionDuration } from '../lib/session.js';

const router = Router();
const attempts = new Map();
const windowMs = 15 * 60 * 1000;

router.post('/login', async (req, res, next) => {
  try {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      if (entry.expiresAt < now) attempts.delete(key);
    }
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, expiresAt: now + windowMs };
    if (entry.count >= 20) {
      res.set('Retry-After', String(Math.ceil((entry.expiresAt - now) / 1000)));
      return res.status(429).json({ message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' });
    }
    entry.count += 1;
    attempts.set(key, entry);
    const identifierInput = req.body.identifier ?? req.body.email;
    const identifier = typeof identifierInput === 'string' ? identifierInput.trim() : '';
    const password = req.body.password;
    if (!identifier || identifier.length > 254 || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Introduce un usuario o correo y una contraseña válidos.' });
    }
    const user = identifier.includes('@')
      ? await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : await prisma.user.findFirst({ where: { username: { equals: identifier, mode: 'insensitive' } } });
    if (!(await verifyPassword(password, user?.passwordHash))) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
    }
    attempts.delete(key);
    const nonce = randomBytes(32).toString('hex');
    const session = await prisma.session.create({ data: {
      tokenHash: tokenHash(nonce), userId: user.id,
      expiresAt: new Date(now + sessionDuration * 1000)
    } });
    const token = await signSession(user.id, session.id);
    await prisma.session.update({ where: { id: session.id }, data: { tokenHash: tokenHash(token) } });
    const profile = Object.fromEntries(Object.keys(publicUser).map((field) => [field, user[field]]));
    res.set('Cache-Control', 'no-store');
    res.cookie(sessionCookie, token, { ...cookieOptions(), maxAge: sessionDuration * 1000 });
    res.json({ data: { user: profile } });
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => res.json({ data: req.user }));
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await prisma.session.deleteMany({ where: { id: req.sessionId } });
    res.clearCookie(sessionCookie, cookieOptions());
    res.sendStatus(204);
  } catch (error) { next(error); }
});

export default router;
