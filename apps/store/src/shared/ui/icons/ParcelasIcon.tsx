import { ICON_ACCENT, ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/** Cartão de crédito — a vantagem "4x sem juros" da faixa de confiança. */
const ParcelasIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <rect
      x="2.5"
      y="5"
      width="19"
      height="14"
      rx="2.5"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
    />
    <path d="M2.5 10h19" stroke={ICON_ACCENT} strokeWidth={ICON_STROKE} />
  </svg>
)

export default ParcelasIcon
