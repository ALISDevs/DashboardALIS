import 'dotenv/config';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import database from './adminDatabase.js';

try {
  const password = randomBytes(48).toString('base64url');
  await database.$transaction(async (db) => {
    await db.$queryRaw`SELECT set_config('alis.setup_password', ${password}, true)`;
    await db.$executeRaw`DO $$ BEGIN EXECUTE format('ALTER ROLE alis_app PASSWORD %L', current_setting('alis.setup_password')); END $$`;
  });
  const url = new URL(process.env.DIRECT_URL);
  url.username = 'alis_app';
  url.password = password;
  const content = fs.readFileSync('.env', 'utf8').replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${JSON.stringify(url.toString())}`);
  fs.writeFileSync('.env', content);
  console.log('Credencial de ejecucion configurada con un rol PostgreSQL sin privilegios de superusuario.');
} finally { await database.$disconnect(); }
