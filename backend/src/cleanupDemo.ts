import { closeDatabase } from "./db.js";
import { env } from "./env.js";
import { migrate } from "./migrate.js";
import { cleanupExpiredDemoUsers } from "./services/demoCleanup.js";

if (!env.DEMO_MODE) {
  console.error("Demoopprydding krever DEMO_MODE=true.");
  process.exitCode = 1;
} else {
  await migrate();
  const removed = await cleanupExpiredDemoUsers();
  console.log(`Slettet ${removed} utløpte demobrukere.`);
}

await closeDatabase();
