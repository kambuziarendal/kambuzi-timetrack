import { closeDatabase } from "./db.js";
import { env } from "./env.js";
import { verifyDemoSmtp } from "./services/demoMail.js";

if (!env.DEMO_MODE) {
  console.error("SMTP-kontroll for demo krever DEMO_MODE=true.");
  process.exitCode = 1;
} else {
  try {
    await verifyDemoSmtp();
    console.log("SMTP-tilkobling, TLS og autentisering er verifisert.");
  } catch {
    console.error("SMTP-kontrollen feilet.");
    process.exitCode = 1;
  }
}

await closeDatabase();
