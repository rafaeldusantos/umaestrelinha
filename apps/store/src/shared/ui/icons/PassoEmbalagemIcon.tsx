import {
  ICON_ACCENT,
  ICON_SCALE_G40,
  ICON_STROKE_G40,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Caixa lacrada e identificada — passo 03 do guia: embalar e identificar. */
const PassoEmbalagemIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G40})`} strokeWidth={ICON_STROKE_G40}>
      <path
        d="M10 13h20v18a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V13Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M8 7h24l-2 6H10L8 7Z" stroke="currentColor" strokeLinejoin="round" />
      <path d="M16 20h8" stroke={ICON_ACCENT} strokeLinecap="round" />
      <path d="M16 25.5h8" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default PassoEmbalagemIcon
