import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm preview --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      testMatch: /desktop\.spec\.ts/u,
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
    {
      name: "chromium-mobile",
      testMatch: /mobile\.spec\.ts/u,
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
  ],
});
