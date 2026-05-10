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
  client = new PrismaClient();
}

export const prisma = client;
