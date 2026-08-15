import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Corrente com peça redonda pendurada — a categoria "Pingentes".
 *
 * A peça é **círculo**, não gota: a gota já é a [`GotaAfetivaIcon`] do menu, e dois desenhos iguais
 * em vagas vizinhas da mesma barra não distinguem nada.
 */
const PingenteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M5 4C7 8.6 9.2 10.6 12 10.6S17 8.6 19 4"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <circle cx="12" cy="15.4" r="4.6" stroke="currentColor" strokeWidth={ICON_STROKE} />
  </svg>
)

export default PingenteIcon
