import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closeDatabase } from './db.js';

export async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
  const files = (await readdir(directory)).filter(file => /^\d+.*\.sql$/.test(file)).sort();
  const applied = new Set((await pool.query<{version: string}>('SELECT version FROM schema_migrations')).rows.map(row => row.version));
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(directory, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Migrering brukt: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().then(closeDatabase).catch(error => { console.error(error); process.exitCode = 1; });
}
