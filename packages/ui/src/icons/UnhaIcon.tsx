import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Unha com a lúnula — o cartão de preparo simples de unhas, humanas ou de pet (`5MC-0`). */
const UnhaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path
        d="M17 13h14c1.1 0 2 .9 2 2v19c0 3.4-3.6 5.6-9 5.6S15 37.4 15 34V15c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M16 20.5c4.6-3.2 11.4-3.2 16 0" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default UnhaIcon
