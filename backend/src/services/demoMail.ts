import nodemailer from "nodemailer";
import { env } from "../env.js";

export type DemoMail = {
  to: string;
  loginUrl: string;
  expiresAt: Date;
};

export const testDemoMailbox: DemoMail[] = [];

function createDemoTransport() {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL)
    throw new Error("Demo-e-post er ikke konfigurert.");
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: env.SMTP_REQUIRE_TLS,
    auth:
      env.SMTP_USERNAME && env.SMTP_PASSWORD
        ? { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD }
        : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function verifyDemoSmtp() {
  if (env.NODE_ENV === "test") return true;
  await createDemoTransport().verify();
  return true;
}

export async function sendDemoLoginEmail(mail: DemoMail) {
  if (env.NODE_ENV === "test") {
    testDemoMailbox.push(mail);
    return;
  }
  const transport = createDemoTransport();
  await transport.sendMail({
    from: {
      name: env.SMTP_FROM_NAME,
      address: env.SMTP_FROM_EMAIL,
    },
    to: mail.to,
    subject: "Din 24-timersdemo av Kambuzi Timeføring",
    text: [
      "Din private demo er klar.",
      "",
      `Åpne denne engangslenken innen ${env.DEMO_LOGIN_TOKEN_MINUTES} minutter:`,
      mail.loginUrl,
      "",
      `Tilgangen og dataene i demoen slettes automatisk ${mail.expiresAt.toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.`,
      "Ikke videresend lenken. Kambuzi sender aldri passord på e-post.",
    ].join("\n"),
  });
}
