import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Etiqueta de preço — ícone do sistema para o menu (oferta, preço especial). O furo do cordão sai
 * no ouro do conjunto.
 */
const EtiquetaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M3.5 4.5a1 1 0 0 1 1-1h7.1l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-6.5 6.5a1.5 1.5 0 0 1-2.1 0L3.5 12.1Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="1.5" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
  </svg>
)

export default EtiquetaIcon
