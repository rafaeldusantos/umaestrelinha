import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Caminhão de entrega — ícone do sistema para o menu (frete, envio). A carroceria acompanha o
 * texto; as rodas saem no ouro do conjunto.
 */
const FreteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M2.5 6h11v10h-11ZM13.5 9h4l3 3.5V16h-7"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="17.5" r="1.75" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
    <circle cx="17" cy="17.5" r="1.75" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
  </svg>
)

export default FreteIcon
