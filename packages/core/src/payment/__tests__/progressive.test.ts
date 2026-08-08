import { describe, expect, it } from 'vitest'
import {
  applyOrderBump,
  applyProgressiveDiscount,
  calculateOrderTotals,
  countEligibleUnits,
  perItemMin,
  resolveOrderPricing,
  resolveProgressiveTier,
  tierUnitPrice,
  type OrderBumpConfig,
  type OrderPricingInput,
  type PricingItem,
  type ProgressivePromotion,
  type ProgressiveTier,
} from '../pricing'

// Feature 17 — desconto progressivo por quantidade.
//
// PRM-08 (`resolveProgressiveTier`: a maior faixa alcançada) · PRM-09 (`applyProgressiveDiscount`:
// pura, sem mutar, nunca aumenta preço) · PRM-14 (sobreposição: menor `unit_price`, empate pelo
// `created_at` mais antigo) · A7 (a faixa conta UNIDADES) · A10 (a faixa nunca aumenta preço).
//
// As asserções são derivadas das ACs, não do código: os valores esperados foram calculados à mão a
// partir da spec antes de a implementação existir.

const KIT: ProgressiveTier[] = [
  { min_qty: 3, value: 5.0 },
  { min_qty: 5, value: 4.6 },
  { min_qty: 10, value: 4.2 },
]

const promo = (over: Partial<ProgressivePromotion> = {}): ProgressivePromotion => ({
  id: 'promo-kit',
  discount_kind: 'unit_price',
  tiers: KIT,
  scope: 'categories',
  eligibleProductIds: ['pin-a', 'pin-b'],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00Z',
  ...over,
})

const item = (over: Partial<PricingItem> = {}): PricingItem => ({
  product_id: 'pin-a',
  unit_price: 5.9,
  quantity: 1,
  ...over,
})

describe('countEligibleUnits — a faixa conta UNIDADES, não produtos distintos (A7)', () => {
  it('5 unidades do MESMO produto contam 5', () => {
    // "5 unidades do mesmo botton é um kit de 5" — o desenho da cartela já assumia isso
    // ("dois Narutos ocupam dois slots").
    expect(countEligibleUnits([item({ quantity: 5 })], promo())).toBe(5)
  })

  it('soma a quantidade de produtos elegíveis distintos', () => {
    const units = countEligibleUnits(
      [item({ product_id: 'pin-a', quantity: 2 }), item({ product_id: 'pin-b', quantity: 3 })],
      promo(),
    )
    expect(units).toBe(5)
  })

  it('ignora item cujo product_id não está na elegibilidade', () => {
    const units = countEligibleUnits(
      [item({ product_id: 'pin-a', quantity: 2 }), item({ product_id: 'caneca', quantity: 9 })],
      promo(),
    )
    expect(units).toBe(2)
  })

  it('promoção sem nenhum produto elegível conta zero (nunca "toda a loja")', () => {
    // Espelha o `on delete cascade`: categoria apagada ⇒ promoção sem vínculo ⇒ não desconta de
    // ninguém. É AC (PRM-10 / P1-B AC 9), não zelo.
    const units = countEligibleUnits(
      [item({ quantity: 9 })],
      promo({ eligibleProductIds: [] }),
    )
    expect(units).toBe(0)
  })

  it('scope "all" ignora eligibleProductIds, mesmo vazio', () => {
    const units = countEligibleUnits(
      [item({ product_id: 'caneca', quantity: 4 })],
      promo({ scope: 'all', eligibleProductIds: [] }),
    )
    expect(units).toBe(4)
  })

  it('item sem product_id não é elegível em scope "categories", mas é em "all"', () => {
    const anonymous: PricingItem = { unit_price: 5.9, quantity: 3 }
    expect(countEligibleUnits([anonymous], promo())).toBe(0)
    expect(countEligibleUnits([anonymous], promo({ scope: 'all' }))).toBe(3)
  })

  it('carrinho vazio conta zero', () => {
    expect(countEligibleUnits([], promo())).toBe(0)
  })
})

describe('resolveProgressiveTier — a MAIOR faixa com min_qty ≤ n (PRM-08)', () => {
  it('7 unidades pegam a faixa de 5, não a de 3 nem a de 10', () => {
    expect(resolveProgressiveTier([item({ quantity: 7 })], promo())).toEqual({
      min_qty: 5,
      value: 4.6,
    })
  })

  it('a fronteira exata pega a própria faixa', () => {
    expect(resolveProgressiveTier([item({ quantity: 3 })], promo())?.min_qty).toBe(3)
    expect(resolveProgressiveTier([item({ quantity: 5 })], promo())?.min_qty).toBe(5)
    expect(resolveProgressiveTier([item({ quantity: 10 })], promo())?.min_qty).toBe(10)
  })

  it('acima da última faixa continua na última', () => {
    expect(resolveProgressiveTier([item({ quantity: 40 })], promo())?.min_qty).toBe(10)
  })

  it('abaixo da menor faixa devolve null (P1-B AC 2)', () => {
    expect(resolveProgressiveTier([item({ quantity: 2 })], promo())).toBeNull()
  })

  it('promoção ativa e vigente mas SEM faixas devolve null', () => {
    // Edge case explícito da spec: "promoção ativa e vigente mas sem faixas ⇒ nenhum desconto".
    expect(resolveProgressiveTier([item({ quantity: 50 })], promo({ tiers: [] }))).toBeNull()
  })

  it('a ORDEM das faixas na entrada é irrelevante', () => {
    // Edge case da spec: "faixas gravadas fora de ordem ⇒ a leitura ordena por min_qty; ordem de
    // inserção não é contrato". O banco não garante ordem de retorno sem `order by`.
    const foraDeOrdem: ProgressiveTier[] = [
      { min_qty: 10, value: 4.2 },
      { min_qty: 3, value: 5.0 },
      { min_qty: 5, value: 4.6 },
    ]
    expect(resolveProgressiveTier([item({ quantity: 7 })], promo({ tiers: foraDeOrdem }))).toEqual({
      min_qty: 5,
      value: 4.6,
    })
  })

  it('não muta a lista de faixas recebida', () => {
    const tiers: ProgressiveTier[] = [
      { min_qty: 10, value: 4.2 },
      { min_qty: 3, value: 5.0 },
    ]
    resolveProgressiveTier([item({ quantity: 12 })], promo({ tiers }))
    expect(tiers.map((t) => t.min_qty)).toEqual([10, 3])
  })

  it('conta as unidades ELEGÍVEIS, não as do carrinho todo', () => {
    // 2 elegíveis + 8 não elegíveis = 10 no carrinho, mas nenhuma faixa alcançada.
    const result = resolveProgressiveTier(
      [item({ product_id: 'pin-a', quantity: 2 }), item({ product_id: 'caneca', quantity: 8 })],
      promo(),
    )
    expect(result).toBeNull()
  })
})

describe('tierUnitPrice — o preço que a faixa produz', () => {
  it('unit_price: a unidade passa a custar o valor da faixa', () => {
    expect(tierUnitPrice(8.0, 'unit_price', 5.0)).toBe(5.0)
  })

  it('unit_price NUNCA aumenta o preço: botton de R$ 3,90 numa faixa de R$ 4,60 fica R$ 3,90 (A10)', () => {
    expect(tierUnitPrice(3.9, 'unit_price', 4.6)).toBe(3.9)
  })

  it('percent: round2(cheio × (1 − pct/100))', () => {
    // 4,90 × 0,85 = 4,165 ⇒ 4,17
    expect(tierUnitPrice(4.9, 'percent', 15)).toBe(4.17)
    // 5,00 × 0,90 = 4,50
    expect(tierUnitPrice(5.0, 'percent', 10)).toBe(4.5)
  })

  it('percent arredonda POR ITEM, e isso muda o total (P1-B AC 4)', () => {
    // A disciplina que o defeito de 1 centavo do cupom ensinou. Com 3 × R$ 29,90 e 15%:
    //   por item : round2(29,90 × 0,85) = round2(25,415) = 25,42  ⇒  × 3 = 76,26
    //   pelo total: round2(89,70 × 0,85) = round2(76,245) = 76,24  (o float dá 76,24499…)
    // Os dois números são DIFERENTES, então "por item" não é detalhe de estilo.
    const perItem = tierUnitPrice(29.9, 'percent', 15)
    expect(perItem).toBe(25.42)
    expect(perItem * 3).toBeCloseTo(76.26, 10)

    const naiveTotal = Math.round(29.9 * 3 * 0.85 * 100) / 100
    expect(naiveTotal).toBe(76.24)
    expect(naiveTotal).not.toBe(perItem * 3)
  })

  it('percent nunca aumenta o preço, qualquer que seja o valor (A10 como propriedade)', () => {
    // O trigger `validate_promotion_tier` limita `percent` a 1–90 no banco, mas a invariante é da
    // FUNÇÃO: ela não pode devolver acima do cheio nem se receber um valor que o banco recusaria.
    for (const pct of [1, 15, 50, 90]) {
      expect(tierUnitPrice(5.9, 'percent', pct)).toBeLessThanOrEqual(5.9)
    }
    expect(tierUnitPrice(5.9, 'percent', -100)).toBe(5.9)
  })

  it('preço cheio com resíduo de float sai arredondado a 2 casas', () => {
    // 0,1 + 0,2 = 0,30000000000000004; a faixa não pode propagar o resíduo para o subtotal.
    expect(tierUnitPrice(0.1 + 0.2, 'unit_price', 99)).toBe(0.3)
  })
})

describe('applyProgressiveDiscount — aplica a melhor faixa de cada promoção (PRM-09)', () => {
  it('a faixa alcançada vale para TODAS as unidades elegíveis', () => {
    // O caso central da spec: 5 bottons de R$ 5,90 na faixa de 5 un a R$ 4,60 ⇒ R$ 23,00.
    const items = [item({ quantity: 5 })]
    const { items: next } = applyProgressiveDiscount(items, [promo()])
    expect(next[0].unit_price).toBe(4.6)
    expect(next[0].unit_price * next[0].quantity).toBe(23)
  })

  it('nenhuma faixa alcançada ⇒ lista INALTERADA e applied vazio (P1-B AC 2)', () => {
    const items = [item({ quantity: 2 })]
    const result = applyProgressiveDiscount(items, [promo()])
    expect(result.items).toEqual(items)
    expect(result.applied).toEqual([])
  })

  it('sem promoção nenhuma ⇒ lista inalterada', () => {
    const items = [item({ quantity: 9 })]
    const result = applyProgressiveDiscount(items, [])
    expect(result.items).toEqual(items)
    expect(result.applied).toEqual([])
  })

  it('não muta a entrada, e duas chamadas com o mesmo input dão o mesmo resultado', () => {
    const items = [item({ quantity: 5 })]
    const first = applyProgressiveDiscount(items, [promo()])
    const second = applyProgressiveDiscount(items, [promo()])
    expect(items[0].unit_price).toBe(5.9)
    expect(first.items[0].unit_price).toBe(4.6)
    expect(second).toEqual(first)
  })

  it('item não elegível mantém o preço cheio', () => {
    const items = [
      item({ product_id: 'pin-a', quantity: 5 }),
      item({ product_id: 'caneca', quantity: 5, unit_price: 39.9 }),
    ]
    const { items: next } = applyProgressiveDiscount(items, [promo()])
    expect(next[0].unit_price).toBe(4.6)
    expect(next[1].unit_price).toBe(39.9)
  })

  it('percent aplica por item sobre o preço cheio de cada um', () => {
    const items = [
      item({ product_id: 'pin-a', quantity: 3, unit_price: 5.9 }),
      item({ product_id: 'pin-b', quantity: 2, unit_price: 4.9 }),
    ]
    const { items: next } = applyProgressiveDiscount(items, [
      promo({ discount_kind: 'percent', tiers: [{ min_qty: 5, value: 20 }] }),
    ])
    expect(next[0].unit_price).toBe(4.72) // 5,90 × 0,80
    expect(next[1].unit_price).toBe(3.92) // 4,90 × 0,80
  })

  it('applied nomeia promotion_id e tier_min_qty da faixa que valeu', () => {
    const { applied } = applyProgressiveDiscount([item({ quantity: 7 })], [promo()])
    expect(applied).toEqual([{ promotion_id: 'promo-kit', tier_min_qty: 5 }])
  })

  it('promoção cuja faixa é alcançada mas NÃO melhora o preço não entra em applied (A10)', () => {
    // Botton de R$ 3,90 numa faixa de R$ 4,60: preço fica 3,90 e nada foi aplicado de fato.
    const items = [item({ quantity: 5, unit_price: 3.9 })]
    const result = applyProgressiveDiscount(items, [promo({ tiers: [{ min_qty: 5, value: 4.6 }] })])
    expect(result.items[0].unit_price).toBe(3.9)
    expect(result.applied).toEqual([])
  })

  it('sobreposição (D6/PRM-14): por item vence o MENOR unit_price', () => {
    const barata = promo({ id: 'promo-barata', tiers: [{ min_qty: 3, value: 4.5 }] })
    const cara = promo({ id: 'promo-cara', tiers: [{ min_qty: 3, value: 5.0 }] })
    const { items: next, applied } = applyProgressiveDiscount(
      [item({ quantity: 3 })],
      [cara, barata],
    )
    expect(next[0].unit_price).toBe(4.5)
    expect(applied).toEqual([{ promotion_id: 'promo-barata', tier_min_qty: 3 }])
  })

  it('sobreposição empatada resolve pela promoção com created_at MAIS ANTIGO', () => {
    const nova = promo({
      id: 'promo-nova',
      created_at: '2026-08-01T00:00:00Z',
      tiers: [{ min_qty: 3, value: 5.0 }],
    })
    const antiga = promo({
      id: 'promo-antiga',
      created_at: '2026-07-01T00:00:00Z',
      tiers: [{ min_qty: 3, value: 5.0 }],
    })
    const { items: next, applied } = applyProgressiveDiscount(
      [item({ quantity: 3 })],
      [nova, antiga],
    )
    expect(next[0].unit_price).toBe(5)
    expect(applied).toEqual([{ promotion_id: 'promo-antiga', tier_min_qty: 3 }])
  })

  it('a ORDEM das promoções na entrada é irrelevante', () => {
    const barata = promo({ id: 'promo-barata', tiers: [{ min_qty: 3, value: 4.5 }] })
    const cara = promo({ id: 'promo-cara', tiers: [{ min_qty: 3, value: 5.0 }] })
    const items = [item({ quantity: 3 })]
    expect(applyProgressiveDiscount(items, [cara, barata])).toEqual(
      applyProgressiveDiscount(items, [barata, cara]),
    )
  })

  it('duas promoções vencendo em itens diferentes aparecem as DUAS em applied', () => {
    const soA = promo({
      id: 'promo-so-a',
      eligibleProductIds: ['pin-a'],
      tiers: [{ min_qty: 3, value: 4.0 }],
    })
    const soB = promo({
      id: 'promo-so-b',
      eligibleProductIds: ['pin-b'],
      tiers: [{ min_qty: 3, value: 3.0 }],
    })
    const items = [
      item({ product_id: 'pin-a', quantity: 3 }),
      item({ product_id: 'pin-b', quantity: 3 }),
    ]
    const { items: next, applied } = applyProgressiveDiscount(items, [soA, soB])
    expect(next[0].unit_price).toBe(4)
    expect(next[1].unit_price).toBe(3)
    expect(applied).toEqual([
      { promotion_id: 'promo-so-a', tier_min_qty: 3 },
      { promotion_id: 'promo-so-b', tier_min_qty: 3 },
    ])
  })

  it('cada promoção conta as SUAS unidades elegíveis, não as da outra', () => {
    // `promo-so-b` só alcança 2 unidades de pin-b, abaixo da sua faixa de 3 — não desconta,
    // mesmo havendo 5 unidades no carrinho.
    const soB = promo({
      id: 'promo-so-b',
      eligibleProductIds: ['pin-b'],
      tiers: [{ min_qty: 3, value: 3.0 }],
    })
    const items = [
      item({ product_id: 'pin-a', quantity: 3 }),
      item({ product_id: 'pin-b', quantity: 2 }),
    ]
    const { items: next, applied } = applyProgressiveDiscount(items, [soB])
    expect(next).toEqual(items)
    expect(applied).toEqual([])
  })
})

describe('perItemMin — descontos por item NÃO somam (AD-015)', () => {
  const BUMP_50: OrderBumpConfig = { enabled: true, product_id: 'bump-1', discount_percent: 50 }
  const PROMO_20_PCT = promo({
    scope: 'all',
    discount_kind: 'percent',
    tiers: [{ min_qty: 2, value: 20 }],
  })

  it('índice a índice, vence o menor unit_price', () => {
    const a = [item({ unit_price: 10 }), item({ unit_price: 4 })]
    const b = [item({ unit_price: 8 }), item({ unit_price: 6 })]
    expect(perItemMin(a, b).map((i) => i.unit_price)).toEqual([8, 4])
  })

  it('bump e progressivo saem do PREÇO CHEIO e o menor vence — nunca compostos', () => {
    // O AD-015 em números. Dois itens de R$ 24,90, os dois alcançados:
    //   order bump 50% (só o 1º item que casa) ⇒ 12,45
    //   progressivo 20% sobre o cheio          ⇒ 19,92
    //   perItemMin no item 1                   ⇒ 12,45
    // Se compusessem (progressivo POR CIMA do já descontado) daria 12,45 × 0,80 = 9,96 — margem
    // que ninguém autorizou, exibida e cobrada.
    const full = [
      item({ product_id: 'bump-1', unit_price: 24.9, quantity: 1 }),
      item({ product_id: 'bump-1', unit_price: 24.9, quantity: 1 }),
    ]
    const bumped = applyOrderBump(full, BUMP_50)
    const progressive = applyProgressiveDiscount(full, [PROMO_20_PCT]).items

    expect(bumped[0].unit_price).toBe(12.45)
    expect(bumped[1].unit_price).toBe(24.9) // o bump alcança só o primeiro item que casa
    expect(progressive[0].unit_price).toBe(19.92)
    expect(progressive[1].unit_price).toBe(19.92)

    const merged = perItemMin(bumped, progressive)
    expect(merged[0].unit_price).toBe(12.45)
    expect(merged[0].unit_price).not.toBe(9.96) // composto — proibido pelo AD-015
    expect(merged[1].unit_price).toBe(19.92)
  })

  it('o resultado é o mesmo trocando a ORDEM dos argumentos (propriedade do AD-015)', () => {
    const full = [
      item({ product_id: 'bump-1', unit_price: 24.9, quantity: 1 }),
      item({ product_id: 'bump-1', unit_price: 24.9, quantity: 1 }),
    ]
    const bumped = applyOrderBump(full, BUMP_50)
    const progressive = applyProgressiveDiscount(full, [PROMO_20_PCT]).items

    expect(perItemMin(bumped, progressive)).toEqual(perItemMin(progressive, bumped))
  })

  it('empate devolve o mesmo resultado nas duas ordens', () => {
    const a = [item({ unit_price: 7 })]
    const b = [item({ unit_price: 7 })]
    expect(perItemMin(a, b)).toEqual(perItemMin(b, a))
    expect(perItemMin(a, b)[0].unit_price).toBe(7)
  })

  it('não muta nenhuma das duas listas', () => {
    const a = [item({ unit_price: 10 })]
    const b = [item({ unit_price: 8 })]
    perItemMin(a, b)
    expect(a[0].unit_price).toBe(10)
    expect(b[0].unit_price).toBe(8)
  })
})

describe('calculateOrderTotals — assinatura preservada, promotions é OPCIONAL (PRM-16)', () => {
  const BUMP_50: OrderBumpConfig = { enabled: true, product_id: 'prod-bump', discount_percent: 50 }
  const base = {
    items: [
      { product_id: 'prod-a', unit_price: 30, quantity: 1 },
      { product_id: 'prod-bump', unit_price: 20, quantity: 1 },
    ] as PricingItem[],
    shipping: 10,
    couponDiscount: 0,
    pixDiscountPercent: 0,
    method: 'card' as const,
    bump: BUMP_50,
  }

  it('sem a chave promotions, o resultado é EXATAMENTE o de antes da feature 17', () => {
    // Os mesmos números que `orderBump.test.ts` já afirmava: 30 + (20 × 0,5) = 40 de subtotal.
    const totals = calculateOrderTotals(base)
    expect(totals.subtotal).toBe(40)
    expect(totals.total).toBe(50)
  })

  it('promotions: [] é indistinguível de promotions ausente', () => {
    expect(calculateOrderTotals({ ...base, promotions: [] })).toEqual(calculateOrderTotals(base))
  })

  it('promoção sem faixa alcançada é indistinguível de promoção ausente', () => {
    const semFaixa = promo({ scope: 'all', tiers: [{ min_qty: 99, value: 1 }] })
    expect(calculateOrderTotals({ ...base, promotions: [semFaixa] })).toEqual(
      calculateOrderTotals(base),
    )
  })

  it('com promoção, o subtotal usa o menor preço por item (bump vs faixa), nunca os dois', () => {
    // prod-bump: bump 50% ⇒ 10,00 · faixa 20% do cheio ⇒ 16,00 ⇒ vence 10,00
    // prod-a:    sem bump ⇒ 30,00 · faixa 20% do cheio ⇒ 24,00 ⇒ vence 24,00
    const vintePorCento = promo({
      scope: 'all',
      discount_kind: 'percent',
      tiers: [{ min_qty: 2, value: 20 }],
    })
    const totals = calculateOrderTotals({ ...base, promotions: [vintePorCento] })
    expect(totals.subtotal).toBe(34)
    // Composto (bump e depois faixa sobre o já descontado) daria 8 + 24 = 32.
    expect(totals.subtotal).not.toBe(32)
    expect(totals.total).toBe(44)
  })
})

describe('resolveOrderPricing — promoção vs cupom, vence o MENOR TOTAL (PRM-17/PRM-18)', () => {
  const CINCO_PINS: PricingItem[] = [{ product_id: 'pin-a', unit_price: 5.9, quantity: 5 }]
  const KIT_5 = promo({ tiers: [{ min_qty: 5, value: 4.6 }] })

  const input = (over: Partial<OrderPricingInput> = {}): OrderPricingInput => ({
    items: CINCO_PINS,
    shipping: 0,
    pixDiscountPercent: 0,
    method: 'card',
    coupon: null,
    promotions: [KIT_5],
    ...over,
  })

  it('promoção sozinha: winner promotion, nada descartado', () => {
    const out = resolveOrderPricing(input())
    // 5 × 4,60 = 23,00 · desconto = 5 × (5,90 − 4,60) = 6,50
    expect(out.totals.subtotal).toBe(23)
    expect(out.totals.total).toBe(23)
    expect(out.promotionDiscount).toBe(6.5)
    expect(out.applied).toEqual([{ promotion_id: 'promo-kit', tier_min_qty: 5 }])
    expect(out.winner).toBe('promotion')
    expect(out.discarded).toBeNull()
  })

  it('nem cupom nem faixa alcançada: winner none, discarded null, desconto 0', () => {
    const out = resolveOrderPricing(
      input({ items: [{ product_id: 'pin-a', unit_price: 5.9, quantity: 2 }] }),
    )
    expect(out.totals.subtotal).toBe(11.8)
    expect(out.promotionDiscount).toBe(0)
    expect(out.applied).toEqual([])
    expect(out.winner).toBe('none')
    expect(out.discarded).toBeNull()
  })

  it('cupom sozinho (sem faixa alcançada): winner coupon, nada descartado', () => {
    const out = resolveOrderPricing(
      input({
        items: [{ product_id: 'pin-a', unit_price: 5.9, quantity: 2 }],
        coupon: { type: 'percent', value: 10 },
      }),
    )
    expect(out.totals.couponDiscount).toBe(1.18)
    expect(out.promotionDiscount).toBe(0)
    expect(out.winner).toBe('coupon')
    expect(out.discarded).toBeNull()
  })

  it('promoção desconta mais dinheiro que o cupom ⇒ promoção vence e nomeia o cupom descartado', () => {
    const out = resolveOrderPricing(input({ coupon: { type: 'fixed', value: 2 } }))
    // promoção: 23,00 · cupom: 29,50 − 2,00 = 27,50
    expect(out.totals.total).toBe(23)
    expect(out.promotionDiscount).toBe(6.5)
    expect(out.totals.couponDiscount).toBe(0)
    expect(out.winner).toBe('promotion')
    expect(out.discarded).toBe('coupon')
  })

  it('cupom free_shipping VENCE promoção que desconta mais dinheiro (D2 — compara o TOTAL)', () => {
    // A razão de existir da comparação por total final:
    //   promoção  ⇒ desconta R$ 6,50 no subtotal, mas paga R$ 24,80 de frete ⇒ total 47,80
    //   cupom     ⇒ desconta R$ 0,00 no subtotal, e zera o frete            ⇒ total 29,50
    // Comparar DESCONTOS faria o cupom de frete perder feio. Comparar TOTAL acerta.
    const out = resolveOrderPricing(
      input({ shipping: 24.8, coupon: { type: 'free_shipping', value: 0 } }),
    )
    expect(out.totals.total).toBe(29.5)
    expect(out.totals.shipping).toBe(0)
    expect(out.totals.subtotal).toBe(29.5)
    expect(out.promotionDiscount).toBe(0)
    expect(out.applied).toEqual([])
    expect(out.winner).toBe('coupon')
    expect(out.discarded).toBe('promotion')
  })

  it('empate no total ⇒ a PROMOÇÃO vence (não exige código digitado)', () => {
    // promoção: 23,00 · cupom fixed 6,50 sobre 29,50: 23,00. Empate exato.
    const out = resolveOrderPricing(input({ coupon: { type: 'fixed', value: 6.5 } }))
    expect(out.totals.total).toBe(23)
    expect(out.winner).toBe('promotion')
    expect(out.discarded).toBe('coupon')
    expect(out.promotionDiscount).toBe(6.5)
    expect(out.totals.couponDiscount).toBe(0)
  })

  it('stacks_with_coupon ⇒ UM cálculo só, winner both, nada descartado (PRM-18)', () => {
    const out = resolveOrderPricing(
      input({
        promotions: [promo({ tiers: [{ min_qty: 5, value: 4.6 }], stacks_with_coupon: true })],
        coupon: { type: 'percent', value: 15 },
      }),
    )
    // O número que o próprio AD-015 cita: 5 bottons a R$ 4,60 com cupom de 15% ⇒ R$ 19,55.
    expect(out.totals.subtotal).toBe(23)
    expect(out.totals.couponDiscount).toBe(3.45)
    expect(out.totals.total).toBe(19.55)
    expect(out.promotionDiscount).toBe(6.5)
    expect(out.winner).toBe('both')
    expect(out.discarded).toBeNull()
  })

  it('stacks só vale quando TODAS as promoções aplicadas acumulam', () => {
    const acumula = promo({
      id: 'promo-acumula',
      eligibleProductIds: ['pin-a'],
      tiers: [{ min_qty: 5, value: 4.6 }],
      stacks_with_coupon: true,
    })
    const naoAcumula = promo({
      id: 'promo-nao-acumula',
      eligibleProductIds: ['pin-b'],
      tiers: [{ min_qty: 2, value: 1 }],
      stacks_with_coupon: false,
    })
    const out = resolveOrderPricing(
      input({
        items: [
          { product_id: 'pin-a', unit_price: 5.9, quantity: 5 },
          { product_id: 'pin-b', unit_price: 4.9, quantity: 2 },
        ],
        promotions: [acumula, naoAcumula],
        coupon: { type: 'percent', value: 15 },
      }),
    )
    expect(out.winner).not.toBe('both')
    expect(out.winner).toBe('promotion')
    expect(out.discarded).toBe('coupon')
  })

  it('não muta a entrada', () => {
    const items: PricingItem[] = [{ product_id: 'pin-a', unit_price: 5.9, quantity: 5 }]
    resolveOrderPricing(input({ items }))
    expect(items[0].unit_price).toBe(5.9)
  })

  it('duas chamadas com o mesmo input dão o mesmo resultado', () => {
    const arg = input({ coupon: { type: 'percent', value: 10 } })
    expect(resolveOrderPricing(arg)).toEqual(resolveOrderPricing(arg))
  })

  it('desconto PIX incide sobre o subtotal já descontado pela faixa', () => {
    const out = resolveOrderPricing(input({ pixDiscountPercent: 5, method: 'pix' }))
    // base do PIX = 23,00 (não 29,50) ⇒ 5% = 1,15 ⇒ total 21,85
    expect(out.totals.subtotal).toBe(23)
    expect(out.totals.pixDiscount).toBe(1.15)
    expect(out.totals.total).toBe(21.85)
  })
})
