import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../services/authService.js';
export const meRouter = Router(); meRouter.use(requireAuth);
meRouter.get('/', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { company: true, position: true } });
  res.json(user);
});
meRouter.put('/', async (req, res) => {
  const d = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    birthDate: z.string().min(10),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    }).parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { ...d, birthDate: d.birthDate ? new Date(d.birthDate) : d.birthDate, profileReviewRequired: false },
    include: { company: true, position: true }
  });
  res.json(user);
});
meRouter.put('/password', async (req, res) => {
  const d = z.object({ currentPassword: z.string().optional(), newPassword: z.string().min(8) }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!user.passwordChangeRequired) {
    if (!d.currentPassword || !(await verifyPassword(d.currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Nåværende passord er feil.' });
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(d.newPassword), passwordChangeRequired: false } });
  res.json({ message: 'Passordet er oppdatert.' });
});
meRouter.put('/push-token', async (req, res) => res.json(await prisma.user.update({ where: { id: req.user!.id }, data: { expoPushToken: req.body.expoPushToken } })));
