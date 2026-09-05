import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Frasco de tampa alta com a confirmação ao lado — passo 2: fechar sem risco de vazar (`5MC-0`). */
const TampaVedadaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path d="M19 7h10v6H19z" stroke="currentColor" strokeLinejoin="round" />
      <path
        d="M17 13h14v22a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4V13z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="M34 12l2.6 2.6L41 10"
        stroke={ICON_ACCENT}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export default TampaVedadaIcon
