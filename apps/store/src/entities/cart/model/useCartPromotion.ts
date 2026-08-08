// O que as promoções fazem com ESTA sacola (PRM-15, PRM-23).
//
// Mora em `entities/cart` — não em `widgets/cart-drawer` — porque a gaveta é `widgets/` e o checkout
// é `features/`: um hook compartilhado pelas duas superfícies tem de estar numa camada abaixo das
// duas. É o mesmo raciocínio que pôs o `cartUiStore` aqui em vez de dentro do widget.
//
// Nenhuma aritmética de desconto mora neste arquivo. `promotionDiscount`, `winner` e `discarded` vêm
// de `resolveOrderPricing` — a mesma função que o `create-payment` chama — e `missing`/`unitPrice` do
// convite vêm de `countEligibleUnits` e `tierUnitPrice`. Conta reescrita na tela é como o desconto
// passa a ser exibido e não cobrado.
import { useMemo } from 'react'
import {
  countEligibleUnits,
  resolveOrderPricing,
  tierUnitPrice,
  type OrderPricingOutcome,
  type PricingItem,
  type ProgressiveTier,
  type ProgressivePromotion,
} from '@nanapin/core/payment/pricing'
import { useActivePromotions } from '@nanapin/core/hooks/usePromotions'
import { useCouponStore } from '@/entities/coupon'
import { useCartStore } from './cartStore'

/** O convite da próxima faixa: quantas unidades faltam e a que preço a unidade sai (PRM-23). */
export interface NextTier {
  missing: number
  unitPrice: number
}

export type CartPromotion = OrderPricingOutcome & { nextTier: NextTier | null }

const NO_PROMOTION: CartPromotion = {
  totals: { subtotal: 0, couponDiscount: 0, pixDiscount: 0, shipping: 0, total: 0 },
  promotionDiscount: 0,
  applied: [],
  winner: 'none',
  discarded: null,
  nextTier: null,
}

/**
 * Um item é elegível quando a contagem de unidades dele sozinho é maior que zero.
 *
 * `isEligible` não é exportado de `payment/pricing.ts`, e reescrever aqui o `scope === 'all' ||
 * eligibleProductIds.includes(...)` daria uma segunda definição da regra — exatamente o defeito que
 * a feature 16 pagou com a barra do menu. `countEligibleUnits` é a mesma função pura, aplicada a uma
 * lista de um item.
 */
const isEligible = (item: PricingItem, promo: ProgressivePromotion) =>
  countEligibleUnits([item], promo) > 0

/**
 * A promoção de referência do convite: a que **está valendo**; e quando nenhuma está, a mais antiga
 * entre as que têm item elegível na sacola.
 *
 * O desempate é o mesmo de D6 (`created_at`, depois `id`) porque sem ele o convite trocaria de
 * campanha entre dois renders — a armadilha que `bySortOrder` já documentou na 16.
 */
function pickReference(
  promotions: readonly ProgressivePromotion[],
  items: PricingItem[],
  outcome: OrderPricingOutcome,
): ProgressivePromotion | null {
  if (outcome.applied.length > 0) {
    const id = outcome.applied[0].promotion_id
    const applied = promotions.find((promo) => promo.id === id)
    if (applied) return applied
  }

  const eligible = promotions.filter((promo) => countEligibleUnits(items, promo) > 0)
  if (eligible.length === 0) return null

  return eligible.reduce((oldest, promo) =>
    promo.created_at < oldest.created_at ||
    (promo.created_at === oldest.created_at && promo.id < oldest.id)
      ? promo
      : oldest,
  )
}

/**
 * O preço cheio de referência do convite: o **maior** entre os itens elegíveis.
 *
 * Numa sacola de preços diferentes, "cada botton sai a R$ 4,20" não tem resposta única. O maior é o
 * único que não promete menos do que a cliente vai pagar por algum item: numa faixa `unit_price`
 * todos os itens acima da faixa pousam no valor dela, e numa faixa `percent` o mais caro é o teto.
 */
function referencePrice(items: PricingItem[], promo: ProgressivePromotion): number | null {
  let highest: number | null = null
  for (const item of items) {
    if (!isEligible(item, promo)) continue
    if (highest === null || item.unit_price > highest) highest = item.unit_price
  }
  return highest
}

/** A menor faixa **acima** da contagem atual. `null` na última faixa — não há o que convidar. */
function nextTierAbove(promo: ProgressivePromotion, units: number): ProgressiveTier | null {
  return promo.tiers.reduce<ProgressiveTier | null>((best, tier) => {
    if (tier.min_qty <= units) return best
    if (best && best.min_qty <= tier.min_qty) return best
    return tier
  }, null)
}

function resolveNextTier(
  items: PricingItem[],
  promotions: readonly ProgressivePromotion[],
  outcome: OrderPricingOutcome,
): NextTier | null {
  const promo = pickReference(promotions, items, outcome)
  if (!promo) return null

  const units = countEligibleUnits(items, promo)
  const tier = nextTierAbove(promo, units)
  if (!tier) return null

  const reference = referencePrice(items, promo)
  if (reference === null) return null

  return {
    missing: tier.min_qty - units,
    unitPrice: tierUnitPrice(reference, promo.discount_kind, tier.value),
  }
}

/**
 * PRM-15: o desconto que as faixas produzem sobre a sacola, mais o convite da próxima faixa.
 *
 * O cupom entra no cálculo porque `resolveOrderPricing` é quem decide entre os dois (D2): sem
 * passá-lo, a gaveta anunciaria um desconto progressivo que o checkout descartaria em favor do
 * cupom — um desconto exibido e não cobrado, que é a falha exata que esta feature existe para matar.
 *
 * `shipping` e `pixDiscountPercent` entram em zero: a sacola não tem cotação de frete nem método de
 * pagamento escolhido. O veredito de ordem do pedido — com frete cotado — é o do checkout
 * (`useCheckoutTotals`), e é ele que a cliente paga.
 */
export function useCartPromotion(): CartPromotion {
  const items = useCartStore((s) => s.items)
  const coupon = useCouponStore((s) => s.applied)
  const { data: promotions } = useActivePromotions()

  return useMemo(() => {
    if (items.length === 0) return NO_PROMOTION

    const pricingItems: PricingItem[] = items.map((item) => ({
      product_id: item.product.id,
      // `unitPrice`, não `product.price`: com grade os dois divergem e é o primeiro que o
      // `cartStore.subtotal()` soma — e que o servidor reprecifica.
      unit_price: item.unitPrice,
      quantity: item.quantity,
    }))

    let outcome: OrderPricingOutcome
    try {
      outcome = resolveOrderPricing({
        items: pricingItems,
        shipping: 0,
        pixDiscountPercent: 0,
        method: 'card',
        coupon: coupon ? { type: coupon.type, value: coupon.value } : null,
        promotions,
      })
    } catch {
      // Total abaixo de R$ 0,01 (cupom fixo que come o subtotal inteiro): `calculateOrderTotals`
      // lança, como já lançava. A gaveta não pode quebrar por isso — o bloqueio de verdade é
      // server-side, no `create-payment`.
      return NO_PROMOTION
    }

    return { ...outcome, nextTier: resolveNextTier(pricingItems, promotions, outcome) }
  }, [items, coupon, promotions])
}
