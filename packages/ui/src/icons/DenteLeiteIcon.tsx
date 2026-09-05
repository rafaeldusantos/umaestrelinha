import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/** Dente de leite com o brilho ao lado — o cartão de preparo simples do dente (`5MC-0`). */
const DenteLeiteIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
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
        d="M18 10c-5 0-8 3.6-8 8.6 0 7 3 9.4 4.2 17 .6 3.6 1.2 5.4 2.8 5.4s1.8-3.6 3-3.6 1.4 3.6 3 3.6 2.2-1.8 2.8-5.4C27 28 30 25.6 30 18.6 30 13.6 27 10 22 10c-1.4 0-1.6.8-2 .8s-.6-.8-2-.8z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M34 14c2.4 0 4 1.6 4 4" stroke={ICON_ACCENT} strokeLinecap="round" />
    </g>
  </svg>
)

export default DenteLeiteIcon
