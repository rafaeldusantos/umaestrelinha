import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Pote fechado, tampa por cima — passo 1 do preparo de cinzas de cremação (`5MC-0`). */
const PoteTampaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path d="M14 14h20" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M16 17h16c1.6 0 2.8 1.2 2.6 2.8l-1.6 19a3.6 3.6 0 0 1-3.6 3.2h-10a3.6 3.6 0 0 1-3.6-3.2l-1.6-19c-.2-1.6 1-2.8 2.6-2.8z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M20 29h8" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default PoteTampaIcon
