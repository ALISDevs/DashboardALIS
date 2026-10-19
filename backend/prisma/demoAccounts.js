import { randomBytes } from 'node:crypto';
import prisma from './adminDatabase.js';
import { hashPassword } from '../src/lib/security.js';

export async function ensureDemoAccounts() {
  const accounts = [
    { email: 'nestor@alis.dev', name: 'Néstor', username: 'ALIS', role: 'ADMIN' },
    { email: 'ness@alis.dev', name: 'Ness', username: 'Ness_ALIS', role: 'MEMBER' },
    { email: 'ana@alis.dev', name: 'Ana Morales', role: 'MEMBER' }
  ];
  const result = [];
  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing?.passwordHash) {
      const user = !existing.username && account.username
        ? await prisma.user.update({ where: { id: existing.id }, data: { username: account.username } })
        : existing;
      result.push(user);
      continue;
    }
    const password = `Alis-${randomBytes(12).toString('base64url')}`;
    const data = { ...account, passwordHash: await hashPassword(password) };
    const user = await prisma.user.upsert({ where: { email: account.email }, create: data, update: data });
    console.log(`${account.role} | ${account.username || account.email} | ${password}`);
    result.push(user);
  }
  return result;
}
