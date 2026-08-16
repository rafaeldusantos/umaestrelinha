import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Saco zip com a faixa do fecho e duas linhas de escrita — o passo final de **toda** ficha (`5MC-0`).
 *
 * As três fichas terminam no mesmo gesto: guardar no saquinho com o nome completo. Um ícone por ficha
 * diria à cliente que são três coisas diferentes, e a regra da página é justamente que é uma só.
 */
const SacoIdentificadoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
        d="M12 10h24v30a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V10z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M12 17h24" stroke="currentColor" />
      <path d="M18 26h12M18 32h8" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default SacoIdentificadoIcon
