import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/pages.spec.ts",
  fullyParallel: true,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5187",
    viewport: { width: 1440, height: 1000 },
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5187",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: false,
    env: {
      WORKSPACE_SYNC: "off",
      DESK_DB: ":memory:",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      ALERT_TO: "team@example.com",
      PILOT_TOKEN: "",
    },
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
