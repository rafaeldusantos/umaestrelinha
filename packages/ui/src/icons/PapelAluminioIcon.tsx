import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Folha com a ponta virada e a onda do papel — passo 2: embrulhar sem dobrar os fios (`5MC-0`). */
const PapelAluminioIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path d="M11 11h20l6 6v20H11V11z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M31 11v6h6" stroke="currentColor" strokeLinejoin="round" />
      <path d="M16 26c4 3 8 3 12 0s4-3 6-1" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default PapelAluminioIcon
