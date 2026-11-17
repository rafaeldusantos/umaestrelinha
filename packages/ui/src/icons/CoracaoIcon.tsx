import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Coração — ícone do sistema para o menu (presentes de afeto, favoritas). Contorno no tom do texto,
 * com um brilho no ouro do conjunto.
 */
const CoracaoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M12 20s-7.5-4.6-7.5-10A4.25 4.25 0 0 1 12 7.3 4.25 4.25 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.5 10.2a2 2 0 0 1 1.8-2"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default CoracaoIcon
