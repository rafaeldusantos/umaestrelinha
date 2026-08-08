import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.preset";

/**
 * Tema Nanita — escopo: só a loja.
 *
 * O preset compartilhado continua servindo o backoffice com a paleta antiga.
 * Aqui sobrescrevemos os acentos `nana-*` (valores literais no preset, por isso
 * precisam ser redeclarados para que modificadores de opacidade como
 * `bg-nana-violet/10` continuem funcionando) e adicionamos o namespace
 * `nanita-*`, que é o que código novo deve usar.
 *
 * Referência: boards "18 · Logotipo Nanita v2 + Paleta" e "20b · Onde cada cor
 * entrou na tela" (Paper) · ver DESIGN.md.
 *
 * Os valores aqui e os de `src/app/App.css` são a MESMA paleta declarada duas
 * vezes — `palette.test.ts` falha se divergirem. É o único jeito de o valor não
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
      fontFamily: {
        // Duas famílias, e é tudo. Berkshire Swash saiu na v2: o wordmark virou
        // SVG e a inicial do card de coleção virou Fredoka 700, então a fonte
        // ficou sem nenhuma função. Onde havia um "N" em `font-logo`, hoje há o
        // `NanitaMonogram` — que é o N de verdade da marca.
        //
        // Fredoka substitui Lilita One (display) e Outfit (heading).
        display: ["Fredoka", "system-ui", "sans-serif"],
        heading: ["Fredoka", "system-ui", "sans-serif"],
        body: ["DM Sans", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta PAPELARIA. Contraste medido sobre Papel #F9F1EE, WCAG 2.1.
        // Os nomes vieram da v1 e viraram apelidos — o nome de desenho está no
        // comentário, e o papel de cada cor está em DESIGN.md §2.
        nanita: {
          /** Papel — o chão da loja. Substitui o branco. Nunca texto. */
          paper: "#F9F1EE",
          /** Carimbo — preenchimento, wordmark. 2,67:1. **Nunca texto.** */
          glaze: "#F1678D",
          /** Selo — dot, ícone, detalhe gráfico ≥24px. 3,56:1 ✓ lg. */
          raspberry: "#E93A6D",
          /** Carmim — preço, link, botão primário, aba ativa. AA 6,38:1. */
          jam: "#A62348",
          /** Grafite — texto primário e superfície escura. AAA 13,92:1. */
          ink: "#2E2028",
          /** Carbono — texto secundário. AA 5,46:1 — é o piso. */
          plum: "#7E5769",
          /** Mata-borrão — faixa de seção e palco de foto. Nunca texto. */
          sugar: "#F7D6E0",
          /** Dobra — divisor e contorno de card. Nunca borda de campo. */
          border: "#EBDDD7",
          /** Papelão — borda de input e de controle. 3,95:1 ✓ (WCAG 1.4.11). */
          rule: "#8F7268",
          /** Fita — badge. Só sobre Grafite (10,17:1), nunca sobre Papel. */
          butter: "#FFC95C",
        },
        // Acentos legados remapeados na paleta papelaria (compatibilidade).
        nana: {
          violet: "#A62348",
          pop: "#A62348",
          pink: "#A62348",
          sakura: "#E93A6D",
          cyan: "#A62348",
          yellow: "#FFC95C",
          dark: "#2E2028",
        },
      },
      borderRadius: {
        // Escala da papelaria. Cada raio nomeia UMA função — a v1 usava pílula
        // para quatro coisas diferentes (botão, badge, chip, campo) e a cliente
        // não tinha como saber qual delas clica.
        //
        //   sm      8px   MIÚDO    thumbnail, selo retangular
        //   button 14px   AÇÃO     botão, CTA, submit
        //   md     16px   CAMPO    input, textarea, select
        //   lg     24px   CAIXA    card de produto, card de seção, banner
        //   pill  999px   RÓTULO   badge, chip de tema, tag, campo de busca
        //   full    50%   DISCO    + do card, seta do carrossel, ícone, avatar
        //
        // O disco é a forma-assinatura da marca — o produto é redondo — e é a
        // única exceção declarada à regra "ação é 14px".
        //
        // `button` é declarado POR ÚLTIMO de propósito. O Tailwind emite os
        // utilitários na ordem das chaves, e o `<Button>` do shadcn carrega
        // `rounded-md` na base — que o `tailwind-merge` NÃO colapsa contra um
        // token custom (medido: devolve as duas classes). Com as duas no
        // elemento, quem vence é a última no CSS. Declarado antes de `md`,
        // `rounded-button` perderia em silêncio.
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "24px",
        "2xl": "24px",
        pill: "999px",
        button: "14px",
      },
      boxShadow: {
        // Sombra só como elevação suave e rosada — nunca cinza neutro.
        // Recalibrada do rosa velho (#FF51B9) para o Selo (#E93A6D) e do
        // Grafite (#2E2028): sombra é elevação, não identidade, então o nome
        // fica e o valor acompanha a paleta.
        "nanita-soft": "0 14px 28px -10px rgba(233, 58, 109, 0.18)",
        "nanita-lift": "0 26px 50px -12px rgba(233, 58, 109, 0.24)",
        "nanita-ink": "0 16px 30px -8px rgba(46, 32, 40, 0.16)",
      },
    },
  },
} satisfies Config;
