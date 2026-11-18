import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/app-shell",
  outputDir: "./test-results/app-shell",
  reporter: "line",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit", hasTouch: true } },
  ],
});
