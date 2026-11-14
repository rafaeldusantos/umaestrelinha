import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.preset";
import {
  ESTRELINHA_COLOR_VARIABLES,
  ESTRELINHA_FONTS,
  ESTRELINHA_RADIUS,
  ESTRELINHA_SHADOW_VARIABLES,
} from "../../packages/ui/src/tokens/estrelinha";

/**
 * Tema Uma Estrelinha — escopo: só a loja.
 *
 * O preset compartilhado continua servindo o backoffice com a paleta dele.
 * Aqui declaramos o namespace `estrelinha-*`, que é o único que código da loja
 * deve usar. Os acentos legados do preset não são mais sobrescritos: o remap da
 * feature 20 apagou o último uso deles na loja.
 *
 * Referência: arquivo do Paper "Uma Estrelinha" · ver DESIGN.md.
 *
 * As cores e as sombras são lidas POR VARIÁVEL (`rgb(var(--estrelinha-<t>-rgb) /
 * <alpha-value>)`): quem dá o valor é o bloco do perfil de estilo em vigor no
 * `src/app/App.css` (`:root` com o Padrão, o atributo do perfil no `<html>` com
 * o Black Friday). Os valores de cada perfil têm um dono,
 * `ESTRELINHA_PROFILES` em `packages/ui/src/tokens/estrelinha.ts`, e
 * `palette.test.ts` compara cada bloco do `App.css` com ele.
 */
export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/auth/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Os objetos da marca têm UM dono desde a feature 72: `packages/ui/src/tokens/estrelinha.ts`.
      // `palette.test.ts` exige que cada um destes SEJA o objeto de lá (`toBe`) — uma cópia literal
      // aqui reprova. Cores e sombras são as versões POR VARIÁVEL, que acompanham o perfil de
      // estilo; o app do ateliê lê as em hex e fica no Padrão.
      fontFamily: ESTRELINHA_FONTS,
      colors: {
        estrelinha: ESTRELINHA_COLOR_VARIABLES,
      },
      borderRadius: ESTRELINHA_RADIUS,
      boxShadow: ESTRELINHA_SHADOW_VARIABLES,
    },
  },
} satisfies Config;
