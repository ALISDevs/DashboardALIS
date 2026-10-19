import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
export const publicUser = { id: true, name: true, email: true, username: true, role: true };

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, hash) {
  const [, salt, key] = (hash || '').split(':');
  const expected = Buffer.from(key || '0'.repeat(128), 'hex');
  const actual = await scrypt(password, salt || 'unconfigured-account', 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual) && Boolean(hash);
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128;
}
