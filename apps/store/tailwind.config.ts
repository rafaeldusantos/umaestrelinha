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
        // Paleta UMA ESTRELINHA. Contraste medido sobre `ground #FAF8F4`,
        // WCAG 2.1. O papel de cada token está em `src/app/App.css`, e os dois
        // arquivos são comparados do disco por `palette.test.ts`.
        estrelinha: {
          /** O chão da loja. Nunca texto. */
          ground: "#FAF8F4",
          /** Faixa de seção, palco de foto. */
          "ground-deep": "#F1EBE1",
          /** O card — o branco é superfície, não chão. */
          surface: "#FFFFFF",
          /** Divisor e contorno de card (1,25:1). Nunca borda de campo. */
          line: "#E6DFD4",
          /** Texto primário e superfície escura (12,73:1 ✓ AAA). */
          ink: "#23303A",
          /** Texto secundário (6,00:1 ✓ AA) — o piso. */
          "ink-soft": "#54616B",
          /** Ação, link, preço, aba ativa (8,76:1 ✓ AA). */
          primary: "#34495E",
          /** Hover / pressed do primário (11,03:1). */
          "primary-strong": "#283A4A",
          /** Texto sobre `primary` (8,40:1). */
          "on-primary": "#F7F3EC",
          /** Preenchimento e detalhe. Texto só sobre `ink` (4,78:1). */
          accent: "#B8945F",
          /** Detalhe gráfico ≥24px (3,55:1). Não é texto de corpo. */
          "accent-strong": "#A07E4C",
          /** Faixa e palco pontuais (1,19:1). Nunca texto. */
          serenity: "#DCE6EC",
          /** Só o botão do WhatsApp. */
          whatsapp: "#25D366",
          /** Borda de campo (3,63:1 ✓ WCAG 1.4.11). */
          field: "#8C8073",
        },
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
        // Escala do DS da Uma Estrelinha (`--radius-*` do arquivo do Paper).
        //
        //   sm      6px   AÇÃO E MIÚDO   botão, CTA, thumbnail, selo
        //   md     12px   CAMPO          input, textarea, select
        //   lg     20px   CAIXA          card de produto, de seção, banner
        //   pill  999px   RÓTULO         badge, chip de tema, tag, busca
        //   full    50%   DISCO          ícone, avatar, seta de carrossel
        //
        // Ação é `rounded-sm`, rótulo é pílula, disco é disco — a separação da
        // papelaria sobrevive, só mudou o valor da ação.
        //
        // **A chave `button` (14px) SAIU.** Ela existia só para contornar um
        // conflito: o `<Button>` do shadcn traz `rounded-md` na base e o
        // `tailwind-merge` NÃO colapsa token custom contra t-shirt size —
        // medido neste repositório, `twMerge('rounded-md','rounded-button')`
        // devolve as DUAS classes, enquanto `twMerge('rounded-md','rounded-sm')`
        // devolve só `rounded-sm`. Como a ação da Uma Estrelinha é 6px, ela
        // cabe em `sm`, o merge resolve sozinho, e a maquinaria toda (chave
        // custom + ordem de declaração) deixou de ter função.
        sm: "6px",
        md: "12px",
        lg: "20px",
        xl: "20px",
        "2xl": "20px",
        pill: "999px",
      },
      boxShadow: {
        // Sombra é elevação, não identidade: o nome fica e o valor acompanha a
        // paleta. Recalibrada do rosa (#E93A6D) para o slate — `primary`
        // #34495E nas duas suaves e `ink` #23303A na de peso.
        "estrelinha-soft": "0 14px 28px -10px rgba(52, 73, 94, 0.16)",
        "estrelinha-lift": "0 26px 50px -12px rgba(52, 73, 94, 0.22)",
        "estrelinha-ink": "0 16px 30px -8px rgba(35, 48, 58, 0.16)",
        "nanita-soft": "0 14px 28px -10px rgba(233, 58, 109, 0.18)",
        "nanita-lift": "0 26px 50px -12px rgba(233, 58, 109, 0.24)",
        "nanita-ink": "0 16px 30px -8px rgba(46, 32, 40, 0.16)",
      },
    },
  },
} satisfies Config;
