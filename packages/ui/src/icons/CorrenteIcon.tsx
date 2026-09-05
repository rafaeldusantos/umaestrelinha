import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/** Dois elos travados — a categoria "Correntes" no menu. */
const CorrenteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M10.5 8h-3a4 4 0 0 0 0 8h3"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <path
      d="M13.5 8h3a4 4 0 0 1 0 8h-3"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <path d="M8.5 12h7" stroke="currentColor" strokeWidth={ICON_STROKE} strokeLinecap="round" />
  </svg>
)

export default CorrenteIcon
