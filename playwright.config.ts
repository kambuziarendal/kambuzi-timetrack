import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4199",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "npm run build && DATABASE_URL=pglite://memory NODE_ENV=test PORT=4199 APP_URL=http://127.0.0.1:4199 SECURE_COOKIES=false npm run start --workspace backend",
    url: "http://127.0.0.1:4199/health/ready",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
  ],
});
