import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Dúvida — ícone do sistema para o menu (perguntas frequentes). O círculo acompanha o texto; o
 * ponto de interrogação sai no ouro do conjunto.
 */
const DuvidaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
      d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5h.01"
      stroke={ICON_ACCENT}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default DuvidaIcon
