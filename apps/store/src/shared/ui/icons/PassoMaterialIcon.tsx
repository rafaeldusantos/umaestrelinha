import {
  ICON_ACCENT,
  ICON_SCALE_G40,
  ICON_STROKE_G40,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Frasco com líquido e uma gota — passo 02 do guia: preparar o material. */
const PassoMaterialIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
        d="M16 6h8v6l5.4 8.6A5 5 0 0 1 25.2 29H14.8a5 5 0 0 1-4.2-8.4L16 12V6Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M12.6 22.4h14.8" stroke="currentColor" />
      <path
        d="M15.6 25.8c1.6 0 1.6 1.6 3.2 1.6s1.6-1.6 3.2-1.6 1.6 1.6 3.2 1.6"
        stroke={ICON_ACCENT}
        strokeLinecap="round"
      />
      <path
        d="M31 32.5c1.4 0 2.5-1.1 2.5-2.5S31 25.5 31 25.5s-2.5 3.1-2.5 4.5 1.1 2.5 2.5 2.5Z"
        stroke={ICON_ACCENT}
        strokeLinejoin="round"
      />
    </g>
  </svg>
)

export default PassoMaterialIcon
