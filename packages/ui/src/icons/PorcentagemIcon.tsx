import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Sinal de porcentagem — ícone do sistema para o menu (desconto). A barra acompanha o texto; os
 * dois círculos saem no ouro do conjunto.
 */
const PorcentagemIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M18 6 6 18"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <circle cx="7.5" cy="7.5" r="2.5" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
    <circle cx="16.5" cy="16.5" r="2.5" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
  </svg>
)

export default PorcentagemIcon
