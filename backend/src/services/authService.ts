import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db.js';
import { env } from '../env.js';
import type { Role } from '@prisma/client';

export type JwtUser = { id: string; companyId: string; role: Role; email: string };
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export function signAccessToken(user: JwtUser) { return jwt.sign(user, env.accessSecret, { expiresIn: '15m' }); }
export function signRefreshToken(user: JwtUser) { return jwt.sign({ id: user.id }, env.refreshSecret, { expiresIn: '7d' }); }
export function verifyAccessToken(token: string) { return jwt.verify(token, env.accessSecret) as JwtUser; }
export function verifyRefreshToken(token: string) { return jwt.verify(token, env.refreshSecret) as { id: string }; }
export function tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
export async function issueTokens(user: JwtUser) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  await prisma.refreshToken.create({ data: { userId: user.id, tokenHash: tokenHash(refreshToken), expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });
  return { accessToken, refreshToken };
}
