import { describe, expect, it } from 'vitest'

import { createPayment } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase } from './fakes.ts'

// O desconto da compra casada (Compre Junto) na cobrança: o `create-payment` recalcula pela
// configuração do BANCO e pelo preço de catálogo — nunca pelo `unit_price`, pelo desconto nem pela
// marca que vieram do navegador —, recusa antes de cobrar quando o pedido sai mais caro do que a tela
// mostrou, e regrava cada linha com o preço cobrado e o cheio. Os números foram feitos à mão.

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const USER_ID = 'auth-user-1'
const JOIA = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
const CORRENTE = 'c9d8e7f6-a5b4-4c3d-9e2f-1a0b9c8d7e6f'
const PROMO_ID = 'f1e2d3c4-b5a6-4978-8a6b-5c4d3e2f1a09'

const pixBody = { order_id: ORDER_ID, method: 'pix', idempotency_key: 'idem-abc' }
const request = () =>
  new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-de-teste', 'Content-Type': 'application/json' },
  })

const mpOrder = {
  id: 'ORDTST01',
  status: 'action_required',
  status_detail: 'waiting_transfer',
  external_reference: ORDER_ID,
  expiration_time: '2026-07-28T12:30:00.000-03:00',
  transactions: { payments: [{ id: 'PAY01', payment_method: { qr_code: 'PIX', qr_code_base64: 'cXI=' } }] },
}

/** Uma linha do pedido como a loja a grava. */
const linha = (o: Record<string, unknown>) => ({
  product_id: JOIA,
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

// A joia (300) e duas correntes (79): a loja mostrou uma com o desconto casado de 10% (71,10) e a
// outra a preço cheio — duas linhas da mesma peça.
const LINHAS = [
  linha({ id: 'oi-1', quantity: 1, unit_price: 300, full_unit_price: 300 }),
  linha({
    id: 'oi-2',
    product_id: CORRENTE,
    product_name: 'Corrente',
    quantity: 1,
    unit_price: 71.1,
    full_unit_price: 79,
    accompanies_product_ids: [JOIA],
  }),
  linha({
    id: 'oi-3',
    product_id: CORRENTE,
    product_name: 'Corrente',
    quantity: 1,
    unit_price: 79,
    full_unit_price: 79,
    accompanies_product_ids: [JOIA],
  }),
]

const adicional = (discount_percent: number | null) => ({
  id: 'pbt-1',
  position: 0,
  kind: 'product',
  product_id: JOIA,
  target_product_id: CORRENTE,
  list_id: null,
  target_variant_ids: [],
  hidden_on_variant_ids: [],
  discount_percent,
  main: { id: JOIA, name: 'Pingente' },
  list: null,
})

interface Cenario {
  order?: Record<string, unknown>
  linhas?: unknown[]
  /** A configuração do Compre Junto lida do banco AGORA. */
  compreJunto?: unknown[]
  checkout?: Record<string, unknown> | null
  promotions?: unknown[]
  eligible?: unknown[]
  products?: unknown[]
}

const montar = (c: Cenario = {}) => {
  const supabase = createFakeSupabase({
    user: { id: USER_ID },
    rows: {
      orders: {
        id: ORDER_ID,
        order_number: '0244',
        customer_id: 'cust-1',
        customer_email: 'cliente@estrelinha.test',
        customer_name: 'Ana Souza',
        payment_status: 'pending',
        shipping_cost: 0,
        coupon_id: null,
        mp_order_id: null,
        total: 450.1,
        promotion_discount: 0,
        buy_together_discount: 7.9,
        order_bump_discount: 0,
        ...c.order,
      },
      customers: { user_id: USER_ID, cpf: '39053344705', name: 'Mariana Souza Lima' },
      store_settings: (eq: [string, unknown] | null) =>
        eq?.[1] === 'checkout' && c.checkout ? { value: c.checkout } : null,
      coupons: null,
    },
    lists: {
      order_items: c.linhas ?? LINHAS,
      products: c.products ?? [
        { id: JOIA, base_price: 300 },
        { id: CORRENTE, base_price: 79 },
      ],
      product_buy_together: c.compreJunto ?? [adicional(10)],
      ...(c.promotions ? { promotions: c.promotions } : {}),
      ...(c.eligible ? { promotion_eligible_products: c.eligible } : {}),
    },
  })
  const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrder }])
  return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
}

const cobrado = (e: ReturnType<typeof montar>) => e.fetchDouble.calls.at(-1)?.body.total_amount
const gravacaoDoPedido = (e: ReturnType<typeof montar>) =>
  e.supabase.updates.find((u) => u.table === 'orders' && 'total' in u.values)?.values
const escritasDosItens = (e: ReturnType<typeof montar>) => ({
  updates: e.supabase.updates.filter((u) => u.table === 'order_items'),
  inserts: e.supabase.inserts.filter((i) => i.table === 'order_items'),
  deletes: e.supabase.deletes.filter((d) => d.table === 'order_items'),
})

describe('create-payment — o desconto casado é recalculado pelo banco', () => {
  it('cobra o que a tela mostrou: 300 + 71,10 + 79 = 450,10, e grava os descontos por tipo', async () => {
    const e = montar()
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('450.10')
    expect(gravacaoDoPedido(e)).toEqual({
      subtotal: 450.1,
      total: 450.1,
      pix_discount: 0,
      promotion_id: null,
      promotion_discount: 0,
      buy_together_discount: 7.9,
      order_bump_discount: 0,
    })
    // As linhas já estavam com o cobrado e o cheio: nenhuma regravação redundante.
    const itens = escritasDosItens(e)
    expect(itens.updates).toEqual([])
    expect(itens.inserts).toEqual([])
    expect(itens.deletes).toEqual([])
    // A configuração foi lida do banco, pelas joias do pedido.
    const leitura = e.supabase.reads.find((r) => r.table === 'product_buy_together')
    expect(leitura?.in).toEqual([['product_id', [JOIA, CORRENTE]]])
  })

  it('ignora o preço, o desconto e a marca forjados: no corpo e nas linhas do pedido', async () => {
    const forjadas = LINHAS.map((l) => ({ ...l, unit_price: 1 }))
    const e = montar({ linhas: forjadas })
    const response = await createPayment(e.deps, request(), {
      ...pixBody,
      buy_together_discount: 999,
      items: [{ product_id: CORRENTE, unit_price: 0.01, accompanies_product_ids: [JOIA] }],
    })

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('450.10')
    // E cada linha é regravada com o cobrado, nunca o forjado.
    const precos = escritasDosItens(e).updates.map((u) => [u.eq?.[1], u.values.unit_price])
    expect(precos).toEqual([
      ['oi-1', 300],
      ['oi-2', 71.1],
      ['oi-3', 79],
    ])
  })

  it('sem a configuração no banco, a peça é cobrada a preço cheio — a marca não dá desconto', async () => {
    const e = montar({ compreJunto: [], order: { buy_together_discount: 0, total: 458 } })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('458.00')
  })
})

describe('create-payment — a guarda do teto: recusa só quando o pedido sai mais caro', () => {
  it('a dona baixou o percentual: 422 com código próprio, antes e agora, a peça — e nada é cobrado', async () => {
    const e = montar({ compreJunto: [adicional(5)] })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: 'O desconto do Compre Junto deste pedido mudou. Nada foi cobrado.',
      code: 'buy_together_price_changed',
      displayed_total: 450.1,
      // 300 + 75,05 (79 com 5%) + 79.
      total: 454.05,
      piece: 'Corrente',
    })
    expect(e.fetchDouble.calls).toHaveLength(0)
    expect(gravacaoDoPedido(e)).toBeUndefined()
    expect(escritasDosItens(e).updates).toEqual([])
  })

  it('a dona tirou o desconto: 422 também', async () => {
    const e = montar({ compreJunto: [adicional(null)] })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('buy_together_price_changed')
    expect(e.fetchDouble.calls).toHaveLength(0)
  })

  it('a oferta do checkout caiu depois do pedido: 422 com o antes e o agora, sem dizer "promoção"', async () => {
    // A tela mostrou o bump de 50% na caixa (40 → 20); a dona desligou a oferta antes do pagamento.
    const e = montar({
      compreJunto: [],
      order: { buy_together_discount: 0, order_bump_discount: 20, total: 320 },
      linhas: [
        LINHAS[0],
        linha({ id: 'oi-9', product_id: CORRENTE, product_name: 'Caixa', quantity: 1, unit_price: 20, full_unit_price: 40 }),
      ],
      products: [
        { id: JOIA, base_price: 300 },
        { id: CORRENTE, base_price: 40 },
      ],
      checkout: { order_bump_enabled: false, order_bump_product_id: CORRENTE, order_bump_discount_percent: 50 },
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error: 'Um desconto deste pedido mudou. Nada foi cobrado.',
      code: 'promotion_no_longer_valid',
      displayed_total: 320,
      total: 340,
      piece: 'Caixa',
    })
    expect(e.fetchDouble.calls).toHaveLength(0)
  })

  it('a dona subiu o percentual: segue, e cobra o melhor', async () => {
    const e = montar({ compreJunto: [adicional(20)] })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    // 300 + 63,20 (79 com 20%) + 79.
    expect(cobrado(e)).toBe('442.20')
    expect(gravacaoDoPedido(e)?.buy_together_discount).toBe(15.8)
    const oi2 = escritasDosItens(e).updates.find((u) => u.eq?.[1] === 'oi-2')
    expect(oi2?.values).toEqual({ unit_price: 63.2 })
  })

  it('outro desconto passou a valer no lugar do casado e o pedido saiu mais barato: segue', async () => {
    // O casado saiu, mas uma promoção de 15% nas correntes desconta 23,70 (> 7,90 exibido).
    const e = montar({
      compreJunto: [adicional(null)],
      promotions: [
        {
          id: PROMO_ID,
          discount_kind: 'percent',
          scope: 'categories',
          stacks_with_coupon: false,
          active: true,
          valid_from: null,
          valid_until: null,
          created_at: '2026-08-01T10:00:00.000Z',
          promotion_tiers: [{ min_qty: 1, value: 15 }],
        },
      ],
      eligible: [{ promotion_id: PROMO_ID, product_id: CORRENTE }],
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    // 300 + 2 × 67,15.
    expect(cobrado(e)).toBe('434.30')
    expect(gravacaoDoPedido(e)).toMatchObject({ promotion_discount: 23.7, buy_together_discount: 0 })
    // As duas linhas da corrente têm agora o mesmo preço: viram UMA (a primeira), e a outra sai.
    const itens = escritasDosItens(e)
    expect(itens.updates.find((u) => u.eq?.[1] === 'oi-2')?.values).toEqual({ quantity: 2, unit_price: 67.15 })
    expect(itens.deletes).toEqual([{ table: 'order_items', eq: [['id', 'oi-3']] }])
  })
})

describe('create-payment — as linhas do pedido', () => {
  it('a linha mista chega como duas linhas e o bump não vale duas vezes', async () => {
    // O bump aponta para a corrente: sem juntar as duas linhas, cada uma teria 1 unidade e a
    // primeira levaria os 50% do bump. Juntas, são 2 unidades — o bump não se aplica.
    const e = montar({
      checkout: { order_bump_enabled: true, order_bump_product_id: CORRENTE, order_bump_discount_percent: 50 },
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('450.10')
    expect(gravacaoDoPedido(e)?.order_bump_discount).toBe(0)
  })

  it('a linha que passa a ter unidades com e sem o desconto vira duas: a segunda é inserida', async () => {
    // A loja mostrou as duas correntes a preço cheio (sem desconto configurado); agora há 10%: uma
    // unidade sai com desconto. O pedido ficou mais barato, então segue.
    const e = montar({
      order: { buy_together_discount: 0, total: 458 },
      linhas: [
        LINHAS[0],
        linha({
          id: 'oi-2',
          product_id: CORRENTE,
          product_name: 'Corrente',
          quantity: 2,
          unit_price: 79,
          full_unit_price: 79,
          accompanies_product_ids: [JOIA],
        }),
      ],
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('450.10')
    const itens = escritasDosItens(e)
    expect(itens.updates.find((u) => u.eq?.[1] === 'oi-2')?.values).toEqual({ quantity: 1, unit_price: 71.1 })
    expect(itens.inserts).toHaveLength(1)
    expect(itens.inserts[0].values).toMatchObject({
      order_id: ORDER_ID,
      product_id: CORRENTE,
      product_name: 'Corrente',
      accompanies_product_ids: [JOIA],
      quantity: 1,
      unit_price: 79,
      full_unit_price: 79,
    })
    expect(itens.inserts[0].values).not.toHaveProperty('id')
  })

  it('no par recíproco decide pela marca que o pedido gravou, como a sacola', async () => {
    // A joia oferece a corrente com 10% e a corrente oferece a joia com 20%, as duas a 100. A
    // corrente foi levada pelo bloco da joia: ela recebe os 10% (190). Sem ler a marca, o empate
    // iria para a joia, a primeira, com 20% (180) — outro número que o da tela.
    const e = montar({
      order: { buy_together_discount: 10, total: 190 },
      products: [
        { id: JOIA, base_price: 100 },
        { id: CORRENTE, base_price: 100 },
      ],
      compreJunto: [
        adicional(10),
        { ...adicional(20), id: 'pbt-2', product_id: CORRENTE, target_product_id: JOIA, main: { id: CORRENTE, name: 'Corrente' } },
      ],
      linhas: [
        linha({ id: 'oi-1', quantity: 1, unit_price: 100, full_unit_price: 100 }),
        linha({
          id: 'oi-2',
          product_id: CORRENTE,
          product_name: 'Corrente',
          quantity: 1,
          unit_price: 90,
          full_unit_price: 100,
          accompanies_product_ids: [JOIA],
        }),
      ],
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('190.00')
  })

  it('o pin personalizado é cobrado pelo preço cheio numa segunda tentativa', async () => {
    // Na primeira tentativa o servidor regravou `unit_price` com o cobrado (aqui, 10 — com uma
    // promoção que já acabou). Ler `unit_price` agora cobraria o desconto de novo.
    const e = montar({
      order: { buy_together_discount: 0, total: 20 },
      compreJunto: [],
      linhas: [
        linha({ id: 'oi-1', product_id: 'custom-1754000000000', product_name: 'Pin', quantity: 2, unit_price: 10, full_unit_price: 12.5 }),
      ],
      products: [],
    })
    const response = await createPayment(e.deps, request(), pixBody)

    expect(response.status).toBe(200)
    expect(cobrado(e)).toBe('25.00')
  })
})
