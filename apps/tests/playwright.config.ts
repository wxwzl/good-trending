import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./src/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.E2E_WEB_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Web E2E tests
    {
      name: "web-chrome",
      testDir: "./src/e2e/web",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "web-firefox",
      testDir: "./src/e2e/web",
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: "web-mobile",
      testDir: "./src/e2e/web",
      use: {
        ...devices["iPhone 13"],
      },
    },
    // API E2E tests
    {
      name: "api",
      testDir: "./src/e2e/api",
      use: {
        baseURL: process.env.E2E_API_URL || "http://localhost:3015",
      },
    },
  ],
  webServer: isCI
    ? undefined
    : [
        {
          command: "pnpm --filter @good-trending/web dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
        {
          command: "pnpm --filter @good-trending/api dev",
          url: "http://localhost:3015/health",
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      ],
});
