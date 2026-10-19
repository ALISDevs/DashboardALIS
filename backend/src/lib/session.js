import { SignJWT, jwtVerify } from 'jose';

export const sessionCookie = 'alis_session';
export const sessionDuration = 8 * 60 * 60;

function jwtKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith('replace-with-') || Buffer.byteLength(secret) < 32) throw new Error('JWT_SECRET debe ser un secreto aleatorio de al menos 32 bytes.');
  return new TextEncoder().encode(secret);
}

export function validateSessionConfiguration() { jwtKey(); }

export function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api' };
}

export function readSessionCookie(req) {
  const cookies = (req.headers.cookie || '').split(';').map((entry) => entry.trim());
  const value = cookies.find((entry) => entry.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  return value && value.length < 4096 ? value : null;
}

export async function signSession(userId, sessionId) {
  return new SignJWT({ sid: sessionId }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('alis-api').setAudience('alis-team').setSubject(userId)
    .setIssuedAt().setExpirationTime(`${sessionDuration}s`).sign(jwtKey());
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, jwtKey(), {
    algorithms: ['HS256'], issuer: 'alis-api', audience: 'alis-team', typ: 'JWT', maxTokenAge: `${sessionDuration}s`,
    requiredClaims: ['sub', 'sid', 'iat', 'exp']
  });
  return payload;
}
