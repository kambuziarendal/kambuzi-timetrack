import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { upload, publicUploadPath } from '../middleware/upload.js';
import { hashPassword } from '../services/authService.js';
export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/company', async (req, res) => res.json(await prisma.company.findUnique({ where: { id: req.user!.companyId } })));
adminRouter.put('/company', async (req, res) => {
  const data = z.object({ name: z.string().min(2).optional(), orgNumber: z.string().optional(), address: z.string().optional(), timezone: z.string().optional(), workWeekHours: z.number().optional() }).parse(req.body);
  res.json(await prisma.company.update({ where: { id: req.user!.companyId }, data }));
});
adminRouter.post('/company/logo', upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Ingen fil lastet opp.' });
  res.json(await prisma.company.update({ where: { id: req.user!.companyId }, data: { logoPath: publicUploadPath(req.file.filename) } }));
});

adminRouter.get('/users', async (req, res) => res.json(await prisma.user.findMany({ where: { companyId: req.user!.companyId }, include: { position: true }, orderBy: { createdAt: 'desc' } })));
adminRouter.post('/users', async (req, res) => {
  const d = z.object({ firstName: z.string(), lastName: z.string(), email: z.string().trim().email(), password: z.string().min(8), role: z.enum(['ADMIN','EMPLOYEE']).default('EMPLOYEE'), birthDate: z.string().min(10), positionId: z.string().optional(), hourlyRate: z.number().optional(), paidBreakDefault: z.boolean().default(false) }).parse(req.body);
  const { password, ...userData } = d;
  res.status(201).json(await prisma.user.create({ data: { ...userData, email: d.email.trim().toLowerCase(), birthDate: d.birthDate ? new Date(d.birthDate) : undefined, passwordHash: await hashPassword(password), companyId: req.user!.companyId } }));
});
adminRouter.put('/users/:id', async (req, res) => {
  const d = z.object({ firstName: z.string().optional(), lastName: z.string().optional(), role: z.enum(['ADMIN','EMPLOYEE']).optional(), birthDate: z.string().optional().nullable(), positionId: z.string().optional().nullable(), hourlyRate: z.number().optional().nullable(), paidBreakDefault: z.boolean().optional(), isActive: z.boolean().optional() }).parse(req.body);
  res.json(await prisma.user.update({ where: { id: String(req.params.id), companyId: req.user!.companyId } as any, data: { ...d, birthDate: d.birthDate ? new Date(d.birthDate) : d.birthDate } }));
});
adminRouter.post('/users/:id/contract', upload.single('contract'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Ingen fil lastet opp.' });
  res.json(await prisma.user.update({ where: { id: String(req.params.id) }, data: { employmentContractPath: publicUploadPath(req.file.filename) } }));
});

adminRouter.get('/positions', async (req, res) => res.json(await prisma.position.findMany({ where: { companyId: req.user!.companyId } })));
adminRouter.post('/positions', async (req, res) => res.status(201).json(await prisma.position.create({ data: { ...z.object({ name: z.string(), color: z.string().default('#2563eb') }).parse(req.body), companyId: req.user!.companyId } })));
adminRouter.put('/positions/:id', async (req, res) => res.json(await prisma.position.update({ where: { id: String(req.params.id) }, data: z.object({ name: z.string().optional(), color: z.string().optional() }).parse(req.body) })));
adminRouter.delete('/positions/:id', async (req, res) => { await prisma.position.delete({ where: { id: String(req.params.id) } }); res.status(204).end(); });

adminRouter.get('/work-rules', async (req, res) => res.json(await prisma.workRules.findUnique({ where: { companyId: req.user!.companyId } })));
adminRouter.put('/work-rules', async (req, res) => res.json(await prisma.workRules.upsert({ where: { companyId: req.user!.companyId }, create: { companyId: req.user!.companyId, ...req.body }, update: req.body })));

adminRouter.post('/time-entries/:id/approve', async (req, res) => res.json(await prisma.timeEntry.update({ where: { id: String(req.params.id) }, data: { status: 'APPROVED', rejectionNote: null } })));
adminRouter.post('/time-entries/:id/reject', async (req, res) => res.json(await prisma.timeEntry.update({ where: { id: String(req.params.id) }, data: { status: 'DRAFT', rejectionNote: z.object({ rejectionNote: z.string().min(2) }).parse(req.body).rejectionNote } })));
adminRouter.post('/time-entries/lock-period', async (req, res) => {
  const { from, to } = z.object({ from: z.string(), to: z.string() }).parse(req.body);
  const result = await prisma.timeEntry.updateMany({ where: { companyId: req.user!.companyId, date: { gte: new Date(from), lte: new Date(to) }, status: 'APPROVED' }, data: { status: 'LOCKED' } });
  res.json({ locked: result.count });
});
adminRouter.post('/time-entries/mark-processed', async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
  const result = await prisma.timeEntry.updateMany({ where: { companyId: req.user!.companyId, id: { in: ids } }, data: { processedAt: new Date() } });
  res.json({ processed: result.count });
});
adminRouter.post('/time-entries/unmark-processed', async (req, res) => {
  const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
  const result = await prisma.timeEntry.updateMany({ where: { companyId: req.user!.companyId, id: { in: ids } }, data: { processedAt: null } });
  res.json({ processed: result.count });
});

adminRouter.get('/alerts', async (req, res) => res.json(await prisma.complianceAlert.findMany({ where: { user: { companyId: req.user!.companyId } }, include: { user: true, timeEntry: true }, orderBy: { createdAt: 'desc' } })));
adminRouter.post('/alerts/:id/acknowledge', async (req, res) => res.json(await prisma.complianceAlert.update({ where: { id: String(req.params.id) }, data: { acknowledgedAt: new Date() } })));
