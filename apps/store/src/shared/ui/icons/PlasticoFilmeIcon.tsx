import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Frasco dentro de um contorno tracejado — envolver com plástico filme (`5MC-0`).
 *
 * **Um desenho só para os dois passos que dizem a mesma coisa.** O board tem uma versão no preparo do
 * leite e outra no das cinzas, com dois pixels de diferença no contorno; duplicar aqui repetiria o
 * defeito que o comentário do `EnvioIcon` já registra — dois ícones para o mesmo conceito divergem no
 * primeiro ajuste e ninguém percebe qual dos dois a tela está usando.
 */
const PlasticoFilmeIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path
        d="M20 16h8v18a4 4 0 0 1-4 4 4 4 0 0 1-4-4V16z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M14 9h20v32H14z"
        stroke={ICON_ACCENT}
        strokeLinejoin="round"
        strokeDasharray="4 4"
      />
      <path d="M38 14c3 0 3 22 0 22" stroke="currentColor" strokeLinecap="round" />
    </g>
  </svg>
)

export default PlasticoFilmeIcon
