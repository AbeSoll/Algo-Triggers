import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "pages.spec.ts",
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4173/Algo-Triggers-demo/",
    viewport: { width: 1440, height: 1000 },
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --mode pages --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Algo-Triggers-demo/",
    reuseExistingServer: false,
  },
  reporter: "list",
});
