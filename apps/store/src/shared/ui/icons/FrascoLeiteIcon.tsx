import {
  ICON_ACCENT,
  ICON_SCALE_G120,
  ICON_STROKE_G120,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Mamadeira com bico e leite — o cabeçalho da ficha de leite materno (`5MC-0`).
 *
 * Nasceu na grade de 120 do board e entra escalado, não redesenhado: o bico tem três degraus de
 * largura (16 → 28 → 34) e reescrevê-los à mão na grade de 24 arredondaria a diferença entre eles até
 * o desenho virar um cilindro qualquer.
 */
const FrascoLeiteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G120})`} strokeWidth={ICON_STROKE_G120}>
      <path d="M52 6h16v10H52z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M46 16h28v9H46z" stroke="currentColor" strokeLinejoin="round" />
      <path
        d="M43 25h34v70a12 12 0 0 1-12 12H55a12 12 0 0 1-12-12V25z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M44 62c6-5 11 5 17 0s10-5 16 0"
        stroke={ICON_ACCENT}
        strokeLinecap="round"
      />
    </g>
  </svg>
)

export default FrascoLeiteIcon
