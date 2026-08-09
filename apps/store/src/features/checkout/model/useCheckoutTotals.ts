// Totais do checkout one-page — a **única** fonte do valor exibido (CHK-05, CHK-06, BMP-03).
//
// Existe para que o resumo (`OrderSummary`) e o rótulo do CTA (`CheckoutPage`) não tenham duas
// contas parecidas: os dois leem daqui. E o que está aqui tem de dar o MESMO número que o recálculo
// server-side de `supabase/functions/mercado-pago/handlers.ts` — é isso que faz "exibido == cobrado".
//
// Espelhamento — hoje é **uma chamada só** (não mudar um lado sem o outro):
//
//   `resolveOrderPricing` é o ponto ÚNICO que decide o total, e a edge function chama exatamente a
//   mesma função com as mesmas entradas. Antes da feature 17 este arquivo espelhava o servidor PASSO
//   A PASSO, à mão — base do cupom, ordem de aplicação, quem zera o frete — e cada passo era uma
//   chance de divergir; foi um deles que produziu o defeito de 1 centavo (`3 × 29,90 + cupom 15%`
//   exibia 72,43 e cobrava 72,44). Com um terceiro desconto entrando, a superfície espelhada tinha
//   de ENCOLHER, e encolheu para estes dois itens:
//
//    1. `pricingItems` leva o **preço cheio DA LINHA** (`item.unitPrice`, nunca `product.price`) + o
//       objeto `bump`. ⚠️ Passar item já descontado aplicaria o desconto duas vezes
//       (carry-forward #1) — `applyOrderBump` e `applyProgressiveDiscount` não são idempotentes por
//       composição.
//    2. `shipping` que entra é o frete **COTADO**. Quem zera para cupom `free_shipping` é a própria
//       `resolveOrderPricing` — zerar aqui antes faria o caminho do cupom perder a única coisa que
//       ele desconta, e a comparação "promoção vs cupom" pelo total final (D2) daria a resposta
//       errada para todo cupom de frete.
//
// O que NÃO é mais decidido aqui: a base do cupom, o desconto do cupom, o desconto das faixas e o
// veredito entre os dois. Tudo isso é `resolveOrderPricing`.
import { useMemo } from 'react'
import type { Product } from '@estrelinha/supabase/types'
import {
  applyProgressiveDiscount,
  resolveOrderPricing,
  type OrderBumpConfig,
  type OrderPricingOutcome,
  type OrderTotals,
  type PricingItem,
} from '@estrelinha/core/payment/pricing'
import { useActivePromotions } from '@estrelinha/core/hooks/usePromotions'
import {
  useCheckoutSettings,
  usePaymentSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { useCartStore, type CartItem } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useProductById } from '@/entities/product'
import { useCheckoutStore } from './checkoutStore'

export interface CheckoutTotals {
  items: CartItem[]
  /** Itens com **preço cheio**, na ordem em que vão para `order_items`. */
  pricingItems: PricingItem[]
  bump: OrderBumpConfig
  /** Produto do bump quando marcado e elegível; `null` caso contrário. */
  bumpProduct: Product | null
  /** Subtotal do carrinho, sem o bump — base da faixa de frete grátis. */
  cartSubtotal: number
  /**
   * PRM-15: o subtotal **antes** do desconto de faixa — é este que o resumo exibe, com
   * `Desconto progressivo −R$ X` na linha logo abaixo. Mesma forma da gaveta.
   *
   * `totals.subtotal` é o subtotal realmente **cobrado** (bump e faixa já embutidos) e segue sendo a
   * base do cupom e o que o pedido grava. Exibi-lo ao lado da linha de desconto é que fazia o resumo
   * do checkout parecer descontar duas vezes, enquanto a gaveta mostrava o cheio — duas superfícies
   * lendo a mesma regra e apresentando o subtotal de formas diferentes.
   */
  subtotalBeforePromotion: number
  couponDiscount: number
  /** Frete **realmente cobrado**: o cotado, ou zero quando o cupom é `free_shipping`. */
  shippingCost: number
  /** PRM-15/PRM-16: desconto das faixas, já embutido em `totals.subtotal`. Zero quando não aplicou. */
  promotionDiscount: number
  /**
   * PRM-12: as faixas que de fato alteraram preço no caminho VENCEDOR — é este `applied` que a
   * `CheckoutPage` grava em `orders.promotion_id`, com a mesma regra do servidor (uma só ⇒ o id;
   * zero ou duas ⇒ `null`).
   *
   * Não confundir com o `wouldApply` de `promotionName` logo abaixo: aquele responde "que faixa
   * teria aplicado", para nomear a campanha mesmo quando o cupom venceu. Este responde "o que a
   * cliente está vendo", e é o único que pode virar registro do pedido.
   */
  applied: OrderPricingOutcome['applied']
  /**
   * Nome da campanha, para a frase de PRM-17 — "a promoção **Kit de joias** desconta mais".
   *
   * Sai de `applyProgressiveDiscount`, a MESMA função pura do desconto, e não do `applied` do
   * outcome: quando o cupom vence, `resolveOrderPricing` devolve o caminho do cupom, cujo `applied`
   * é vazio, e o nome do descartado se perderia justamente no caso em que a frase precisa dele.
   */
  promotionName: string | null
  /** Quem venceu entre promoção e cupom (D2). */
  winner: OrderPricingOutcome['winner']
  /** O descartado, quando houve escolha — é ele que a frase do resumo nomeia (PRM-17). */
  discarded: OrderPricingOutcome['discarded']
  pixDiscountPercent: number
  method: 'pix' | 'card' | null
  totals: OrderTotals
  /**
   * RSM-06: o total **sem** desconto PIX, qualquer que seja o método escolhido. A sub-linha
   * "no cartão: Nx de R$ Y" responde "e se eu pagasse no cartão?" — derivá-la do total exibido
   * com PIX anunciaria uma parcela que o cartão não pratica.
   */
  cardTotal: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function useCheckoutTotals(): CheckoutTotals {
  const items = useCartStore((s) => s.items)
  const cartSubtotal = useCartStore((s) => s.subtotal())
  const coupon = useCouponStore((s) => s.applied)
  const shipping = useCheckoutStore((s) => s.shipping)
  const method = useCheckoutStore((s) => s.payment.method)
  const bumpChecked = useCheckoutStore((s) => s.bumpChecked)

  const checkout = useCheckoutSettings()
  const { pix_discount_percent } = usePaymentSettings()
  // Carregando ou em erro, `useActivePromotions` devolve `[]`: preço cheio, sem linha. O total nunca
  // aparece descontado e volta.
  const { data: promotions } = useActivePromotions()

  const bump = useMemo<OrderBumpConfig>(
    () => ({
      enabled: checkout.order_bump_enabled,
      product_id: checkout.order_bump_product_id,
      discount_percent: checkout.order_bump_discount_percent,
    }),
    [
      checkout.order_bump_enabled,
      checkout.order_bump_product_id,
      checkout.order_bump_discount_percent,
    ],
  )

  const wantsBump = bumpChecked && bump.enabled ? bump.product_id : null
  const bumpProduct = useProductById(wantsBump).data ?? null

  return useMemo(() => {
    const pricingItems: PricingItem[] = items.map((item) => ({
      product_id: item.product.id,
      // `item.unitPrice`, **nunca** `item.product.price`: com grade os dois DIVERGEM
      // (`cartStore.ts:121`). `unitPrice` é o preço que o `cartStore.subtotal()` soma, o que a gaveta
      // precifica (`useCartPromotion.ts:151`) e o que o servidor reprecifica por `resolveItemPrice`
      // a partir do `price_source` congelado no item (`handlers.ts:377`).
      //
      // Com o preço BASE aqui, o desconto de faixa que esta tela exibia — e que a `CheckoutPage`
      // grava em `orders.promotion_discount` — saía do preço errado. Numa variação mais barata que o
      // base, o gravado ficava MAIOR que o recalculado, e a guarda de teto de PRM-12
      // (`handlers.ts:574`) devolvia 422 `promotion_no_longer_valid` num pagamento legítimo, de novo
      // a cada recarga. Os três lugares têm de ler o mesmo preço por item; este é o preço.
      unit_price: item.unitPrice,
      quantity: item.quantity,
    }))
    if (bumpProduct) {
      pricingItems.push({
        product_id: bumpProduct.id,
        unit_price: bumpProduct.price,
        quantity: 1,
      })
    }

    // O frete COTADO entra na função; quem zera para `free_shipping` é ela. Ver o item 2 do topo.
    const quotedShipping = shipping?.cost ?? 0

    const pricingFor = (chosen: 'pix' | 'card') =>
      resolveOrderPricing({
        items: pricingItems,
        shipping: quotedShipping,
        pixDiscountPercent: pix_discount_percent,
        method: chosen,
        bump,
        coupon: coupon ? { type: coupon.type, value: coupon.value } : null,
        promotions,
      })

    let outcome: OrderPricingOutcome
    let cardTotal: number
    try {
      // Sem método escolhido ainda: mostra o valor sem desconto PIX (o maior dos dois).
      outcome = pricingFor(method ?? 'card')
      // Uma conta a mais pela MESMA função do servidor — zero risco de divergir dele (RSM-06).
      cardTotal = method === 'pix' ? pricingFor('card').totals.total : outcome.totals.total
    } catch {
      // Total abaixo de R$ 0,01: a criação do pagamento é bloqueada server-side (herdado da 02).
      // Aqui o resumo só não pode quebrar a tela.
      outcome = {
        totals: {
          subtotal: round2(
            pricingItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
          ),
          couponDiscount: 0,
          pixDiscount: 0,
          shipping: quotedShipping,
          total: 0,
        },
        promotionDiscount: 0,
        applied: [],
        winner: 'none',
        discarded: null,
      }
      cardTotal = 0
    }

    // O nome do descartado (PRM-17) tem de sobreviver ao caso em que o CUPOM vence — e nesse caso
    // `outcome.applied` está vazio, porque o outcome devolvido é o do caminho do cupom. Daí perguntar
    // à mesma função pura quais faixas teriam aplicado; nenhuma aritmética nova.
    const wouldApply = applyProgressiveDiscount(pricingItems, promotions).applied
    const promotionName =
      wouldApply.length > 0
        ? (promotions.find((promo) => promo.id === wouldApply[0].promotion_id)?.name ?? null)
        : null

    return {
      items,
      pricingItems,
      bump,
      bumpProduct,
      cartSubtotal,
      // Reconstituído do outcome, não somado do carrinho: `totals.subtotal` já inclui o bump, e o
      // carrinho não o conhece. Somar `promotionDiscount` de volta é a única conta que devolve
      // exatamente o subtotal de antes da faixa, com o bump preservado.
      subtotalBeforePromotion: round2(outcome.totals.subtotal + outcome.promotionDiscount),
      couponDiscount: outcome.totals.couponDiscount,
      shippingCost: outcome.totals.shipping,
      promotionDiscount: outcome.promotionDiscount,
      applied: outcome.applied,
      promotionName,
      winner: outcome.winner,
      discarded: outcome.discarded,
      pixDiscountPercent: pix_discount_percent,
      method,
      totals: outcome.totals,
      cardTotal,
    }
  }, [
    items,
    cartSubtotal,
    coupon,
    shipping?.cost,
    method,
    bump,
    bumpProduct,
    pix_discount_percent,
    promotions,
  ])
}
