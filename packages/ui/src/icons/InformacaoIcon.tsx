import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Informação — ícone do sistema para o menu (páginas de ajuda e políticas). O círculo acompanha o
 * texto; a letra “i” sai no ouro do conjunto.
 */
const InformacaoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={ICON_STROKE} />
    <path
      d="M12 11v5.5M12 7.75h.01"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default InformacaoIcon
