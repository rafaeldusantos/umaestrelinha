import {
  ICON_ACCENT,
  ICON_SCALE_G120,
  ICON_STROKE_G120,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Quatro fios com a amarração no meio — o cabeçalho da ficha de cabelos, pelos e penas (`5MC-0`).
 *
 * A amarração em `accent-strong` não é enfeite: é a instrução inteira da ficha em um traço — mecha
 * sem linha se desfaz no caminho, e é o erro que a página existe para evitar.
 */
const MechaCabeloIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G120})`} strokeWidth={ICON_STROKE_G120}>
      <path
        d="M42 12c-8 24-4 50 6 94M54 10c-5 26 0 52 6 96M66 12c-1 26 2 52 4 94M78 16c3 24 0 50-4 88"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path d="M38 54c10 4 34 4 44 0" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default MechaCabeloIcon
