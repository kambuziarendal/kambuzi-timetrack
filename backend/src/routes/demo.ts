import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { env } from "../env.js";
import { sessionCookie, tokenHash } from "../middleware/auth.js";
import { cleanupExpiredDemoUsers } from "../services/demoCleanup.js";
import { sendDemoLoginEmail } from "../services/demoMail.js";
import { createSession } from "../services/sessions.js";
import { audit, httpError, id, secret } from "../utils/http.js";

export const demoRouter = Router();
const requestLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
});
const redeemLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const requestSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  accepted: z.literal(true),
  website: z.string().max(0).optional(),
});

demoRouter.get("/status", (_req, res) =>
  res.json({
    enabled: env.DEMO_MODE,
    durationHours: env.DEMO_TTL_HOURS,
    loginTokenMinutes: env.DEMO_LOGIN_TOKEN_MINUTES,
  }),
);

demoRouter.post("/request", requestLimiter, async (req, res) => {
  if (!env.DEMO_MODE) throw httpError(404, "Demo er ikke aktivert.");
  const data = requestSchema.parse(req.body);
  await cleanupExpiredDemoUsers();
  if (
    Number(
      (await pool.query("SELECT count(*)::int AS count FROM app_settings"))
        .rows[0].count,
    ) === 0
  )
    throw httpError(503, "Demoen er ikke ferdig satt opp.");
  const rawToken = secret();
  const passwordHash = await bcrypt.hash(secret(32), 12);
  const result = await withTransaction(async (client) => {
    await client.query("SELECT id FROM app_settings WHERE id=1 FOR UPDATE");
    const activeCount = Number(
      (
        await client.query(
          "SELECT count(*)::int AS count FROM users WHERE demo_expires_at>now()",
        )
      ).rows[0].count,
    );
    let user = (
      await client.query<{
        id: string;
        demo_expires_at: Date | string | null;
      }>("SELECT id,demo_expires_at FROM users WHERE email=$1 FOR UPDATE", [
        data.email,
      ])
    ).rows[0];
    if (!user) {
      if (activeCount >= env.DEMO_MAX_ACTIVE_USERS)
        throw httpError(503, "Demoen er full akkurat nå. Prøv igjen senere.");
      const userId = id();
      const expiresAt = new Date(Date.now() + env.DEMO_TTL_HOURS * 3_600_000);
      await client.query(
        `INSERT INTO users(id,email,password_hash,first_name,last_name,role,must_change_password,demo_expires_at)
         VALUES ($1,$2,$3,$4,'','EMPLOYEE',false,$5)`,
        [userId, data.email, passwordHash, data.name, expiresAt],
      );
      user = { id: userId, demo_expires_at: expiresAt };
    }
    if (!user.demo_expires_at) return null;
    const expiresAt = new Date(user.demo_expires_at);
    if (expiresAt.getTime() <= Date.now()) return null;
    const recent = await client.query(
      "SELECT 1 FROM demo_login_tokens WHERE user_id=$1 AND used_at IS NULL AND created_at>now()-interval '2 minutes'",
      [user.id],
    );
    if (recent.rowCount) return null;
    await client.query(
      "UPDATE demo_login_tokens SET used_at=COALESCE(used_at,now()) WHERE user_id=$1 AND used_at IS NULL",
      [user.id],
    );
    await client.query(
      "INSERT INTO demo_login_tokens(id,user_id,token_hash,expires_at) VALUES ($1,$2,$3,now()+($4 || ' minutes')::interval)",
      [id(), user.id, tokenHash(rawToken), env.DEMO_LOGIN_TOKEN_MINUTES],
    );
    await audit(client, user.id, "demo.access_requested", "user", user.id);
    return { userId: user.id, expiresAt };
  });
  if (result) {
    const loginUrl = new URL(env.APP_URL);
    loginUrl.hash = new URLSearchParams({ demo_token: rawToken }).toString();
    try {
      await sendDemoLoginEmail({
        to: data.email,
        loginUrl: loginUrl.toString(),
        expiresAt: result.expiresAt,
      });
    } catch {
      await pool.query(
        "UPDATE demo_login_tokens SET used_at=now() WHERE user_id=$1 AND token_hash=$2",
        [result.userId, tokenHash(rawToken)],
      );
      throw httpError(503, "E-posten kunne ikke sendes. Prøv igjen senere.");
    }
  }
  res.status(202).json({
    message:
      "Hvis adressen kan brukes, får du en engangslenke på e-post. Sjekk også søppelpost.",
  });
});

demoRouter.post("/redeem", redeemLimiter, async (req, res) => {
  if (!env.DEMO_MODE) throw httpError(404, "Demo er ikke aktivert.");
  const { token } = z
    .object({ token: z.string().min(32).max(200) })
    .parse(req.body);
  const result = await withTransaction(async (client) => {
    const row = (
      await client.query<{
        token_id: string;
        user_id: string;
        email: string;
        first_name: string;
        last_name: string;
        role: "EMPLOYEE";
        demo_expires_at: Date | string;
      }>(
        `SELECT t.id AS token_id,u.id AS user_id,u.email,u.first_name,u.last_name,u.role,u.demo_expires_at
           FROM demo_login_tokens t JOIN users u ON u.id=t.user_id
          WHERE t.token_hash=$1 AND t.used_at IS NULL AND t.expires_at>now()
            AND u.is_active=true AND u.demo_expires_at>now()
          FOR UPDATE OF t,u`,
        [tokenHash(token)],
      )
    ).rows[0];
    if (!row) throw httpError(401, "Lenken er brukt eller utløpt.");
    await client.query(
      "UPDATE demo_login_tokens SET used_at=now() WHERE id=$1",
      [row.token_id],
    );
    const remainingSeconds = Math.max(
      1,
      Math.floor((new Date(row.demo_expires_at).getTime() - Date.now()) / 1000),
    );
    const session = await createSession(client, row.user_id, remainingSeconds);
    await audit(
      client,
      row.user_id,
      "demo.access_redeemed",
      "user",
      row.user_id,
    );
    return { row, session };
  });
  res.setHeader(
    "Set-Cookie",
    sessionCookie(result.session.token, result.session.maxAge),
  );
  res.json({
    csrfToken: result.session.csrfToken,
    user: {
      id: result.row.user_id,
      email: result.row.email,
      firstName: result.row.first_name,
      lastName: result.row.last_name,
      role: result.row.role,
      mustChangePassword: false,
      demoExpiresAt: result.row.demo_expires_at,
    },
  });
});
