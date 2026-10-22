import type { VitePWAOptions } from "vite-plugin-pwa";
import { ESTRELINHA_COLORS } from "../../packages/ui/src/tokens/estrelinha";

/**
 * O PWA do app do ateliê (feature 72, `MAF-01`/`MAF-02`/`MAF-20`), num arquivo próprio para os
 * guardas lerem a configuração como DADO (`manifest.test.ts`, `swSemDadosDaLoja.test.ts`) — o
 * plugin só resolve as opções dentro do ciclo do Vite. `vite.config.ts` passa ESTE objeto ao
 * `VitePWA`, e `manifest.test.ts` confere a fiação.
 *
 * As cores vêm do dono único da paleta (`packages/ui/src/tokens/estrelinha.ts`), nunca digitadas:
 * a placa da splash do Android, a barra do sistema e o fundo dos ícones são o mesmo
 * `primary-strong` da marca.
 */
export const ATELIE_THEME_COLOR = ESTRELINHA_COLORS["primary-strong"];

export const pwaOptions: Partial<VitePWAOptions> = {
  // A versão nova vale na próxima abertura, sem perguntar: um bundle velho chamando uma RPC que
  // mudou é o risco maior, e perguntar "atualizar?" a cada deploy é ruído.
  registerType: "autoUpdate",
  injectRegister: "auto",
  manifest: {
    name: "Ateliê · Uma Estrelinha",
    short_name: "Ateliê",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: ATELIE_THEME_COLOR,
    background_color: ATELIE_THEME_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  // O service worker guarda SÓ a casca (HTML, JS, CSS, fontes, ícones). Dado da loja é sempre rede:
  // dinheiro desatualizado é pior que ausente (`AD-056`). Por isso NÃO há cache em tempo de
  // execução nenhum, e `swSemDadosDaLoja.test.ts` recusa que ele apareça — o host do banco nunca
  // passa pelo service worker.
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff2,png,svg}"],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [/^\/api\//],
  },
};
