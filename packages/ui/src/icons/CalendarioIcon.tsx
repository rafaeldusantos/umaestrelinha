import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Calendário — ícone do sistema para o menu (datas, agenda). A folha e as argolas acompanham o
 * texto; o dia marcado sai no ouro do conjunto.
 */
const CalendarioIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M5.5 5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3.5 9.5h17M8 3v4M16 3v4"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 13.5h3v3h-3Z"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default CalendarioIcon
