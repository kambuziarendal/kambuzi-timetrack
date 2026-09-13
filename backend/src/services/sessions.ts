import type { DbClient } from "../db.js";
import { env } from "../env.js";
import { csrfTokenFor, tokenHash } from "../middleware/auth.js";
import { id, secret } from "../utils/http.js";

export async function createSession(
  client: DbClient,
  userId: string,
  maximumAgeSeconds = env.SESSION_DAYS * 86_400,
) {
  const token = secret();
  const csrfToken = csrfTokenFor(token);
  const maxAge = Math.max(
    1,
    Math.min(env.SESSION_DAYS * 86_400, Math.floor(maximumAgeSeconds)),
  );
  await client.query(
    "DELETE FROM sessions WHERE expires_at<now() OR revoked_at IS NOT NULL",
  );
  await client.query(
    "INSERT INTO sessions(id,user_id,token_hash,csrf_hash,expires_at) VALUES ($1,$2,$3,$4,now()+($5 || ' seconds')::interval)",
    [id(), userId, tokenHash(token), tokenHash(csrfToken), maxAge],
  );
  return { token, csrfToken, maxAge };
}
