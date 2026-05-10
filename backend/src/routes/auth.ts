import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { hashPassword, issueTokens, tokenHash, verifyPassword, verifyRefreshToken } from '../services/authService.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const schema = z.object({ companyName: z.string().min(2), orgNumber: z.string().optional(), address: z.string().optional(), firstName: z.string(), lastName: z.string(), email: z.string().trim().email(), password: z.string().min(8) });
  const data = schema.parse(req.body);
  const passwordHash = await hashPassword(data.password);
  const company = await prisma.company.create({ data: { name: data.companyName, orgNumber: data.orgNumber, address: data.address, workRules: { create: {} }, positions: { create: { name: 'Ansatt', color: '#2563eb' } }, users: { create: { firstName: data.firstName, lastName: data.lastName, email: data.email.trim().toLowerCase(), passwordHash, role: 'ADMIN' } } }, include: { users: true } });
  const user = company.users[0];
  const tokens = await issueTokens({ id: user.id, companyId: company.id, role: user.role, email: user.email });
  res.status(201).json({ user: { id: user.id, companyId: company.id, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName }, ...tokens });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().trim().email(), password: z.string() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ message: 'Feil e-post eller passord.' });
  const tokens = await issueTokens({ id: user.id, companyId: user.companyId, role: user.role, email: user.email });
  res.json({ user: { id: user.id, companyId: user.companyId, role: user.role, email: user.email, firstName: user.firstName, lastName: user.lastName }, ...tokens });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
  try {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await prisma.refreshToken.findFirst({ where: { userId: payload.id, tokenHash: tokenHash(refreshToken), revokedAt: null, expiresAt: { gt: new Date() } } });
    if (!stored) return res.status(401).json({ message: 'Ugyldig refresh-token.' });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.id } });
    const accessToken = await import('../services/authService.js').then(m => m.signAccessToken({ id: user.id, companyId: user.companyId, role: user.role, email: user.email }));
    res.json({ accessToken });
  } catch { res.status(401).json({ message: 'Sesjonen er utløpt.' }); }
});

authRouter.post('/forgot-password', async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + 60*60*1000) } });
    if (env.smtp.host) {
      const transport = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined });
      await transport.sendMail({ from: env.smtp.from, to: user.email, subject: 'Tilbakestill passord i TimeTrack', text: `Åpne denne lenken: ${env.appUrl}/reset-password?token=${token}` });
    }
  }
  res.json({ message: 'Hvis e-posten finnes, sender vi en lenke for passordtilbakestilling.' });
});

authRouter.post('/reset-password', async (req, res) => {
  const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
  const reset = await prisma.passwordResetToken.findFirst({ where: { tokenHash: tokenHash(token), usedAt: null, expiresAt: { gt: new Date() } } });
  if (!reset) return res.status(400).json({ message: 'Lenken er ugyldig eller utløpt.' });
  await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(password) } });
  await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
  res.json({ message: 'Passordet er oppdatert.' });
});
