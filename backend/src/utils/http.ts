import crypto from "node:crypto";
import type { DbClient } from "../db.js";
export function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}
export function id() {
  return crypto.randomUUID();
}
export function secret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}
export async function audit(
  client: DbClient,
  actorUserId: string | null,
  action: string,
  subjectType: string,
  subjectId?: string,
  metadata: Record<string, unknown> = {},
) {
  await client.query(
    "INSERT INTO audit_events(id,actor_user_id,action,subject_type,subject_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)",
    [id(), actorUserId, action, subjectType, subjectId ?? null, metadata],
  );
}
