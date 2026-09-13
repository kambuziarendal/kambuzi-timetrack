import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { audit, httpError } from "../utils/http.js";
import {
  clearSessionCookie,
  requireAuth,
  sessionCookie,
} from "../middleware/auth.js";
import { createSession } from "../services/sessions.js";
export const authRouter = Router();
const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const credentials = z.object({
  email: z.email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12).max(200),
});
authRouter.post("/login", limiter, async (req, res) => {
  const data = credentials.parse(req.body);
  const user = (
    await pool.query(
      "SELECT id,email,password_hash,first_name,last_name,role,is_active,must_change_password,demo_expires_at FROM users WHERE email=$1",
      [data.email],
    )
  ).rows[0];
  if (
    !user ||
    !user.is_active ||
    !(await bcrypt.compare(data.password, user.password_hash))
  )
    throw httpError(401, "Feil e-post eller passord.");
  const maximumAgeSeconds = user.demo_expires_at
    ? Math.floor((new Date(user.demo_expires_at).getTime() - Date.now()) / 1000)
    : undefined;
  if (maximumAgeSeconds !== undefined && maximumAgeSeconds <= 0)
    throw httpError(401, "Feil e-post eller passord.");
  const session = await withTransaction((client) =>
    createSession(client, user.id, maximumAgeSeconds),
  );
  res.setHeader("Set-Cookie", sessionCookie(session.token, session.maxAge));
  res.json({
    csrfToken: session.csrfToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      mustChangePassword: user.must_change_password,
      demoExpiresAt: user.demo_expires_at,
    },
  });
});
authRouter.get("/session", async (req, res) => {
  if (!req.user || !req.sessionId) return res.json({ user: null });
  const state = await pool.query(
    "SELECT must_change_password FROM users WHERE id=$1",
    [req.user.id],
  );
  res.json({
    csrfToken: req.csrfToken,
    user: {
      ...req.user,
      mustChangePassword: state.rows[0]?.must_change_password ?? false,
    },
  });
});
authRouter.post("/logout", requireAuth, async (req, res) => {
  await pool.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [
    req.sessionId,
  ]);
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(204).end();
});
authRouter.put("/password", requireAuth, async (req, res) => {
  const data = z
    .object({
      currentPassword: z.string().max(200),
      newPassword: z.string().min(12).max(200),
    })
    .parse(req.body);
  const current = await pool.query(
    "SELECT password_hash FROM users WHERE id=$1",
    [req.user!.id],
  );
  if (
    !(await bcrypt.compare(data.currentPassword, current.rows[0].password_hash))
  )
    throw httpError(400, "Nåværende passord er feil.");
  await withTransaction(async (client) => {
    await client.query(
      "UPDATE users SET password_hash=$1,must_change_password=false,updated_at=now() WHERE id=$2",
      [await bcrypt.hash(data.newPassword, 12), req.user!.id],
    );
    await client.query(
      "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2",
      [req.user!.id, req.sessionId],
    );
    await audit(client, req.user!.id, "password.changed", "user", req.user!.id);
  });
  res.json({ message: "Passordet er oppdatert." });
});
