import dotenv from 'dotenv';
dotenv.config();
export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  appUrl: process.env.APP_URL ?? 'http://localhost:8081',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'Kambuzi Timeføring <noreply@example.no>'
  }
};
