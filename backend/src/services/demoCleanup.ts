import { pool, withTransaction } from "../db.js";
import { env } from "../env.js";

export async function cleanupExpiredDemoUsers() {
  return withTransaction(async (client) => {
    const expired = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE demo_expires_at IS NOT NULL AND demo_expires_at<=now() FOR UPDATE",
    );
    const userIds = expired.rows.map((row) => row.id);
    await client.query(
      "DELETE FROM demo_login_tokens WHERE expires_at<=now() OR used_at IS NOT NULL AND used_at<now()-interval '1 day'",
    );
    if (!userIds.length) return 0;
    const entries = await client.query<{ id: string }>(
      "SELECT id FROM time_entries WHERE user_id=ANY($1::uuid[])",
      [userIds],
    );
    const entryIds = entries.rows.map((row) => row.id);
    await client.query(
      `DELETE FROM audit_events
        WHERE actor_user_id=ANY($1::uuid[])
           OR (subject_type='user' AND subject_id=ANY($2::text[]))
           OR (subject_type='time_entry' AND subject_id=ANY($3::text[]))`,
      [userIds, userIds, entryIds],
    );
    await client.query("DELETE FROM time_entries WHERE user_id=ANY($1::uuid[])", [
      userIds,
    ]);
    await client.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
    return userIds.length;
  });
}

export function startDemoCleanup() {
  if (!env.DEMO_MODE) return undefined;
  const run = () =>
    cleanupExpiredDemoUsers().catch(() =>
      console.error("Opprydding av utløpte demobrukere feilet."),
    );
  void run();
  const timer = setInterval(
    run,
    env.DEMO_CLEANUP_INTERVAL_MINUTES * 60_000,
  );
  timer.unref();
  return timer;
}
