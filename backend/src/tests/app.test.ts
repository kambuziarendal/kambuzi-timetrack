import { beforeAll, afterAll, describe, expect, it } from "vitest";
import supertest from "supertest";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "pglite://memory";
process.env.SECURE_COOKIES = "false";
process.env.APP_URL = "http://localhost:4000/timetest/";
process.env.DEMO_MODE = "true";
process.env.SMTP_HOST = "smtp.example.test";
process.env.SMTP_FROM_EMAIL = "timeforing@example.test";

let app: typeof import("../app.js").app;
let closeDatabase: typeof import("../db.js").closeDatabase;
let migrate: typeof import("../migrate.js").migrate;
let pool: typeof import("../db.js").pool;
let cleanupExpiredDemoUsers: typeof import("../services/demoCleanup.js").cleanupExpiredDemoUsers;
let testDemoMailbox: typeof import("../services/demoMail.js").testDemoMailbox;
let admin = supertest.agent("http://127.0.0.1");
let employee = supertest.agent("http://127.0.0.1");
let adminCsrf = "";
let employeeCsrf = "";
let employeeId = "";
let temporaryPassword = "";
let entryId = "";
const mutation = (
  agent: typeof admin,
  csrf: string,
  method: "post" | "put" | "delete",
  path: string,
) => agent[method](path).set("x-csrf-token", csrf);

beforeAll(async () => {
  ({ app } = await import("../app.js"));
  ({ closeDatabase } = await import("../db.js"));
  ({ pool } = await import("../db.js"));
  ({ migrate } = await import("../migrate.js"));
  ({ cleanupExpiredDemoUsers } = await import("../services/demoCleanup.js"));
  ({ testDemoMailbox } = await import("../services/demoMail.js"));
  await migrate();
  await migrate();
  admin = supertest.agent(app);
  employee = supertest.agent(app);
});
afterAll(async () => closeDatabase());

describe("selvhostet Timeføring API", () => {
  it("starter uten oppsett og fullfører oppsett bare én gang", async () => {
    expect((await supertest(app).get("/api/setup/status")).body.required).toBe(
      true,
    );
    await supertest(app)
      .post("/api/setup")
      .send({
        companyName: "Testbedrift",
        orgNumber: "999999999",
        firstName: "Ada",
        lastName: "Admin",
        email: "admin@example.test",
        password: "et langt testpassord 2026",
      })
      .expect(201);
    await supertest(app)
      .post("/api/setup")
      .send({
        companyName: "Annen",
        firstName: "A",
        lastName: "B",
        email: "a@b.test",
        password: "et annet langt passord",
      })
      .expect(409);
  });
  it("krever sikker innlogging og CSRF på alle mutasjoner", async () => {
    await admin
      .post("/api/auth/login")
      .set("origin", "https://angriper.example")
      .send({
        email: "admin@example.test",
        password: "et langt testpassord 2026",
      })
      .expect(403);
    await admin
      .post("/api/auth/login")
      .send({ email: "admin@example.test", password: "feil feil feil" })
      .expect(401);
    const login = await admin
      .post("/api/auth/login")
      .send({
        email: "admin@example.test",
        password: "et langt testpassord 2026",
      })
      .expect(200);
    adminCsrf = login.body.csrfToken;
    const firstSession = await admin.get("/api/auth/session").expect(200);
    const secondSession = await admin.get("/api/auth/session").expect(200);
    expect(firstSession.body.csrfToken).toBe(adminCsrf);
    expect(secondSession.body.csrfToken).toBe(adminCsrf);
    const cookie = login.headers["set-cookie"]?.[0] ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    await admin
      .post("/api/admin/users")
      .send({ firstName: "Uten", lastName: "Csrf", email: "csrf@example.test" })
      .expect(403);
  });
  it("gir isolert demo via engangslenke og sletter alle data etter 24 timer", async () => {
    const status = await supertest(app).get("/api/demo/status").expect(200);
    expect(status.body).toMatchObject({ enabled: true, durationHours: 24 });

    await supertest(app)
      .post("/api/demo/request")
      .send({
        name: "Demo Nora",
        email: "demo-nora@example.test",
        accepted: true,
        website: "",
      })
      .expect(202);
    expect(testDemoMailbox).toHaveLength(1);
    const loginUrl = new URL(testDemoMailbox[0]!.loginUrl);
    expect(loginUrl.pathname).toBe("/timetest/");
    const token = new URLSearchParams(loginUrl.hash.slice(1)).get("demo_token");
    expect(token).toBeTruthy();
    const storedToken = await pool.query<{ token_hash: string }>(
      "SELECT token_hash FROM demo_login_tokens WHERE user_id=(SELECT id FROM users WHERE email=$1)",
      ["demo-nora@example.test"],
    );
    expect(storedToken.rows[0]?.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedToken.rows[0]?.token_hash).not.toBe(token);

    const demo = supertest.agent(app);
    const redeemed = await demo
      .post("/api/demo/redeem")
      .send({ token })
      .expect(200);
    expect(redeemed.body.user).toMatchObject({
      email: "demo-nora@example.test",
      role: "EMPLOYEE",
      mustChangePassword: false,
    });
    expect(redeemed.body.user.demoExpiresAt).toBeTruthy();
    const demoSession = await pool.query<{ expires_at: Date | string }>(
      `SELECT s.expires_at FROM sessions s
        JOIN users u ON u.id=s.user_id
       WHERE u.email=$1 AND s.revoked_at IS NULL`,
      ["demo-nora@example.test"],
    );
    expect(
      new Date(demoSession.rows[0]!.expires_at).getTime(),
    ).toBeLessThanOrEqual(new Date(redeemed.body.user.demoExpiresAt).getTime());
    await supertest(app).post("/api/demo/redeem").send({ token }).expect(401);

    const csrf = redeemed.body.csrfToken as string;
    await demo.get("/api/admin/users").expect(403);
    await demo
      .get("/api/reports?from=2026-09-01&to=2026-09-30")
      .expect(403);
    const created = await mutation(demo, csrf, "post", "/api/time-entries")
      .send({
        date: new Date().toLocaleDateString("en-CA", {
          timeZone: "Europe/Oslo",
        }),
        start: "09:00",
        end: "15:00",
        breakMinutes: 30,
        note: "Min private demovakt",
      })
      .expect(201);

    await supertest(app)
      .post("/api/demo/request")
      .send({
        name: "Demo Omar",
        email: "demo-omar@example.test",
        accepted: true,
        website: "",
      })
      .expect(202);
    const secondToken = new URLSearchParams(
      new URL(testDemoMailbox[1]!.loginUrl).hash.slice(1),
    ).get("demo_token");
    const otherDemo = supertest.agent(app);
    await otherDemo
      .post("/api/demo/redeem")
      .send({ token: secondToken })
      .expect(200);
    const otherRows = await otherDemo.get("/api/time-entries").expect(200);
    expect(otherRows.body).toEqual([]);

    await pool.query(
      "UPDATE users SET demo_expires_at=now()-interval '1 minute' WHERE email=$1",
      ["demo-nora@example.test"],
    );
    expect(await cleanupExpiredDemoUsers()).toBe(1);
    expect(
      Number(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM users WHERE email=$1",
            ["demo-nora@example.test"],
          )
        ).rows[0].count,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await pool.query(
            "SELECT count(*)::int AS count FROM time_entries WHERE id=$1",
            [created.body.id],
          )
        ).rows[0].count,
      ),
    ).toBe(0);
    await demo.get("/api/me").expect(401);
  });
  it("returnerer bare nødvendige brukerfelt og lager et unikt startpassord", async () => {
    const created = await mutation(admin, adminCsrf, "post", "/api/admin/users")
      .send({
        firstName: "Eli",
        lastName: "Ansatt",
        email: "eli@example.test",
        role: "EMPLOYEE",
      })
      .expect(201);
    employeeId = created.body.user.id;
    temporaryPassword = created.body.temporaryPassword;
    expect(temporaryPassword.length).toBeGreaterThan(20);
    const users = await admin.get("/api/admin/users").expect(200);
    expect(JSON.stringify(users.body)).not.toMatch(
      /passwordHash|password_hash|tokenHash|token_hash|csrf/i,
    );
    const login = await employee
      .post("/api/auth/login")
      .send({ email: "eli@example.test", password: temporaryPassword })
      .expect(200);
    employeeCsrf = login.body.csrfToken;
    expect(login.body.user.mustChangePassword).toBe(true);
    const me = await employee.get("/api/me").expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(
      /passwordHash|password_hash|tokenHash|token_hash|csrf/i,
    );
  });
  it("validerer og sender inn en egen timeføring", async () => {
    const created = await mutation(
      employee,
      employeeCsrf,
      "post",
      "/api/time-entries",
    )
      .send({
        date: "2026-09-10",
        start: "16:00",
        end: "23:00",
        breakMinutes: 0,
        note: "Kveld",
      })
      .expect(201);
    entryId = created.body.id;
    expect(created.body.totalMinutes).toBe(420);
    await mutation(employee, employeeCsrf, "post", "/api/time-entries")
      .send({
        date: "2026-09-10",
        start: "20:00",
        end: "23:30",
        breakMinutes: 0,
      })
      .expect(409);
    await mutation(
      employee,
      employeeCsrf,
      "post",
      `/api/time-entries/${entryId}/submit`,
    ).expect(200);
    await mutation(
      employee,
      employeeCsrf,
      "put",
      `/api/time-entries/${entryId}`,
    )
      .send({
        date: "2026-09-10",
        start: "16:00",
        end: "22:00",
        breakMinutes: 0,
        version: 2,
      })
      .expect(409);
  });
  it("håndhever godkjenning og låsing som statsmaskin", async () => {
    const submitted = await mutation(
      employee,
      employeeCsrf,
      "post",
      "/api/time-entries",
    )
      .send({
        date: "2026-08-08",
        start: "10:00",
        end: "12:00",
        breakMinutes: 0,
      })
      .expect(201);
    await mutation(
      employee,
      employeeCsrf,
      "post",
      `/api/time-entries/${submitted.body.id}/submit`,
    ).expect(200);
    await mutation(
      admin,
      adminCsrf,
      "delete",
      `/api/time-entries/${submitted.body.id}`,
    ).expect(409);
    await mutation(
      admin,
      adminCsrf,
      "post",
      `/api/admin/time-entries/${entryId}/approve`,
    ).expect(200);
    await mutation(
      admin,
      adminCsrf,
      "post",
      `/api/admin/time-entries/${entryId}/approve`,
    ).expect(409);
    const locked = await mutation(
      admin,
      adminCsrf,
      "post",
      "/api/admin/time-entries/lock-period",
    )
      .send({ from: "2026-09-01", to: "2026-09-30" })
      .expect(200);
    expect(locked.body.locked).toBe(1);
    await mutation(admin, adminCsrf, "put", `/api/time-entries/${entryId}`)
      .send({
        userId: employeeId,
        date: "2026-09-10",
        start: "16:00",
        end: "22:00",
        breakMinutes: 0,
        version: 3,
      })
      .expect(409);
  });
  it("bruker samme filtre i rapport, CSV og PDF", async () => {
    await admin.get("/api/reports?from=2025-01-01&to=2026-09-30").expect(400);
    const report = await admin
      .get("/api/reports?from=2026-09-01&to=2026-09-30&userIds=" + employeeId)
      .expect(200);
    expect(report.body.rows).toHaveLength(1);
    expect(report.body.totalMinutes).toBe(420);
    const csv = await admin
      .get(
        "/api/reports/csv?from=2026-09-01&to=2026-09-30&userIds=" + employeeId,
      )
      .expect(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.text).toContain("Eli");
    const pdf = await admin
      .get(
        "/api/reports/pdf?from=2026-09-01&to=2026-09-30&userIds=" + employeeId,
      )
      .expect(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
  });
  it("markerer bare låste registreringer som lønnsbehandlet", async () => {
    const processed = await mutation(
      admin,
      adminCsrf,
      "post",
      "/api/admin/time-entries/processed",
    )
      .send({ ids: [entryId], processed: true })
      .expect(200);
    expect(processed.body.updated).toBe(1);
    const report = await admin
      .get(
        `/api/reports?from=2026-09-01&to=2026-09-30&userIds=${employeeId}&processed=yes`,
      )
      .expect(200);
    expect(report.body.rows).toHaveLength(1);
    expect(report.body.rows[0].processedAt).toBeTruthy();
  });
  it("håndhever datogrenser, vaktlengde og midnattskryssing", async () => {
    await mutation(employee, employeeCsrf, "post", "/api/time-entries")
      .send({
        date: "2099-01-01",
        start: "09:00",
        end: "10:00",
        breakMinutes: 0,
      })
      .expect(400);
    await mutation(employee, employeeCsrf, "post", "/api/time-entries")
      .send({
        date: "2026-09-09",
        start: "08:00",
        end: "04:00",
        breakMinutes: 0,
      })
      .expect(400);
    const overnight = await mutation(
      employee,
      employeeCsrf,
      "post",
      "/api/time-entries",
    )
      .send({
        date: "2026-09-09",
        start: "22:00",
        end: "02:00",
        breakMinutes: 30,
      })
      .expect(201);
    expect(overnight.body).toMatchObject({
      crossesMidnight: true,
      totalMinutes: 210,
    });
  });
  it("hindrer ansatte i adminflater og andre ansattes registreringer", async () => {
    await employee.get("/api/admin/users").expect(403);
    const other = await mutation(admin, adminCsrf, "post", "/api/admin/users")
      .send({
        firstName: "Ola",
        lastName: "Annen",
        email: "ola@example.test",
        role: "EMPLOYEE",
      })
      .expect(201);
    const otherEntry = await mutation(
      admin,
      adminCsrf,
      "post",
      "/api/time-entries",
    )
      .send({
        userId: other.body.user.id,
        date: "2026-09-08",
        start: "09:00",
        end: "12:00",
        breakMinutes: 0,
      })
      .expect(201);
    await mutation(
      employee,
      employeeCsrf,
      "put",
      `/api/time-entries/${otherEntry.body.id}`,
    )
      .send({
        date: "2026-09-08",
        start: "09:00",
        end: "11:00",
        breakMinutes: 0,
        version: 1,
      })
      .expect(403);
    const ownRows = await employee.get("/api/time-entries").expect(200);
    expect(
      ownRows.body.every(
        (row: { userId: string }) => row.userId === employeeId,
      ),
    ).toBe(true);
    expect(
      (await employee.get("/api/time-entries?limit=1").expect(200)).body,
    ).toHaveLength(1);
    await employee.get("/api/time-entries?limit=501").expect(400);
  });
  it("bevarer minst én aktiv administrator", async () => {
    const adminId = (await admin.get("/api/me").expect(200)).body.id;
    await mutation(admin, adminCsrf, "put", `/api/admin/users/${adminId}`)
      .send({ isActive: false })
      .expect(409);
    await mutation(admin, adminCsrf, "put", `/api/admin/users/${adminId}`)
      .send({ role: "EMPLOYEE" })
      .expect(409);
  });
  it("arbeidsroller kan opprettes og skjules uten å miste historikk", async () => {
    const created = await mutation(
      admin,
      adminCsrf,
      "post",
      "/api/admin/positions",
    )
      .send({ name: "Kjøkken", color: "#185c45" })
      .expect(201);
    const hidden = await mutation(
      admin,
      adminCsrf,
      "put",
      `/api/admin/positions/${created.body.id}`,
    )
      .send({ isActive: false })
      .expect(200);
    expect(hidden.body.isActive).toBe(false);
  });
  it("avviser ugyldig tidssone og bevarer auditspor", async () => {
    await mutation(admin, adminCsrf, "put", "/api/admin/settings")
      .send({
        companyName: "Testbedrift",
        orgNumber: null,
        timezone: "Mars/Base",
        payrollStartDay: 1,
      })
      .expect(400);
    const audit = await admin.get("/api/admin/audit").expect(200);
    expect(audit.body.map((event: any) => event.action)).toEqual(
      expect.arrayContaining([
        "installation.created",
        "user.created",
        "time_entry.created",
        "time_entry.submitted",
        "time_entry.approved",
        "time_entries.locked",
      ]),
    );
    const created = audit.body.find(
      (event: any) =>
        event.action === "time_entry.created" && event.subjectId === entryId,
    );
    expect(created.metadata).toMatchObject({
      userId: employeeId,
      date: "2026-09-10",
      totalMinutes: 420,
    });
  });
  it("deaktivering stopper eksisterende økt umiddelbart", async () => {
    await mutation(admin, adminCsrf, "put", `/api/admin/users/${employeeId}`)
      .send({ isActive: false })
      .expect(200);
    await employee.get("/api/me").expect(401);
  });
  it("API-svar med persondata blir aldri cachet", async () => {
    const response = await admin.get("/api/admin/users").expect(200);
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("readiness og versjon viser migrasjon og eksakt release", async () => {
    const ready = await supertest(app).get("/health/ready").expect(200);
    expect(ready.body).toMatchObject({
      ok: true,
      database: "ok",
      migration: "003_demo_access.sql",
      setupRequired: false,
      version: "1.0.0-beta.5",
      release: "development",
    });
    await supertest(app).get("/version").expect(200, {
      name: "Kambuzi Timeføring",
      version: "1.0.0-beta.5",
      release: "development",
    });
  });
});
