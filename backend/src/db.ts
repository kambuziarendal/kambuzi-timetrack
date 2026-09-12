import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;
export type DbClient = { query: <T extends pg.QueryResultRow = any>(text: string, values?: unknown[]) => Promise<pg.QueryResult<T>>; release: () => void };
export type DbPool = { query: DbClient['query']; connect: () => Promise<DbClient>; end: () => Promise<void> };

async function createPool(): Promise<DbPool> {
  if (env.DATABASE_URL === 'pglite://memory') {
    const { PGlite } = await import('@electric-sql/pglite');
    const database = new PGlite();
    await database.waitReady;
    const query: DbClient['query'] = async (text, values = []) => {
      if (!values.length && text.split(';').filter(part => part.trim()).length > 1) {
        await database.exec(text);
        return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] } as pg.QueryResult<any>;
      }
      const result = await database.query(text, values);
      return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0, command: '', oid: 0, fields: [] } as pg.QueryResult<any>;
    };
    return { query, connect: async () => ({ query, release: () => undefined }), end: async () => database.close() };
  }
  return new Pool({ connectionString: env.DATABASE_URL, max: 10 }) as unknown as DbPool;
}

export const pool = await createPool();

export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() { await pool.end(); }
