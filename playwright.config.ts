import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: true,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "bun run --cwd apps/web dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
