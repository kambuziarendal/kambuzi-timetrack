import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { pool } from "../db.js";
import { env } from "../env.js";

export type AppRole = "ADMIN" | "EMPLOYEE";
export type AppUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  isActive: boolean;
  demoExpiresAt?: Date | string | null;
};
declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
      sessionId?: string;
      csrfToken?: string;
    }
  }
}

function parseCookies(header = "") {
  const pairs = header.split(";").map((part) => part.trim().split("="));
  return Object.fromEntries(
    pairs
      .filter((parts) => parts.length === 2)
      .map(([key, value]) => [
        decodeURIComponent(key!),
        decodeURIComponent(value!),
      ]),
  );
}
export function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
export function csrfTokenFor(sessionToken: string) {
  return tokenHash(`csrf:${sessionToken}`);
}
export function sessionCookie(token: string, maxAgeSeconds: number) {
  return `${env.COOKIE_NAME}=${encodeURIComponent(token)}; Path=${env.COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${env.SECURE_COOKIES ? "; Secure" : ""}`;
}
export function clearSessionCookie() {
  return `${env.COOKIE_NAME}=; Path=${env.COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0${env.SECURE_COOKIES ? "; Secure" : ""}`;
}
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = parseCookies(req.headers.cookie)[env.COOKIE_NAME];
  if (!token) return next();
  const result = await pool.query<AppUser & { sessionId: string }>(
    `
    SELECT u.id, u.email, u.first_name AS "firstName", u.last_name AS "lastName",
           u.role, u.is_active AS "isActive", u.demo_expires_at AS "demoExpiresAt", s.id AS "sessionId"
      FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.is_active = true
       AND (u.demo_expires_at IS NULL OR u.demo_expires_at > now())
  `,
    [tokenHash(token)],
  );
  const row = result.rows[0];
  if (row) {
    req.sessionId = row.sessionId;
    req.csrfToken = csrfTokenFor(token);
    req.user = {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      isActive: row.isActive,
      demoExpiresAt: row.demoExpiresAt,
    };
  }
  next();
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Du må logge inn." });
  next();
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: "Du må logge inn." });
  if (req.user.role !== "ADMIN")
    return res.status(403).json({ message: "Du har ikke tilgang til dette." });
  next();
}
export async function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (
    ["GET", "HEAD", "OPTIONS"].includes(req.method) ||
    [
      "/api/auth/login",
      "/api/setup",
      "/api/demo/request",
      "/api/demo/redeem",
    ].includes(req.path)
  )
    return next();
  if (!req.sessionId)
    return res.status(401).json({ message: "Du må logge inn." });
  const supplied = req.header("x-csrf-token");
  if (!supplied)
    return res
      .status(403)
      .json({ message: "Sikkerhetskontrollen mangler. Last siden på nytt." });
  const expected = req.csrfToken;
  if (
    !expected ||
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  ) {
    return res
      .status(403)
      .json({ message: "Sikkerhetskontrollen er utløpt. Last siden på nytt." });
  }
  next();
}
