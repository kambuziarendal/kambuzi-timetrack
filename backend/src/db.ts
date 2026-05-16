import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

let client: PrismaClient;

if (process.env.DATABASE_DIR) {
  const [{ PGlite }, { PrismaPGlite }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('pglite-prisma-adapter')
  ]);
  const pglite = new PGlite({ dataDir: process.env.DATABASE_DIR });
  const adapter = new PrismaPGlite(pglite);
  client = new PrismaClient({ adapter });
} else {
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL må være satt når DATABASE_DIR ikke brukes.');
  }

  const adapter = new PrismaPg({ connectionString });
  client = new PrismaClient({ adapter });
}

export const prisma = client;
