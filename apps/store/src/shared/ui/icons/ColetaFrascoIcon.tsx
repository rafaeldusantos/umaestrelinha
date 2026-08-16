import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Copo graduado com a linha do nível em ouro — passo 1 do preparo de leite materno (`5MC-0`). */
const ColetaFrascoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
        d="M14 12h20l-2 26a4 4 0 0 1-4 3.6h-8A4 4 0 0 1 16 38L14 12z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M27 19h5M27 25h5" stroke="currentColor" strokeLinecap="round" />
      <path d="M16.4 30h15.2" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default ColetaFrascoIcon
