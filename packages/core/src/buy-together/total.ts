// Compre Junto — o total do conjunto, o preço PIX dele e as frases de "falta uma escolha".
//
// O PIX do conjunto é `pixPrice` do TOTAL: somar o PIX de cada peça arredonda cada desconto sozinho e
// pode divergir em centavos do que o caixa cobra (`displayedEqualsCharged.test.ts`).

import { engravingLimit, normalizeEngraving } from '../material/material.ts'
import { pixPrice } from '../payment/pix.ts'
import { buyTogetherDiscountedPrice } from './discount.ts'
import type { BuyTogetherAddonKind } from './types.ts'

const cents = (value: number): number => Math.round(value * 100)

/** Uma peça marcada no bloco: o preço de hoje da variação escolhida e o desconto ao levar junto. */
export interface BundleAddon {
  price: number
  /** `null` ou ausente = sem desconto. */
  discountPercent?: number | null
}

/**
 * O principal na quantidade que a página mostra, mais cada adicional marcado uma vez, já com o desconto
 * do Compre Junto. O preço com desconto é `buyTogetherDiscountedPrice`, por unidade e arredondado a
 * centavo — a mesma conta da sacola e do servidor. `discount` é o que o conjunto deixa de custar: só
 * as peças, nunca a joia.
 */
export const bundleTotal = (input: {
  mainPrice: number
  mainQty: number
  addons: readonly BundleAddon[]
}): { total: number; discount: number } => {
  let full = 0
  let charged = 0
  for (const addon of input.addons) {
    full += cents(addon.price)
    charged += cents(buyTogetherDiscountedPrice(addon.price, addon.discountPercent))
  }
  return {
    total: (cents(input.mainPrice) * input.mainQty + charged) / 100,
    discount: (full - charged) / 100,
  }
}

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
