import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.preset";
import {
  ESTRELINHA_COLORS,
  ESTRELINHA_FONTS,
  ESTRELINHA_RADIUS,
  ESTRELINHA_SHADOW,
} from "../../packages/ui/src/tokens/estrelinha";

/**
 * O app do ateliê usa a paleta DA LOJA (`estrelinha-*`), não os tokens `estrelinha-admin-*` do
 * painel. Os objetos vêm do dono único em `packages/ui/src/tokens/estrelinha.ts` — nunca uma cópia
 * aqui: `palette.test.ts` (suíte da loja) exige identidade (`toBe`) com o dono.
 *
 * O preset continua presente porque os primitivos do shadcn (`Button`, `Input`) leem as variáveis
 * dele; o visual da marca vem das classes `estrelinha-*` passadas a eles.
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
      fontFamily: ESTRELINHA_FONTS,
      colors: {
        estrelinha: ESTRELINHA_COLORS,
      },
      borderRadius: ESTRELINHA_RADIUS,
      boxShadow: ESTRELINHA_SHADOW,
      // A splash (feature 72, `MAF-05`/`MAF-07`). O lockup sobe 8px SEM opacidade: ele nunca nasce
      // invisível. A barra cresce até 90% e para — ela acompanha a espera, não promete o fim. Com
      // `motion-reduce:animate-none` as duas ficam no estado final: lockup no lugar, barra cheia.
      keyframes: {
        "splash-lockup": {
          from: { transform: "translateY(8px)" },
          to: { transform: "translateY(0)" },
        },
        "splash-progresso": {
          from: { transform: "scaleX(0.08)" },
          to: { transform: "scaleX(0.9)" },
        },
      },
      animation: {
        "splash-lockup": "splash-lockup 600ms ease-out both",
        "splash-progresso": "splash-progresso 1600ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
} satisfies Config;
