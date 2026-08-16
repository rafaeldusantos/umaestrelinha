import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/** Caixa fechada em perspectiva — a modalidade PAC na seção de postagem (`5MC-0`). */
const CaixaPacIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M4 8.5l8-4 8 4v7l-8 4-8-4v-7z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M4 8.5l8 4 8-4M12 12.5v7"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
  </svg>
)

export default CaixaPacIcon
