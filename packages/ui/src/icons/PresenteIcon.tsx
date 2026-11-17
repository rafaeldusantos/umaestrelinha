import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Caixa de presente — ícone do sistema para o menu. A caixa e a tampa acompanham o texto; a fita e
 * o laço saem no ouro do conjunto.
 */
const PresenteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M5 11.5h14V20H5ZM3.5 7.5h17v4h-17Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 7.5V20M12 7.5C11 5 8 3.6 7.2 5.2c-.7 1.6 2.3 2.3 4.8 2.3Zm0 0c1-2.5 4-3.9 4.8-2.3.7 1.6-2.3 2.3-4.8 2.3Z"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default PresenteIcon
