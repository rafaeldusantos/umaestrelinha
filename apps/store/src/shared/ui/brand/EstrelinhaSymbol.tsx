import { SYMBOL, SYMBOL_TINY } from './paths'
import { BrandSvg, type BrandTone } from './BrandSvg'

/**
 * **Piso do símbolo: 48px** — e o número é do board, não nosso.
 *
 * A nota da prancha `734-0` ("02 · SÍMBOLO") diz *"Use de 48px para cima"*, e a
 * conta bate: o traço da marca mede 2,46 num quadro de 100, então 2,46% × 48 =
 * **1,18px**. É o piso de legibilidade desta identidade, medido uma vez e
 * reusado nos três degraus.
 *
 * Abaixo disso o símbolo **troca de arte**, não encolhe: `74Q-0` registra que
 * *"abaixo de 32px o símbolo completo vira mancha: as pétalas e as fagulhas
 * fecham"*, e a redução *"usa traço 8,0, calibrado para render pelo menos 1,3px
 * de linha a 16px. É quase 3× o traço do símbolo grande, e é proposital."*
 * A própria tira de escala do board (64 · 48 · 32 · 24 · 16) usa a arte
 * reduzida nos cinco tamanhos.
 */
export const SYMBOL_FLOOR = 48

export interface EstrelinhaSymbolProps {
  /** Lado em px — o símbolo é quadrado (viewBox 100×100). */
  size: number
  tone?: BrandTone
  className?: string
}

/**
 * O símbolo — lua, estrela e as duas fagulhas. O degrau mais baixo da escada.
 *
 * Serve de favicon, selo, avatar e marca d'água, e é o que a
 * `EstrelinhaSignature` renderiza quando a largura pedida fica abaixo do piso
 * dela.
 */
export function EstrelinhaSymbol({ size, tone = 'brand', className }: EstrelinhaSymbolProps) {
  return (
    <BrandSvg
      art={size < SYMBOL_FLOOR ? SYMBOL_TINY : SYMBOL}
      label="Uma Estrelinha"
      width={size}
      tone={tone}
      className={className}
    />
  )
}

export default EstrelinhaSymbol
