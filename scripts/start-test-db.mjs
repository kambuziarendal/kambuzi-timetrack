import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'pglite-server';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const port = Number(process.env.TIMETRACK_TEST_DB_PORT ?? 5432);
const dataDir = resolve(process.cwd(), '.test-pglite');
mkdirSync(dataDir, { recursive: true });

const db = new PGlite(dataDir);
await db.waitReady;

const server = createServer(db);
server.listen(port, '127.0.0.1', () => {
  console.log(`TimeTrack test database running on postgresql://timetrack:timetrack@127.0.0.1:${port}/timetrack`);
  console.log(`Data directory: ${dataDir}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
