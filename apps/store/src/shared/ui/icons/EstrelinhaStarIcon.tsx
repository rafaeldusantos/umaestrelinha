import { ICON_STROKE, ICON_VIEW_BOX, type IconProps } from './types'

/**
 * O **ornamento do logotipo**, em traço — sparkle de quatro pontas com os lados côncavos.
 *
 * O desenho é o do nó `745-0` do arquivo do Paper ("Uma Estrelinha — Logo final e aplicações"): a
 * mesma faísca que aparece entre as palavras da marca, normalizada da grade original (meia-extensão
 * 3,835) para a grade 24 da biblioteca. A concavidade é 8,7% da meia-extensão nas duas grades — é o
 * que separa esta faísca de um losango, e é o que se perde se alguém "arredondar" os números.
 *
 * **Era uma estrela genérica de cinco pontas até a feature 29**, e a troca alcança os dois
 * consumidores de propósito: a estrela da loja passa a ser a da marca, em vez de um desenho
 * parecido. Um segundo ícone quase igual seria o "defeito 01" do projeto em miniatura.
 *
 * **Não é a marca em si.** A marca é `shared/ui/brand` (SVG gerado dos arquivos-fonte, guardado
 * caractere a caractere por `paths.test.ts`). Este é o ornamento *solto*, usado como selo de
 * assinatura, realce de card e marcador de linha memorial.
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
      d="M12 3 Q15.72 8.28 21 12 Q15.72 15.72 12 21 Q8.28 15.72 3 12 Q8.28 8.28 12 3 Z"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default EstrelinhaStarIcon
