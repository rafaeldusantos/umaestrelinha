import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Disco com o cordão em S — o bloco de preparo em casa da placenta (`5MC-0`). */
const PlacentaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <circle cx="24" cy="24" r="14" stroke="currentColor" />
      <path d="M24 10c-4 6-4 12 0 14s4 8 0 14" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default PlacentaIcon
