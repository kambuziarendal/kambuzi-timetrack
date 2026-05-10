import 'express-async-errors';
import express from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import cors from 'cors';
import path from 'path';
import { env } from './env.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { timeEntriesRouter } from './routes/timeEntries.js';
import { reportsRouter } from './routes/reports.js';
import { meRouter } from './routes/me.js';
export const app = express();
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(env.uploadDir)));
app.get('/health', (_req, res) => res.json({ ok: true, name: 'TimeTrack API' }));
app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/time-entries', timeEntriesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reports', reportsRouter);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Sjekk at alle felt er fylt ut riktig.' });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ message: 'Denne e-posten finnes allerede.' });
  }
  res.status(err.status ?? 500).json({ message: err.message ?? 'Noe gikk galt.' });
});
