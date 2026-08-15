import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * Estilete de gravação — a categoria "Personalizados" no menu, e o campo de gravação da peça.
 *
 * O nome é `Gravacao` e não `Lapis` porque o que ele significa aqui é o eixo `Com gravação` do
 * catálogo (feature `22`), não a ação genérica de editar.
 */
const GravacaoIcon = ({ className, 'aria-hidden': ariaHidden }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox={ICON_VIEW_BOX}
    fill="none"
    className={className}
    aria-hidden={ariaHidden}
    focusable="false"
  >
    <path
      d="M15.2 3.8 20.2 8.8 10 19H5v-5L15.2 3.8Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinejoin="round"
    />
    <path
      d="m13.2 5.8 5 5"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
)

export default GravacaoIcon
