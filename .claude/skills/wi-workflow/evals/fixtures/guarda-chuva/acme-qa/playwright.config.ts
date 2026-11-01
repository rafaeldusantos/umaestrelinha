import { defineConfig } from "@playwright/test";

// Suíte do deployed: a URL vem do ambiente, sem webServer.
export default defineConfig({
  testDir: "./tests",
  use: { baseURL: process.env.BASE_URL },
});
