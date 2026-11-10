import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { buildDeps, route } from '../handlers.ts'

// A página do link de pagamento por cartão lê o pedido pelo token (`get-card-link`). Ela mostra só o
// que precisa para pagar — o número, o valor e as peças —, nunca dado pessoal; pedido pago ou
// cancelado mostra a situação, sem nada para pagar; token inválido ou substituído não mostra nada.

const ORDER_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const TOKEN = 'tok-do-link-de-cartao-abcdefghijklmnopqrstu'
const hash = (t: string) => createHash('sha256').update(t).digest('hex')

const PEDIDO = {
  id: ORDER_ID,
  order_number: '0301',
  customer_id: 'cust-1',
  customer_email: 'ana@exemplo.invalid',
  customer_name: 'Ana Souza',
  customer_phone: '51998124471',
  customer_document: '39053344705',
  address_street: 'Rua das Flores',
  address_zip: '91240010',
  payment_method: 'card',
  status: 'pending',
  payment_status: 'rejected',
  paid_at: null,
  total: 1,
  guest_access_hash: 'abc',
}

interface Cenario {
  pedido?: Record<string, unknown> | null
  link?: Record<string, unknown> | null
  travado?: Record<string, unknown> | null
  opcoes?: FakeSupabaseOptions
}

const montar = (c: Cenario = {}) => {
  const fake = createFakeSupabase({
    rows: {
      order_card_links: (_eq: unknown, _sel: string, eqs: Array<[string, unknown]>) =>
        eqs.some(([col, v]) => col === 'token_hash' && v === hash(TOKEN))
          ? c.link === undefined
            ? { order_id: ORDER_ID, revoked_at: null }
            : c.link
          : null,
      orders: (_eq: unknown, _sel: string, eqs: Array<[string, unknown]>) =>
        eqs.some(([col, v]) => col === 'id' && v === ORDER_ID)
          ? c.pedido === undefined
            ? PEDIDO
            : c.pedido && { ...PEDIDO, ...c.pedido }
          : null,
      order_charge_locks:
        c.travado === undefined ? { card: { total: 182 }, pix: { total: 173.9 } } : c.travado,
    },
    lists: {
      order_items: (eqs: Array<[string, unknown]>) =>
        eqs.some(([col, v]) => col === 'order_id' && v === ORDER_ID)
          ? [
              { product_name: 'Pingente Estrela', variant_label: 'Prata', quantity: 2 },
              { product_name: 'Corrente', variant_label: null, quantity: 1 },
            ]
          : [],
    },
    ...c.opcoes,
  })
  return { fake, deps: buildDeps(fake.client, () => Date.parse('2026-11-10T12:00:00Z')) }
}

const ler = (deps: ReturnType<typeof buildDeps>, token: unknown = TOKEN, ip = '200.1.1.1') =>
  route(
    deps,
    new Request('https://x.test/functions/v1/checkout?action=get-card-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ token }),
    }),
  )

describe('get-card-link — o pedido pelo token do link de cartão', () => {
  it('pedido pendente: o número, o valor travado no cartão e as peças — e nada pessoal', async () => {
    const { deps } = montar()
    const r = await ler(deps)

    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo).toEqual({
      order: {
        id: ORDER_ID,
        order_number: '0301',
        amount: 182,
        items: [
          { name: 'Pingente Estrela', variant: 'Prata', quantity: 2 },
          { name: 'Corrente', variant: null, quantity: 1 },
        ],
      },
    })
    const texto = JSON.stringify(corpo)
    for (const pessoal of ['ana@exemplo.invalid', 'Ana Souza', '51998124471', '39053344705', 'Rua das Flores', '91240010', 'cust-1']) {
      expect(texto).not.toContain(pessoal)
    }
  })

  it('sem valor travado, o valor é o total do pedido', async () => {
    const { deps } = montar({ travado: null, pedido: { total: 150.5 } })
    expect((await (await ler(deps)).json()).order.amount).toBe(150.5)
  })

  it.each([
    ['pago', { payment_status: 'approved', paid_at: '2026-11-10T12:00:00Z' }, 'paid'],
    ['cancelado', { status: 'cancelled' }, 'cancelled'],
  ])('pedido %s: só a situação, sem nada para pagar', async (_n, pedido, situation) => {
    const { deps } = montar({ pedido })
    const r = await ler(deps)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ situation, order_number: '0301' })
  })

  it('pedido em análise (não pagável e não encerrado): link indisponível', async () => {
    const { deps } = montar({ pedido: { payment_status: 'in_process' } })
    const r = await ler(deps)
    expect(r.status).toBe(404)
    expect((await r.json()).order).toBeUndefined()
  })

  it.each([
    ['substituído por um link novo', { link: { order_id: ORDER_ID, revoked_at: '2026-11-10T11:00:00Z' } }, TOKEN],
    ['desconhecido', {}, 'outro-token-qualquer'],
    ['vazio', {}, ''],
    ['de pedido que não existe mais', { pedido: null }, TOKEN],
  ])('token %s: 404, sem dado do pedido', async (_n, cenario, token) => {
    const { deps } = montar(cenario as Cenario)
    const r = await ler(deps, token)
    expect(r.status).toBe(404)
    const corpo = await r.json()
    expect(corpo.order).toBeUndefined()
    expect(corpo.situation).toBeUndefined()
    expect(corpo.code).toBe('unavailable')
  })

  it('30 leituras por IP passam; a 31ª é recusada com 429', async () => {
    const { deps } = montar()
    for (let i = 0; i < 30; i++) expect((await ler(deps, 'x', '200.9.9.9')).status).toBe(404)
    expect((await ler(deps, 'x', '200.9.9.9')).status).toBe(429)
    expect((await ler(deps, 'x', '200.8.8.8')).status).toBe(404)
  })
})
