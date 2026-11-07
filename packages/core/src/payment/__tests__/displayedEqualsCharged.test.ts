import { describe, expect, it } from 'vitest'
import {
  resolveCouponDiscount,
  resolveOrderPricing,
  type CouponRule,
  type OrderBumpConfig,
  type OrderPricingOutcome,
  type PricingItem,
  type ProgressivePromotion,
} from '../pricing'
import { pixPrice } from '../pix'
import { resolveOrderLines, type BuyTogetherPricingInput, type OrderPricingInput } from '../pricing'
import { joinOrderRows, type OrderRowLike } from '../orderLines'
import type { BuyTogetherDiscountAddon } from '../../buy-together/cartDiscount'

// BMP-04 / Success Criterion central da 08: "o total no rótulo do CTA é igual ao `total` que a
// edge function persiste em `orders`" — asseverado **por valor**, não por inspeção visual.
//
// Este arquivo existe porque o argumento "os dois lados chamam o mesmo módulo" tinha um furo: a
// base do cupom era calculada inline nos dois lugares, e só um deles arredondava. Resultado
// medido antes da correção, num carrinho trivial de uma loja de pins:
//
//   3 × R$ 29,90 + cupom percent 15% · PIX    → loja exibia 72,43 · servidor cobrava 72,44
//   3 × R$ 29,90 + cupom percent 15% · cartão → loja exibia 76,24 · servidor cobrava 76,25
//
// A divergência é de 1 centavo e a direção era contra a cliente.
//
// ⚠️ Como este arquivo prova isso MUDOU na feature 17, e a mudança é o ponto.
//
// A versão original montava os dois caminhos **localmente**: cada helper chamava
// `calculateOrderTotals` + `resolveCouponDiscount` por conta própria e reimplementava
// `resolveChargedItems` (o `chargedItems` local). Era o espelho da época, quando a loja e a edge
// function de fato mantinham cada uma a sua sequência de passos — e a assimetria de arredondamento da
// base do cupom era a diferença REAL entre os dois lados.
//
// A 17 acabou com essa duplicação: `resolveOrderPricing` passou a ser o ponto ÚNICO que decide o
// total, e os dois chamadores de verdade fazem hoje a MESMA chamada (`useCheckoutTotals.ts:143` e
// `mercado-pago/handlers.ts:543`). Os helpers locais, porém, continuaram remontando os passos à mão —
// e o arquivo que carrega o nome da invariante ficou **cego** à decisão central da feature. Medido:
// inverter a comparação promoção-vs-cupom em `pricing.ts:460` derrubava só `progressive.test.ts`;
// este arquivo passava intacto. Pior, o caso de 19,55 afirmava o resultado EMPILHADO para uma
// promoção com `stacks_with_coupon: false` — um número que o sistema real nunca produz.
//
// Daí os dois espelhos abaixo chamarem `resolveOrderPricing`. Eles são agora idênticos **de
// propósito**: "a loja e o servidor cobram o mesmo centavo" deixou de ser uma coincidência entre duas
// sequências parecidas e passou a ser uma consequência de haver uma função só. O que os testes provam
// é (a) que a função existe como ponto único e (b) o VALOR exato que ela produz em cada cenário —
// inclusive a escolha entre promoção e cupom, que é a decisão que a 17 acrescentou. Qualquer mudança
// de comportamento em `resolveOrderPricing` mata casos daqui.
//
// O que continua sendo assimetria de verdade — e o que este arquivo NÃO pode provar — é a montagem
// das ENTRADAS: a loja lê o carrinho, o servidor lê `order_items`. Foi exatamente ali que a 17 deixou
// um defeito (a loja passava `product.price` onde o servidor resolvia o preço da variação), e ele só
// é pegável nos testes de cada lado — `useCheckoutTotals.test.tsx` e `handlers.test.ts`, que usam a
// mesma fixture de propósito.

interface Scenario {
  items: PricingItem[]
  bump?: OrderBumpConfig
  /** Feature 17. Ausente deixa o cenário idêntico ao que era antes dela. */
  promotions?: ProgressivePromotion[]
  coupon: CouponRule | null
  /** Frete cotado, antes de o cupom `free_shipping` zerá-lo — quem zera é `resolveOrderPricing`. */
  shipping: number
  pixDiscountPercent: number
  method: 'pix' | 'card'
}

/**
 * Espelho de `apps/store/src/features/checkout/model/useCheckoutTotals.ts`: monta os itens com o
 * preço **cheio** da linha, passa o frete **cotado** e o cupom em bruto, e deixa a decisão inteira
 * (base do cupom, faixa, `free_shipping`, promoção vs cupom) para `resolveOrderPricing`.
 */
function storePricing(s: Scenario): OrderPricingOutcome {
  return resolveOrderPricing({
    items: s.items,
    shipping: s.shipping,
    pixDiscountPercent: s.pixDiscountPercent,
    method: s.method,
    bump: s.bump,
    coupon: s.coupon,
    promotions: s.promotions ?? [],
  })
}

/**
 * Espelho de `supabase/functions/mercado-pago/handlers.ts`: os mesmos argumentos, lidos do pedido
 * persistido em vez do carrinho — e a mesma função.
 *
 * A chamada é caractere por caractere a de cima, e é isso que se está afirmando: se um dos dois
 * chamadores voltar a montar a conta por si, este espelho tem de deixar de ser idêntico, e a
 * diferença aparece aqui.
 */
function serverPricing(s: Scenario): OrderPricingOutcome {
  return resolveOrderPricing({
    items: s.items,
    shipping: s.shipping,
    pixDiscountPercent: s.pixDiscountPercent,
    method: s.method,
    bump: s.bump,
    coupon: s.coupon,
    promotions: s.promotions ?? [],
  })
}

// 29,90 × 3 = 89.69999999999999 em ponto flutuante — é este resíduo que fazia o percentual
// pousar em lados opostos do meio centavo nos dois cálculos.
const PINS: PricingItem = { product_id: 'pin-1', unit_price: 29.9, quantity: 3 }
const BUMP_ITEM: PricingItem = { product_id: 'bump-1', unit_price: 24.9, quantity: 1 }
const BUMP_50: OrderBumpConfig = {
  enabled: true,
  product_id: 'bump-1',
  discount_percent: 50,
}

const PERCENT_15: CouponRule = { type: 'percent', value: 15 }
const PERCENT_10: CouponRule = { type: 'percent', value: 10 }

// --- feature 17: desconto progressivo por quantidade ---------------------------------------------
// 5 bottons de R$ 5,90 na faixa de 5 un a R$ 4,60 ⇒ R$ 23,00, o número que a spec persegue nos
// quatro lugares (gaveta, CTA, orders.total, total_amount no MP).
const CINCO_PINS: PricingItem = { product_id: 'pin-kit', unit_price: 5.9, quantity: 5 }

const KIT_5_A_460: ProgressivePromotion = {
  id: 'promo-kit',
  discount_kind: 'unit_price',
  tiers: [
    { min_qty: 3, value: 5.0 },
    { min_qty: 5, value: 4.6 },
  ],
  scope: 'categories',
  eligibleProductIds: ['pin-kit'],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00Z',
}

/** A MESMA regra do kit, marcada para acumular com cupom (PRM-18). */
const KIT_5_A_460_STACKS: ProgressivePromotion = { ...KIT_5_A_460, stacks_with_coupon: true }

/** Alcança TODO o carrinho — é o que faz o bump e a faixa disputarem o MESMO item. */
const VINTE_PCT_EM_TUDO: ProgressivePromotion = {
  id: 'promo-tudo',
  discount_kind: 'percent',
  tiers: [{ min_qty: 2, value: 20 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00Z',
}

describe('exibido == cobrado — total da loja idêntico ao total do servidor', () => {
  interface Case {
    name: string
    scenario: Scenario
    total: number
    /** Feature 17: o desconto que as faixas produziram no caminho VENCEDOR. */
    promotionDiscount?: number
    /** Feature 17: quem venceu entre promoção e cupom (D2) — a decisão que a 17 acrescentou. */
    winner?: OrderPricingOutcome['winner']
  }

  const cases: Case[] = [
    {
      // O caso que divergia: 72,43 exibido vs 72,44 cobrado.
      name: '3 × 29,90 + cupom percent 15% · PIX',
      scenario: {
        items: [PINS],
        coupon: PERCENT_15,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 72.43,
    },
    {
      // O caso que divergia: 76,24 exibido vs 76,25 cobrado.
      name: '3 × 29,90 + cupom percent 15% · cartão',
      scenario: {
        items: [PINS],
        coupon: PERCENT_15,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 76.24,
    },
    {
      name: '3 × 29,90 + cupom percent 15% + frete 14,90 · PIX',
      scenario: {
        items: [PINS],
        coupon: PERCENT_15,
        shipping: 14.9,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 87.33,
    },
    {
      name: 'order bump marcado + cupom percent 10% · PIX',
      scenario: {
        items: [PINS, BUMP_ITEM],
        bump: BUMP_50,
        coupon: PERCENT_10,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 87.33,
    },
    {
      name: 'order bump marcado + cupom percent 10% + frete 14,90 · cartão',
      scenario: {
        items: [PINS, BUMP_ITEM],
        bump: BUMP_50,
        coupon: PERCENT_10,
        shipping: 14.9,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 106.83,
    },
    {
      // `fixed` que excede o subtotal: o desconto para no subtotal, nunca vira crédito.
      name: 'cupom fixed de 500 sobre subtotal de 89,70 + frete 14,90 · PIX',
      scenario: {
        items: [PINS],
        coupon: { type: 'fixed', value: 500 },
        shipping: 14.9,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 14.9,
    },
    {
      // `free_shipping`: frete zerado e desconto PIX ainda incidindo sobre (subtotal − 0).
      name: 'cupom free_shipping · PIX (frete cotado 24,80 zerado)',
      scenario: {
        items: [PINS],
        coupon: { type: 'free_shipping', value: 0 },
        shipping: 24.8,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 85.21,
    },
    {
      name: 'cupom free_shipping · cartão (frete cotado 24,80 zerado)',
      scenario: {
        items: [PINS],
        coupon: { type: 'free_shipping', value: 0 },
        shipping: 24.8,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 89.7,
    },
    {
      // SUCCESS CRITERION #2 da spec, ao pé da letra: em 5 bottons elegíveis, gaveta, CTA,
      // `orders.total` e `total_amount` no MP mostram **R$ 23,00**. Aqui os dois lados do par
      // loja↔servidor afirmam esse número — antes ele só existia isolado em `progressive.test.ts` e
      // como subtotal do caso empilhado, com o par provado por OUTRA fixture (3 × 8,90 ⇒ 15,00).
      name: 'progressivo: 5 bottons na faixa de 5 un a R$ 4,60 = R$ 23,00 · cartão',
      scenario: {
        items: [CINCO_PINS],
        promotions: [KIT_5_A_460],
        coupon: null,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 23,
      // 5 × 5,90 = 29,50 cheio ⇒ 29,50 − 23,00.
      promotionDiscount: 6.5,
      winner: 'promotion',
    },
    {
      // Feature 17, progressivo PURO: 5 × 4,60 = 23,00 · PIX 5% = 1,15 ⇒ 21,85.
      name: 'progressivo: 5 bottons na faixa de 5 un a R$ 4,60 · PIX',
      scenario: {
        items: [CINCO_PINS],
        promotions: [KIT_5_A_460],
        coupon: null,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 21.85,
      promotionDiscount: 6.5,
      winner: 'promotion',
    },
    {
      // Progressivo + cupom EMPILHADO. É o número que o próprio AD-015 cita ao explicar por que
      // empilhar não pode ser o default: 5 bottons a R$ 4,60 com cupom de 15% sai a R$ 19,55.
      //
      // A promoção aqui é a variante `stacks_with_coupon: true` — sem ela `resolveOrderPricing`
      // escolheria UM dos dois caminhos e cobraria R$ 23,00. Os 19,55 só existem no modo empilhado,
      // e afirmá-los para uma promoção que não acumula era o que a versão anterior deste arquivo
      // fazia, por remontar a conta à mão em vez de chamar a função real.
      name: 'progressivo + cupom percent 15% EMPILHADO sobre o subtotal já descontado · cartão',
      scenario: {
        items: [CINCO_PINS],
        promotions: [KIT_5_A_460_STACKS],
        coupon: PERCENT_15,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 19.55,
      promotionDiscount: 6.5,
      winner: 'both',
    },
    {
      // D2: sem acumular, vence o de MENOR TOTAL FINAL. Promoção 23,00 contra cupom
      // 29,50 − 10% = 26,55 ⇒ a promoção, e o cupom é descartado sem descontar nada.
      name: 'progressivo vence o cupom percent 10% pelo total final · cartão',
      scenario: {
        items: [CINCO_PINS],
        promotions: [KIT_5_A_460],
        coupon: PERCENT_10,
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 23,
      promotionDiscount: 6.5,
      winner: 'promotion',
    },
    {
      // O mesmo carrinho com um cupom que desconta MAIS: 29,50 − 20,00 = 9,50 contra os 23,00 da
      // faixa ⇒ vence o cupom, e a promoção não desconta nada. Os dois casos juntos afirmam a
      // comparação nas DUAS direções — é o que faltava para este arquivo sentir uma inversão do
      // veredito em `resolveOrderPricing`.
      name: 'cupom fixed de 20 vence o progressivo pelo total final · cartão',
      scenario: {
        items: [CINCO_PINS],
        promotions: [KIT_5_A_460],
        coupon: { type: 'fixed', value: 20 },
        shipping: 0,
        pixDiscountPercent: 5,
        method: 'card',
      },
      total: 9.5,
      promotionDiscount: 0,
      winner: 'coupon',
    },
    {
      // Progressivo + bump disputando o MESMO item (AD-015):
      //   bump-1: bump 50% ⇒ 12,45 · faixa 20% do cheio ⇒ 19,92 ⇒ vence 12,45
      //   pin-kit: sem bump ⇒ 5,90 · faixa 20% do cheio ⇒ 4,72 ⇒ vence 4,72
      //   subtotal = 12,45 + 5 × 4,72 = 36,05 · PIX 5% = 1,80 · + frete 14,90 ⇒ 49,15
      // Compostos dariam 12,45 × 0,80 = 9,96 no bump-1 e um subtotal de 33,56: outro número.
      name: 'progressivo + order bump no MESMO item, nenhum dos dois composto · PIX',
      scenario: {
        items: [BUMP_ITEM, CINCO_PINS],
        bump: BUMP_50,
        promotions: [VINTE_PCT_EM_TUDO],
        coupon: null,
        shipping: 14.9,
        pixDiscountPercent: 5,
        method: 'pix',
      },
      total: 49.15,
      // 12,45 (bump) + 5 × 5,90 = 41,95 cheio ⇒ 41,95 − 36,05.
      promotionDiscount: 5.9,
      winner: 'promotion',
    },
  ]

  for (const { name, scenario, total, promotionDiscount, winner } of cases) {
    it(`${name}: loja e servidor cobram o mesmo centavo`, () => {
      const store = storePricing(scenario)
      const server = serverPricing(scenario)

      // A asserção do Success Criterion: o valor exibido é o valor cobrado.
      expect(store.totals.total).toBe(server.totals.total)
      // E é este valor — sem isto, quebrar os dois lados junto passaria.
      expect(store.totals.total).toBe(total)
      // O desconto do cupom (onde a divergência nascia) também tem de bater.
      expect(store.totals.couponDiscount).toBe(server.totals.couponDiscount)
      // E o resto da decomposição, para o total não bater por compensação de erros.
      expect(store.totals).toEqual(server.totals)
      // Feature 17: o desconto de faixa e o veredito promoção-vs-cupom são parte do que os dois
      // lados têm de concordar — é o `promotionDiscount` que a loja grava em `orders` e que a guarda
      // de teto do servidor (PRM-12) compara.
      expect(store.promotionDiscount).toBe(server.promotionDiscount)
      expect(store.winner).toBe(server.winner)
      expect(store.applied).toEqual(server.applied)
      if (promotionDiscount !== undefined) expect(store.promotionDiscount).toBe(promotionDiscount)
      if (winner) expect(store.winner).toBe(winner)
    })
  }

  it('cupom free_shipping não gera desconto de valor em nenhum dos lados', () => {
    const scenario: Scenario = {
      items: [PINS],
      coupon: { type: 'free_shipping', value: 0 },
      shipping: 24.8,
      pixDiscountPercent: 5,
      method: 'pix',
    }
    expect(storePricing(scenario).totals.couponDiscount).toBe(0)
    expect(serverPricing(scenario).totals.couponDiscount).toBe(0)
    // Frete zerado pelo cupom, e o desconto PIX incide sobre (89,70 − 0) = 4,49.
    expect(storePricing(scenario).totals.shipping).toBe(0)
    expect(storePricing(scenario).totals.pixDiscount).toBe(4.49)
  })
})

describe('resolveCouponDiscount — a base é arredondada antes do percentual', () => {
  // Sensor direto da causa raiz: soma crua e soma arredondada têm de dar o MESMO desconto.
  // É o que impede o retorno do arredondamento assimétrico entre loja e servidor.
  it('percent: soma float crua e soma arredondada dão o mesmo desconto', () => {
    const raw = 29.9 * 3 // 89.69999999999999
    expect(raw).not.toBe(89.7) // o resíduo existe mesmo — o teste não é vacuoso
    expect(resolveCouponDiscount(raw, PERCENT_15)).toBe(
      resolveCouponDiscount(89.7, PERCENT_15),
    )
    expect(resolveCouponDiscount(raw, PERCENT_15)).toBe(13.46)
  })

  it('percent sobre subtotal com bump: soma crua e arredondada coincidem', () => {
    const raw = 29.9 * 3 + 12.45 // 102.14999999999999
    expect(raw).not.toBe(102.15)
    expect(resolveCouponDiscount(raw, PERCENT_10)).toBe(
      resolveCouponDiscount(102.15, PERCENT_10),
    )
    expect(resolveCouponDiscount(raw, PERCENT_10)).toBe(10.22)
  })

  it('fixed: limitado ao subtotal arredondado, nunca acima', () => {
    expect(resolveCouponDiscount(29.9 * 3, { type: 'fixed', value: 500 })).toBe(89.7)
    expect(resolveCouponDiscount(89.7, { type: 'fixed', value: 20 })).toBe(20)
  })

  it('free_shipping e ausência de cupom não geram desconto de valor', () => {
    expect(resolveCouponDiscount(89.7, { type: 'free_shipping', value: 0 })).toBe(0)
    expect(resolveCouponDiscount(89.7, null)).toBe(0)
    expect(resolveCouponDiscount(89.7, undefined)).toBe(0)
  })
})

// --- feature 27: o preço com PIX da VITRINE é o mesmo que o caixa cobra ---------------------------
//
// PDP-14/PDP-15. A vitrine (card e página do produto) anuncia "R$ X com Pix" **antes** de haver
// carrinho, então ela não passa por `resolveOrderPricing` — ela chama `pixPrice`. São dois caminhos
// de código para o mesmo número, que é exatamente a forma de defeito que este arquivo existe para
// travar.
//
// E eles JÁ divergiam. A versão anterior, inline em `ProductCard.tsx`, arredondava o preço final em
// vez do desconto; com o `pix_discount_percent = 5` de hoje, **81 dos 259 preços distintos do
// catálogo (31%)** saíam 1 centavo acima do cobrado. Ao contrário do defeito de 2026-07 registrado no
// topo deste arquivo, a direção era a FAVOR da cliente — e é por isso que sobreviveu sem queixa.
describe('preço com PIX da vitrine = total cobrado por uma unidade', () => {
  /** O que o caixa cobra por 1 unidade daquele preço, sem cupom e sem frete, pagando no PIX. */
  const cobrado = (unitPrice: number, pct: number) =>
    resolveOrderPricing({
      items: [{ product_id: 'p-1', unit_price: unitPrice, quantity: 1 }],
      shipping: 0,
      pixDiscountPercent: pct,
      method: 'pix',
      coupon: null,
      promotions: [],
    }).totals.total

  // Os quatro preços medidos no catálogo real que divergiam a 5%, mais um que não divergia.
  const precos = [7.9, 22.9, 64.9, 74.9, 289.9, 100]

  it.each(precos)('R$ %s a 5%%: a vitrine anuncia o que o caixa cobra', unitPrice => {
    expect(pixPrice(unitPrice, 5)).toBe(cobrado(unitPrice, 5))
  })

  it.each(precos)('R$ %s a 7%%: idem', unitPrice => {
    expect(pixPrice(unitPrice, 7)).toBe(cobrado(unitPrice, 7))
  })

  it('o caso de R$ 7,90 é o que divergia — e o valor certo é o menor', () => {
    // Sem esta asserção o `it.each` acima passaria mesmo se as duas pontas voltassem juntas para a
    // fórmula errada. Ela crava o número que o caixa cobra.
    expect(cobrado(7.9, 5)).toBe(7.5)
    expect(pixPrice(7.9, 5)).toBe(7.5)
    // A fórmula anterior, escrita por extenso: é o valor que NÃO pode voltar.
    expect(Math.round(7.9 * (1 - 5 / 100) * 100) / 100).toBe(7.51)
  })
})

// --- O desconto da compra casada, com bump, promoção e cupom ---------------------------------
//
// A assimetria de verdade entre as duas pontas: a loja calcula sobre as linhas da SACOLA e grava o
// pedido com a linha mista partida em duas (as unidades com desconto casado e as a preço cheio); o
// servidor lê `order_items`, JUNTA as linhas da mesma peça e recalcula. Os dois lados chamam
// `resolveOrderPricing` e `resolveOrderLines` — o espelho abaixo passa pelas mesmas funções que a
// `CheckoutPage` (`buildOrderItems`) e a `mercado-pago` (`joinOrderRows`) chamam. Os números foram
// feitos à mão.
describe('exibido == cobrado com o desconto casado — a sacola e o pedido gravado dão o mesmo centavo', () => {
  const addon = (o: Partial<BuyTogetherDiscountAddon>): BuyTogetherDiscountAddon => ({
    id: 'a1',
    mainProductId: 'joia',
    position: 0,
    kind: 'product',
    targetProductId: 'corrente',
    listId: null,
    targetVariantIds: [],
    hiddenOnVariantIds: [],
    discountPercent: 10,
    ...o,
  })

  interface CartLine extends PricingItem {
    product_id: string
    marks?: string[]
  }

  /** A loja: as linhas da sacola, o pedido gravado com a linha mista partida. */
  const lojaGrava = (input: OrderPricingInput, cart: CartLine[]) => {
    const outcome = resolveOrderPricing(input)
    const lines = resolveOrderLines(input, outcome)
    const rows: Array<OrderRowLike & { unit_price: number; full_unit_price: number }> =
      lines.lines.map((l) => ({
        product_id: cart[l.index].product_id,
        variant_id: cart[l.index].variant_id ?? null,
        quantity: l.quantity,
        unit_price: l.unitPrice,
        full_unit_price: l.fullUnitPrice,
        accompanies_product_ids: cart[l.index].marks ?? null,
      }))
    return { outcome, lines, rows }
  }

  /** O servidor: junta as linhas gravadas, refaz as entradas e recalcula pela MESMA função. */
  const servidorRecalcula = (
    base: Omit<OrderPricingInput, 'items' | 'buyTogether'>,
    config: Omit<BuyTogetherPricingInput, 'marks'>,
    rows: ReturnType<typeof lojaGrava>['rows'],
  ) => {
    const joined = joinOrderRows(rows)
    const input: OrderPricingInput = {
      ...base,
      items: joined.map((j) => ({
        product_id: rows[j.rows[0]].product_id,
        variant_id: rows[j.rows[0]].variant_id ?? null,
        // O preço de catálogo, que o servidor lê do banco: aqui, o cheio gravado.
        unit_price: rows[j.rows[0]].full_unit_price,
        quantity: j.quantity,
      })),
      buyTogether: { ...config, marks: joined.map((j) => j.marks) },
    }
    const outcome = resolveOrderPricing(input)
    return { joined, outcome, lines: resolveOrderLines(input, outcome) }
  }

  const config = { addons: [addon({})], lists: [] }
  // A joia (300), duas correntes (79 — uma leva o casado de 10%, a outra vai a preço cheio) e o bump
  // (40, 50%). A promoção dá 5% nas correntes a partir de 2 unidades; o cupom, 10%.
  const cart: CartLine[] = [
    { product_id: 'joia', variant_id: null, unit_price: 300, quantity: 1 },
    { product_id: 'corrente', variant_id: null, unit_price: 79, quantity: 2, marks: ['joia'] },
    { product_id: 'bump-1', variant_id: null, unit_price: 40, quantity: 1 },
  ]
  const cincoNasCorrentes: ProgressivePromotion = {
    id: 'promo-5',
    discount_kind: 'percent',
    tiers: [{ min_qty: 2, value: 5 }],
    scope: 'categories',
    eligibleProductIds: ['corrente'],
    stacks_with_coupon: false,
    created_at: '2026-11-01T00:00:00Z',
  }
  const base = {
    shipping: 20,
    pixDiscountPercent: 5,
    method: 'pix' as const,
    bump: { enabled: true, product_id: 'bump-1', discount_percent: 50 },
    promotions: [cincoNasCorrentes],
  }

  it('casado + bump + promoção, sem cupom: a promoção vale só na corrente a preço cheio', () => {
    const input: OrderPricingInput = {
      ...base,
      coupon: null,
      items: cart,
      buyTogether: { ...config, marks: cart.map((c) => c.marks ?? []) },
    }
    const loja = lojaGrava(input, cart)
    // 300 + 71,10 (79 com 10%) + 75,05 (79 com 5%) + 20 (bump) = 466,15 · PIX 23,31 · frete 20.
    expect(loja.outcome.totals.total).toBe(462.84)
    expect(loja.rows.map((r) => [r.product_id, r.quantity, r.unit_price, r.full_unit_price])).toEqual([
      ['joia', 1, 300, 300],
      ['corrente', 1, 71.1, 79],
      ['corrente', 1, 75.05, 79],
      ['bump-1', 1, 20, 40],
    ])
    expect(loja.lines.buyTogetherDiscount).toBe(7.9)
    expect(loja.lines.promotionDiscount).toBe(3.95)
    expect(loja.lines.orderBumpDiscount).toBe(20)

    const servidor = servidorRecalcula({ ...base, coupon: null }, config, loja.rows)
    // As duas linhas da corrente voltam a ser UMA: a faixa conta 2 unidades, e o bump não dobra.
    expect(servidor.joined.map((j) => j.quantity)).toEqual([1, 2, 1])
    expect(servidor.outcome.totals).toEqual(loja.outcome.totals)
    expect(servidor.lines).toEqual(loja.lines)
  })

  it('com cupom de 10%: o cupom vence a promoção, e o casado e o bump continuam', () => {
    const coupon: CouponRule = { type: 'percent', value: 10 }
    const input: OrderPricingInput = {
      ...base,
      coupon,
      items: cart,
      buyTogether: { ...config, marks: cart.map((c) => c.marks ?? []) },
    }
    const loja = lojaGrava(input, cart)
    // 470,10 − cupom 47,01 = 423,09 · PIX 21,15 · frete 20 ⇒ 421,94 (a promoção daria 462,84).
    expect(loja.outcome.winner).toBe('coupon')
    expect(loja.outcome.totals.total).toBe(421.94)
    expect(loja.rows.map((r) => r.unit_price)).toEqual([300, 71.1, 79, 20])
    expect(loja.lines.promotionDiscount).toBe(0)
    expect(loja.lines.buyTogetherDiscount).toBe(7.9)
    expect(loja.lines.orderBumpDiscount).toBe(20)
    // O pedido gravado soma o subtotal cobrado, linha a linha.
    expect(loja.rows.reduce((s, r) => s + r.unit_price * r.quantity, 0)).toBeCloseTo(470.1, 10)

    const servidor = servidorRecalcula({ ...base, coupon }, config, loja.rows)
    expect(servidor.outcome.totals).toEqual(loja.outcome.totals)
    expect(servidor.lines).toEqual(loja.lines)
  })

  it('no par recíproco o servidor decide pela marca gravada, como a sacola', () => {
    // A oferece B com 10% e B oferece A com 20%, os dois a 100. B foi levada pelo bloco de A: B recebe
    // os 10% (190). Sem a marca, o empate iria para A, a primeira, com 20% (180).
    const reciproco = {
      addons: [
        addon({ id: 'ab', mainProductId: 'A', targetProductId: 'B', discountPercent: 10 }),
        addon({ id: 'ba', mainProductId: 'B', targetProductId: 'A', discountPercent: 20 }),
      ],
      lists: [],
    }
    const par: CartLine[] = [
      { product_id: 'A', variant_id: null, unit_price: 100, quantity: 1 },
      { product_id: 'B', variant_id: null, unit_price: 100, quantity: 1, marks: ['A'] },
    ]
    const semTaxas = { shipping: 0, pixDiscountPercent: 0, method: 'card' as const, coupon: null, promotions: [] }
    const loja = lojaGrava(
      { ...semTaxas, items: par, buyTogether: { ...reciproco, marks: par.map((c) => c.marks ?? []) } },
      par,
    )
    expect(loja.outcome.totals.total).toBe(190)
    const servidor = servidorRecalcula(semTaxas, reciproco, loja.rows)
    expect(servidor.outcome.totals.total).toBe(190)
    // Sem a marca gravada, o servidor cobraria outro número — é por isso que ele a lê.
    const semMarca = servidorRecalcula(
      semTaxas,
      reciproco,
      loja.rows.map((r) => ({ ...r, accompanies_product_ids: null })),
    )
    expect(semMarca.outcome.totals.total).toBe(180)
  })
})
