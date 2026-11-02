// Compre Junto — o total do conjunto, o preço PIX dele e as frases de "falta uma escolha".
//
// O PIX do conjunto é `pixPrice` do TOTAL: somar o PIX de cada peça arredonda cada desconto sozinho e
// pode divergir em centavos do que o caixa cobra (`displayedEqualsCharged.test.ts`).

import { engravingLimit, normalizeEngraving } from '../material/material.ts'
import { pixPrice } from '../payment/pix.ts'
import type { BuyTogetherAddonKind } from './types.ts'

const cents = (value: number): number => Math.round(value * 100)

/** O principal na quantidade que a página mostra, mais cada adicional marcado uma vez. */
export const bundleTotal = (input: {
  mainPrice: number
  mainQty: number
  addonPrices: readonly number[]
}): number =>
  (cents(input.mainPrice) * input.mainQty + input.addonPrices.reduce((s, p) => s + cents(p), 0)) /
  100

/** `null` quando a loja não oferece PIX ou o desconto é inválido. */
export const bundlePix = (total: number, percent: number): number | null => pixPrice(total, percent)

/**
 * A recusa da gravação de um adicional. O limite é o do cadastro da PEÇA (`engraving_max_chars`), e o
 * texto conta depois de aparado, como o campo do principal.
 */
export const addonEngravingRefusal = (
  text: string | null | undefined,
  max: number | null | undefined,
): string | null => {
  const value = normalizeEngraving(text)
  if (value === null) return null
  const limit = engravingLimit(max)
  if (value.length <= limit) return null
  return `Cabem até ${limit} caracteres nesta peça. Tire ${value.length - limit} para continuar.`
}

/**
 * A frase do que falta num adicional marcado, ou `null` quando está completo. O eixo e a palavra do
 * nome entram no meio da frase, então saem em minúscula ("Escolha o cor da pingente.").
 */
export const addonMissingChoice = (input: {
  kind: BuyTogetherAddonKind
  /** Numa lista, a cliente já escolheu uma peça? */
  pieceChosen: boolean
  /** O primeiro eixo sem valor escolhido na peça, ou `null`. */
  missingAxis: string | null
  pieceName: string
}): string | null => {
  if (input.kind === 'list' && !input.pieceChosen) return 'Escolha a peça.'
  if (input.missingAxis === null) return null
  const first = (input.pieceName.trim().split(/\s+/)[0] ?? '').toLocaleLowerCase('pt-BR')
  return `Escolha o ${input.missingAxis.toLocaleLowerCase('pt-BR')} da ${first}.`
}
