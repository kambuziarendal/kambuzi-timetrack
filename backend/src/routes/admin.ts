import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { audit, httpError, id, secret } from "../utils/http.js";
import { validDate } from "../utils/time.js";
export const adminRouter = Router();
adminRouter.use(requireAdmin);
const userSelect = `SELECT u.id,u.email,u.first_name AS "firstName",u.last_name AS "lastName",u.role,u.is_active AS "isActive",u.must_change_password AS "mustChangePassword",u.created_at AS "createdAt",p.id AS "positionId",p.name AS "positionName",p.color AS "positionColor" FROM users u LEFT JOIN positions p ON p.id=u.position_id`;

adminRouter.get("/overview", async (_req, res) => {
  const [users, pending, hours, auditRows] = await Promise.all([
    pool.query(
      "SELECT count(*)::int AS total,count(*) FILTER (WHERE is_active)::int AS active FROM users",
    ),
    pool.query(
      "SELECT count(*)::int AS count FROM time_entries WHERE status='SUBMITTED'",
    ),
    pool.query(
      "SELECT COALESCE(sum(total_minutes),0)::int AS minutes FROM time_entries WHERE work_date>=date_trunc('month',current_date)::date",
    ),
    pool.query(
      'SELECT id,action,subject_type AS "subjectType",created_at AS "createdAt" FROM audit_events ORDER BY created_at DESC LIMIT 8',
    ),
  ]);
  res.json({
    users: users.rows[0],
    pending: pending.rows[0].count,
    monthMinutes: hours.rows[0].minutes,
    recentActivity: auditRows.rows,
  });
});
adminRouter.get("/users", async (_req, res) =>
  res.json(
    (
      await pool.query(
        `${userSelect} ORDER BY u.is_active DESC,u.first_name,u.last_name`,
      )
    ).rows,
  ),
);
adminRouter.post("/users", async (req, res) => {
  const data = z
    .object({
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.email().transform((v) => v.trim().toLowerCase()),
      role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
      positionId: z.preprocess(
        (v) => (v === "" ? null : v),
        z.uuid().nullable().optional(),
      ),
    })
    .parse(req.body);
  const temporaryPassword = secret(18),
    userId = id();
  await withTransaction(async (client) => {
    if (
      data.positionId &&
      !(
        await client.query(
          "SELECT 1 FROM positions WHERE id=$1 AND is_active=true",
          [data.positionId],
        )
      ).rowCount
    )
      throw httpError(400, "Arbeidsrollen finnes ikke.");
    await client.query(
      "INSERT INTO users(id,email,password_hash,first_name,last_name,role,position_id,must_change_password) VALUES ($1,$2,$3,$4,$5,$6,$7,true)",
      [
        userId,
        data.email,
        await bcrypt.hash(temporaryPassword, 12),
        data.firstName,
        data.lastName,
        data.role,
        data.positionId || null,
      ],
    );
    await audit(client, req.user!.id, "user.created", "user", userId, {
      role: data.role,
    });
  });
  const user = (await pool.query(`${userSelect} WHERE u.id=$1`, [userId]))
    .rows[0];
  res.status(201).json({ user, temporaryPassword });
});
adminRouter.put("/users/:id", async (req, res) => {
  const userId = z.uuid().parse(req.params.id);
  const data = z
    .object({
      firstName: z.string().trim().min(1).max(80).optional(),
      lastName: z.string().trim().min(1).max(80).optional(),
      role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
      positionId: z.uuid().nullable().optional(),
      isActive: z.boolean().optional(),
    })
    .parse(req.body);
  await withTransaction(async (client) => {
    const target = (
      await client.query(
        "SELECT role,is_active FROM users WHERE id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    if (!target) throw httpError(404, "Ansatt finnes ikke.");
    if (
      target.role === "ADMIN" &&
      target.is_active &&
      (data.role === "EMPLOYEE" || data.isActive === false)
    ) {
      const admins = Number(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM users WHERE role='ADMIN' AND is_active=true",
          )
        ).rows[0].count,
      );
      if (admins <= 1)
        throw httpError(409, "Minst én aktiv administrator må beholdes.");
    }
    if (
      data.positionId &&
      !(
        await client.query(
          "SELECT 1 FROM positions WHERE id=$1 AND is_active=true",
          [data.positionId],
        )
      ).rowCount
    )
      throw httpError(400, "Arbeidsrollen finnes ikke.");
    await client.query(
      `UPDATE users SET first_name=COALESCE($2,first_name),last_name=COALESCE($3,last_name),role=COALESCE($4,role),position_id=CASE WHEN $5::boolean THEN $6::uuid ELSE position_id END,is_active=COALESCE($7,is_active),updated_at=now() WHERE id=$1`,
      [
        userId,
        data.firstName ?? null,
        data.lastName ?? null,
        data.role ?? null,
        Object.hasOwn(data, "positionId"),
        data.positionId ?? null,
        data.isActive ?? null,
      ],
    );
    if (data.isActive === false || data.role)
      await client.query(
        "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [userId],
      );
    await audit(client, req.user!.id, "user.updated", "user", userId, {
      fields: Object.keys(data),
    });
  });
  res.json((await pool.query(`${userSelect} WHERE u.id=$1`, [userId])).rows[0]);
});
adminRouter.post("/users/:id/reset-password", async (req, res) => {
  const userId = z.uuid().parse(req.params.id),
    temporaryPassword = secret(18);
  await withTransaction(async (client) => {
    if (
      !(await client.query("SELECT 1 FROM users WHERE id=$1", [userId]))
        .rowCount
    )
      throw httpError(404, "Ansatt finnes ikke.");
    await client.query(
      "UPDATE users SET password_hash=$1,must_change_password=true,updated_at=now() WHERE id=$2",
      [await bcrypt.hash(temporaryPassword, 12), userId],
    );
    await client.query(
      "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [userId],
    );
    await audit(client, req.user!.id, "user.password_reset", "user", userId);
  });
  res.json({ temporaryPassword });
});

adminRouter.get("/positions", async (_req, res) =>
  res.json(
    (
      await pool.query(
        'SELECT id,name,color,is_active AS "isActive" FROM positions ORDER BY is_active DESC,name',
      )
    ).rows,
  ),
);
adminRouter.post("/positions", async (req, res) => {
  const data = z
      .object({
        name: z.string().trim().min(1).max(80),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .default("#2563eb"),
      })
      .parse(req.body),
    positionId = id();
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO positions(id,name,color) VALUES ($1,$2,$3)",
      [positionId, data.name, data.color],
    );
    await audit(
      client,
      req.user!.id,
      "position.created",
      "position",
      positionId,
    );
  });
  res
    .status(201)
    .json(
      (
        await pool.query(
          'SELECT id,name,color,is_active AS "isActive" FROM positions WHERE id=$1',
          [positionId],
        )
      ).rows[0],
    );
});
adminRouter.put("/positions/:id", async (req, res) => {
  const positionId = z.uuid().parse(req.params.id),
    data = z
      .object({
        name: z.string().trim().min(1).max(80).optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE positions SET name=COALESCE($2,name),color=COALESCE($3,color),is_active=COALESCE($4,is_active) WHERE id=$1",
      [
        positionId,
        data.name ?? null,
        data.color ?? null,
        data.isActive ?? null,
      ],
    );
    if (!result.rowCount) throw httpError(404, "Arbeidsrollen finnes ikke.");
    await audit(
      client,
      req.user!.id,
      "position.updated",
      "position",
      positionId,
      { fields: Object.keys(data) },
    );
  });
  res.json(
    (
      await pool.query(
        'SELECT id,name,color,is_active AS "isActive" FROM positions WHERE id=$1',
        [positionId],
      )
    ).rows[0],
  );
});

adminRouter.get("/settings", async (_req, res) =>
  res.json(
    (
      await pool.query(
        'SELECT company_name AS "companyName",org_number AS "orgNumber",timezone,payroll_start_day AS "payrollStartDay" FROM app_settings WHERE id=1',
      )
    ).rows[0],
  ),
);
adminRouter.put("/settings", async (req, res) => {
  const data = z
    .object({
      companyName: z.string().trim().min(2).max(120),
      orgNumber: z.string().trim().max(20).nullable(),
      timezone: z.string().refine((v) => {
        try {
          Intl.DateTimeFormat("no", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
      payrollStartDay: z.number().int().min(1).max(28),
    })
    .parse(req.body);
  await withTransaction(async (client) => {
    await client.query(
      "UPDATE app_settings SET company_name=$1,org_number=$2,timezone=$3,payroll_start_day=$4 WHERE id=1",
      [
        data.companyName,
        data.orgNumber || null,
        data.timezone,
        data.payrollStartDay,
      ],
    );
    await audit(client, req.user!.id, "settings.updated", "settings", "1");
  });
  res.json(data);
});
adminRouter.post("/time-entries/:id/approve", async (req, res) => {
  const entryId = z.uuid().parse(req.params.id);
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE time_entries SET status='APPROVED',rejection_note=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND status='SUBMITTED'",
      [entryId],
    );
    if (!result.rowCount)
      throw httpError(409, "Bare innsendte timer kan godkjennes.");
    await audit(
      client,
      req.user!.id,
      "time_entry.approved",
      "time_entry",
      entryId,
    );
  });
  res.json({ ok: true });
});
adminRouter.post("/time-entries/:id/reject", async (req, res) => {
  const entryId = z.uuid().parse(req.params.id),
    data = z
      .object({ reason: z.string().trim().min(2).max(500) })
      .parse(req.body);
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE time_entries SET status='REJECTED',rejection_note=$2,updated_at=now(),version=version+1 WHERE id=$1 AND status='SUBMITTED'",
      [entryId, data.reason],
    );
    if (!result.rowCount)
      throw httpError(409, "Bare innsendte timer kan avvises.");
    await audit(
      client,
      req.user!.id,
      "time_entry.rejected",
      "time_entry",
      entryId,
    );
  });
  res.json({ ok: true });
});
adminRouter.post("/time-entries/lock-period", async (req, res) => {
  const data = z.object({ from: z.string(), to: z.string() }).parse(req.body);
  if (!validDate(data.from) || !validDate(data.to) || data.from > data.to)
    throw httpError(400, "Ugyldig låseperiode.");
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE time_entries SET status='LOCKED',updated_at=now(),version=version+1 WHERE work_date BETWEEN $1::date AND $2::date AND status='APPROVED'",
      [data.from, data.to],
    );
    await audit(
      client,
      req.user!.id,
      "time_entries.locked",
      "time_entry",
      undefined,
      { from: data.from, to: data.to, count: result.rowCount },
    );
    res.json({ locked: result.rowCount });
  });
});
adminRouter.post("/time-entries/processed", async (req, res) => {
  const data = z
    .object({ ids: z.array(z.uuid()).min(1).max(500), processed: z.boolean() })
    .parse(req.body);
  await withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE time_entries SET processed_at=CASE WHEN $2 THEN now() ELSE NULL END,updated_at=now(),version=version+1 WHERE id=ANY($1::uuid[]) AND status='LOCKED'`,
      [data.ids, data.processed],
    );
    await audit(
      client,
      req.user!.id,
      data.processed ? "time_entries.processed" : "time_entries.unprocessed",
      "time_entry",
      undefined,
      { count: result.rowCount },
    );
    res.json({ updated: result.rowCount });
  });
});
adminRouter.get("/data-export", async (_req, res) => {
  const [settings, users, positions, entries, auditRows] = await Promise.all([
    pool.query("SELECT * FROM app_settings"),
    pool.query(
      "SELECT id,email,first_name,last_name,role,position_id,is_active,created_at,updated_at FROM users",
    ),
    pool.query("SELECT * FROM positions"),
    pool.query("SELECT * FROM time_entries"),
    pool.query("SELECT * FROM audit_events ORDER BY created_at"),
  ]);
  res
    .attachment(
      `kambuzi-timeforing-data-${new Date().toISOString().slice(0, 10)}.json`,
    )
    .json({
      exportedAt: new Date().toISOString(),
      settings: settings.rows,
      users: users.rows,
      positions: positions.rows,
      timeEntries: entries.rows,
      auditEvents: auditRows.rows,
    });
});
adminRouter.post("/users/:id/anonymize", async (req, res) => {
  const userId = z.uuid().parse(req.params.id);
  z.object({ confirmation: z.literal("ANONYMISER") }).parse(req.body);
  if (userId === req.user!.id)
    throw httpError(409, "Du kan ikke anonymisere din egen konto.");
  await withTransaction(async (client) => {
    const target = (
      await client.query(
        "SELECT is_active,role FROM users WHERE id=$1 FOR UPDATE",
        [userId],
      )
    ).rows[0];
    if (!target) throw httpError(404, "Ansatt finnes ikke.");
    if (target.is_active)
      throw httpError(409, "Deaktiver kontoen før anonymisering.");
    await client.query(
      "UPDATE users SET email=$2,first_name='Tidligere',last_name='ansatt',password_hash=$3,position_id=NULL,must_change_password=true,updated_at=now() WHERE id=$1",
      [
        userId,
        `anonymisert-${userId}@invalid.local`,
        await bcrypt.hash(secret(32), 12),
      ],
    );
    await client.query(
      "UPDATE sessions SET revoked_at=now() WHERE user_id=$1",
      [userId],
    );
    await audit(client, req.user!.id, "user.anonymized", "user", userId);
  });
  res.json({ ok: true });
});
adminRouter.get("/audit", async (req, res) => {
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50)
    .parse(req.query.limit);
  res.json(
    (
      await pool.query(
        `SELECT a.id,a.action,a.subject_type AS "subjectType",a.subject_id AS "subjectId",a.metadata,a.created_at AS "createdAt",concat(u.first_name,' ',u.last_name) AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT $1`,
        [limit],
      )
    ).rows,
  );
});
