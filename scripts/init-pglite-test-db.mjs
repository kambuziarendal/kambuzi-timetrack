import { PGlite } from '@electric-sql/pglite';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';

const dataDir = resolve(process.cwd(), '.test-pglite');
rmSync(dataDir, { recursive: true, force: true });
mkdirSync(dataDir, { recursive: true });

const db = new PGlite({ dataDir });
await db.waitReady;

const sql = readFileSync('/tmp/timetrack_schema.sql', 'utf8');
await db.exec(sql);

const passwordHash = await bcrypt.hash('Passord123!', 12);
await db.query(`
  INSERT INTO "Company" ("id", "name", "orgNumber", "address", "workWeekHours")
  VALUES ('seed-company', 'Demo Bedrift AS', '999999999', 'Storgata 1, 4800 Arendal', 37.5);
`);
await db.query(`
  INSERT INTO "WorkRules" ("id", "companyId") VALUES ('seed-workrules', 'seed-company');
`);
await db.query(`
  INSERT INTO "Position" ("id", "companyId", "name", "color") VALUES
  ('seed-pos-servitor', 'seed-company', 'Servitør', '#16a34a'),
  ('seed-pos-kokk', 'seed-company', 'Kokk', '#dc2626');
`);
await db.query(`
  INSERT INTO "User" ("id", "companyId", "firstName", "lastName", "email", "passwordHash", "role")
  VALUES ('seed-admin', 'seed-company', 'Demo', 'Admin', 'admin@timetrack.no', $1, 'ADMIN');
`, [passwordHash]);

console.log(`Test database initialized at ${dataDir}`);
console.log('Login: admin@timetrack.no / Passord123!');
