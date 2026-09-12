import { Router } from "express";
import { z } from "zod";
import { pool, withTransaction, type DbClient } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { audit, httpError, id } from "../utils/http.js";
import { calculateEntry, todayInTimezone, validDate } from "../utils/time.js";
export const timeEntriesRouter = Router();
timeEntriesRouter.use(requireAuth);
const entryInput = z.object({
  userId: z.uuid().optional(),
  date: z.string(),
  start: z.string(),
  end: z.string(),
  breakMinutes: z.number().int().min(0).max(720).default(0),
  note: z.string().trim().max(200).nullable().optional(),
  version: z.number().int().positive().optional(),
});
const select = `SELECT t.id,t.user_id AS "userId",t.work_date::text AS date,t.start_minutes AS "startMinutes",t.end_minutes AS "endMinutes",t.crosses_midnight AS "crossesMidnight",t.break_minutes AS "breakMinutes",t.total_minutes AS "totalMinutes",t.note,t.status,t.rejection_note AS "rejectionNote",t.processed_at AS "processedAt",t.updated_at AS "updatedAt",t.version,u.first_name AS "firstName",u.last_name AS "lastName",p.name AS "positionName" FROM time_entries t JOIN users u ON u.id=t.user_id LEFT JOIN positions p ON p.id=u.position_id`;

async function timezone() {
  return (
    (
      await pool.query<{ timezone: string }>(
        "SELECT timezone FROM app_settings WHERE id=1",
      )
    ).rows[0]?.timezone ?? "Europe/Oslo"
  );
}
async function validateInput(
  client: DbClient,
  data: z.infer<typeof entryInput>,
  actor: { id: string; role: string },
  excludeId?: string,
) {
  if (!validDate(data.date)) throw httpError(400, "Ugyldig dato.");
  if (data.date > todayInTimezone(await timezone()))
    throw httpError(400, "Timer kan ikke føres fram i tid.");
  const calculated = calculateEntry(data.start, data.end, data.breakMinutes);
  const userId = actor.role === "ADMIN" && data.userId ? data.userId : actor.id;
  if (
    !(
      await client.query(
        "SELECT 1 FROM users WHERE id=$1 AND is_active=true FOR UPDATE",
        [userId],
      )
    ).rowCount
  )
    throw httpError(400, "Den ansatte finnes ikke eller er deaktivert.");
  const overlap = await client.query(
    `SELECT id FROM time_entries WHERE user_id=$1 AND id<>COALESCE($2::uuid,'00000000-0000-0000-0000-000000000000'::uuid) AND (work_date::timestamp + start_minutes*interval '1 minute') < ($3::date + $4::int*interval '1 minute' + CASE WHEN $5 THEN interval '1 day' ELSE interval '0' END) AND (work_date::timestamp + end_minutes*interval '1 minute' + CASE WHEN crosses_midnight THEN interval '1 day' ELSE interval '0' END) > ($3::date + $6::int*interval '1 minute')`,
    [
      userId,
      excludeId ?? null,
      data.date,
      calculated.endMinutes,
      calculated.crossesMidnight,
      calculated.startMinutes,
    ],
  );
  if (overlap.rowCount)
    throw httpError(409, "Denne vakten overlapper en eksisterende timeføring.");
  return { ...calculated, userId };
}

timeEntriesRouter.get("/", async (req, res) => {
  const schema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    userId: z.uuid().optional(),
    status: z
      .enum(["DRAFT", "SUBMITTED", "APPROVED", "LOCKED", "REJECTED"])
      .optional(),
    processed: z.enum(["yes", "no"]).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  });
  const q = schema.parse(req.query),
    admin = req.user!.role === "ADMIN",
    values: unknown[] = [];
  const where: string[] = [];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    where.push(sql.replace("?", `$${values.length}`));
  };
  if (!admin) add("t.user_id=?", req.user!.id);
  else if (q.userId) add("t.user_id=?", q.userId);
  if (q.from) {
    if (!validDate(q.from)) throw httpError(400, "Ugyldig fra-dato.");
    add("t.work_date>=?::date", q.from);
  }
  if (q.to) {
    if (!validDate(q.to)) throw httpError(400, "Ugyldig til-dato.");
    add("t.work_date<=?::date", q.to);
  }
  if (q.status) add("t.status=?", q.status);
  if (q.processed)
    where.push(
      q.processed === "yes"
        ? "t.processed_at IS NOT NULL"
        : "t.processed_at IS NULL",
    );
  values.push(q.limit, q.offset);
  const limitParameter = `$${values.length - 1}`;
  const offsetParameter = `$${values.length}`;
  res.json(
    (
      await pool.query(
        `${select}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY t.work_date DESC,t.start_minutes DESC LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
        values,
      )
    ).rows,
  );
});
timeEntriesRouter.post("/", async (req, res) => {
  const data = entryInput.parse(req.body);
  const entryId = id();
  await withTransaction(async (client) => {
    const v = await validateInput(client, data, req.user!);
    await client.query(
      `INSERT INTO time_entries(id,user_id,work_date,start_minutes,end_minutes,crosses_midnight,break_minutes,total_minutes,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        entryId,
        v.userId,
        data.date,
        v.startMinutes,
        v.endMinutes,
        v.crossesMidnight,
        data.breakMinutes,
        v.totalMinutes,
        data.note || null,
      ],
    );
    await audit(
      client,
      req.user!.id,
      "time_entry.created",
      "time_entry",
      entryId,
      {
        userId: v.userId,
        date: data.date,
        startMinutes: v.startMinutes,
        endMinutes: v.endMinutes,
        crossesMidnight: v.crossesMidnight,
        breakMinutes: data.breakMinutes,
        totalMinutes: v.totalMinutes,
      },
    );
  });
  res
    .status(201)
    .json((await pool.query(`${select} WHERE t.id=$1`, [entryId])).rows[0]);
});
timeEntriesRouter.put("/:id", async (req, res) => {
  const entryId = z.uuid().parse(req.params.id),
    data = entryInput.parse(req.body);
  await withTransaction(async (client) => {
    const current = (
      await client.query(
        "SELECT user_id,status,version,work_date::text AS date,start_minutes,end_minutes,crosses_midnight,break_minutes,total_minutes,note FROM time_entries WHERE id=$1 FOR UPDATE",
        [entryId],
      )
    ).rows[0];
    if (!current) throw httpError(404, "Timeføringen finnes ikke.");
    if (req.user!.role !== "ADMIN" && current.user_id !== req.user!.id)
      throw httpError(403, "Du har ikke tilgang til denne timeføringen.");
    if (
      current.status === "LOCKED" ||
      (req.user!.role !== "ADMIN" &&
        !["DRAFT", "REJECTED"].includes(current.status))
    )
      throw httpError(409, "Timeføringen kan ikke redigeres i denne statusen.");
    const v = await validateInput(
        client,
        {
          ...data,
          userId:
            req.user!.role === "ADMIN"
              ? (data.userId ?? current.user_id)
              : req.user!.id,
        },
        req.user!,
        entryId,
      ),
      version = data.version ?? current.version;
    const result = await client.query(
      `UPDATE time_entries SET user_id=$2,work_date=$3,start_minutes=$4,end_minutes=$5,crosses_midnight=$6,break_minutes=$7,total_minutes=$8,note=$9,status=CASE WHEN status='REJECTED' THEN 'DRAFT' ELSE status END,rejection_note=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND version=$10`,
      [
        entryId,
        v.userId,
        data.date,
        v.startMinutes,
        v.endMinutes,
        v.crossesMidnight,
        data.breakMinutes,
        v.totalMinutes,
        data.note || null,
        version,
      ],
    );
    if (!result.rowCount)
      throw httpError(
        409,
        "Timeføringen ble endret i en annen fane. Last siden på nytt.",
      );
    await audit(
      client,
      req.user!.id,
      "time_entry.updated",
      "time_entry",
      entryId,
      {
        before: {
          userId: current.user_id,
          date: current.date,
          startMinutes: current.start_minutes,
          endMinutes: current.end_minutes,
          crossesMidnight: current.crosses_midnight,
          breakMinutes: current.break_minutes,
          totalMinutes: current.total_minutes,
          status: current.status,
        },
        after: {
          userId: v.userId,
          date: data.date,
          startMinutes: v.startMinutes,
          endMinutes: v.endMinutes,
          crossesMidnight: v.crossesMidnight,
          breakMinutes: data.breakMinutes,
          totalMinutes: v.totalMinutes,
          status: current.status === "REJECTED" ? "DRAFT" : current.status,
        },
      },
    );
  });
  res.json((await pool.query(`${select} WHERE t.id=$1`, [entryId])).rows[0]);
});
timeEntriesRouter.delete("/:id", async (req, res) => {
  const entryId = z.uuid().parse(req.params.id);
  await withTransaction(async (client) => {
    const current = (
      await client.query(
        "SELECT user_id,status,work_date::text AS date,start_minutes,end_minutes,crosses_midnight,break_minutes,total_minutes FROM time_entries WHERE id=$1 FOR UPDATE",
        [entryId],
      )
    ).rows[0];
    if (!current) throw httpError(404, "Timeføringen finnes ikke.");
    if (req.user!.role !== "ADMIN" && current.user_id !== req.user!.id)
      throw httpError(403, "Du har ikke tilgang til denne timeføringen.");
    if (!["DRAFT", "REJECTED"].includes(current.status))
      throw httpError(
        409,
        "Bare utkast eller returnerte timer kan slettes. Send innsendte timer tilbake først.",
      );
    await audit(
      client,
      req.user!.id,
      "time_entry.deleted",
      "time_entry",
      entryId,
      {
        userId: current.user_id,
        status: current.status,
        date: current.date,
        startMinutes: current.start_minutes,
        endMinutes: current.end_minutes,
        crossesMidnight: current.crosses_midnight,
        breakMinutes: current.break_minutes,
        totalMinutes: current.total_minutes,
      },
    );
    await client.query("DELETE FROM time_entries WHERE id=$1", [entryId]);
  });
  res.status(204).end();
});
timeEntriesRouter.post("/:id/submit", async (req, res) => {
  const entryId = z.uuid().parse(req.params.id);
  await withTransaction(async (client) => {
    const result = await client.query(
      "UPDATE time_entries SET status='SUBMITTED',rejection_note=NULL,updated_at=now(),version=version+1 WHERE id=$1 AND user_id=$2 AND status IN ('DRAFT','REJECTED')",
      [entryId, req.user!.id],
    );
    if (!result.rowCount)
      throw httpError(
        409,
        "Bare egne utkast eller avviste timer kan sendes inn.",
      );
    await audit(
      client,
      req.user!.id,
      "time_entry.submitted",
      "time_entry",
      entryId,
    );
  });
  res.json((await pool.query(`${select} WHERE t.id=$1`, [entryId])).rows[0]);
});
