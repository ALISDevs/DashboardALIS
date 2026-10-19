import prisma from '../lib/prisma.js';
import { publicUser, tokenHash } from '../lib/security.js';
import { readSessionCookie, verifySession, sessionCookie, cookieOptions } from '../lib/session.js';

export async function authenticate(req, res, next) {
  try {
    const token = readSessionCookie(req);
    if (!token) {
      return res.status(401).json({ message: 'Inicia sesión para continuar.' });
    }
    let payload;
    try { payload = await verifySession(token); }
    catch {
      res.clearCookie(sessionCookie, cookieOptions());
      return res.status(401).json({ message: 'La sesión no es válida. Inicia sesión de nuevo.' });
    }
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: { select: publicUser } }
    });
    if (!session || session.userId !== payload.sub || session.tokenHash !== tokenHash(token) || session.expiresAt <= new Date()) {
      res.clearCookie(sessionCookie, cookieOptions());
      return res.status(401).json({ message: 'La sesión venció. Inicia sesión de nuevo.' });
    }
    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    next(error);
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Esta acción requiere una cuenta de administrador.' });
  }
  next();
}
