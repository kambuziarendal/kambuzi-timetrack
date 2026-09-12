import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { env } from "../env.js";
import { audit, httpError, id, secret } from "../utils/http.js";
import {
  clearSessionCookie,
  requireAuth,
  sessionCookie,
  tokenHash,
} from "../middleware/auth.js";
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
async function createSession(userId: string) {
  const token = secret(),
    csrfToken = secret(),
    maxAge = env.SESSION_DAYS * 86400;
  await pool.query(
    "DELETE FROM sessions WHERE expires_at<now() OR revoked_at IS NOT NULL",
  );
  await pool.query(
    "INSERT INTO sessions(id,user_id,token_hash,csrf_hash,expires_at) VALUES ($1,$2,$3,$4,now()+($5 || ' seconds')::interval)",
    [id(), userId, tokenHash(token), tokenHash(csrfToken), maxAge],
  );
  return { token, csrfToken, maxAge };
}
authRouter.post("/login", limiter, async (req, res) => {
  const data = credentials.parse(req.body);
  const user = (
    await pool.query(
      "SELECT id,email,password_hash,first_name,last_name,role,is_active,must_change_password FROM users WHERE email=$1",
      [data.email],
    )
  ).rows[0];
  if (
    !user ||
    !user.is_active ||
    !(await bcrypt.compare(data.password, user.password_hash))
  )
    throw httpError(401, "Feil e-post eller passord.");
  const session = await createSession(user.id);
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
    },
  });
});
authRouter.get("/session", async (req, res) => {
  if (!req.user || !req.sessionId) return res.json({ user: null });
  const csrfToken = secret();
  await pool.query("UPDATE sessions SET csrf_hash=$1 WHERE id=$2", [
    tokenHash(csrfToken),
    req.sessionId,
  ]);
  const state = await pool.query(
    "SELECT must_change_password FROM users WHERE id=$1",
    [req.user.id],
  );
  res.json({
    csrfToken,
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
