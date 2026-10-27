import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { ESTRELINHA_COLORS, ESTRELINHA_FONTS, ESTRELINHA_RADIUS } from "../../packages/ui/src/tokens/estrelinha";

/**
 * A splash ESTÁTICA do `index.html` (feature 72, `MAF-28`).
 *
 * Antes, a primeira pintura era uma página em branco até o JavaScript chegar — 5,2 s medidos em
 * Slow 3G na primeira abertura, antes de instalar. Agora o HTML já chega com a splash dentro de
 * `#root`: o mesmo fundo `primary-strong`, o MESMO lockup e o mesmo rótulo da `Splash` do React. O
 * `createRoot(...).render` substitui o conteúdo de `#root` ao montar, e a troca não salta porque as
 * duas desenham o mesmo quadro: o lockup começa 8 px abaixo (o primeiro quadro da animação dele) e a
 * barra em 8% (o primeiro quadro da dela); com movimento reduzido, os dois no estado final.
 *
 * **O lockup NÃO é uma segunda cópia**: ele é lido, no build, do MESMO arquivo que a `Splash` importa
 * (`src/features/splash/assets/...`), e `splashEstatica.test.ts` confere que o HTML gerado o contém
 * byte a byte. As cores vêm do dono da paleta; nenhuma é digitada aqui.
 */

export const LOCKUP_DA_SPLASH = resolve(__dirname, "src/shared/assets/uma-estrelinha-lockup-negativo.svg");

/** O rótulo e o nome acessível — os mesmos da `Splash` do React (o teste compara os dois). */
export const ROTULO_DA_SPLASH = "Ateliê · painel";
export const NOME_DA_SPLASH = "Abrindo o painel do ateliê";

/** Uma cor do dono com transparência, como o `/20` do Tailwind faz. */
const comAlfa = (hex: string, alfa: number): string => {
  const n = hex.replace(/^#/, "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${alfa})`;
};

const familia = (nomes: readonly string[]) => nomes.map((n) => (n.includes(" ") ? `'${n}'` : n)).join(", ");

/** O markup da splash estática, com o SVG do lockup dentro. */
export const splashEstaticaHtml = (lockup: string): string => {
  const c = ESTRELINHA_COLORS;
  return [
    `<div id="splash-estatica" role="status" aria-label="${NOME_DA_SPLASH}" style="position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.5rem;padding:0 1rem;background-color:${c["primary-strong"]}">`,
    `<div class="splash-estatica-lockup" style="width:300px;max-width:100%">${lockup}</div>`,
    `<div style="display:flex;flex-direction:column;align-items:center;gap:1rem">`,
    `<div style="height:0.25rem;width:120px;overflow:hidden;border-radius:${ESTRELINHA_RADIUS.pill};background-color:${comAlfa(c["on-primary"], 0.2)}">`,
    `<div class="splash-estatica-progresso" style="height:100%;width:100%;transform-origin:left;border-radius:${ESTRELINHA_RADIUS.pill};background-color:${c.accent}"></div>`,
    `</div>`,
    `<p style="margin:0;font-family:${familia(ESTRELINHA_FONTS.body)};font-size:11px;line-height:1.5;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:${c["on-primary"]}">${ROTULO_DA_SPLASH}</p>`,
    `</div>`,
    `<style>`,
    `#splash-estatica .splash-estatica-lockup>svg{display:block;width:100%;height:auto}`,
    `#splash-estatica .splash-estatica-lockup{transform:translateY(8px)}`,
    `#splash-estatica .splash-estatica-progresso{transform:scaleX(0.08)}`,
    `@media (prefers-reduced-motion: reduce){#splash-estatica .splash-estatica-lockup,#splash-estatica .splash-estatica-progresso{transform:none}}`,
    `</style>`,
    `</div>`,
  ].join("");
};

const RAIZ_VAZIA = '<div id="root"></div>';

/** Põe a splash dentro de `#root`. Lança se não achar a raiz vazia: o build falha, nunca sai sem splash. */
export const injetarSplash = (html: string, lockup: string): string => {
  if (!html.includes(RAIZ_VAZIA)) throw new Error("index.html sem <div id=\"root\"></div>: a splash estática não tem onde entrar");
  return html.replace(RAIZ_VAZIA, `<div id="root">${splashEstaticaHtml(lockup)}</div>`);
};

/** O plugin: lê o lockup do disco a cada build (nunca uma cópia guardada aqui). */
export const splashEstatica = (): Plugin => ({
  name: "atelie-splash-estatica",
  transformIndexHtml(html) {
    return injetarSplash(html, readFileSync(LOCKUP_DA_SPLASH, "utf8"));
  },
});
