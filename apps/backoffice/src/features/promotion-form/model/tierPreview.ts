// A prévia de uma faixa: "Cliente paga R$ 23,00 · −48%" (feature 17 / T17, PRM-04).
//
// A regra NÃO é reescrita aqui. `tierUnitPrice` é a **mesma** função pura que a loja usa para montar
// o carrinho e que `mercado-pago/handlers.ts` usa para cobrar — se a prévia tivesse aritmética
// própria, ela poderia mentir sobre o que vai ser cobrado, e é justamente essa divergência que a
// feature 17 existe para matar. Aqui só se multiplica pela quantidade e se formata.
//
// Por que a prévia precisa de um PREÇO DE REFERÊNCIA: `tierUnitPrice` é `min(cheio, faixa)` (A10) e
// `% off` incide sobre o cheio. Sem saber o preço cheio de nada, não existe resposta para "quanto a
// cliente paga" — nem para "quantos por cento é isso". Daí a referência vir de
// `useEligiblePreview` (a mediana dos elegíveis) e a prévia ficar em `—` enquanto não houver escopo.

import { tierUnitPrice, type PromotionDiscountKind } from '@nanapin/core/payment/pricing'

export interface TierPreview {
  /** O que cada unidade passa a custar. */
  unitPrice: number | null
  /** O que a cliente paga pelas `min_qty` unidades — `5 un a R$ 4,60 ⇒ R$ 23,00` (AC 6). */
  total: number | null
  /** O desconto equivalente, em pontos percentuais inteiros. */
  percentOff: number | null
}

const EMPTY: TierPreview = { unitPrice: null, total: null, percentOff: null }

const round2 = (value: number) => Math.round(value * 100) / 100

export function tierPreview(
  tier: { min_qty: number | string; value: number | string },
  kind: PromotionDiscountKind,
  referencePrice: number | null,
): TierPreview {
  const minQty = Number(tier.min_qty)
  const value = Number(tier.value)

  if (!referencePrice || referencePrice <= 0) return EMPTY
  if (!Number.isFinite(minQty) || minQty < 1) return EMPTY
  if (!Number.isFinite(value) || value <= 0) return EMPTY

  const unitPrice = tierUnitPrice(referencePrice, kind, value)
  return {
    unitPrice,
    total: round2(unitPrice * minQty),
    percentOff: Math.round((1 - unitPrice / referencePrice) * 100),
  }
}
