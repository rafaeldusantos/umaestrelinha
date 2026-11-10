import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { route } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase, type FakeSupabaseOptions } from './fakes.ts'

// O link de pagamento por cartão: a Adri gera no painel (ação `card-link`, só admin) e a cliente paga
// por ele sem login. O token é a terceira prova de posse do `create-payment`, e só vale para cartão.

const ORDER_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d'
const OUTRO_PEDIDO = '0f9e8d7c-6b5a-4c3d-8e2f-1a0b9c8d7e6f'
const MP_ORDER_ID = 'ORDTST01KCARTAORECUSADO00000'
const ADMIN = { id: 'admin-1' }
const LINK_TOKEN = 'tok-do-link-de-cartao-abcdefghijklmnopqrstu'
const hash = (t: string) => createHash('sha256').update(t).digest('hex')

/** Um pedido de cartão cujo pagamento foi recusado — o caso do link. */
const PEDIDO = {
  id: ORDER_ID,
  order_number: '0301',
  customer_id: null,
  customer_email: 'cliente@estrelinha.test',
  customer_name: 'Ana Souza',
  customer_document: '39053344705',
  payment_method: 'card',
  status: 'pending',
  payment_status: 'rejected',
  paid_at: null,
  shipping_cost: 20,
  mp_order_id: MP_ORDER_ID,
  total: 1,
  promotion_discount: 0,
  buy_together_discount: 0,
  order_bump_discount: 0,
}

/** O valor travado na primeira cobrança (feita a mão, não pela função): cartão 182,00. */
const TRAVADO = {
  order_id: ORDER_ID,
  first_method: 'card',
  promotion_id: null,
  promotion_discount: 0,
  buy_together_discount: 0,
  order_bump_discount: 0,
  pix: { subtotal: 180, discount: 18, pix_discount: 8.1, shipping: 20, total: 173.9 },
  card: { subtotal: 180, discount: 18, pix_discount: 0, shipping: 20, total: 182 },
  lines: [{ product_id: 'peca-1', variant_id: null, quantity: 2, unit_price: 90, full_unit_price: 100 }],
}

const mpCard = {
  id: 'ORDTST02',
  status: 'processed',
  status_detail: 'accredited',
  external_reference: ORDER_ID,
  transactions: { payments: [{ id: 'PAY02', status: 'processed', status_detail: 'accredited' }] },
}

interface Cenario {
  pedido?: Record<string, unknown>
  /** A linha da credencial lida pelo hash, ou `null` (token desconhecido). */
  link?: ((hashLido: unknown) => Record<string, unknown> | null) | null
  opcoes?: FakeSupabaseOptions
}

/** O token que o link carrega no fragmento. */
const tokenDo = (link: string) => new URL(link).hash.slice(1)

const montar = (c: Cenario = {}, storePublicUrl = 'https://umaestrelinha.com.br') => {
  const supabase = createFakeSupabase({
    user: ADMIN,
    rpcByFn: { has_role: { data: true }, issue_order_card_link: { data: 'link-1' } },
    rows: {
      orders: { ...PEDIDO, ...c.pedido },
      order_charge_locks: TRAVADO,
      order_card_links: (_eq: unknown, _sel: string, eqs: Array<[string, unknown]>) => {
        const lido = eqs.find(([col]) => col === 'token_hash')?.[1]
        if (c.link === null) return null
        if (c.link) return c.link(lido)
        return lido === hash(LINK_TOKEN) ? { order_id: ORDER_ID, revoked_at: null } : null
      },
    },
    lists: {
      order_items: [{ id: 'oi-1', product_id: 'peca-1', variant_id: null, quantity: 2, unit_price: 90, full_unit_price: 100 }],
    },
    ...c.opcoes,
  })
  const fetchDouble = createFakeFetch([
    { match: '/cancel', body: { id: MP_ORDER_ID } },
    { match: '/v1/orders', body: mpCard },
  ])
  return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble, {}, { storePublicUrl }) }
}
type Montado = ReturnType<typeof montar>

const gerar = (comToken = true, orderId = ORDER_ID) =>
  new Request('http://local/functions/v1/mercado-pago?action=card-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(comToken ? { Authorization: 'Bearer jwt-admin' } : {}) },
    body: JSON.stringify({ order_id: orderId }),
  })

const pagar = (corpo: Record<string, unknown>) =>
  new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: ORDER_ID,
      method: 'card',
      idempotency_key: 'idem-link',
      card: { token: 'tok', payment_method_id: 'visa', installments: 1, payer: { email: 'quem@paga.test' } },
      card_link_token: LINK_TOKEN,
      ...corpo,
    }),
  })

const emissoes = (e: Montado) => e.supabase.rpcs.filter((r) => r.fn === 'issue_order_card_link')
const cobrancas = (e: Montado) =>
  e.fetchDouble.calls.filter((c) => c.method === 'POST' && c.url.endsWith('/v1/orders'))
const cancelamentos = (e: Montado) => e.fetchDouble.calls.filter((c) => c.url.endsWith(`/v1/orders/${MP_ORDER_ID}/cancel`))

describe('gerar o link de cartão (a porta da Adri)', () => {
  it('pedido de cartão recusado: devolve o link da loja com o token no fragmento, grava só o hash e fecha a cobrança aberta', async () => {
    const e = montar()
    const r = await route(e.deps, gerar())

    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(Object.keys(corpo)).toEqual(['link'])
    const url = new URL(corpo.link)
    expect(url.origin).toBe('https://umaestrelinha.com.br')
    expect(url.pathname).toBe('/pagar-com-cartao')
    expect(url.search).toBe('')
    const token = tokenDo(corpo.link)
    expect(token.length).toBeGreaterThanOrEqual(43)
    expect(emissoes(e)).toEqual([
      { fn: 'issue_order_card_link', args: { p_order_id: ORDER_ID, p_token_hash: hash(token), p_created_by: ADMIN.id } },
    ])
    expect(cancelamentos(e)).toHaveLength(1)
  })

  it.each(['pending', 'expired'])('pedido de cartão com pagamento %s também recebe o link', async (payment_status) => {
    const e = montar({ pedido: { payment_status } })
    expect((await route(e.deps, gerar())).status).toBe(200)
    expect(emissoes(e)).toHaveLength(1)
  })

  it('gerar de novo emite um token novo a cada vez', async () => {
    const e = montar()
    const a = tokenDo((await (await route(e.deps, gerar())).json()).link)
    const b = tokenDo((await (await route(e.deps, gerar())).json()).link)
    expect(a).not.toBe(b)
    expect(emissoes(e).map((r) => r.args.p_token_hash)).toEqual([hash(a), hash(b)])
  })

  it('a origem da loja com barra no fim não dobra a barra do caminho', async () => {
    const e = montar({}, 'https://umaestrelinha.com.br/')
    const { link } = await (await route(e.deps, gerar())).json()
    expect(link).toMatch(/^https:\/\/umaestrelinha\.com\.br\/pagar-com-cartao#[A-Za-z0-9_-]{43,}$/)
  })

  it('sem a origem da loja configurada: 503 e nenhum link emitido (o painel não teria o que copiar)', async () => {
    const e = montar({}, '')
    const r = await route(e.deps, gerar())
    expect(r.status).toBe(503)
    expect(emissoes(e)).toEqual([])
    expect(e.fetchDouble.calls).toEqual([])
  })

  it('não mexe no pedido — o cancelamento automático não é adiado', async () => {
    const e = montar()
    await route(e.deps, gerar())
    expect(e.supabase.updates.filter((u) => u.table === 'orders')).toEqual([])
  })

  it.each([
    ['feito com PIX', { payment_method: 'pix' }, 'O link de cartão é só para pedido feito com cartão.'],
    ['cancelado', { status: 'cancelled' }, 'Este pedido foi cancelado.'],
    ['já pago', { payment_status: 'approved', paid_at: '2026-11-10T12:00:00Z' }, 'Este pedido já foi pago.'],
  ])('pedido %s: 409 com o motivo, sem emitir link nem fechar cobrança', async (_n, pedido, motivo) => {
    const e = montar({ pedido })
    const r = await route(e.deps, gerar())
    expect(r.status).toBe(409)
    expect((await r.json()).error).toBe(motivo)
    expect(emissoes(e)).toEqual([])
    expect(e.fetchDouble.calls).toEqual([])
  })

  it('sem sessão: 401; conta que não é admin: 403 — e nenhum link sai', async () => {
    const semSessao = montar()
    expect((await route(semSessao.deps, gerar(false))).status).toBe(401)
    const naoAdmin = montar({ opcoes: { rpcByFn: { has_role: { data: false } } } })
    expect((await route(naoAdmin.deps, gerar())).status).toBe(403)
    expect([...emissoes(semSessao), ...emissoes(naoAdmin)]).toEqual([])
  })

  it('pedido que não existe: 404', async () => {
    const e = montar({ opcoes: { rows: { orders: null } } })
    expect((await route(e.deps, gerar())).status).toBe(404)
    expect(emissoes(e)).toEqual([])
  })
})

describe('pagar pelo link (a terceira prova de posse do create-payment)', () => {
  it('o token vivo do pedido, sem login, cobra o cartão pelo valor travado', async () => {
    const e = montar()
    const r = await route(e.deps, pagar({}))

    expect(r.status).toBe(200)
    expect(cobrancas(e)).toHaveLength(1)
    expect(cobrancas(e)[0].body.total_amount).toBe('182.00')
  })

  it('o mesmo token para PIX não é prova nenhuma: 401, sem cobrança', async () => {
    const e = montar()
    const r = await route(e.deps, pagar({ method: 'pix', card: undefined }))
    expect(r.status).toBe(401)
    expect(cobrancas(e)).toEqual([])
  })

  it('token substituído por um link novo (revogado): 403, sem cobrança', async () => {
    const e = montar({ link: () => ({ order_id: ORDER_ID, revoked_at: '2026-11-10T12:00:00Z' }) })
    expect((await route(e.deps, pagar({}))).status).toBe(403)
    expect(cobrancas(e)).toEqual([])
  })

  it('token de outro pedido: 403, sem cobrança', async () => {
    const e = montar({ link: () => ({ order_id: OUTRO_PEDIDO, revoked_at: null }) })
    expect((await route(e.deps, pagar({}))).status).toBe(403)
    expect(cobrancas(e)).toEqual([])
  })

  it('token desconhecido: 403, sem cobrança', async () => {
    const e = montar({ link: null })
    expect((await route(e.deps, pagar({}))).status).toBe(403)
    expect(cobrancas(e)).toEqual([])
  })

  it.each([
    ['pago', { payment_status: 'approved', paid_at: '2026-11-10T12:00:00Z' }, 'order_already_paid'],
    ['cancelado', { status: 'cancelled' }, 'order_cancelled'],
  ])('pedido %s com o link vivo: 409, sem cobrança', async (_n, pedido, code) => {
    const e = montar({ pedido })
    const r = await route(e.deps, pagar({}))
    expect(r.status).toBe(409)
    expect((await r.json()).code).toBe(code)
    expect(cobrancas(e)).toEqual([])
  })

  // O pedido que a loja levou adiante sem pagamento não aceita cobrança pelo endereço de pagamento
  // (`order_not_awaiting_payment`); o link de cartão é a exceção, porque só a admin o gera.
  it('pedido em Separando sem pagamento, com o link vivo: a cobrança da admin sai', async () => {
    const e = montar({ pedido: { status: 'separating' } })
    const r = await route(e.deps, pagar({}))
    expect(r.status).toBe(200)
    expect(cobrancas(e)).toHaveLength(1)
  })
})
