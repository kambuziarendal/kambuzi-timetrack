import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, withTransaction } from "../db.js";
import { audit, httpError, id } from "../utils/http.js";
export const setupRouter = Router();
const limiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
setupRouter.get("/status", async (_req, res) =>
  res.json({
    required:
      Number(
        (await pool.query("SELECT count(*)::int AS count FROM app_settings"))
          .rows[0].count,
      ) === 0,
  }),
);
setupRouter.post("/", limiter, async (req, res) => {
  const data = z
    .object({
      companyName: z.string().trim().min(2).max(120),
      orgNumber: z.string().trim().max(20).optional(),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.email().transform((v) => v.trim().toLowerCase()),
      password: z.string().min(12).max(200),
    })
    .parse(req.body);
  const userId = id();
  await withTransaction(async (client) => {
    if (
      Number(
        (await client.query("SELECT count(*)::int AS count FROM app_settings"))
          .rows[0].count,
      ) !== 0
    )
      throw httpError(409, "Oppsettet er allerede fullført.");
    await client.query(
      "INSERT INTO app_settings(company_name,org_number) VALUES ($1,$2)",
      [data.companyName, data.orgNumber || null],
    );
    const positionId = id();
    await client.query(
      "INSERT INTO positions(id,name,color) VALUES ($1,$2,$3)",
      [positionId, "Ansatt", "#2563eb"],
    );
    await client.query(
      "INSERT INTO users(id,email,password_hash,first_name,last_name,role) VALUES ($1,$2,$3,$4,$5,'ADMIN')",
      [
        userId,
        data.email,
        await bcrypt.hash(data.password, 12),
        data.firstName,
        data.lastName,
      ],
    );
    await audit(client, userId, "installation.created", "settings", "1");
  });
  res.status(201).json({ message: "Oppsettet er fullført. Du kan logge inn." });
});
