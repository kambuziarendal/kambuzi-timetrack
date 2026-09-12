import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform(value => value === 'true');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@127.0.0.1:5433/timetrack'),
  APP_URL: z.string().url().default('http://localhost:4000'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  SECURE_COOKIES: bool.default(false),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Ugyldig serverkonfigurasjon', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
