import {
  ICON_ACCENT,
  ICON_SCALE_G120,
  ICON_STROKE_G120,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Pote de tampa larga com um fio de fumaça — o cabeçalho da ficha de cinzas de cremação (`5MC-0`).
 *
 * O corpo afunila para baixo (40 de boca, 8 de recolhimento em 48 de altura). Um cilindro reto no
 * lugar dele leria como copo, e copo é o desenho da ficha ao lado.
 */
const PoteCinzasIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G120})`} strokeWidth={ICON_STROKE_G120}>
      <path d="M34 40h52" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M40 46h40c4 0 7 3 6 7l-4 48a9 9 0 0 1-9 8H47a9 9 0 0 1-9-8l-4-48c-1-4 2-7 6-7z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M60 14c0 6-7 8-7 14" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default PoteCinzasIcon
