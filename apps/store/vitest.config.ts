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
     * O client de `@estrelinha/supabase` LANÇA no carregamento do módulo quando estas duas faltam
     * — de propósito, para que a falta de configuração não vire fallback silencioso. Mas o `.env`
     * de cada app é gitignored, então quem fornecia os valores para o teste era a máquina de quem
     * já tinha rodado a loja. Resultado: a suíte passava aqui e morria no CI, em 8 arquivos, antes
     * da primeira asserção — e o erro nem parece de teste, parece de configuração de app.
     *
     * Fixar aqui é a mesma lição que `storeOrigin.test.ts` já custou uma vez: **teste que lê
     * `import.meta.env` mede a máquina, não o código**. Com os valores na config, a suíte é
     * determinística — e para de depender de o desenvolvedor ter apontado o `.env` para o projeto
     * local, o hospedado, ou coisa nenhuma.
     *
     * Nenhum teste fala com a rede: tudo que toca Supabase é mockado. Os valores só precisam
     * existir, e a URL só precisa ser parseável por `createClient`.
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
