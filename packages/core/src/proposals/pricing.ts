// O preço da proposta (feature 89) — dois cálculos, cada um com os seus chamadores.
//
//   priceProposalDraft  — "quanto dá esta montagem?": o painel ao montar (MON-09) e a function
//                         `order-proposals` ao gravar (PRC-01) chamam IGUAL, sobre a mesma entrada.
//   proposalPricing     — "quanto a cliente paga, com esta entrega e este meio?": a página do link,
//                         o `create-order` e o `create-payment` chamam IGUAL (PRC-06).
//
// Os dois passam por `resolveOrderPricing`/`calculateOrderTotals` (`core/payment/pricing.ts`), que é
// o dono do dinheiro: nenhuma conta de desconto é escrita aqui. Todo import tem `.ts` — o grafo é
// resolvido pelo Deno nas functions.

import {
  applyProgressiveDiscount,
  calculateOrderTotals,
  resolveOrderPricing,
  type CouponRule,
  type OrderPricingOutcome,
  type OrderTotals,
  type ProgressivePromotion,
} from '../payment/pricing.ts'
import { freeShippingState, type FreeShippingConfig } from '../shipping/freeShipping.ts'
import {
  MANUAL_PERCENT_MAX,
  MANUAL_PERCENT_MIN,
  MANUAL_REASON_MAX,
  PROPOSAL_MAX_LINES,
  PROPOSAL_MAX_QTY,
  PROPOSAL_MIN_ITEMS_TOTAL,
} from './limits.ts'
import type { LockedLine, LockedProposal, ManualDiscountDraft, ProposalLine } from './types.ts'

const round2 = (value: number) => Math.round(value * 100) / 100

export const PROPOSAL_ZERO_REFUSAL = 'O desconto não pode zerar o pedido.'

/** As linhas cabem nos limites? `null` = sim. */
export function proposalLinesRefusal(lines: readonly ProposalLine[]): string | null {
  if (!lines || lines.length === 0) return 'Acrescente pelo menos uma peça.'
  if (lines.length > PROPOSAL_MAX_LINES) return `Uma proposta leva até ${PROPOSAL_MAX_LINES} peças.`
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > PROPOSAL_MAX_QTY) {
      return `A quantidade de cada peça vai de 1 a ${PROPOSAL_MAX_QTY}.`
    }
  }
  return null
}

/** O desconto avulso é gravável? `null` = sim, ou não há desconto (MON-08, A-12). */
export function manualDiscountRefusal(manual: ManualDiscountDraft | null | undefined): string | null {
  if (!manual) return null
  const value = manual.value
  if (manual.kind === 'percent') {
    if (!Number.isFinite(value) || value < MANUAL_PERCENT_MIN || value > MANUAL_PERCENT_MAX) {
      return 'O desconto em percentual vai de 0,01% a 99,99%.'
    }
  } else if (!Number.isFinite(value) || value <= 0) {
    return 'Informe o valor do desconto combinado.'
  }
  // Aparado, como o banco conta (`char_length(btrim(manual_discount_reason))`, migration da 89) e
  // como a function `order-proposals` grava. Contar sem aparar recusaria na tela um motivo de 120
  // caracteres com espaço no fim que o banco aceita (fecho da rodada 1 do Verifier, C06).
  const reason = typeof manual.reason === 'string' ? manual.reason.trim() : ''
  if (reason === '') return 'Escreva o motivo do desconto combinado.'
  if (reason.length > MANUAL_REASON_MAX) {
    return `O motivo do desconto vai até ${MANUAL_REASON_MAX} caracteres.`
  }
  return null
}

export interface ProposalDraftInput<L extends ProposalLine = ProposalLine> {
  lines: readonly L[]
  /** O cupom já conferido por `couponRefusal`; `null` sem cupom. */
  coupon: CouponRule | null
  promotions: readonly ProgressivePromotion[]
  manualDiscount: ManualDiscountDraft | null
}

export interface ProposalDraftPrice<L extends ProposalLine = ProposalLine> {
  /** Uma por linha, na mesma ordem, com o `unit_price` travado (já com a promoção que venceu). */
  lockedLines: LockedLine<L>[]
  /** Soma dos preços travados. */
  subtotal: number
  /** Quanto a promoção tirou do preço cheio (só para mostrar; já está nos `unit_price`). */
  promotionDiscount: number
  couponDiscount: number
  /** O cupom entrou no cálculo (venceu, ou acumulou com a promoção)? */
  couponApplied: boolean
  /** O cupom aplicado é de frete grátis (PRC-05). */
  couponFreeShipping: boolean
  manualDiscount: number
  /** subtotal − cupom − avulso: o que os itens somam. */
  itemsTotal: number
  winner: OrderPricingOutcome['winner']
  discarded: OrderPricingOutcome['discarded']
  /** A primeira recusa, ou `null`. Com recusa, os números são informativos e nada é gravável. */
  refusal: string | null
}

function priceItems(input: ProposalDraftInput, shipping: number): OrderPricingOutcome {
  return resolveOrderPricing({
    items: input.lines.map((l) => ({
      product_id: l.product_id,
      unit_price: l.list_price,
      quantity: l.quantity,
    })),
    // O frete ainda não existe — a cliente escolhe no link. Zero é a mesma entrada que a loja usa
    // antes da cotação. Consequência declarada: um cupom de frete grátis que não acumula perde para
    // uma promoção que aplica, como na loja com o frete em zero.
    shipping,
    pixDiscountPercent: 0,
    method: 'card',
    coupon: input.coupon,
    promotions: input.promotions,
    manualDiscount: input.manualDiscount
      ? { kind: input.manualDiscount.kind, value: input.manualDiscount.value }
      : null,
  })
}

/**
 * MON-08, MON-09, PRC-01, PRC-04, A-12: o preço da montagem. Painel e servidor chamam igual.
 *
 * O avulso é aplicado por `resolveOrderPricing` (depois de promoção e cupom, antes do PIX). A recusa
 * de A-12 olha cupom + avulso JUNTOS: cada um pode caber sozinho e os dois levarem os itens abaixo
 * de R$ 1,00.
 */
export function priceProposalDraft<L extends ProposalLine>(
  input: ProposalDraftInput<L>,
): ProposalDraftPrice<L> {
  const linesRefusal = proposalLinesRefusal(input.lines)
  const manualRefusal = linesRefusal ? null : manualDiscountRefusal(input.manualDiscount)

  let outcome: OrderPricingOutcome | null = null
  if (input.lines.length > 0) {
    try {
      outcome = priceItems(input, 0)
    } catch {
      // `calculateOrderTotals` recusa total abaixo de R$ 0,01 lançando — com o frete em zero, é o
      // desconto zerando os itens. Os números do resumo saem de uma segunda conta com um frete de
      // R$ 1,00 só para não lançar; a recusa é a de A-12. Com cupom de frete grátis o frete também
      // some e a segunda conta lança igual: aí não há número a mostrar, só a recusa.
      try {
        outcome = priceItems(input, 1)
      } catch {
        outcome = null
      }
    }
  }

  if (!outcome) {
    return {
      lockedLines: [],
      subtotal: 0,
      promotionDiscount: 0,
      couponDiscount: 0,
      couponApplied: false,
      couponFreeShipping: false,
      manualDiscount: 0,
      itemsTotal: 0,
      winner: 'none',
      discarded: null,
      refusal: linesRefusal ?? manualRefusal ?? PROPOSAL_ZERO_REFUSAL,
    }
  }

  const promotionWon = outcome.winner === 'promotion' || outcome.winner === 'both'
  const charged = promotionWon
    ? applyProgressiveDiscount(
        input.lines.map((l) => ({ product_id: l.product_id, unit_price: l.list_price, quantity: l.quantity })),
        input.promotions,
      ).items
    : null

  const lockedLines = input.lines.map((line, i) => ({
    line,
    unit_price: charged ? charged[i].unit_price : round2(line.list_price),
  }))

  const couponApplied = !!input.coupon && (outcome.winner === 'coupon' || outcome.winner === 'both')
  const subtotal = outcome.totals.subtotal
  const couponDiscount = outcome.totals.couponDiscount
  const manualDiscount = outcome.totals.manualDiscount ?? 0
  const itemsTotal = round2(subtotal - couponDiscount - manualDiscount)

  // Se a primeira conta lançou, a segunda deu itens em zero: a mesma régua recusa.
  const totalRefusal = itemsTotal < PROPOSAL_MIN_ITEMS_TOTAL ? PROPOSAL_ZERO_REFUSAL : null

  return {
    lockedLines,
    subtotal,
    promotionDiscount: outcome.promotionDiscount,
    couponDiscount,
    couponApplied,
    couponFreeShipping: couponApplied && input.coupon?.type === 'free_shipping',
    manualDiscount,
    itemsTotal: Math.max(0, itemsTotal),
    winner: outcome.winner,
    discarded: outcome.discarded,
    refusal: linesRefusal ?? manualRefusal ?? totalRefusal,
  }
}

/** O travado a partir do preço da montagem — o que se grava e o que se cobra. */
export function lockProposal(price: ProposalDraftPrice): LockedProposal {
  return {
    lines: price.lockedLines.map((l) => ({ unit_price: l.unit_price, quantity: l.line.quantity })),
    couponDiscount: price.couponDiscount,
    couponFreeShipping: price.couponFreeShipping,
    manualDiscount: price.manualDiscount,
  }
}

export interface ProposalPricingInput {
  /** O frete COTADO da entrega escolhida; quem zera é esta função. */
  shipping: number
  method: 'pix' | 'card'
  pixDiscountPercent: number
  /** `store_settings.shipping` — o frete grátis tem um dono só (`freeShippingState`, A-11). */
  freeShipping: FreeShippingConfig | null
}

/**
 * PRC-03, PRC-05, PRC-06, A-11: quanto a cliente paga pela proposta travada.
 *
 * Não relê catálogo, promoção nem regra de cupom: os preços são os das linhas, o cupom é o valor
 * travado. O frete é zerado pelo cupom `free_shipping` ou pela faixa de frete grátis, conferida sobre
 * o que os itens somam depois dos descontos. O avulso entra como valor em reais — o mesmo
 * `calculateOrderTotals` o aplica depois do cupom e antes do PIX.
 */
export function proposalPricing(locked: LockedProposal, input: ProposalPricingInput): OrderTotals {
  const items = locked.lines.map((l) => ({ unit_price: l.unit_price, quantity: l.quantity }))
  const subtotal = round2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0))
  const base = round2(subtotal - locked.couponDiscount - locked.manualDiscount)
  const freeByThreshold = input.freeShipping ? freeShippingState(input.freeShipping, base).reached : false
  const shipping = locked.couponFreeShipping || freeByThreshold ? 0 : input.shipping

  return calculateOrderTotals({
    items,
    shipping,
    couponDiscount: locked.couponDiscount,
    pixDiscountPercent: input.pixDiscountPercent,
    method: input.method,
    manualDiscount: { kind: 'amount', value: locked.manualDiscount },
  })
}
