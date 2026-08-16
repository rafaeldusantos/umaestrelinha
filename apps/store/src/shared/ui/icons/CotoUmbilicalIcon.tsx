import {
  ICON_ACCENT,
  ICON_SCALE_G48,
  ICON_STROKE_G48,
  ICON_VIEW_BOX,
  type IconProps,
} from './types'

/**
 * Cordão terminando na presilha — o cartão de preparo simples do coto umbilical (`5MC-0`).
 *
 * A presilha aparece porque a instrução da ficha é sobre ela: se o coto ainda estiver preso, a
 * presilha volta junto com a joia.
 */
const CotoUmbilicalIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <g transform={`scale(${ICON_SCALE_G48})`} strokeWidth={ICON_STROKE_G48}>
      <path d="M9 11c9 1.5 14.5 7 16.5 15" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M22 26h13a4 4 0 0 1 0 8H22a4 4 0 0 1 0-8z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <path d="M26.5 26v8M31 26v8" stroke={ICON_ACCENT} />
    </g>
  </svg>
)

export default CotoUmbilicalIcon
