import { MONOGRAM_D, MONOGRAM_RATIO, WORDMARK_D, WORDMARK_RATIO } from './paths'

/**
 * Cor do traço da marca — nunca a forma.
 *
 * **Três nomes dizem a TINTA e um diz a SUPERFÍCIE**, e a assimetria é
 * deliberada: `brand`, `ink` e `paper` são a cor que sai; `onInk` é "sobre
 * Grafite" e resolve o par de cores certo para aquele fundo. Sem ele o rodapé
 * não tem tom nenhum que sirva — `ink` pinta Grafite sobre Grafite (**1,00:1**,
 * o defeito que fez o "Nanita" do rodapé desaparecer) e `brand` acerta o
 * wordmark mas deixa o descritor em Carbono, a 2,55:1. `onInk` é o mesmo nome
 * que a variante escura do botão já usa, pela mesma razão.
 *
 * `mono` existe para quando o contexto já define a cor (herda `currentColor`),
 * e é o que permite o wordmark viver dentro de um link colorido sem receber
 * uma cor fixa que brigue com o hover.
 */
export type BrandTone = 'brand' | 'ink' | 'paper' | 'onInk' | 'mono'

const FILL: Record<BrandTone, string> = {
  brand: '#F1678D', // Carimbo — sobre Papel
  ink: '#2E2028', // Grafite — sobre superfície CLARA, quando a marca precisa pesar
  paper: '#F9F1EE', // Papel — sobre superfície escura saturada
  onInk: '#F1678D', // Carimbo — sobre Grafite (5,22:1). Nunca Grafite, que dá 1,00:1.
  mono: 'currentColor',
}

/**
 * **Piso do wordmark: 110px de largura** (prancha 21, medido por rasterização,
 * não estimado).
 *
 * Quem quebra primeiro não é a haste da letra — são as cinco marcas da fileira
 * de baixo. A haste tem 33 unidades em 690 de largura, as barras têm 29 e os
 * losangos 44. A 90px as barras saem com 3,78px e os losangos viram manchas;
 * a 110px a barra tem 4,62px e a fileira lê limpa.
 */
export const WORDMARK_FLOOR = 110

export interface NanitaWordmarkProps {
  /** Largura em px. A altura sai da proporção 4,01:1 — não se passa altura. */
  width: number
  tone?: BrandTone
  className?: string
}

/**
 * O wordmark "Nanita" (prancha 18), como SVG **inline**.
 *
 * Inline e não `<img src>` por duas razões que não são preferência: o wordmark
 * do header não pode ter estado de carregamento nem 404 possível, e
 * `currentColor` só funciona inline.
 *
 * **Abaixo do piso ele cai para o monograma**, nunca renderiza o wordmark
 * borrado. É a escada da prancha 21 funcionando: lockup ≥140px → wordmark
 * ≥110px → monograma ≤48px. Header e rodapé usarem marcas diferentes não é
 * inconsistência — na mesma altura de 40px o lockup mede 116px de largura,
 * 24px abaixo do próprio piso, com o descritor em 7,6px.
 */
export function NanitaWordmark({ width, tone = 'brand', className }: NanitaWordmarkProps) {
  const fill = FILL[tone]

  if (width < WORDMARK_FLOOR) {
    return (
      <svg
        role="img"
        aria-label="Nanita"
        viewBox="0 0 126.87 160.18"
        width={width}
        height={Math.round((width / MONOGRAM_RATIO) * 100) / 100}
        className={className}
      >
        <title>Nanita</title>
        <path fillRule="evenodd" d={MONOGRAM_D} fill={fill} />
      </svg>
    )
  }

  return (
    <svg
      role="img"
      aria-label="Nanita"
      viewBox="0 0 690.06 172.04"
      width={width}
      height={Math.round((width / WORDMARK_RATIO) * 100) / 100}
      className={className}
    >
      <title>Nanita</title>
      <path fillRule="evenodd" d={WORDMARK_D} fill={fill} />
    </svg>
  )
}

export default NanitaWordmark
