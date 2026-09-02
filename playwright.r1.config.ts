import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.R1_E2E_BASE_URL?.trim();

if (!baseURL) {
  throw new Error(
    "R1_E2E_BASE_URL is required. Point it at an authenticated preview or production deployment.",
  );
}

export default defineConfig({
  testDir: "./e2e/r1",
  globalSetup: "./e2e/navigation-performance/auth.setup.ts",
  outputDir: "./test-results/r1",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    storageState: ".auth/navigation-performance.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
