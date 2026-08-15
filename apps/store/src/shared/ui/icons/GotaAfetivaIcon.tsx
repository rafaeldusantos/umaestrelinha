import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Gota — a marca de "coleção afetiva" no menu.
 *
 * Monotom de propósito: o traço herda `currentColor`, e quem chama decide a cor — ouro sobre a
 * barra escura do menu, tinta sobre claro. Um ouro cravado aqui sumiria no chão creme (2,66:1).
 */
const GotaAfetivaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M12 3C12 3 5 11 5 15.5A7 7 0 0 0 19 15.5C19 11 12 3 12 3Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
  </svg>
)

export default GotaAfetivaIcon
