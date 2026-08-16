import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/** Envelope — a carta registrada, que na loja vale só para fios (`5MC-0`). */
const CartaRegistradaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M3.5 6h17v12h-17z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M3.5 6.5l8.5 6 8.5-6"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
  </svg>
)

export default CartaRegistradaIcon
