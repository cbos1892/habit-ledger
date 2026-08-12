import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.NAV_PERF_BASE_URL?.trim();

if (!baseURL) {
  throw new Error(
    "NAV_PERF_BASE_URL is required. Point it at an authenticated preview or production deployment.",
  );
}

export default defineConfig({
  testDir: "./e2e/navigation-performance",
  globalSetup: "./e2e/navigation-performance/auth.setup.ts",
  outputDir: "./test-results/navigation-performance",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  timeout: 120_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    storageState: ".auth/navigation-performance.json",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
