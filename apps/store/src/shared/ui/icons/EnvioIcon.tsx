import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Caminhão de entrega — "envio garantido para todo o Brasil", e o passo 04 do guia de material.
 *
 * **Um caminhão só na biblioteca.** O guia nasceu com um segundo desenho de caminhão, na grade de
 * 40; dois ícones para o mesmo conceito divergem no primeiro ajuste e ninguém percebe qual dos dois
 * a tela está usando.
 */
const EnvioIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M2 7.5h11v9H2z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="M13 10.5h4.5L21 14v2.5h-8"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <circle cx="7" cy="18" r="1.8" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
    <circle cx="17" cy="18" r="1.8" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
  </svg>
)

export default EnvioIcon
