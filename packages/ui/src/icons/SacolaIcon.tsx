import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Sacola de compras — o gatilho da sacola no header e na aba do celular (board `5N2-0`).
 *
 * Substitui o `ShoppingCart` do lucide: a loja passou a chamar a sacola de **sacola** em toda
 * superfície, e um ícone de carrinho de supermercado ao lado da palavra "Sacola" diria duas coisas.
 *
 * O corpo herda `currentColor` (acompanha o header escuro e a aba clara) e a alça sai no ouro do
 * conjunto. O Paper desenha o traço em 1,4; aqui ele entra em 1,5, o peso da família.
 */
const SacolaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M6 8H18L17 20H7Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M9 8V6.5A3 3 0 0 1 15 6.5V8"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default SacolaIcon
