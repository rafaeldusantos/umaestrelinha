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
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nanapin/ui": path.resolve(root, "packages/ui/src"),
      "@nanapin/supabase": path.resolve(root, "packages/supabase/src"),
      "@nanapin/auth": path.resolve(root, "packages/auth/src"),
      "@nanapin/core": path.resolve(root, "packages/core/src"),
    },
  },
});
