import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { ATELIE_THEME_COLOR, pwaOptions } from "./pwa.config";
import { splashEstatica } from "./splashEstatica";

const root = path.resolve(__dirname, "../..");

/**
 * A `<meta name="theme-color">` do `index.html`, escrita a partir da MESMA cor do manifest — um hex
 * no HTML seria a segunda escrita do valor. (O plugin de PWA só injeta a meta pelo gerador de
 * assets, que este app não usa.)
 */
const themeColorMeta = (): Plugin => ({
  name: "atelie-theme-color",
  transformIndexHtml(html) {
    return html.replace("</head>", `  <meta name="theme-color" content="${ATELIE_THEME_COLOR}" />\n  </head>`);
  },
});

// O app do ateliê (feature 72): o painel no celular. Molde: `apps/backoffice/vite.config.ts`.
export default defineConfig({
  server: {
    host: "::",
    port: 8084,
    hmr: {
      overlay: false,
    },
  },
  preview: {
    port: 8084,
  },
  plugins: [react(), themeColorMeta(), splashEstatica(), VitePWA(pwaOptions)],
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
