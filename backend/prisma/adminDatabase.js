import { PrismaClient } from '@prisma/client';

const adminDatabase = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
export default adminDatabase;
