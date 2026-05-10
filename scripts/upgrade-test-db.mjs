import { PGlite } from '@electric-sql/pglite';
import { resolve } from 'node:path';

const db = new PGlite({ dataDir: resolve(process.cwd(), '.test-pglite') });
await db.waitReady;
await db.exec('ALTER TABLE "TimeEntry" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);');
console.log('Test database upgraded: TimeEntry.processedAt exists');
