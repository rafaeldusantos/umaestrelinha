import { describe, expect, it } from 'vitest'

import { createPayment } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase, type FetchRoute } from './fakes.ts'

// Pagar de novo cobra o valor da PRIMEIRA cobrança que o servidor calculou para o pedido.
//
// A primeira cobrança recalcula pelo catálogo, pela promoção e pelo cupom de agora (o caminho de
// sempre) e guarda o resultado numa tabela que só a service role alcança — os totais dos dois meios,
// o desconto, o frete e as linhas cobradas. Da segunda em diante o pedido é cobrado por esse valor:
// promoção encerrada, cupom esgotado ou preço mudado no catálogo não mudam o valor nem recusam.
//
// Os números esperados foram feitos à mão, nunca recalculados com a função que o handler chama.

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const USER_ID = 'auth-user-1'
const PINGENTE = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
const COUPON_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-3c4d5e6f7081'
const PROMO_ID = 'f1e2d3c4-b5a6-4978-8a6b-5c4d3e2f1a09'

const TABELA = 'order_charge_locks'

const request = () =>
  new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-de-teste', 'Content-Type': 'application/json' },
  })
const corpo = (method: 'pix' | 'card') =>
  method === 'pix'
    ? { order_id: ORDER_ID, method: 'pix', idempotency_key: 'idem-abc' }
    : {
        order_id: ORDER_ID,
        method: 'card',
        idempotency_key: 'idem-abc',
        card: {
          token: 'tok',
          payment_method_id: 'visa',
          installments: 1,
          payer: { email: 'cliente@estrelinha.test' },
        },
      }

const mpPix = {
  id: 'ORDTST01',
  status: 'action_required',
  status_detail: 'waiting_transfer',
  external_reference: ORDER_ID,
  transactions: { payments: [{ id: 'PAY01', payment_method: { qr_code: 'PIX', qr_code_base64: 'cXI=' } }] },
}
const mpCard = {
  id: 'ORDTST02',
  status: 'processing',
  status_detail: 'in_process',
  external_reference: ORDER_ID,
  transactions: { payments: [{ id: 'PAY02', status: 'processing', status_detail: 'in_process' }] },
}

/** Uma linha do pedido como a loja a grava. */
const linha = (o: Record<string, unknown>) => ({
  id: 'oi-1',
  product_id: PINGENTE,
  product_name: 'Pingente',
  product_image: null,
  size: null,
  finish: null,
  variant_id: null,
  price_source: 'base',
  variant_label: null,
  variant_options: null,
  requires_material: false,
  material_kinds: [],
  engraving_text: null,
  accompanies_product_ids: null,
  accompanies_list_ids: null,
  ...o,
})

/**
 * O valor travado de um pedido que, na primeira cobrança, tinha a promoção de 10% no pingente
 * (100 → 90, duas unidades: 180, promoção de 20) e o cupom de 10% (18), frete 20 e PIX de 5%:
 *   PIX:    180 − 18 − round2(162 × 0,05 = 8,10) + 20 = 173,90
 *   cartão: 180 − 18 + 20 = 182,00
 */
const TRAVADO = {
  order_id: ORDER_ID,
  first_method: 'pix',
  coupon_id: COUPON_ID,
  promotion_id: PROMO_ID,
  promotion_discount: 20,
  buy_together_discount: 0,
  order_bump_discount: 0,
  pix: { subtotal: 180, discount: 18, pix_discount: 8.1, shipping: 20, total: 173.9 },
  card: { subtotal: 180, discount: 18, pix_discount: 0, shipping: 20, total: 182 },
  lines: [{ product_id: PINGENTE, variant_id: null, quantity: 2, unit_price: 90, full_unit_price: 100 }],
}

interface Cenario {
  order?: Record<string, unknown>
  linhas?: unknown[]
  /** A linha da tabela do valor travado, ou ausente (pedido sem cobrança gravada). */
  travado?: Record<string, unknown> | null
  /** O catálogo de AGORA. */
  products?: unknown[]
  promotions?: unknown[]
  eligible?: unknown[]
  cupom?: Record<string, unknown> | null
  pixPercent?: number
  insertErrorByTable?: Record<string, unknown>
  fetchRoutes?: FetchRoute[]
}

const montar = (c: Cenario = {}) => {
  /** Toda leitura de linha única, por tabela — o que prova o que NÃO foi relido. */
  const leiturasDeLinha: string[] = []
  const espia = (table: string, valor: unknown) => () => {
    leiturasDeLinha.push(table)
    return valor
  }
  const supabase = createFakeSupabase({
    user: { id: USER_ID },
    rows: {
      orders: {
        id: ORDER_ID,
        order_number: '0244',
        customer_id: 'cust-1',
        customer_email: 'cliente@estrelinha.test',
        customer_name: 'Ana Souza',
        status: 'pending',
        payment_status: 'pending',
        shipping_cost: 20,
        coupon_id: COUPON_ID,
        mp_order_id: null,
        total: 191,
        promotion_discount: 0,
        buy_together_discount: 0,
        order_bump_discount: 0,
        ...c.order,
      },
      customers: { user_id: USER_ID, cpf: '39053344705', name: 'Mariana Souza Lima' },
      store_settings: (eq: [string, unknown] | null) =>
        eq?.[1] === 'payment' ? { value: { pix_discount_percent: c.pixPercent ?? 5 } } : null,
      coupons: espia(
        'coupons',
        c.cupom === undefined
          ? {
              type: 'percent',
              value: 10,
              active: true,
              valid_from: null,
              valid_until: null,
              max_uses: 5,
              used_count: 1,
            }
          : c.cupom,
      ),
      [TABELA]: espia(TABELA, c.travado ?? null),
    },
    lists: {
      order_items: c.linhas ?? [linha({ quantity: 2, unit_price: 100, full_unit_price: 100 })],
      products: c.products ?? [{ id: PINGENTE, base_price: 100 }],
      product_buy_together: [],
      ...(c.promotions ? { promotions: c.promotions } : {}),
      ...(c.eligible ? { promotion_eligible_products: c.eligible } : {}),
    },
    ...(c.insertErrorByTable ? { insertErrorByTable: c.insertErrorByTable } : {}),
  })
  const fetchDouble = createFakeFetch(
    c.fetchRoutes ?? [
      { match: '/cancel', body: {} },
      { match: '/v1/orders', body: mpPix },
    ],
  )
  return { supabase, fetchDouble, leiturasDeLinha, deps: createDeps(supabase, fetchDouble) }
}

type Montado = ReturnType<typeof montar>
const chamadasDeCriar = (e: Montado) =>
  e.fetchDouble.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'))
const cobrado = (e: Montado) => chamadasDeCriar(e).at(-1)?.body.total_amount
const travamentos = (e: Montado) => e.supabase.inserts.filter((i) => i.table === TABELA)

describe('a primeira cobrança grava o valor travado', () => {
  it('grava os totais dos dois meios, o desconto, o frete e as linhas cobradas, e cobra o de sempre', async () => {
    // 2 × 100 = 200; cupom de 10% = 20; frete 20; PIX de 5% sobre 180 = 9.
    //   PIX:    200 − 20 − 9 + 20 = 191,00
    //   cartão: 200 − 20 + 20     = 200,00
    const e = montar()
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('191.00')
    expect(travamentos(e)).toHaveLength(1)
    expect(travamentos(e)[0].values).toEqual({
      order_id: ORDER_ID,
      first_method: 'pix',
      coupon_id: COUPON_ID,
      promotion_id: null,
      promotion_discount: 0,
      buy_together_discount: 0,
      order_bump_discount: 0,
      pix: { subtotal: 200, discount: 20, pix_discount: 9, shipping: 20, total: 191 },
      card: { subtotal: 200, discount: 20, pix_discount: 0, shipping: 20, total: 200 },
      lines: [{ product_id: PINGENTE, variant_id: null, quantity: 2, unit_price: 100, full_unit_price: 100 }],
    })
  })
})

/** O pedido da segunda cobrança: as linhas como a primeira as regravou, e o catálogo de agora mudado. */
const pagarDeNovo = (c: Cenario = {}) =>
  montar({
    travado: TRAVADO,
    // O que a primeira cobrança gravou no pedido; `total` forjado de propósito, nunca é o cobrado.
    order: { promotion_discount: 20, discount: 18, total: 1, mp_order_id: null, ...c.order },
    linhas: [linha({ quantity: 2, unit_price: 90, full_unit_price: 100 })],
    // Hoje: o pingente custa 150, a promoção acabou, o cupom esgotou e o PIX passou a 10%.
    products: [{ id: PINGENTE, base_price: 150 }],
    promotions: [],
    cupom: {
      type: 'percent',
      value: 10,
      active: true,
      valid_from: null,
      valid_until: null,
      max_uses: 5,
      used_count: 5,
    },
    pixPercent: 10,
    ...c,
  })

describe('pagar de novo cobra o valor travado', () => {
  it('no PIX: 173,90, com promoção encerrada, cupom esgotado, preço mudado e total forjado, sem 422', async () => {
    const e = pagarDeNovo()
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('173.90')
    // O pedido volta a dizer o que foi cobrado — do travado, nunca do que estava gravado nele.
    const gravado = e.supabase.updates.find((u) => u.table === 'orders' && 'total' in u.values)
    expect(gravado?.values).toEqual({
      subtotal: 180,
      discount: 18,
      pix_discount: 8.1,
      total: 173.9,
      promotion_id: PROMO_ID,
      promotion_discount: 20,
      buy_together_discount: 0,
      order_bump_discount: 0,
    })
    // Não relê catálogo, promoção nem cupom, e não trava de novo.
    const listas = e.supabase.reads.map((r) => r.table)
    expect(listas).not.toContain('products')
    expect(listas).not.toContain('product_variants')
    expect(listas).not.toContain('promotions')
    expect(e.leiturasDeLinha).not.toContain('coupons')
    expect(travamentos(e)).toEqual([])
    // As linhas do pedido não são regravadas.
    expect(e.supabase.updates.filter((u) => u.table === 'order_items')).toEqual([])
  })

  it('no cartão: 182,00 — o mesmo cálculo da primeira cobrança, sem o desconto do PIX', async () => {
    const e = pagarDeNovo({
      fetchRoutes: [
        { match: '/cancel', body: {} },
        { match: '/v1/orders', body: mpCard },
      ],
    })
    const response = await createPayment(e.deps, request(), corpo('card'))

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('182.00')
    const gravado = e.supabase.updates.find((u) => u.table === 'orders' && 'total' in u.values)
    expect(gravado?.values).toMatchObject({ subtotal: 180, discount: 18, pix_discount: 0, total: 182 })
  })
})

describe('gerar um código novo com o valor travado', () => {
  it('cancela a order anterior no Mercado Pago antes de abrir a nova', async () => {
    const e = pagarDeNovo({ order: { mp_order_id: 'ORDANTIGO', payment_status: 'pending' } })
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(200)
    const rotas = e.fetchDouble.calls.map((c) => `${c.method} ${c.url.replace('https://api.mercadopago.com', '')}`)
    expect(rotas).toEqual(['POST /v1/orders/ORDANTIGO/cancel', 'POST /v1/orders'])
    expect(cobrado(e)).toBe('173.90')
  })

  it('uma linha acrescentada ao pedido depois do travado não sai pelo valor de antes', async () => {
    const e = pagarDeNovo({
      linhas: [
        linha({ quantity: 2, unit_price: 90, full_unit_price: 100 }),
        linha({ id: 'oi-2', quantity: 1, unit_price: 90, full_unit_price: 100 }),
      ],
    })
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(422)
    expect(e.fetchDouble.calls).toEqual([])
    expect(e.supabase.updates.filter((u) => u.table === 'orders')).toEqual([])
  })
})

describe('pedido sem cobrança gravada é calculado como hoje', () => {
  it('a promoção que acabou continua dando o 422 "um desconto mudou", e nada é travado', async () => {
    // O pedido de antes do travado: a loja gravou 20 de promoção, e hoje a promoção acabou.
    const e = montar({
      order: { promotion_discount: 20, coupon_id: null, total: 180 },
      linhas: [linha({ quantity: 2, unit_price: 90, full_unit_price: 100 })],
      promotions: [],
    })
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('promotion_no_longer_valid')
    expect(e.fetchDouble.calls).toEqual([])
    expect(travamentos(e)).toEqual([])
  })

  it('o travado que não grava para antes do Mercado Pago', async () => {
    const e = montar({ insertErrorByTable: { [TABELA]: { code: '42501', message: 'permission denied' } } })
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(500)
    expect(e.fetchDouble.calls).toEqual([])
  })

  it('outra cobrança do mesmo pedido que travou no mesmo instante não derruba esta', async () => {
    const e = montar({ insertErrorByTable: { [TABELA]: { code: '23505', message: 'duplicate key' } } })
    const response = await createPayment(e.deps, request(), corpo('pix'))

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('191.00')
  })
})
