import { describe, expect, it } from 'vitest'
import { lockProposal, priceProposalDraft, proposalPricing } from '../pricing.ts'
import { buildOrderPayload } from '../../payment/orders.ts'
import { resolveOrderPricing, type CouponRule, type ProgressivePromotion } from '../../payment/pricing.ts'
import { formatPrice } from '../../formatters/price.ts'
import type { ManualDiscountDraft, ProposalLine } from '../types.ts'

/**
 * `PRC-06` — **o valor cobrado no Mercado Pago é o total que o link mostrou** (feature 89, T10).
 *
 * No molde de `shoppingParity`: medido pelas SERIALIZAÇÕES reais, nunca pelo número intermediário.
 *
 *   o que a cliente vê    `formatPrice(total)`, a frase do resumo da página do link
 *   o que o MP cobra      `buildOrderPayload(...).total_amount`, o corpo que o `create-payment` envia
 *
 * As duas pontas partem de `proposalPricing` sobre o MESMO travado (`lockProposal` do preço que o
 * painel mostrou ao montar). E a âncora que dá sentido à paridade: o travado, cobrado depois de o
 * catálogo mudar, continua valendo o que o painel mostrou — o cupom que venceu e a promoção que
 * acabou não desfazem a proposta (`PRC-03`).
 *
 * Se este arquivo puder ser satisfeito com a cobrança relendo o catálogo, a arquitetura falhou — é o
 * que o sensor no fim prova.
 */

/** "R$ 1.234,56" → "1234.56": o número que a cliente LÊ, na grafia do `total_amount`. */
const lido = (frase: string) => {
  const limpo = frase.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  expect(limpo).toMatch(/^\d+\.\d{2}$/)
  return limpo
}

const PAGADOR = {
  email: 'cliente@estrelinha.test',
  first_name: 'Ana',
  last_name: 'Souza',
  identification: { type: 'CPF', number: '39053344705' },
}

/** O corpo que o MP recebe para este total e este meio. */
const cobrado = (total: number, method: 'pix' | 'card') =>
  method === 'pix'
    ? buildOrderPayload({ orderId: 'pedido-1', total, payer: PAGADOR, method: 'pix' })
    : buildOrderPayload({
        orderId: 'pedido-1',
        total,
        payer: PAGADOR,
        method: 'card',
        card: { token: 'tok', payment_method_id: 'visa', installments: 1 },
      })

const linha = (product_id: string, list_price: number, quantity: number): ProposalLine => ({
  product_id,
  variant_id: null,
  list_price,
  quantity,
})

const promocao3x10: ProgressivePromotion = {
  id: 'promo-1',
  discount_kind: 'percent',
  tiers: [{ min_qty: 3, value: 10 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: true,
  created_at: '2026-10-01T00:00:00Z',
}

interface Caso {
  nome: string
  lines: ProposalLine[]
  coupon: CouponRule | null
  promotions: ProgressivePromotion[]
  manual: ManualDiscountDraft | null
  shipping: number
  method: 'pix' | 'card'
  pix: number
  /** O total que a AC promete, escrito por extenso. */
  esperado: string
}

const casos: Caso[] = [
  {
    nome: 'sem desconto, cartão',
    lines: [linha('a', 59.9, 1)],
    coupon: null,
    promotions: [],
    manual: null,
    shipping: 22.4,
    method: 'card',
    pix: 5,
    esperado: '82.30',
  },
  {
    nome: 'cupom percentual + combinado em R$, PIX',
    lines: [linha('a', 100, 1), linha('b', 40, 2)],
    coupon: { type: 'percent', value: 10 },
    promotions: [],
    manual: { kind: 'amount', value: 20, reason: 'Cliente antiga' },
    shipping: 18.5,
    method: 'pix',
    pix: 5,
    // 180 − 18 − 20 = 142; PIX 7,10; + 18,50
    esperado: '153.40',
  },
  {
    nome: 'combinado em %, cartão',
    lines: [linha('a', 80, 1)],
    coupon: { type: 'fixed', value: 15 },
    promotions: [],
    manual: { kind: 'percent', value: 10, reason: 'Aniversário' },
    shipping: 12,
    method: 'card',
    pix: 5,
    // 80 − 15 = 65; 10% = 6,50; 58,50 + 12
    esperado: '70.50',
  },
  {
    nome: 'promoção por quantidade travada no preço da linha, PIX',
    lines: [linha('a', 30, 3)],
    coupon: null,
    promotions: [promocao3x10],
    manual: null,
    shipping: 10,
    method: 'pix',
    pix: 5,
    // 3 × 27 = 81; PIX 4,05; + 10
    esperado: '86.95',
  },
  {
    nome: 'promoção + cupom que acumula + combinado, cartão',
    lines: [linha('a', 30, 3)],
    coupon: { type: 'fixed', value: 5 },
    promotions: [promocao3x10],
    manual: { kind: 'amount', value: 6, reason: 'Ajuste' },
    shipping: 10,
    method: 'card',
    pix: 5,
    // 81 − 5 − 6 + 10
    esperado: '80.00',
  },
]

describe('PRC-06 — o link mostra o que o Mercado Pago cobra', () => {
  it.each(casos)('$nome', (c) => {
    const preco = priceProposalDraft({ lines: c.lines, coupon: c.coupon, promotions: c.promotions, manualDiscount: c.manual })
    expect(preco.refusal).toBeNull()
    const travado = lockProposal(preco)
    const entrada = { shipping: c.shipping, method: c.method, pixDiscountPercent: c.pix, freeShipping: null }

    const naTela = lido(formatPrice(proposalPricing(travado, entrada).total))
    const corpo = cobrado(proposalPricing(travado, entrada).total, c.method)

    expect(corpo.total_amount).toBe(naTela)
    expect(corpo.transactions.payments[0].amount).toBe(naTela)
    expect(naTela).toBe(c.esperado)
  })

  it('o travado vale o que o painel mostrou: com o mesmo catálogo, é o total da loja sobre as mesmas escolhas', () => {
    // Sem frete grátis em jogo, a conta da loja (`resolveOrderPricing`) sobre os preços CHEIOS e a
    // regra do cupom dá o mesmo total que o travado: travar não muda o preço, só o congela.
    for (const c of casos) {
      const travado = lockProposal(
        priceProposalDraft({ lines: c.lines, coupon: c.coupon, promotions: c.promotions, manualDiscount: c.manual }),
      )
      const daProposta = proposalPricing(travado, { shipping: c.shipping, method: c.method, pixDiscountPercent: c.pix, freeShipping: null })
      const daLoja = resolveOrderPricing({
        items: c.lines.map((l) => ({ product_id: l.product_id, unit_price: l.list_price, quantity: l.quantity })),
        shipping: c.shipping,
        method: c.method,
        pixDiscountPercent: c.pix,
        coupon: c.coupon,
        promotions: c.promotions,
        manualDiscount: c.manual ? { kind: c.manual.kind, value: c.manual.value } : null,
      }).totals
      expect(cobrado(daProposta.total, c.method).total_amount).toBe(cobrado(daLoja.total, c.method).total_amount)
    }
  })

  it('PRC-05: cupom de frete grátis travado zera o frete nos dois lados', () => {
    const travado = lockProposal(
      priceProposalDraft({
        lines: [linha('a', 50, 1)],
        coupon: { type: 'free_shipping', value: 0 },
        promotions: [],
        manualDiscount: null,
      }),
    )
    expect(travado.couponFreeShipping).toBe(true)
    const entrada = { shipping: 27.9, method: 'card' as const, pixDiscountPercent: 5, freeShipping: null }
    const naTela = lido(formatPrice(proposalPricing(travado, entrada).total))
    expect(naTela).toBe('50.00')
    expect(cobrado(proposalPricing(travado, entrada).total, 'card').total_amount).toBe(naTela)
  })

  it.each([
    { faixa: 100, esperado: '100.00' },
    { faixa: 100.01, esperado: '127.90' },
  ])('A-11: faixa de frete grátis em $faixa, itens 100,00 → $esperado nos dois lados', ({ faixa, esperado }) => {
    const travado = lockProposal(
      priceProposalDraft({ lines: [linha('a', 100, 1)], coupon: null, promotions: [], manualDiscount: null }),
    )
    const entrada = {
      shipping: 27.9,
      method: 'card' as const,
      pixDiscountPercent: 5,
      freeShipping: { free_shipping_enabled: true, free_shipping_threshold: faixa },
    }
    const naTela = lido(formatPrice(proposalPricing(travado, entrada).total))
    expect(naTela).toBe(esperado)
    expect(cobrado(proposalPricing(travado, entrada).total, 'card').total_amount).toBe(naTela)
  })
})

describe('PRC-03 — a cobrança não relê o catálogo (sensor)', () => {
  // O caso que a feature existe para segurar: a Adri montou com cupom e promoção, a cliente paga
  // depois de o cupom vencer e a promoção acabar.
  const montagem = casos[4]
  const travado = lockProposal(
    priceProposalDraft({
      lines: montagem.lines,
      coupon: montagem.coupon,
      promotions: montagem.promotions,
      manualDiscount: montagem.manual,
    }),
  )
  const entrada = { shipping: montagem.shipping, method: montagem.method, pixDiscountPercent: montagem.pix, freeShipping: null }
  const naTela = lido(formatPrice(proposalPricing(travado, entrada).total))

  /** A cobrança INGÊNUA: o caminho de sempre do `create-payment`, relendo o catálogo de hoje. */
  const ingenua = (opts: { coupon: CouponRule | null; promotions: ProgressivePromotion[]; manual: boolean }) =>
    cobrado(
      resolveOrderPricing({
        items: montagem.lines.map((l) => ({ product_id: l.product_id, unit_price: l.list_price, quantity: l.quantity })),
        shipping: montagem.shipping,
        method: montagem.method,
        pixDiscountPercent: montagem.pix,
        coupon: opts.coupon,
        promotions: opts.promotions,
        manualDiscount: opts.manual && montagem.manual ? { kind: montagem.manual.kind, value: montagem.manual.value } : null,
      }).totals.total,
      montagem.method,
    ).total_amount

  it('o travado cobra o que o link mostrou, com o cupom vencido e a promoção encerrada', () => {
    expect(cobrado(proposalPricing(travado, entrada).total, montagem.method).total_amount).toBe(naTela)
    expect(naTela).toBe('80.00')
  })

  it('sensor: reler o catálogo de hoje (cupom vencido ⇒ sem cupom, promoção encerrada) reprova a paridade', () => {
    expect(ingenua({ coupon: null, promotions: [], manual: true })).not.toBe(naTela)
  })

  it('sensor: esquecer o desconto combinado reprova a paridade, mesmo com o catálogo igual', () => {
    expect(ingenua({ coupon: montagem.coupon, promotions: montagem.promotions, manual: false })).not.toBe(naTela)
  })

  it('sensor: o catálogo igual e o combinado presente passa — a régua não reprova tudo', () => {
    expect(ingenua({ coupon: montagem.coupon, promotions: montagem.promotions, manual: true })).toBe(naTela)
  })
})
