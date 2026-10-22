import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Mesma fixação de `apps/backoffice/vitest.config.ts`: o client de `@estrelinha/supabase` LANÇA
    // no carregamento do módulo sem estas duas, e o `.env` é gitignored — sem a fixação a suíte
    // passaria na máquina de quem tem `.env` e morreria no CI antes da primeira asserção.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54441",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@estrelinha/ui": path.resolve(root, "packages/ui/src"),
      "@estrelinha/supabase": path.resolve(root, "packages/supabase/src"),
      "@estrelinha/auth": path.resolve(root, "packages/auth/src"),
      "@estrelinha/core": path.resolve(root, "packages/core/src"),
    },
  },
});
