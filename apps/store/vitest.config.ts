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
    include: ["src/**/*.{test,spec}.{ts,tsx}", "server/**/*.{test,spec}.ts", "scripts/**/*.{test,spec}.ts"],
    /**
     * O teto de 5 s do vitest é baixo para esta suíte, e o CI roda sem `--testTimeout`. Os casos que
     * varrem disco e as páginas reais com dezenas de linhas cruzam 5 s sob a contenção da suíte
     * completa — no runner do CI (2 vCPUs) mais ainda — e reprovam por timeout, nunca por asserção,
     * num arquivo que muda a cada execução. 20 s é o teto que o `CLAUDE.md` já mandava passar à mão
     * para medir; aqui ele vale também no CI. Teste preso de verdade continua reprovando, só mais tarde.
     */
    testTimeout: 20_000,
    /**
     * No CI, dois workers. Com o padrão (um por núcleo) a suíte da loja satura o runner, o processo
     * principal deixa de responder às mensagens dos workers e o vitest aborta com
     * `[vitest-worker]: Timeout calling "onTaskUpdate"` — todos os casos verdes e o job vermelho
     * (CI de `master`, 2026-11-07, no merge da `92`). Fora do CI, o padrão.
     */
    ...(process.env.CI ? { minWorkers: 1, maxWorkers: 2 } : {}),
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
