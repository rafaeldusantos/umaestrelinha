import { describe, expect, it } from 'vitest'
import { resolveOrderPricing, type ProgressivePromotion } from '../../payment/pricing.ts'
import {
  lockProposal,
  manualDiscountRefusal,
  priceProposalDraft,
  proposalLinesRefusal,
  proposalPricing,
  PROPOSAL_ZERO_REFUSAL,
} from '../pricing.ts'
import type { ProposalLine } from '../types.ts'

// MON-08, MON-09, PRC-01, PRC-03..06, A-11, A-12. Os números de cada caso foram feitos à mão a
// partir da spec.

const linha = (over: Partial<ProposalLine> = {}): ProposalLine => ({
  product_id: 'p1',
  variant_id: 'v1',
  list_price: 30,
  quantity: 1,
  ...over,
})

const KIT: ProgressivePromotion = {
  id: 'kit',
  discount_kind: 'unit_price',
  tiers: [{ min_qty: 5, value: 4.6 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00Z',
}

const motivo = 'Combinado no WhatsApp'

describe('priceProposalDraft — A-12: o desconto não pode zerar o pedido', () => {
  it('cupom e avulso cabem SOZINHOS e juntos levam os itens abaixo de R$ 1,00 ⇒ recusa', () => {
    const base = { lines: [linha()], promotions: [] }
    // 30 − 15 = 15 (cabe) · 30 − 14,50 = 15,50 (cabe) · 30 − 15 − 14,50 = 0,50 (não cabe)
    expect(priceProposalDraft({ ...base, coupon: { type: 'fixed', value: 15 }, manualDiscount: null }).refusal).toBeNull()
    expect(
      priceProposalDraft({ ...base, coupon: null, manualDiscount: { kind: 'amount', value: 14.5, reason: motivo } }).refusal,
    ).toBeNull()
    const juntos = priceProposalDraft({
      ...base,
      coupon: { type: 'fixed', value: 15 },
      manualDiscount: { kind: 'amount', value: 14.5, reason: motivo },
    })
    expect(juntos.refusal).toBe('O desconto não pode zerar o pedido.')
    expect(juntos.itemsTotal).toBe(0.5)
  })

  it('exatamente R$ 1,00 passa; R$ 0,99 não', () => {
    const com = (value: number) =>
      priceProposalDraft({
        lines: [linha()],
        promotions: [],
        coupon: null,
        manualDiscount: { kind: 'amount', value, reason: motivo },
      })
    expect(com(29).refusal).toBeNull()
    expect(com(29).itemsTotal).toBe(1)
    expect(com(29.01).refusal).toBe(PROPOSAL_ZERO_REFUSAL)
  })

  it('desconto que zera os itens (o cálculo de dinheiro lançaria) vira a mesma recusa, sem lançar', () => {
    const r = priceProposalDraft({
      lines: [linha()],
      promotions: [],
      coupon: { type: 'fixed', value: 10 },
      manualDiscount: { kind: 'amount', value: 50, reason: motivo },
    })
    expect(r.refusal).toBe(PROPOSAL_ZERO_REFUSAL)
    expect(r.itemsTotal).toBe(0)
    // Fecho da rodada 3 (N05b): o resumo da montagem recusada mostra os números de verdade — a
    // peça, o cupom e o avulso que coube —, não zeros; é o que diz à Adri quanto passou do ponto.
    expect(r.subtotal).toBe(30)
    expect(r.couponDiscount).toBe(10)
    expect(r.manualDiscount).toBe(20)
    expect(r.lockedLines.map((l) => l.unit_price)).toEqual([30])
  })

  it('cupom de frete grátis + avulso que zera: ainda recusa, sem lançar', () => {
    const r = priceProposalDraft({
      lines: [linha()],
      promotions: [],
      coupon: { type: 'free_shipping', value: 0 },
      manualDiscount: { kind: 'percent', value: 99.99, reason: motivo },
    })
    expect(r.refusal).toBe(PROPOSAL_ZERO_REFUSAL)
  })
})

describe('priceProposalDraft — o preço da montagem é o de resolveOrderPricing (MON-09, PRC-01)', () => {
  it('cupom 10% + R$ 20 combinado em duas peças: os mesmos números de resolveOrderPricing', () => {
    const lines = [linha({ list_price: 189.9 }), linha({ product_id: 'p2', variant_id: null, list_price: 59.9, quantity: 2 })]
    const r = priceProposalDraft({
      lines,
      promotions: [],
      coupon: { type: 'percent', value: 10 },
      manualDiscount: { kind: 'amount', value: 20, reason: motivo },
    })
    const ref = resolveOrderPricing({
      items: lines.map((l) => ({ product_id: l.product_id, unit_price: l.list_price, quantity: l.quantity })),
      shipping: 0,
      pixDiscountPercent: 0,
      method: 'card',
      coupon: { type: 'percent', value: 10 },
      promotions: [],
      manualDiscount: { kind: 'amount', value: 20 },
    })
    // 189,90 + 119,80 = 309,70 · cupom 30,97 · avulso 20 ⇒ 258,73
    expect(r.subtotal).toBe(309.7)
    expect(r.couponDiscount).toBe(30.97)
    expect(r.manualDiscount).toBe(20)
    expect(r.itemsTotal).toBe(258.73)
    expect(r.itemsTotal).toBe(ref.totals.total)
    expect(r.couponApplied).toBe(true)
    expect(r.refusal).toBeNull()
  })

  it('a promoção vencedora é TRAVADA no unit_price de cada linha (A-05)', () => {
    const r = priceProposalDraft({
      lines: [linha({ list_price: 5.9, quantity: 5 }), linha({ product_id: 'p2', list_price: 10, quantity: 1 })],
      promotions: [{ ...KIT, scope: 'categories', eligibleProductIds: ['p1'] }],
      coupon: null,
      manualDiscount: null,
    })
    expect(r.lockedLines.map((l) => l.unit_price)).toEqual([4.6, 10])
    expect(r.subtotal).toBe(33)
    expect(r.promotionDiscount).toBe(6.5)
    expect(r.winner).toBe('promotion')
  })

  it('cupom que vence a promoção: preço cheio nas linhas, cupom aplicado', () => {
    const r = priceProposalDraft({
      lines: [linha({ list_price: 5.9, quantity: 5 })],
      promotions: [KIT],
      coupon: { type: 'percent', value: 50 },
      manualDiscount: null,
    })
    expect(r.winner).toBe('coupon')
    expect(r.lockedLines[0].unit_price).toBe(5.9)
    expect(r.couponDiscount).toBe(14.75)
    expect(r.couponApplied).toBe(true)
  })

  it('cupom descartado pela promoção: não conta como aplicado nem trava frete grátis', () => {
    const r = priceProposalDraft({
      lines: [linha({ list_price: 5.9, quantity: 5 })],
      promotions: [KIT],
      coupon: { type: 'free_shipping', value: 0 },
      manualDiscount: null,
    })
    expect(r.discarded).toBe('coupon')
    expect(r.couponApplied).toBe(false)
    expect(r.couponFreeShipping).toBe(false)
  })

  it('cupom de frete grátis aplicado: bandeira travada, nenhum desconto nos itens', () => {
    const r = priceProposalDraft({ lines: [linha()], promotions: [], coupon: { type: 'free_shipping', value: 0 }, manualDiscount: null })
    expect(r.couponFreeShipping).toBe(true)
    expect(r.couponDiscount).toBe(0)
    expect(r.itemsTotal).toBe(30)
  })

  it('a entrada não é mutada, e a linha travada carrega a linha original', () => {
    const lines = [linha({ list_price: 5.9, quantity: 5 })]
    const copia = JSON.parse(JSON.stringify(lines))
    const r = priceProposalDraft({ lines, promotions: [KIT], coupon: null, manualDiscount: null })
    expect(lines).toEqual(copia)
    expect(r.lockedLines[0].line).toBe(lines[0])
  })
})

describe('recusas de limite e do avulso, na ordem: linhas → avulso → total', () => {
  it('linhas', () => {
    expect(proposalLinesRefusal([])).toBe('Acrescente pelo menos uma peça.')
    expect(proposalLinesRefusal(Array.from({ length: 31 }, () => linha()))).toBe('Uma proposta leva até 30 peças.')
    expect(proposalLinesRefusal(Array.from({ length: 30 }, () => linha()))).toBeNull()
    expect(proposalLinesRefusal([linha({ quantity: 0 })])).toBe('A quantidade de cada peça vai de 1 a 99.')
    expect(proposalLinesRefusal([linha({ quantity: 100 })])).toBe('A quantidade de cada peça vai de 1 a 99.')
    expect(proposalLinesRefusal([linha({ quantity: 1.5 })])).toBe('A quantidade de cada peça vai de 1 a 99.')
    expect(proposalLinesRefusal([linha({ quantity: 99 })])).toBeNull()
  })

  it('avulso: percentual 0,01..99,99, valor positivo, motivo obrigatório até 120', () => {
    expect(manualDiscountRefusal(null)).toBeNull()
    expect(manualDiscountRefusal({ kind: 'percent', value: 0, reason: motivo })).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    expect(manualDiscountRefusal({ kind: 'percent', value: 100, reason: motivo })).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    expect(manualDiscountRefusal({ kind: 'percent', value: 0.01, reason: motivo })).toBeNull()
    // O piso de 0,01% (A-12), por EXTENSO: abaixo dele, a frase — nunca o `check` do banco num 500.
    expect(manualDiscountRefusal({ kind: 'percent', value: 0.005, reason: motivo })).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    expect(manualDiscountRefusal({ kind: 'percent', value: 0.0099, reason: motivo })).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    // O motivo é contado APARADO, como o banco (`char_length(btrim(...))`): 120 com espaço em volta
    // passa, 121 de texto não.
    expect(manualDiscountRefusal({ kind: 'amount', value: 10, reason: `  ${'x'.repeat(120)} \t` })).toBeNull()
    expect(manualDiscountRefusal({ kind: 'amount', value: 10, reason: ` ${'x'.repeat(121)} ` })).toBe('O motivo do desconto vai até 120 caracteres.')
    expect(manualDiscountRefusal({ kind: 'percent', value: 99.99, reason: motivo })).toBeNull()
    expect(manualDiscountRefusal({ kind: 'amount', value: 0, reason: motivo })).toBe('Informe o valor do desconto combinado.')
    expect(manualDiscountRefusal({ kind: 'amount', value: 10, reason: '   ' })).toBe('Escreva o motivo do desconto combinado.')
    expect(manualDiscountRefusal({ kind: 'amount', value: 10, reason: 'x'.repeat(120) })).toBeNull()
    expect(manualDiscountRefusal({ kind: 'amount', value: 10, reason: 'x'.repeat(121) })).toBe(
      'O motivo do desconto vai até 120 caracteres.',
    )
  })

  it('a primeira recusa vence', () => {
    const r = priceProposalDraft({
      lines: [linha({ quantity: 0 })],
      promotions: [],
      coupon: null,
      manualDiscount: { kind: 'amount', value: 100, reason: '' },
    })
    expect(r.refusal).toBe('A quantidade de cada peça vai de 1 a 99.')
    const r2 = priceProposalDraft({
      lines: [linha()],
      promotions: [],
      coupon: null,
      manualDiscount: { kind: 'amount', value: 100, reason: '' },
    })
    expect(r2.refusal).toBe('Escreva o motivo do desconto combinado.')
    expect(priceProposalDraft({ lines: [], promotions: [], coupon: null, manualDiscount: null }).refusal).toBe(
      'Acrescente pelo menos uma peça.',
    )
  })
})

describe('proposalPricing — o que a cliente paga (PRC-03, PRC-05, PRC-06, A-11)', () => {
  // 2 × 110 = 220 · cupom 22 · avulso 10 ⇒ itens 188
  const travada = lockProposal(
    priceProposalDraft({
      lines: [linha({ list_price: 110, quantity: 2 })],
      promotions: [],
      coupon: { type: 'percent', value: 10 },
      manualDiscount: { kind: 'amount', value: 10, reason: motivo },
    }),
  )
  const SEM_FAIXA = { free_shipping_enabled: false, free_shipping_threshold: 0 }

  it('cartão: itens travados + frete cotado', () => {
    const t = proposalPricing(travada, { shipping: 24.8, method: 'card', pixDiscountPercent: 5, freeShipping: SEM_FAIXA })
    expect(t).toEqual({ subtotal: 220, couponDiscount: 22, manualDiscount: 10, pixDiscount: 0, shipping: 24.8, total: 212.8 })
  })

  it('PIX: 5% sobre (subtotal − cupom − avulso), frete fora da base', () => {
    // 188 × 5% = 9,40 ⇒ 188 − 9,40 + 24,80 = 203,40
    const t = proposalPricing(travada, { shipping: 24.8, method: 'pix', pixDiscountPercent: 5, freeShipping: SEM_FAIXA })
    expect(t.pixDiscount).toBe(9.4)
    expect(t.total).toBe(203.4)
  })

  it('o total dos itens é o mesmo número da montagem (sem frete, cartão)', () => {
    const t = proposalPricing(travada, { shipping: 0, method: 'card', pixDiscountPercent: 0, freeShipping: null })
    expect(t.total).toBe(188)
  })

  it('cupom free_shipping travado zera o frete da entrega escolhida (PRC-05)', () => {
    const fs = lockProposal(
      priceProposalDraft({ lines: [linha()], promotions: [], coupon: { type: 'free_shipping', value: 0 }, manualDiscount: null }),
    )
    const t = proposalPricing(fs, { shipping: 31.5, method: 'card', pixDiscountPercent: 0, freeShipping: SEM_FAIXA })
    expect(t.shipping).toBe(0)
    expect(t.total).toBe(30)
  })

  it('faixa de frete grátis: decidida sobre os itens DEPOIS dos descontos, dos dois lados do limiar', () => {
    const faixa = (threshold: number) => ({ free_shipping_enabled: true, free_shipping_threshold: threshold })
    // itens = 188: faixa de 188 é atingida, de 188,01 não.
    expect(proposalPricing(travada, { shipping: 20, method: 'card', pixDiscountPercent: 0, freeShipping: faixa(188) }).shipping).toBe(0)
    expect(proposalPricing(travada, { shipping: 20, method: 'card', pixDiscountPercent: 0, freeShipping: faixa(188.01) }).shipping).toBe(20)
    // Subtotal 220 atingiria uma faixa de 200; os descontos o levam a 188 ⇒ paga o frete.
    expect(proposalPricing(travada, { shipping: 20, method: 'card', pixDiscountPercent: 0, freeShipping: faixa(200) }).shipping).toBe(20)
  })

  it('interruptor desligado não dá frete grátis, mesmo acima da faixa guardada', () => {
    const t = proposalPricing(travada, {
      shipping: 20,
      method: 'card',
      pixDiscountPercent: 0,
      freeShipping: { free_shipping_enabled: false, free_shipping_threshold: 50 },
    })
    expect(t.shipping).toBe(20)
  })

  it('não relê promoção nem cupom: o preço travado vale mesmo que hoje fossem outros', () => {
    const t = proposalPricing(
      { lines: [{ unit_price: 4.6, quantity: 5 }], couponDiscount: 3.45, couponFreeShipping: false, manualDiscount: 0 },
      { shipping: 0, method: 'card', pixDiscountPercent: 0, freeShipping: null },
    )
    expect(t.subtotal).toBe(23)
    expect(t.total).toBe(19.55)
  })
})
