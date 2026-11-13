import { describe, expect, it } from 'vitest'

import { createPayment } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase } from './fakes.ts'

// O desconto de campanha na cobrança. O `create-payment` aplica a campanha GRAVADA na linha pelo
// `create-order` — sem reavaliar a vigência: o pedido criado durante a campanha e pago depois do fim
// vale pelo que foi gravado —, soma o desconto de campanha à guarda de teto, confere o pedido mínimo
// do cupom sem as peças de campanha e trava o desconto na primeira cobrança. Números feitos à mão.

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const USER_ID = 'auth-user-1'
const PECA = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
const COMUM = 'c9d8e7f6-a5b4-4c3d-9e2f-1a0b9c8d7e6f'
const COUPON_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-3c4d5e6f7081'

const pix = { order_id: ORDER_ID, method: 'pix', idempotency_key: 'idem-abc' }
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
  expiration_time: '2026-11-28T12:30:00.000-03:00',
  transactions: { payments: [{ id: 'PAY01', payment_method: { qr_code: 'PIX', qr_code_base64: 'cXI=' } }] },
}

const linha = (o: Record<string, unknown>) => ({
  product_id: PECA,
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
  campaign_id: null,
  campaign_percent: null,
  compare_unit_price: null,
  ...o,
})

// A peça de campanha (209,90 com 20% ⇒ 167,92) e a comum (100,00).
const LINHAS = [
  linha({ id: 'oi-1', quantity: 1, unit_price: 167.92, full_unit_price: 209.9, campaign_id: 'camp-black', campaign_percent: 20 }),
  linha({ id: 'oi-2', product_id: COMUM, product_name: 'Corrente', quantity: 1, unit_price: 100, full_unit_price: 100 }),
]

interface Cenario {
  order?: Record<string, unknown>
  linhas?: unknown[]
  cupom?: Record<string, unknown> | null
  travado?: Record<string, unknown> | null
}

const montar = (c: Cenario = {}) => {
  const supabase = createFakeSupabase({
    user: { id: USER_ID },
    rows: {
      orders: {
        id: ORDER_ID,
        order_number: '0300',
        customer_id: 'cust-1',
        customer_email: 'cliente@estrelinha.test',
        customer_name: 'Ana Souza',
        payment_status: 'pending',
        shipping_cost: 0,
        coupon_id: null,
        mp_order_id: null,
        total: 267.92,
        promotion_discount: 0,
        buy_together_discount: 0,
        order_bump_discount: 0,
        campaign_discount: 41.98,
        ...c.order,
      },
      customers: { user_id: USER_ID, cpf: '39053344705', name: 'Mariana Souza Lima' },
      store_settings: () => null,
      coupons: c.cupom ?? null,
      order_charge_locks: c.travado ?? null,
    },
    lists: {
      order_items: c.linhas ?? LINHAS,
      products: [
        { id: PECA, base_price: 209.9, original_price: null },
        { id: COMUM, base_price: 100, original_price: null },
      ],
      product_buy_together: [],
    },
  })
  const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrder }])
  return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
}

const cobrado = (e: ReturnType<typeof montar>) => e.fetchDouble.calls.at(-1)?.body.total_amount
const gravacaoDoPedido = (e: ReturnType<typeof montar>) =>
  e.supabase.updates.find((u) => u.table === 'orders' && 'total' in u.values)?.values

describe('create-payment — a campanha gravada na linha', () => {
  it('aplica a campanha gravada mesmo depois do fim da vigência: cobra 267,92', async () => {
    // Não há campanha nenhuma em `campaigns` neste cenário: a vigência não é reavaliada.
    const e = montar()
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    expect(cobrado(e)).toBe('267.92')
    expect(gravacaoDoPedido(e)).toMatchObject({ subtotal: 267.92, campaign_discount: 41.98 })
  })

  it('a linha regravada preserva a campanha e o percentual (nenhum update de campanha nela)', async () => {
    const e = montar()
    await createPayment(e.deps, request(), pix)
    const updates = e.supabase.updates.filter((u) => u.table === 'order_items')
    for (const u of updates) {
      expect(u.values).not.toHaveProperty('campaign_id')
      expect(u.values).not.toHaveProperty('campaign_percent')
    }
  })

  it('duas linhas da mesma peça de campanha se juntam e saem as duas pelo preço da campanha', async () => {
    // A peça de campanha não recebe o desconto casado nem a faixa, então não se parte em preços
    // diferentes; duas linhas gravadas dela voltam a ser uma, com a campanha preservada.
    const e = montar({
      linhas: [
        linha({ id: 'oi-1', quantity: 1, unit_price: 167.92, full_unit_price: 209.9, campaign_id: 'camp-black', campaign_percent: 20 }),
        linha({ id: 'oi-3', quantity: 1, unit_price: 209.9, full_unit_price: 209.9, campaign_id: 'camp-black', campaign_percent: 20 }),
      ],
      order: { total: 335.84, campaign_discount: 83.96 },
    })
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    expect(cobrado(e)).toBe('335.84')
    const atualizada = e.supabase.updates.find((u) => u.table === 'order_items')
    expect(atualizada?.values).toEqual({ quantity: 2 })
  })

  it('teto com o desconto de campanha: recalculado menor que o gravado ⇒ 422 antes de cobrar', async () => {
    // O pedido diz 60,00 de campanha; o recálculo dá 41,98.
    const e = montar({ order: { campaign_discount: 60 } })
    const res = await createPayment(e.deps, request(), pix)
    const corpo = await res.json()
    expect(res.status).toBe(422)
    expect(corpo.code).toBe('promotion_no_longer_valid')
    expect(e.fetchDouble.calls).toEqual([])
  })

  it('cupom de 10%: desconta só da comum (10,00), e o mínimo não atingido o descarta', async () => {
    const valido = {
      type: 'percent',
      value: 10,
      active: true,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      used_count: 0,
      min_order: 50,
      first_order_only: false,
    }
    const comCupom = montar({ order: { coupon_id: COUPON_ID }, cupom: valido })
    await createPayment(comCupom.deps, request(), pix)
    expect(cobrado(comCupom)).toBe('257.92')

    // Pedido mínimo de 150: a peça de campanha não conta, a comum (100) não chega ⇒ cupom `null`.
    const minimo = montar({ order: { coupon_id: COUPON_ID }, cupom: { ...valido, min_order: 150 } })
    await createPayment(minimo.deps, request(), pix)
    expect(cobrado(minimo)).toBe('267.92')
  })

  it('a primeira cobrança trava o desconto de campanha', async () => {
    const e = montar()
    await createPayment(e.deps, request(), pix)
    const trava = e.supabase.inserts.find((i) => i.table === 'order_charge_locks')?.values
    expect(trava).toMatchObject({ campaign_discount: 41.98 })
  })

  it('pagar de novo devolve o pedido ao desconto de campanha travado', async () => {
    const e = montar({
      travado: {
        order_id: ORDER_ID,
        first_method: 'pix',
        promotion_id: null,
        promotion_discount: 0,
        buy_together_discount: 0,
        order_bump_discount: 0,
        campaign_discount: 41.98,
        pix: { subtotal: 267.92, discount: 0, pix_discount: 0, shipping: 0, total: 267.92 },
        card: { subtotal: 267.92, discount: 0, pix_discount: 0, shipping: 0, total: 267.92 },
        lines: [
          { product_id: PECA, variant_id: null, quantity: 1, unit_price: 167.92, full_unit_price: 209.9 },
          { product_id: COMUM, variant_id: null, quantity: 1, unit_price: 100, full_unit_price: 100 },
        ],
      },
      order: { campaign_discount: 0 },
    })
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    expect(cobrado(e)).toBe('267.92')
    expect(gravacaoDoPedido(e)).toMatchObject({ campaign_discount: 41.98 })
  })
})
