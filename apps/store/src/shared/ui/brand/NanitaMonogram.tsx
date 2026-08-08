import { MONOGRAM_D, MONOGRAM_RATIO } from './paths'
import type { BrandTone } from './NanitaWordmark'

const FILL: Record<BrandTone, string> = {
  brand: '#F1678D',
  ink: '#2E2028',
  paper: '#F9F1EE',
  onInk: '#F1678D', // sobre Grafite o N é Carimbo — ver `BrandTone`
  mono: 'currentColor',
}

export interface NanitaMonogramProps {
  /** Altura em px — aqui a altura é que manda, porque o N é o eixo do desenho. */
  height: number
  tone?: BrandTone
  className?: string
}

/**
 * O N sozinho — o degrau mais baixo da escada (prancha 21: ≤48px).
 *
 * É o **mesmo path do lockup**: nada foi redesenhado para caber em 16px. Serve
 * de favicon, selo, avatar e marca d'água, e é o que o `NanitaWordmark`
 * renderiza quando a largura pedida fica abaixo do piso de 110px.
 */
export function NanitaMonogram({ height, tone = 'brand', className }: NanitaMonogramProps) {
  return (
    <svg
      role="img"
      aria-label="Nanita"
      viewBox="0 0 126.87 160.18"
      width={Math.round(height * MONOGRAM_RATIO * 100) / 100}
      height={height}
      className={className}
    >
      <title>Nanita</title>
      <path fillRule="evenodd" d={MONOGRAM_D} fill={FILL[tone]} />
    </svg>
  )
}

export default NanitaMonogram
