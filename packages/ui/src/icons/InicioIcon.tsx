import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Casa — ícone do sistema para o menu (página inicial). A casa acompanha o texto; a porta sai no
 * ouro do conjunto.
 */
const InicioIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 20v-5h4v5"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default InicioIcon
