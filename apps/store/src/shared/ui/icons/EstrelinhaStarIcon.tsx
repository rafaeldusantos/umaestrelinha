import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Estrela de cinco pontas, em traço.
 *
 * **Não é a marca.** A marca é `shared/ui/brand` (SVG gerado dos arquivos-fonte, guardado caractere
 * a caractere por `paths.test.ts`). Esta é a estrela *decorativa* — selo de assinatura, realce de
 * card, marcador de linha memorial. Trocar uma pela outra deforma o logotipo sem quebrar nada.
 */
const EstrelinhaStarIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M12 3.5 14.2 9l5.8.4-4.4 3.8 1.4 5.7L12 15.9l-5 3 1.4-5.7L4 9.4 9.8 9 12 3.5Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
  </svg>
)

export default EstrelinhaStarIcon
