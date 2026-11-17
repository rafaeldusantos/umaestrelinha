import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Cupom — ícone do sistema para o menu. O bilhete com os recortes acompanha o texto; o picote sai
 * no ouro do conjunto.
 */
const CupomIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M3.5 7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v2.5a2.5 2.5 0 0 0 0 5V17a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17v-2.5a2.5 2.5 0 0 0 0-5Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 7.75v1.5M14.5 11.25v1.5M14.5 14.75v1.5"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default CupomIcon
