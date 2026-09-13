import { z } from "zod";

const bool = z.enum(["true", "false"]).transform((value) => value === "true");
const blankAsUndefined = (value: unknown) => (value === "" ? undefined : value);
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@127.0.0.1:5433/timetrack"),
  APP_URL: z.string().url().default("http://localhost:4000"),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
  SECURE_COOKIES: bool.default(false),
  COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .default("tt_session"),
  COOKIE_PATH: z
    .string()
    .regex(/^\/(?:[^;\s]*\/)?$/)
    .default("/"),
  SESSION_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  RELEASE_SHA: z.string().trim().min(1).max(128).default("development"),
  DEMO_MODE: bool.default(false),
  DEMO_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(24),
  DEMO_LOGIN_TOKEN_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(60)
    .default(20),
  DEMO_CLEANUP_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(60)
    .default(15),
  DEMO_MAX_ACTIVE_USERS: z.coerce.number().int().min(1).max(500).default(100),
  SMTP_HOST: z.preprocess(
    blankAsUndefined,
    z.string().trim().min(1).optional(),
  ),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: bool.default(false),
  SMTP_REQUIRE_TLS: bool.default(true),
  SMTP_USERNAME: z.preprocess(
    blankAsUndefined,
    z.string().trim().min(1).optional(),
  ),
  SMTP_PASSWORD: z.preprocess(
    blankAsUndefined,
    z.string().min(1).optional(),
  ),
  SMTP_FROM_EMAIL: z.preprocess(blankAsUndefined, z.email().optional()),
  SMTP_FROM_NAME: z.string().trim().min(1).max(100).default("Kambuzi Timeføring"),
}).superRefine((value, ctx) => {
  if (value.DEMO_MODE && (!value.SMTP_HOST || !value.SMTP_FROM_EMAIL)) {
    ctx.addIssue({
      code: "custom",
      path: ["DEMO_MODE"],
      message: "DEMO_MODE krever SMTP_HOST og SMTP_FROM_EMAIL.",
    });
  }
  if (Boolean(value.SMTP_USERNAME) !== Boolean(value.SMTP_PASSWORD)) {
    ctx.addIssue({
      code: "custom",
      path: ["SMTP_USERNAME"],
      message: "SMTP_USERNAME og SMTP_PASSWORD må settes sammen.",
    });
  }
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Ugyldig serverkonfigurasjon",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}
export const env = parsed.data;
