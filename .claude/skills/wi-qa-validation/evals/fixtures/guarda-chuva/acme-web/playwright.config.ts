import { defineConfig } from "@playwright/test";

// Suíte do Dev: sobe o front local antes de rodar.
export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: true },
  use: { baseURL: "http://localhost:5173" },
});
