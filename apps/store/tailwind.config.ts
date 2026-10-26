import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.preset";
import {
  ESTRELINHA_COLORS,
  ESTRELINHA_FONTS,
  ESTRELINHA_RADIUS,
  ESTRELINHA_SHADOW,
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
 * Os valores de `packages/ui/src/tokens/estrelinha.ts` (lidos aqui) e os de
 * `src/app/App.css` são a MESMA paleta declarada duas vezes — `palette.test.ts`
 * falha se divergirem. É o único jeito de o valor não
 * ficar certo num lado e velho no outro.
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
      // Os objetos da marca têm UM dono desde a feature 72: `packages/ui/src/tokens/estrelinha.ts`,
      // lido também pelo app do ateliê (`apps/mobile-adm`). `palette.test.ts` exige que cada um
      // destes SEJA o objeto de lá (`toBe`) — uma cópia literal aqui reprova.
      fontFamily: ESTRELINHA_FONTS,
      colors: {
        estrelinha: ESTRELINHA_COLORS,
      },
      borderRadius: ESTRELINHA_RADIUS,
      boxShadow: ESTRELINHA_SHADOW,
    },
  },
} satisfies Config;
