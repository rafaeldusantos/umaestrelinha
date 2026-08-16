import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Flor com o caule, achatada — o cartão de flores e pétalas.
 *
 * **É o único desenho desta página que não veio do board `5MC-0`**, e a ausência tem causa: o board
 * cobre os materiais das fichas ricas, e `flores` é um `MaterialKind` que a página do produto
 * endereça por âncora desde a feature 22. Deixar a vaga sem ícone quebraria a fileira de cartões;
 * emprestar o ícone de outro material diria à cliente que o preparo é o mesmo, e não é — pétala
 * fresca escurece dentro da resina.
 *
 * Desenhado direto na grade de 24, como os miúdos do conjunto: quatro pétalas em torno do miolo, com
 * o caule em `accent-strong` para o realce cair no que a instrução cobra — a flor vai prensada.
 */
const FlorPrensadaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M12 3.8c1.9 0 3 1.4 3 3.1s-1.1 2.6-3 2.6-3-.9-3-2.6 1.1-3.1 3-3.1Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M12 14.4c-1.9 0-3-1.4-3-3.1s1.1-2.6 3-2.6 3 .9 3 2.6-1.1 3.1-3 3.1Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M6.7 9.1c0-1.9 1.4-3 3.1-3s2.6 1.1 2.6 3-.9 3-2.6 3-3.1-1.1-3.1-3Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M17.3 9.1c0 1.9-1.4 3-3.1 3s-2.6-1.1-2.6-3 .9-3 2.6-3 3.1 1.1 3.1 3Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M12 14.4V21M12 17.6c1.8 0 3.2-1.1 3.9-2.6"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default FlorPrensadaIcon
