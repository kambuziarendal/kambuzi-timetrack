import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
export const meRouter = Router(); meRouter.use(requireAuth);
meRouter.get('/', async (req, res) => res.json(await prisma.user.findUnique({ where: { id: req.user!.id }, include: { company: true, position: true } })));
meRouter.put('/push-token', async (req, res) => res.json(await prisma.user.update({ where: { id: req.user!.id }, data: { expoPushToken: req.body.expoPushToken } })));
