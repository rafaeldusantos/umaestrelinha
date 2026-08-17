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
    /**
     * Mesma fixação que `apps/store/vitest.config.ts` — aqui **preventiva**, não corretiva.
     *
     * A suíte do backoffice passa hoje no CI porque todo teste que chega perto do banco mocka
     * `@estrelinha/supabase`. Isso não é uma propriedade do app, é uma coincidência mantida à mão
     * em 109 arquivos: o primeiro teste que renderizar uma tela sem mockar o client cai no mesmo
     * `throw` de carregamento de módulo que derrubou 8 arquivos da loja — e vai cair **só no CI**,
     * porque na máquina de quem desenvolve o `.env` existe.
     */
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54341",
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
