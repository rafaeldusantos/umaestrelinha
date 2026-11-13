import { describe, expect, it } from 'vitest'

import { createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { IDENTIFY_MAX, IDENTIFY_WINDOW_MS, createRateLimiter, linhaDoItem, route, type Deps } from '../handlers.ts'

/**
 * O `create-order` e a campanha de desconto: a function resolve, com o RELÓGIO DELA, a campanha em
 * vigência e a marcação de cada peça, e grava o que resolveu — nunca o que veio no corpo. A loja
 * manda o percentual EXIBIDO por linha só para comparação: se o servidor dá menos desconto que a
 * tela mostrou (a campanha acabou entre a sacola e o pedido), 422 com o código do "um desconto deste
 * pedido mudou" e nada gravado.
 */

const DENTRO = Date.parse('2026-11-28T12:00:00.000Z')
const DEPOIS = Date.parse('2026-11-30T03:00:00.000Z')
const ANTES = Date.parse('2026-11-26T12:00:00.000Z')

const PECA = '11111111-1111-4111-8111-111111111111'
const COMUM = '22222222-2222-4222-8222-222222222222'

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  starts_at: '2026-11-27T03:00:00.000Z',
  ends_at: '2026-11-30T03:00:00.000Z',
  active: true,
}

const item = (extra: Record<string, unknown>) => ({
  product_id: PECA,
  product_name: 'Pingente',
  quantity: 1,
  unit_price: 167.92,
  full_unit_price: 209.9,
  variant_id: null,
  price_source: 'base',
  campaign_percent: 20,
  ...extra,
})

const PEDIDO = {
  client_request_id: 'tentativa-campanha',
  customer_name: 'Marina',
  customer_email: 'marina@exemplo.com',
  payment_method: 'pix',
  subtotal: 267.92,
  discount: 0,
  shipping_cost: 0,
  total: 267.92,
  items: [item({}), item({ product_id: COMUM, product_name: 'Corrente', unit_price: 100, full_unit_price: 100, campaign_percent: null })],
}

const cenario = () =>
  createFakeSupabase({
    rpcByFn: { account_exists: { data: false } },
    rows: { orders: null, customers: { id: 'cus-1' } },
    inserted: { orders: { id: 'ord-1' } },
    createdUser: { id: 'usr-1' },
    lists: {
      campaigns: [BLACK],
      product_campaigns: (eqs) =>
        eqs.some(([c, v]) => c === 'campaign_id' && v === 'camp-black') ? [{ product_id: PECA, percent: 20 }] : [],
      products: [
        { id: PECA, base_price: 209.9, original_price: null },
        { id: COMUM, base_price: 100, original_price: null },
      ],
      product_variants: [],
    },
  })

const deps = (supabase: ReturnType<typeof createFakeSupabase>, agora: number): Deps => ({
  supabase: supabase.client,
  now: () => agora,
  limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, () => agora),
})

const pedir = (body: unknown) =>
  new Request('https://x.test/functions/v1/checkout?action=create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const gravado = (supabase: ReturnType<typeof createFakeSupabase>, tabela: string) =>
  supabase.inserts.find((i) => i.table === tabela)?.values as never

describe('create-order — a campanha que o servidor resolveu', () => {
  it('em vigência: grava a campanha e o percentual na linha marcada, e o desconto do pedido', async () => {
    const supabase = cenario()
    const res = await route(deps(supabase, DENTRO), pedir(PEDIDO))
    expect(res.status).toBe(200)

    const itens = gravado(supabase, 'order_items') as Record<string, unknown>[]
    expect(itens[0]).toMatchObject({ campaign_id: 'camp-black', campaign_percent: 20, compare_unit_price: null })
    expect(itens[1].campaign_id).toBeUndefined()
    expect(itens[1].campaign_percent).toBeUndefined()
    // 209,90 − 167,92 = 41,98.
    expect((gravado(supabase, 'orders') as Record<string, unknown>).campaign_discount).toBe(41.98)
  })

  it('a campanha vinda do corpo é descartada: o servidor grava a dele, nunca a forjada', async () => {
    const supabase = cenario()
    const forjado = {
      ...PEDIDO,
      campaign_discount: 999,
      items: [
        item({ campaign_id: 'camp-forjada', campaign_percent: 70, compare_unit_price: 9999 }),
        item({ product_id: COMUM, unit_price: 100, full_unit_price: 100, campaign_id: 'camp-forjada', campaign_percent: null }),
      ],
    }
    const res = await route(deps(supabase, DENTRO), pedir(forjado))
    // 70% exibido contra 20% do servidor: o servidor dá MENOS ⇒ recusa.
    expect(res.status).toBe(422)
    expect(supabase.inserts).toEqual([])
  })

  it('linhaDoItem não copia campanha nenhuma do corpo', () => {
    const linha = linhaDoItem(
      { product_id: PECA, quantity: 1, unit_price: 1, campaign_id: 'x', campaign_percent: 70, compare_unit_price: 5 },
      'ord-1',
      [PECA],
    )
    expect(linha).not.toHaveProperty('campaign_id')
    expect(linha).not.toHaveProperty('campaign_percent')
    expect(linha).not.toHaveProperty('compare_unit_price')
  })

  it('a campanha acabou entre a sacola e o pedido: 422 com o código do desconto mudado, nada gravado', async () => {
    const supabase = cenario()
    const res = await route(deps(supabase, DEPOIS), pedir(PEDIDO))
    const corpo = await res.json()
    expect(res.status).toBe(422)
    expect(corpo.code).toBe('promotion_no_longer_valid')
    expect(corpo.displayed_total).toBe(267.92)
    expect(supabase.inserts).toEqual([])
  })

  it('a campanha começou depois de a sacola ser aberta: grava a do servidor', async () => {
    const supabase = cenario()
    const semExibir = { ...PEDIDO, items: PEDIDO.items.map((i) => ({ ...i, campaign_percent: null, unit_price: i.full_unit_price })) }
    const res = await route(deps(supabase, DENTRO), pedir(semExibir))
    expect(res.status).toBe(200)
    const itens = gravado(supabase, 'order_items') as Record<string, unknown>[]
    expect(itens[0]).toMatchObject({ campaign_id: 'camp-black', campaign_percent: 20 })
    expect((gravado(supabase, 'orders') as Record<string, unknown>).campaign_discount).toBe(41.98)
  })

  it('antes do início e depois do fim, sem nada exibido: nenhuma campanha gravada', async () => {
    for (const agora of [ANTES, DEPOIS]) {
      const supabase = cenario()
      const semExibir = { ...PEDIDO, items: PEDIDO.items.map((i) => ({ ...i, campaign_percent: null })) }
      const res = await route(deps(supabase, agora), pedir(semExibir))
      expect(res.status).toBe(200)
      const itens = gravado(supabase, 'order_items') as Record<string, unknown>[]
      expect(itens.every((i) => i.campaign_id === undefined)).toBe(true)
      expect((gravado(supabase, 'orders') as Record<string, unknown>).campaign_discount).toBe(0)
    }
  })

  it('o "de/por" entra no cheio: a linha guarda o "de" e o desconto parte dele', async () => {
    const supabase = createFakeSupabase({
      rpcByFn: { account_exists: { data: false } },
      rows: { orders: null, customers: { id: 'cus-1' } },
      inserted: { orders: { id: 'ord-1' } },
      createdUser: { id: 'usr-1' },
      lists: {
        campaigns: [BLACK],
        product_campaigns: [{ product_id: PECA, percent: 30 }],
        // De 250,00 por 199,90; 30% sobre 250 = 175,00.
        products: [{ id: PECA, base_price: 199.9, original_price: 250 }],
        product_variants: [],
      },
    })
    const body = { ...PEDIDO, items: [item({ unit_price: 175, full_unit_price: 199.9, campaign_percent: 30 })] }
    const res = await route(deps(supabase, DENTRO), pedir(body))
    expect(res.status).toBe(200)
    const itens = gravado(supabase, 'order_items') as Record<string, unknown>[]
    expect(itens[0]).toMatchObject({ campaign_percent: 30, compare_unit_price: 250 })
    expect((gravado(supabase, 'orders') as Record<string, unknown>).campaign_discount).toBe(24.9)
  })
  it('a peça sem grade com o "de" na variação única: o cheio é o "de" dela (R$ 374,00), nunca o "por"', async () => {
    const supabase = createFakeSupabase({
      rpcByFn: { account_exists: { data: false } },
      rows: { orders: null, customers: { id: 'cus-1' } },
      inserted: { orders: { id: 'ord-1' } },
      createdUser: { id: 'usr-1' },
      lists: {
        campaigns: [BLACK],
        product_campaigns: [{ product_id: PECA, percent: 10 }],
        // A forma do catálogo importado: `original_price` nulo, o "de/por" na variação única.
        products: [{ id: PECA, base_price: 349.9, original_price: null }],
        product_variants: [{ id: 'var-mc', product_id: PECA, price: 349.9, compare_price: 374 }],
      },
    })
    // min(349,90; 374,00 × 0,9 = 336,60) = 336,60.
    const body = { ...PEDIDO, items: [item({ unit_price: 336.6, full_unit_price: 349.9, campaign_percent: 10 })] }
    const res = await route(deps(supabase, DENTRO), pedir(body))
    expect(res.status).toBe(200)
    const itens = gravado(supabase, 'order_items') as Record<string, unknown>[]
    expect(itens[0]).toMatchObject({ campaign_percent: 10, compare_unit_price: 374 })
    // 349,90 − 336,60 = 13,30 — nunca os 34,99 do desconto sobre o "por".
    expect((gravado(supabase, 'orders') as Record<string, unknown>).campaign_discount).toBe(13.3)
  })
})
