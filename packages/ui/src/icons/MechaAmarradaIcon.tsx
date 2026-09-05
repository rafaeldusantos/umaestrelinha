import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Mecha com o laço de linha de costura — passo 1 do preparo de cabelos e pelos (`5MC-0`). */
const MechaAmarradaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
        d="M17 8c-3 11-1 21 2 33M24 7c-2 11 0 22 2 34M31 8c0 11 1 21 1 32"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path d="M13 25c8 3 14 3 22 0" stroke={ICON_ACCENT} strokeLinecap="round" />
      <path
        d="M24 22c-4-3-8-1-6 2 1 3 6 2 6-2zM24 22c4-3 8-1 6 2-1 3-6 2-6-2z"
        stroke={ICON_ACCENT}
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export default MechaAmarradaIcon
