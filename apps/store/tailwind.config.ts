import type { Config } from "tailwindcss";
import preset from "../../packages/ui/tailwind.preset";

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
        // Duas famílias, e é tudo — `--font-display` e `--font-body` do arquivo
        // do Paper. A marca não usa fonte nenhuma: ela é traço vetorial em
        // `shared/ui/brand`, então não existe "fonte do logotipo" para carregar.
        //
        // O fallback é serif no display e sans no corpo, e não `system-ui` nos
        // dois: enquanto a webfont não chega, um título de Libre Baskerville
        // caindo em system-ui muda de família E de largura, e a página inteira
        // se remonta quando a fonte carrega.
        display: ["Libre Baskerville", "Georgia", "serif"],
        heading: ["Libre Baskerville", "Georgia", "serif"],
        body: ["Outfit", "system-ui", "sans-serif"],
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
      },
    },
  },
} satisfies Config;
