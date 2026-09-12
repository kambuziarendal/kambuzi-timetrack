import { Router } from "express";
import { Parser } from "json2csv";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { httpError } from "../utils/http.js";
import { validDate } from "../utils/time.js";
export const reportsRouter = Router();
reportsRouter.use(requireAdmin);
const filters = z.object({
  from: z.string(),
  to: z.string(),
  userIds: z.string().optional(),
  positionId: z.uuid().optional(),
  status: z
    .enum(["DRAFT", "SUBMITTED", "APPROVED", "LOCKED", "REJECTED"])
    .optional(),
  processed: z.enum(["all", "yes", "no"]).default("all"),
});
async function rowsFor(raw: unknown) {
  const q = filters.parse(raw);
  if (!validDate(q.from) || !validDate(q.to) || q.from > q.to)
    throw httpError(400, "Ugyldig rapportperiode.");
  const values: unknown[] = [q.from, q.to],
    where = [`t.work_date BETWEEN $1::date AND $2::date`];
  if (q.userIds) {
    const ids = q.userIds
      .split(",")
      .filter(Boolean)
      .map((v) => z.uuid().parse(v));
    values.push(ids);
    where.push(`t.user_id=ANY($${values.length}::uuid[])`);
  }
  if (q.positionId) {
    values.push(q.positionId);
    where.push(`u.position_id=$${values.length}`);
  }
  if (q.status) {
    values.push(q.status);
    where.push(`t.status=$${values.length}`);
  }
  if (q.processed !== "all")
    where.push(
      q.processed === "yes"
        ? "t.processed_at IS NOT NULL"
        : "t.processed_at IS NULL",
    );
  return (
    await pool.query(
      `SELECT t.id,t.work_date::text AS date,u.first_name AS "firstName",u.last_name AS "lastName",COALESCE(p.name,'') AS position,lpad((t.start_minutes/60)::text,2,'0')||':'||lpad((t.start_minutes%60)::text,2,'0') AS start,lpad((t.end_minutes/60)::text,2,'0')||':'||lpad((t.end_minutes%60)::text,2,'0') AS "end",t.break_minutes AS "breakMinutes",t.total_minutes AS "totalMinutes",t.status,t.note,t.processed_at AS "processedAt" FROM time_entries t JOIN users u ON u.id=t.user_id LEFT JOIN positions p ON p.id=u.position_id WHERE ${where.join(" AND ")} ORDER BY u.first_name,u.last_name,t.work_date,t.start_minutes`,
      values,
    )
  ).rows;
}
reportsRouter.get("/", async (req, res) => {
  const rows = await rowsFor(req.query);
  res.json({
    rows,
    totalMinutes: rows.reduce((sum, row) => sum + row.totalMinutes, 0),
  });
});
reportsRouter.get("/csv", async (req, res) => {
  const rows = await rowsFor(req.query);
  const csv = new Parser({
    fields: [
      "date",
      "firstName",
      "lastName",
      "position",
      "start",
      "end",
      "breakMinutes",
      "totalMinutes",
      "status",
      "note",
      "processedAt",
    ],
    withBOM: true,
  }).parse(rows);
  res
    .type("text/csv")
    .attachment(
      `timeforing-${String(req.query.from)}-${String(req.query.to)}.csv`,
    )
    .send(csv);
});
reportsRouter.get("/pdf", async (req, res) => {
  const rows = await rowsFor(req.query),
    settings = (
      await pool.query("SELECT company_name FROM app_settings WHERE id=1")
    ).rows[0];
  res
    .type("application/pdf")
    .attachment(
      `timeforing-${String(req.query.from)}-${String(req.query.to)}.pdf`,
    );
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).text(`${settings.company_name} – timeføringsrapport`);
  doc.fontSize(10).text(`${req.query.from} til ${req.query.to}`).moveDown();
  for (const row of rows)
    doc.text(
      `${row.date}  ${row.firstName} ${row.lastName}  ${row.start}–${row.end}  ${(row.totalMinutes / 60).toFixed(2)} t  ${row.status}`,
    );
  doc
    .moveDown()
    .fontSize(12)
    .text(
      `Totalt: ${(rows.reduce((s, r) => s + r.totalMinutes, 0) / 60).toFixed(2)} timer`,
    );
  doc.end();
});
