import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateTotalMinutes } from '../utils/time.js';
import { createAlertsForEntry } from '../services/complianceService.js';
export const timeEntriesRouter = Router();
timeEntriesRouter.use(requireAuth);
const schema = z.object({ userId: z.string().optional(), date: z.string(), startTime: z.string(), endTime: z.string(), breakMinutes: z.number().int().min(0).default(0), note: z.string().max(200).optional() });

timeEntriesRouter.get('/', async (req, res) => {
  const isAdmin = req.user!.role === 'ADMIN';
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (to) to.setHours(23, 59, 59, 999);
  const entries = await prisma.timeEntry.findMany({ where: { companyId: req.user!.companyId, ...(isAdmin && req.query.userId ? { userId: String(req.query.userId) } : { userId: req.user!.id }), ...(req.query.status ? { status: String(req.query.status) as any } : {}), ...((from || to) ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { user: { include: { position: true } } }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] });
  res.json(entries);
});

timeEntriesRouter.post('/', async (req, res) => {
  const data = schema.parse(req.body); const targetUserId = req.user!.role === 'ADMIN' && data.userId ? data.userId : req.user!.id;
  const user = await prisma.user.findFirstOrThrow({ where: { id: targetUserId, companyId: req.user!.companyId } });
  const start = new Date(data.startTime), end = new Date(data.endTime);
  const entry = await prisma.timeEntry.create({ data: { userId: user.id, companyId: user.companyId, date: new Date(data.date), startTime: start, endTime: end, breakMinutes: data.breakMinutes, note: data.note, totalMinutes: calculateTotalMinutes(start, end, data.breakMinutes, user.paidBreakDefault) } });
  await createAlertsForEntry(entry.id);
  res.status(201).json(entry);
});

timeEntriesRouter.put('/:id', async (req, res) => {
  const current = await prisma.timeEntry.findFirstOrThrow({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (req.user!.role !== 'ADMIN' && (current.userId !== req.user!.id || !['DRAFT'].includes(current.status))) return res.status(403).json({ message: 'Denne timen kan ikke redigeres.' });
  const data = schema.partial().parse(req.body); const user = await prisma.user.findUniqueOrThrow({ where: { id: current.userId } });
  const start = data.startTime ? new Date(data.startTime) : current.startTime; const end = data.endTime ? new Date(data.endTime) : current.endTime; const breakMinutes = data.breakMinutes ?? current.breakMinutes;
  const entry = await prisma.timeEntry.update({ where: { id: current.id }, data: { date: data.date ? new Date(data.date) : current.date, startTime: start, endTime: end, breakMinutes, note: data.note, totalMinutes: calculateTotalMinutes(start, end, breakMinutes, user.paidBreakDefault), status: current.status === 'APPROVED' ? 'SUBMITTED' : current.status } });
  await createAlertsForEntry(entry.id); res.json(entry);
});

timeEntriesRouter.post('/:id/submit', async (req, res) => {
  const entry = await prisma.timeEntry.findFirstOrThrow({ where: { id: req.params.id, companyId: req.user!.companyId } });
  if (entry.userId !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ message: 'Ingen tilgang.' });
  const updated = await prisma.timeEntry.update({ where: { id: entry.id }, data: { status: 'SUBMITTED', rejectionNote: null } });
  await createAlertsForEntry(updated.id); res.json(updated);
});
