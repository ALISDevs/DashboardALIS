import 'dotenv/config';
import prisma from './adminDatabase.js';
import { ensureDemoAccounts } from './demoAccounts.js';

try {
  await ensureDemoAccounts();
  console.log('Cuentas listas. Las contraseñas existentes se conservan.');
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
