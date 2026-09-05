import {
  ICON_ACCENT,
  ICON_SCALE_G40,
  ICON_STROKE_G40,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Sacola com estrela — passo 01 do guia: escolher a joia. */
const PassoEscolhaIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G40})`} strokeWidth={ICON_STROKE_G40}>
      <path d="M14 15V12a6 6 0 0 1 12 0v3" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M9 15h22l-2 17a3 3 0 0 1-3 2.6H14A3 3 0 0 1 11 32L9 15Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path
        d="m20 21 1.9 4.2 4.6.5-3.5 3 1 4.5-4-2.4-4 2.4 1-4.5-3.5-3 4.6-.5L20 21Z"
        stroke={ICON_ACCENT}
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export default PassoEscolhaIcon
