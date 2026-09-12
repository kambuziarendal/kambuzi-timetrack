import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
export const meRouter = Router();
meRouter.use(requireAuth);
meRouter.get("/", async (req, res) => {
  const result = await pool.query(
    `SELECT u.id,u.email,u.first_name AS "firstName",u.last_name AS "lastName",u.role,u.is_active AS "isActive",u.must_change_password AS "mustChangePassword",p.id AS "positionId",p.name AS "positionName" FROM users u LEFT JOIN positions p ON p.id=u.position_id WHERE u.id=$1`,
    [req.user!.id],
  );
  res.json(result.rows[0]);
});
