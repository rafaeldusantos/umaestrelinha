/**
 * Os tokens da MARCA Uma Estrelinha — o dono único do objeto que o Tailwind lê (feature `72`).
 *
 * Até a `72` estes objetos moravam dentro de `apps/store/tailwind.config.ts`. O app do ateliê
 * (`apps/mobile-adm`) é o segundo leitor do objeto, e uma segunda cópia seria o "defeito 01": duas
 * paletas divergindo sem nada quebrar. Os dois `tailwind.config.ts` importam DAQUI, e
 * `palette.test.ts` (suíte da loja) exige que o objeto de cada config SEJA o daqui (`toBe`): o do
 * ateliê, a paleta em hex (`ESTRELINHA_COLORS`, `ESTRELINHA_SHADOW`); o da loja, a mesma paleta
 * POR VARIÁVEL (`ESTRELINHA_COLOR_VARIABLES`, `ESTRELINHA_SHADOW_VARIABLES`), que acompanha o perfil
 * de estilo declarado em `ESTRELINHA_PROFILES`.
 *
 * **Não são os tokens do painel.** `styles.css` e `tailwind.preset.ts` deste pacote declaram
 * `--estrelinha-admin-*`, que é outra paleta. E as variáveis CSS da loja (`--estrelinha-*`)
 * continuam em `apps/store/src/app/App.css`, comparadas com este objeto por `palette.test.ts`.
 *
 * Referência: arquivo do Paper "Uma Estrelinha" · ver DESIGN.md.
 *
 * Importado por caminho RELATIVO nos `tailwind.config.ts` e no `vite.config.ts` do app do ateliê,
 * porque arquivo de config não passa pelo alias do Vite.
 */

import type { StyleProfile } from "../../../core/src/appearance/types.ts";

/**
 * Duas famílias, e é tudo — `--font-display` e `--font-body` do arquivo do Paper. A marca não usa
 * fonte nenhuma: ela é traço vetorial em `@estrelinha/ui/brand`, então não existe "fonte do logotipo"
 * para carregar.
 *
 * O fallback é serif no display e sans no corpo, e não `system-ui` nos dois: enquanto a webfont não
 * chega, um título de Libre Baskerville caindo em system-ui muda de família E de largura, e a página
 * inteira se remonta quando a fonte carrega.
 */
export const ESTRELINHA_FONTS = {
  display: ["Libre Baskerville", "Georgia", "serif"],
  heading: ["Libre Baskerville", "Georgia", "serif"],
  body: ["Outfit", "system-ui", "sans-serif"],
};

/**
 * Paleta UMA ESTRELINHA. Contraste medido sobre `ground #FAF8F4`, WCAG 2.1. O papel de cada token
 * está em `apps/store/src/app/App.css`, e os dois são comparados do disco por `palette.test.ts`.
 */
export const ESTRELINHA_COLORS = {
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
  // Os tons do selo da situação do pedido (feature 59, `SIT-13`) —
  // pares texto × fundo; o papel de cada um está em `App.css`.
  /** "Aguardando" — texto (6,47:1 sobre `wait-soft`). */
  wait: "#6B4F24",
  /** Fundo do selo "aguardando". Nunca texto. */
  "wait-soft": "#F4ECDF",
  /** Pagamento com problema — texto (7,51:1 sobre `alert-soft`). */
  alert: "#7E2F2B",
  /** Fundo do selo de alerta. Nunca texto. */
  "alert-soft": "#F6E7E5",
  /** Entregue — texto (6,69:1 sobre `done-soft`). */
  done: "#3F5A3B",
  /** Fundo do selo "entregue". Nunca texto. */
  "done-soft": "#EEF0EC",
  // O papel de DESCONTO: o selo "-X%" do cartão, o chip de desconto da sacola e a barra do frete
  // grátis. No Padrão ele É a ardósia da ação (o desenho de sempre); existe como papel próprio
  // porque no Black Friday a ação vira quase preto e o desconto passa a ouro, para continuar se
  // distinguindo dos outros selos.
  /** Fundo do selo de desconto. */
  sale: "#34495E",
  /** Texto sobre `sale` (9,29:1 no Padrão). */
  "on-sale": "#FFFFFF",
  /** O preenchimento da barra do frete grátis (≥ 3:1 sobre o branco). */
  "sale-bar": "#34495E",
};

/** O nome de um token de cor da marca (`ink`, `ground-deep`, `sale`…). */
export type EstrelinhaColorToken = keyof typeof ESTRELINHA_COLORS;

/**
 * Os perfis de estilo da LOJA — o mesmo conjunto de tokens, com outros valores. O dono único dos
 * valores de cada perfil: `apps/store/src/app/App.css` os escreve como variáveis (um bloco por
 * perfil, cópia deliberada) e `palette.test.ts` compara cada bloco com este objeto.
 *
 * **O Padrão É `ESTRELINHA_COLORS`** (a mesma referência): o perfil de quem nunca escolheu é a
 * paleta de sempre, e o app do ateliê, que lê `ESTRELINHA_COLORS`, continua nele. O Black Friday
 * troca só o que o protótipo troca; o resto (chão, card, `on-primary`, os selos de situação, o
 * WhatsApp) é herdado do Padrão.
 *
 * Só a loja veste o perfil. O painel (`--estrelinha-admin-*`), o ateliê e os e-mails não.
 */
export const ESTRELINHA_PROFILES: Readonly<
  Record<StyleProfile, Readonly<Record<EstrelinhaColorToken, string>>>
> = {
  padrao: ESTRELINHA_COLORS,
  "black-friday": {
    ...ESTRELINHA_COLORS,
    ink: "#161514",
    "ink-soft": "#57524B",
    primary: "#1C1A18",
    "primary-strong": "#0D0C0B",
    accent: "#C2A063",
    "accent-strong": "#9A7A45",
    line: "#E4DDD0",
    "ground-deep": "#F0EADF",
    field: "#857A6C",
    // O desconto passa a ouro: sobre a ação quase preta, um selo escuro sumiria entre os outros.
    sale: "#C2A063",
    "on-sale": "#161514",
    "sale-bar": "#9A7A45",
  },
};

/**
 * A cor da sombra suave de cada perfil, em canais `R G B` — a forma que a loja escreve em
 * `--estrelinha-shadow-rgb` e que `rgb(var(...) / α)` lê. No Padrão é a ardósia de
 * `ESTRELINHA_SHADOW` (52, 73, 94); no Black Friday, o quase preto da tinta.
 */
export const ESTRELINHA_PROFILE_SHADOW_RGB: Readonly<Record<StyleProfile, string>> = {
  padrao: "52 73 94",
  "black-friday": "22 21 20",
};

/**
 * As classes de cor da LOJA, por variável: cada token vira `rgb(var(--estrelinha-<t>-rgb) /
 * <alpha-value>)`, que é a forma do Tailwind 3.4 que preserva a opacidade (`/80`, `/[0.06]`). Quem
 * troca o valor é o bloco do perfil no `App.css`; a classe é uma só.
 *
 * O app do ateliê NÃO lê isto: ele segue com `ESTRELINHA_COLORS` em hex, no Padrão.
 */
export const ESTRELINHA_COLOR_VARIABLES: Readonly<Record<EstrelinhaColorToken, string>> =
  Object.fromEntries(
    Object.keys(ESTRELINHA_COLORS).map((token) => [
      token,
      `rgb(var(--estrelinha-${token}-rgb) / <alpha-value>)`,
    ]),
  ) as Record<EstrelinhaColorToken, string>;

/**
 * Escala do DS da Uma Estrelinha (`--radius-*` do arquivo do Paper).
 *
 *   sm      6px   AÇÃO E MIÚDO   botão, CTA, thumbnail, selo
 *   md     12px   CAMPO          input, textarea, select
 *   lg     20px   CAIXA          card de produto, de seção, banner
 *   pill  999px   RÓTULO         badge, chip de tema, tag, busca
 *   full    50%   DISCO          ícone, avatar, seta de carrossel
 *
 * Ação é `rounded-sm`, rótulo é pílula, disco é disco — a separação da papelaria sobrevive, só mudou
 * o valor da ação.
 *
 * **A chave custom de botão (14px) SAIU.** Ela existia só para contornar um conflito: o `<Button>`
 * do shadcn traz `rounded-md` na base e o `tailwind-merge` NÃO colapsa token custom contra t-shirt
 * size — medido neste repositório, o merge de `rounded-md` com o token custom devolve as DUAS
 * classes, enquanto `twMerge('rounded-md','rounded-sm')` devolve só `rounded-sm`. Como a ação da
 * Uma Estrelinha é 6px, ela cabe em `sm`, o merge resolve sozinho, e a maquinaria toda (chave
 * custom + ordem de declaração) deixou de ter função.
 */
export const ESTRELINHA_RADIUS = {
  sm: "6px",
  md: "12px",
  lg: "20px",
  xl: "20px",
  "2xl": "20px",
  pill: "999px",
};

/**
 * Sombra é elevação, não identidade: o nome fica e o valor acompanha a paleta. Recalibrada do rosa
 * da papelaria para o slate — `primary` #34495E nas duas suaves e `ink` #23303A na de peso.
 */
export const ESTRELINHA_SHADOW = {
  "estrelinha-soft": "0 14px 28px -10px rgba(52, 73, 94, 0.16)",
  "estrelinha-lift": "0 26px 50px -12px rgba(52, 73, 94, 0.22)",
  "estrelinha-ink": "0 16px 30px -8px rgba(35, 48, 58, 0.16)",
};

/**
 * As mesmas três sombras, por variável — as da LOJA, que acompanham o perfil. As duas suaves leem
 * `--estrelinha-shadow-rgb`; a de peso lê a tinta (`--estrelinha-ink-rgb`), como hoje. Com o
 * Padrão, cada uma resolve exatamente no valor de `ESTRELINHA_SHADOW` (`palette.test.ts` expande e
 * compara). O ateliê continua com `ESTRELINHA_SHADOW`.
 */
export const ESTRELINHA_SHADOW_VARIABLES = {
  "estrelinha-soft": "0 14px 28px -10px rgb(var(--estrelinha-shadow-rgb) / 0.16)",
  "estrelinha-lift": "0 26px 50px -12px rgb(var(--estrelinha-shadow-rgb) / 0.22)",
  "estrelinha-ink": "0 16px 30px -8px rgb(var(--estrelinha-ink-rgb) / 0.16)",
};
