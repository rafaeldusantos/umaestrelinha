import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const root = path.resolve(__dirname, "../..");

/**
 * `PRF-12` — **três chunks de fornecedor que sobrevivem a um deploy**.
 *
 * Antes disto a loja era um arquivo só: qualquer alteração no código da loja mudava o hash, e o
 * navegador de quem já tinha visitado rebaixava React, Supabase e React Query de novo — dependências
 * que não mudam entre deploys. Separá-las é o que faz a segunda visita depois de um deploy custar o
 * código da loja, e não 278 KB.
 *
 * **As listas de `react` e de `query` são as MESMAS do `dedupe` abaixo**, e isso não é coincidência:
 * pacote que precisa de instância única é exatamente o que não pode acabar duplicado entre chunks.
 * `viteChunks.test.ts` lê este arquivo do disco e recusa as duas listas divergirem.
 *
 * Granularidade maior foi descartada: sob HTTP/2 um quarto e um quinto arquivo custam mais em
 * requisição do que economizam em cache.
 */
const VENDOR_CHUNKS: Record<string, string[]> = {
  react: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "scheduler"],
  query: ["@tanstack/react-query", "@tanstack/query-core"],
  supabase: [
    "@supabase/supabase-js",
    "@supabase/auth-js",
    "@supabase/postgrest-js",
    "@supabase/realtime-js",
    "@supabase/storage-js",
    "@supabase/functions-js",
    "@supabase/phoenix",
  ],
};

/** A raiz do pacote de um especificador: `react/jsx-runtime` -> `react`, `@a/b/c` -> `@a/b`. */
const raizDoPacote = (especificador: string): string => {
  const partes = especificador.split("/");
  return especificador.startsWith("@") ? `${partes[0]}/${partes[1]}` : partes[0];
};

/**
 * O pacote dono de um módulo, lido do caminho.
 *
 * O ÚLTIMO `node_modules` do caminho, e não o primeiro: com o `node-linker=hoisted` do pnpm o id de
 * uma dependência transitiva carrega dois — `.../node_modules/a/node_modules/b/index.js` —, e ler o
 * primeiro atribuiria o módulo ao pacote errado.
 */
const pacoteDoModulo = (id: string): string | null => {
  // Barra invertida normalizada primeiro: no Windows o id chega com separador nativo em parte do
  // caminho, e um `split("/node_modules/")` cru não acharia nada.
  const partes = id.split("\\").join("/").split("/node_modules/");
  if (partes.length < 2) return null;
  return raizDoPacote(partes[partes.length - 1]);
};

const vendorChunk = (id: string): string | undefined => {
  const pacote = pacoteDoModulo(id);
  if (!pacote) return undefined;
  for (const [nome, pacotes] of Object.entries(VENDOR_CHUNKS)) {
    if (pacotes.some((p) => raizDoPacote(p) === pacote)) return nome;
  }
  return undefined;
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => vendorChunk(id),
      },
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
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
