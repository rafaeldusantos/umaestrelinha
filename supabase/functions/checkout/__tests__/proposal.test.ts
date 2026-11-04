import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { hashAccessToken } from '../../../../packages/core/src/checkout/guestAccess.ts'
import { proposalPricing } from '../../../../packages/core/src/proposals/index.ts'
import { IDENTIFY_MAX, IDENTIFY_WINDOW_MS, createRateLimiter, route, type Deps } from '../handlers.ts'
import {
  ITEM_UNAVAILABLE,
  PROPOSAL_CHANGED,
  PROPOSAL_READ_MAX,
  PROPOSAL_READ_WINDOW_MS,
  PROPOSAL_UNAVAILABLE,
} from '../proposal.ts'

// A proposta montada pelo painel, do lado da loja (feature 89, T09): `get-proposal` e `create-order`
// com `proposal_token`. O token do link é a credencial (`SEG-01`): o banco só tem o hash, e o
// dublê só devolve a proposta quando o filtro é o hash DESTE token — trocar a coluna ou esquecer o
// hash faz a proposta não ser encontrada.

const AGORA = Date.parse('2026-10-31T12:00:00Z')
const TOKEN = 'tok-do-link-da-maria-0123456789abcdefghijklmn'
const PROP = 'cccccccc-0000-4000-8000-000000000001'
const P1 = 'aaaaaaaa-0000-4000-8000-000000000001'
const P2 = 'aaaaaaaa-0000-4000-8000-000000000002'
const V2 = 'bbbbbbbb-0000-4000-8000-00000000002a'
const CLIENTE = 'eeeeeeee-0000-4000-8000-000000000001'

let HASH = ''
beforeEach(async () => {
  HASH = await hashAccessToken(TOKEN)
})

const PROPOSTA = (over: Record<string, unknown> = {}) => ({
  id: PROP,
  number: 'P-0007',
  status: 'open',
  version: 2,
  expires_at: '2026-11-05T12:00:00Z',
  viewed_at: null,
  order_id: null,
  customer_id: CLIENTE,
  customer_name: 'Maria Clara',
  customer_email: 'maria@exemplo.invalid',
  customer_phone: '51999990000',
  customer_document: '12345678909',
  address_zip: '91240010',
  address_street: 'Rua das Flores',
  address_number: '10',
  address_complement: null,
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  coupon_code: null,
  coupon_discount: 0,
  coupon_free_shipping: false,
  manual_discount: 20,
  // Colunas internas que um `select *` traria e que NÃO podem sair (SEG-04).
  manual_discount_reason: 'Combinado no WhatsApp',
  token_hash: 'nao-deveria-sair',
  admin_note: 'Observação só do ateliê',
  subtotal: 250,
  promotion_discount: 0,
  items_total: 230,
  ...over,
})

const LINHAS = [
  { position: 0, product_id: P1, variant_id: null, product_name: 'Pingente Estrela', product_image: 'p1.webp', variant_label: null, quantity: 1, list_price: 100, unit_price: 100, engraving_text: null, requires_material: false, material_kinds: [] },
  { position: 1, product_id: P2, variant_id: V2, product_name: 'Anel Lua', product_image: 'v2.webp', variant_label: 'M · Sim', quantity: 1, list_price: 150, unit_price: 150, engraving_text: 'Lua', requires_material: true, material_kinds: ['cinzas'] },
]

const PRODUTOS = [
  { id: P1, is_active: true, stock_policy: 'track', stock_total: 3 },
  { id: P2, is_active: true, stock_policy: 'track', stock_total: 3 },
]
const VARIACOES = [{ id: V2, product_id: P2, is_active: true, stock: 2 }]

const porIn = (rows: any[]) => (_e: unknown, _s: string, read: any) => {
  let saida = rows
  for (const [c, vs] of read.in as Array<[string, unknown[]]>) saida = saida.filter((r) => vs.includes(r[c]))
  return saida
}

const AJUSTES: Record<string, unknown> = {
  shipping: { free_shipping_enabled: false, free_shipping_threshold: 0 },
  payment: { pix_discount_percent: 5 },
}

function ambiente(opts: { proposta?: Record<string, unknown> | null; produtos?: any[]; variacoes?: any[]; ajustes?: Record<string, unknown>; extra?: FakeSupabaseOptions; limiter?: Deps['proposalLimiter'] | null } = {}) {
  const proposta = opts.proposta === undefined ? PROPOSTA() : opts.proposta
  const ajustes = opts.ajustes ?? AJUSTES
  const fake = createFakeSupabase({
    rpcByFn: {
      account_exists: { data: false },
      mark_order_proposal_viewed: { data: true },
      create_order_from_proposal: { data: { order_id: 'ord-9', order_number: '0201', reused: false } },
    },
    ...opts.extra,
    rows: {
      order_proposals: (eq: [string, unknown] | null) => (eq?.[0] === 'token_hash' && eq[1] === HASH ? proposta : null),
      store_settings: (eq: [string, unknown] | null) => (eq?.[0] === 'key' && ajustes[String(eq[1])] ? { value: ajustes[String(eq[1])] } : null),
      orders: { order_number: '0150' },
      customers: { id: 'ficha-por-email' },
      ...(opts.extra?.rows ?? {}),
    },
    lists: {
      order_proposal_items: LINHAS,
      products: porIn(opts.produtos ?? PRODUTOS),
      product_variants: porIn(opts.variacoes ?? VARIACOES),
      ...(opts.extra?.lists ?? {}),
    },
  })
  const deps: Deps = {
    supabase: fake.client,
    now: () => AGORA,
    limiter: createRateLimiter(IDENTIFY_MAX, IDENTIFY_WINDOW_MS, () => AGORA),
    // Sem `limiter` na chamada, o balde de produção (`get-proposal` recusa sem nenhum — K18);
    // `limiter: null` é o cenário "a fiação esqueceu o balde".
    proposalLimiter:
      opts.limiter === null
        ? undefined
        : (opts.limiter ?? createRateLimiter(PROPOSAL_READ_MAX, PROPOSAL_READ_WINDOW_MS, () => AGORA)),
  }
  return { ...fake, deps }
}

const pedir = (action: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://x.test/functions/v1/checkout?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

const rpcsDe = (f: { rpcs: Array<{ fn: string; args: any }> }, nome: string) => f.rpcs.filter((r) => r.fn === nome)

let logs: string[]
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...a: unknown[]) => {
    logs.push(a.map(String).join(' '))
  })
})
afterEach(() => vi.restoreAllMocks())

// ---------------------------------------------------------------------------------------------
// get-proposal
// ---------------------------------------------------------------------------------------------

describe('get-proposal — aberta (CON-01, SEG-04)', () => {
  it('devolve só o que a página desenha: sem hash, sem motivo do avulso, sem quem criou', async () => {
    const f = ambiente()
    const res = await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(res.status).toBe(200)
    const { proposal } = await res.json()

    expect(proposal).toMatchObject({ id: PROP, number: 'P-0007', version: 2, manual_discount: 20, items_total: 230 })
    // Fecho da rodada 3 (K30, CON-04/A-07): o e-mail da proposta sai para a página mostrar (e travar).
    expect(proposal.customer_email).toBe('maria@exemplo.invalid')
    expect(proposal.address).toMatchObject({ address_zip: '91240010', address_city: 'Porto Alegre' })
    expect(proposal.lines.map((l: any) => [l.product_name, l.unit_price, l.available])).toEqual([
      ['Pingente Estrela', 100, true],
      ['Anel Lua', 150, true],
    ])
    const corpo = JSON.stringify(proposal)
    expect(corpo).not.toContain('Combinado no WhatsApp')
    expect(corpo).not.toContain('nao-deveria-sair')
    expect(Object.keys(proposal)).not.toContain('manual_discount_reason')
    expect(Object.keys(proposal)).not.toContain('token_hash')
  })

  // A observação interna da proposta mora na mesma linha, e a cliente nunca a recebe —
  // nem pedida no `select`, nem na resposta, mesmo com o banco devolvendo a coluna.
  it('nunca devolve a observação interna (`admin_note`), nem a pede ao banco', async () => {
    let pedidas = ''
    const f = ambiente({
      extra: {
        rows: {
          order_proposals: (_eq: [string, unknown] | null, select: string) => {
            pedidas = select
            return PROPOSTA()
          },
        },
      },
    })
    const res = await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(res.status).toBe(200)
    const { proposal } = await res.json()
    expect(pedidas.length).toBeGreaterThan(0)
    expect(pedidas).not.toMatch(/admin_note/)
    expect(Object.keys(proposal)).not.toContain('admin_note')
    expect(JSON.stringify(proposal)).not.toContain('Observação só do ateliê')
  })

  it('o filtro é o HASH do token, na coluna `token_hash`', async () => {
    let filtro: [string, unknown] | null = null
    const f = ambiente({
      extra: {
        rows: {
          order_proposals: (eq: [string, unknown] | null, select: string) => {
            filtro = eq
            expect(select).not.toMatch(/manual_discount_reason|token_hash|idempotency_key|created_by|\*/)
            return PROPOSTA()
          },
        },
      },
    })
    await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(filtro).toEqual(['token_hash', HASH])
  })

  it('CON-11: marca "vista" uma vez — com `viewed_at` já preenchido, não chama de novo', async () => {
    const primeira = ambiente()
    await route(primeira.deps, pedir('get-proposal', { token: TOKEN }))
    expect(rpcsDe(primeira, 'mark_order_proposal_viewed').map((r) => r.args)).toEqual([{ p_proposal_id: PROP }])

    const segunda = ambiente({ proposta: PROPOSTA({ viewed_at: '2026-10-31T10:00:00Z' }) })
    expect((await route(segunda.deps, pedir('get-proposal', { token: TOKEN }))).status).toBe(200)
    expect(rpcsDe(segunda, 'mark_order_proposal_viewed')).toEqual([])
  })

  it('a marca de "vista" que falha não tira a página da cliente', async () => {
    const f = ambiente({ extra: { rpcByFn: { mark_order_proposal_viewed: { error: { message: 'x' } } } } })
    expect((await route(f.deps, pedir('get-proposal', { token: TOKEN }))).status).toBe(200)
  })

  it.each([
    ['variação pausada', { variacoes: [{ ...VARIACOES[0], is_active: false }] }, [true, false]],
    ['variação sem saldo com track', { variacoes: [{ ...VARIACOES[0], stock: 0 }] }, [true, false]],
    ['peça apagada', { produtos: [PRODUTOS[1]] }, [false, true]],
    ['peça inativa', { produtos: [{ ...PRODUTOS[0], is_active: false }, PRODUTOS[1]] }, [false, true]],
    ['peça sem variação sem saldo', { produtos: [{ ...PRODUTOS[0], stock_total: 0 }, PRODUTOS[1]] }, [false, true]],
    ['sem saldo, mas política `none`', { produtos: [{ ...PRODUTOS[0], stock_total: 0, stock_policy: 'none' }, PRODUTOS[1]] }, [true, true]],
  ])('CON-09: %s ⇒ disponibilidade por linha', async (_n, opts, esperado) => {
    const f = ambiente(opts as any)
    const { proposal } = await (await route(f.deps, pedir('get-proposal', { token: TOKEN }))).json()
    expect(proposal.lines.map((l: any) => l.available)).toEqual(esperado)
  })

  // Fecho da rodada 3 (K20): a leitura da PROPOSTA que falha é soluço do banco, não link morto.
  // 404 `unavailable` faria a página dizer a frase final de CON-08, sem "Tentar de novo".
  it('a leitura da proposta que falha ⇒ 502, nunca "este link não está mais disponível"', async () => {
    const f = ambiente()
    const original = f.deps.supabase.from
    f.deps.supabase.from = (t: string) => {
      if (t !== 'order_proposals') return original(t)
      const falha: any = {
        select: () => falha,
        eq: () => falha,
        maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }),
      }
      return falha
    }
    const res = await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(res.status).toBe(502)
    const corpo = await res.json()
    expect(corpo.code).toBeUndefined()
    expect(corpo.error).not.toBe(PROPOSAL_UNAVAILABLE)
    expect(corpo.proposal).toBeUndefined()
  })

  it('a leitura do catálogo que falha ⇒ 502, nunca "disponível"', async () => {
    const f = ambiente({ extra: { listErrorByTable: { products: { message: 'x' } } } })
    expect((await route(f.deps, pedir('get-proposal', { token: TOKEN }))).status).toBe(502)
  })

  it('o token nunca aparece em log', async () => {
    const f = ambiente()
    await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(logs.length).toBeGreaterThan(0)
    for (const l of logs) {
      expect(l).not.toContain(TOKEN)
      expect(l).not.toContain(HASH)
    }
  })
})

describe('get-proposal — indisponível (CON-08), concluída (CON-07), teto (SEG-04)', () => {
  const semDado = async (res: Response) => {
    expect(res.status).toBe(404)
    const corpo = await res.json()
    expect(corpo).toEqual({ error: PROPOSAL_UNAVAILABLE, code: 'unavailable' })
  }

  it('sem token ⇒ 404 sem ler nada', async () => {
    const f = ambiente()
    await semDado(await route(f.deps, pedir('get-proposal', {})))
    expect(f.reads).toEqual([])
  })

  it('token desconhecido ⇒ 404 sem dado', async () => {
    const f = ambiente({ proposta: null })
    await semDado(await route(f.deps, pedir('get-proposal', { token: TOKEN })))
  })

  it.each([
    ['cancelada', { status: 'cancelled' }],
    ['vencida', { expires_at: '2026-10-30T00:00:00Z' }],
    ['no instante exato do prazo', { expires_at: '2026-10-31T12:00:00Z' }],
  ])('%s ⇒ 404 sem dado, nem leitura das linhas, nem marca de vista', async (_n, over) => {
    const f = ambiente({ proposta: PROPOSTA(over) })
    await semDado(await route(f.deps, pedir('get-proposal', { token: TOKEN })))
    expect(f.reads.find((r) => r.table === 'order_proposal_items')).toBeUndefined()
    expect(rpcsDe(f, 'mark_order_proposal_viewed')).toEqual([])
  })

  it('concluída ⇒ o pedido e um acesso de convidada REEMITIDO para ele', async () => {
    const f = ambiente({ proposta: PROPOSTA({ status: 'completed', order_id: 'ord-9' }) })
    const res = await route(f.deps, pedir('get-proposal', { token: TOKEN }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ completed: true, order_id: 'ord-9' })
    expect(corpo.proposal).toBeUndefined()
    const [u] = f.updates.filter((x) => x.table === 'orders')
    expect(u.eq).toEqual(['id', 'ord-9'])
    expect(u.values.guest_access_hash).toBe(await hashAccessToken(corpo.access_token))
  })

  it('teto por IP: acima dele, 429 sem ler a proposta', async () => {
    const f = ambiente({ limiter: createRateLimiter(1, 60_000, () => AGORA) })
    const ip = { 'x-forwarded-for': '200.1.1.1' }
    expect((await route(f.deps, pedir('get-proposal', { token: TOKEN }, ip))).status).toBe(200)
    const lidasAntes = f.rpcs.length
    expect((await route(f.deps, pedir('get-proposal', { token: TOKEN }, ip))).status).toBe(429)
    expect(f.rpcs.length).toBe(lidasAntes)
  })

  it('SEG-04, fail-closed: sem o balde injetado, recusa sem ler a proposta — nunca "sem teto"', async () => {
    const f = ambiente({ limiter: null })
    const tabelas: string[] = []
    const original = f.deps.supabase.from
    f.deps.supabase.from = (t: string) => {
      tabelas.push(t)
      return original(t)
    }
    const res = await route(f.deps, pedir('get-proposal', { token: TOKEN }, { 'x-forwarded-for': '200.1.1.1' }))
    expect(res.status).toBe(503)
    const corpo = await res.json()
    expect(corpo.proposal).toBeUndefined()
    expect(tabelas).toEqual([])
    expect(f.rpcs).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// create-order com proposta
// ---------------------------------------------------------------------------------------------

const CONCLUIR = (over: Record<string, unknown> = {}) => ({
  proposal_token: TOKEN,
  proposal_version: 2,
  client_request_id: 'tentativa-p1',
  customer_name: 'Maria Clara Souza',
  customer_phone: '(51) 98888-7777',
  customer_document: '123.456.789-09',
  address_zip: '91240-010',
  address_street: 'Rua das Flores',
  address_number: '12',
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  shipping_service_id: '1',
  shipping_carrier: 'Correios',
  shipping_method: 'PAC',
  shipping_cost: 20,
  payment_method: 'card',
  // O que o corpo NÃO decide (PRC-03, A-07): itens, preços e e-mail.
  customer_email: 'outra-pessoa@exemplo.invalid',
  items: [{ product_id: P1, quantity: 9, unit_price: 0.01 }],
  subtotal: 1,
  total: 1,
  discount: 999,
  ...over,
})

const argsDoPedido = (f: { rpcs: Array<{ fn: string; args: any }> }) => rpcsDe(f, 'create_order_from_proposal').map((r) => r.args)

describe('create-order com proposta — o pedido nasce da proposta (PRC-03, CON-05)', () => {
  it('cartão: itens e valores do BANCO, frete cotado, e a RPC atômica — nada de insert em orders', async () => {
    const f = ambiente()
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ order_id: 'ord-9', order_number: '0201' })

    const [args] = argsDoPedido(f)
    expect(args.p_proposal_id).toBe(PROP)
    expect(args.p_version).toBe(2)
    const p = args.p_order
    // 250 − 20 do avulso + 20 de frete; no cartão, sem PIX.
    expect(p.total).toBe(250)
    expect(p.shipping_cost).toBe(20)
    expect(p.payment_method).toBe('card')
    expect(p.material_status).toBe('aguardando_material')
    expect(p.client_request_id).toBe('tentativa-p1')
    expect(p.customer_document).toBe('12345678909')
    expect(p.address_zip).toBe('91240010')
    expect(p.customer_name).toBe('Maria Clara Souza')
    // Nada do que o corpo não decide chega à RPC.
    for (const proibida of ['items', 'customer_email', 'subtotal', 'discount', 'coupon_code', 'manual_discount']) {
      expect(Object.keys(p)).not.toContain(proibida)
    }
    expect(f.inserts.filter((i) => i.table === 'orders' || i.table === 'order_items')).toEqual([])
  })

  it('o acesso de convidada é emitido e o hash gravado é o do token devolvido (CON-07)', async () => {
    const f = ambiente()
    const corpo = await (await route(f.deps, pedir('create-order', CONCLUIR()))).json()
    expect(typeof corpo.access_token).toBe('string')
    expect(argsDoPedido(f)[0].p_order.guest_access_hash).toBe(await hashAccessToken(corpo.access_token))
    for (const l of logs) {
      expect(l).not.toContain(TOKEN)
      expect(l).not.toContain(corpo.access_token)
    }
  })

  it('PIX: o total é o MESMO `proposalPricing` que a página do link desenha (PRC-06)', async () => {
    const f = ambiente()
    await route(f.deps, pedir('create-order', CONCLUIR({ payment_method: 'pix' })))
    const esperado = proposalPricing(
      { lines: [{ unit_price: 100, quantity: 1 }, { unit_price: 150, quantity: 1 }], couponDiscount: 0, couponFreeShipping: false, manualDiscount: 20 },
      { shipping: 20, method: 'pix', pixDiscountPercent: 5, freeShipping: { free_shipping_enabled: false, free_shipping_threshold: 0 } },
    )
    expect(argsDoPedido(f)[0].p_order.total).toBe(esperado.total)
    expect(esperado.total).toBeLessThan(250)
  })

  it('PRC-05: cupom `free_shipping` travado zera o frete da entrega escolhida', async () => {
    const f = ambiente({ proposta: PROPOSTA({ coupon_free_shipping: true, coupon_code: 'FRETE' }) })
    await route(f.deps, pedir('create-order', CONCLUIR()))
    const p = argsDoPedido(f)[0].p_order
    expect(p.shipping_cost).toBe(0)
    expect(p.total).toBe(230)
  })

  it('A-11: a faixa de frete grátis da loja vale sobre os itens depois dos descontos', async () => {
    const ligado = ambiente({ ajustes: { ...AJUSTES, shipping: { free_shipping_enabled: true, free_shipping_threshold: 200 } } })
    await route(ligado.deps, pedir('create-order', CONCLUIR()))
    expect(argsDoPedido(ligado)[0].p_order.shipping_cost).toBe(0)

    // 230 dos itens não alcança 240: o frete fica.
    const longe = ambiente({ ajustes: { ...AJUSTES, shipping: { free_shipping_enabled: true, free_shipping_threshold: 240 } } })
    await route(longe.deps, pedir('create-order', CONCLUIR()))
    expect(argsDoPedido(longe)[0].p_order.shipping_cost).toBe(20)
  })

  // Fecho da rodada 3 (K25, A-11/AD-027): o interruptor da loja decide, não a faixa preenchida.
  // Desligado com a faixa (200) abaixo dos itens (230): o frete cotado fica — é o estado de
  // produção, e a página do link cobra esse frete.
  it('A-11: com o interruptor DESLIGADO e a faixa alcançada, o frete cotado fica', async () => {
    const desligado = ambiente({ ajustes: { ...AJUSTES, shipping: { free_shipping_enabled: false, free_shipping_threshold: 200 } } })
    await route(desligado.deps, pedir('create-order', CONCLUIR()))
    const p = argsDoPedido(desligado)[0].p_order
    expect(p.shipping_cost).toBe(20)
    expect(p.total).toBe(250)
  })

  it('A-08: e-mail COM conta conclui sem desafio e sem criar conta; o pedido fica na ficha da proposta', async () => {
    const f = ambiente({ extra: { rpcByFn: { account_exists: { data: true }, create_order_from_proposal: { data: { order_id: 'ord-9', order_number: '0201', reused: false } } } } })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(200)
    expect((await res.json()).reason).toBeUndefined()
    expect(f.adminCalls.filter((c) => c.method === 'createUser')).toEqual([])
    expect(f.updates.filter((u) => u.table === 'orders' && 'customer_id' in u.values)).toEqual([])
  })

  it('CON-12: e-mail SEM conta cria a conta como a da convidada — com o e-mail DA PROPOSTA', async () => {
    const f = ambiente()
    await route(f.deps, pedir('create-order', CONCLUIR()))
    const [criacao] = f.adminCalls.filter((c) => c.method === 'createUser')
    expect(criacao.attributes).toMatchObject({ email: 'maria@exemplo.invalid', email_confirm: false })
    expect(rpcsDe(f, 'account_exists').map((r) => r.args)).toEqual([{ p_email: 'maria@exemplo.invalid' }])
  })

  it('proposta sem ficha (apagada): liga o pedido à ficha do e-mail', async () => {
    const f = ambiente({ proposta: PROPOSTA({ customer_id: null }) })
    await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(f.updates.filter((u) => u.table === 'orders' && 'customer_id' in u.values)).toEqual([
      { table: 'orders', values: { customer_id: 'ficha-por-email' }, eq: ['id', 'ord-9'] },
    ])
  })

  it('o telefone, o CPF e o endereço vão para a ficha (como no caminho de sempre)', async () => {
    const f = ambiente()
    await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(f.updates.some((u) => u.table === 'customers' && u.eq?.[1] === CLIENTE)).toBe(true)
    expect(f.inserts.some((i) => i.table === 'addresses')).toBe(true)
  })

  // Fecho da rodada 1 (K07): o corpo sem telefone fica com o que a Adri já tinha na proposta.
  // Fecho da rodada 3 (K23, CON-04): o endereço que a cliente editou no link é o que vai ao pedido,
  // não o que a Adri gravou na proposta ("trocar o número da casa", o Independent Test da spec).
  it('o endereço editado no link (número, CEP, rua, bairro, cidade, UF, complemento) vence o da proposta', async () => {
    const f = ambiente()
    await route(
      f.deps,
      pedir('create-order', CONCLUIR({
        address_zip: '90010-150',
        address_street: 'Avenida Borges de Medeiros',
        address_number: '1501',
        address_complement: 'apto 3',
        address_neighborhood: 'Praia de Belas',
        address_city: 'Canoas',
        address_state: 'SC',
      })),
    )
    const p = argsDoPedido(f)[0].p_order
    expect(p).toMatchObject({
      address_zip: '90010150',
      address_street: 'Avenida Borges de Medeiros',
      address_number: '1501',
      address_complement: 'apto 3',
      address_neighborhood: 'Praia de Belas',
      address_city: 'Canoas',
      address_state: 'SC',
    })
    // E o número de CONCLUIR (12) também, diferente do gravado (10).
    const g = ambiente()
    await route(g.deps, pedir('create-order', CONCLUIR()))
    expect(argsDoPedido(g)[0].p_order.address_number).toBe('12')
  })

  it('o corpo sem telefone (vazio ou ausente) leva o telefone DA PROPOSTA ao pedido', async () => {
    for (const corpo of [CONCLUIR({ customer_phone: '   ' }), (({ customer_phone: _x, ...r }) => r)(CONCLUIR())]) {
      const f = ambiente()
      expect((await route(f.deps, pedir('create-order', corpo))).status).toBe(200)
      expect(argsDoPedido(f)[0].p_order.customer_phone).toBe('51999990000')
    }
    // E o telefone que a cliente digitou vence o da proposta.
    const f = ambiente()
    await route(f.deps, pedir('create-order', CONCLUIR()))
    const digitado = argsDoPedido(f)[0].p_order.customer_phone
    expect(String(digitado).replace(/\D/g, '')).toBe('51988887777')
  })

  // Fecho da rodada 2 (R22): o irmão do K07 na linha de baixo. Sem o recuo, o pedido nasce sem o
  // CPF que a Adri já tinha — e o PIX recusa por falta dele (`missing_payer_cpf`).
  it('o corpo sem CPF (vazio, só pontuação ou ausente) leva o CPF DA PROPOSTA ao pedido', async () => {
    const semCpf = [
      CONCLUIR({ customer_document: '' }),
      CONCLUIR({ customer_document: ' .-  ' }),
      (({ customer_document: _x, ...r }) => r)(CONCLUIR()),
    ]
    for (const corpo of semCpf) {
      const f = ambiente()
      expect((await route(f.deps, pedir('create-order', corpo))).status).toBe(200)
      expect(argsDoPedido(f)[0].p_order.customer_document).toBe('12345678909')
    }
    // E o CPF que a cliente digitou (outro, com máscara) vence o da proposta, só com os dígitos.
    const f = ambiente()
    await route(f.deps, pedir('create-order', CONCLUIR({ customer_document: '529.982.247-25' })))
    expect(argsDoPedido(f)[0].p_order.customer_document).toBe('52998224725')
  })

  it('o ramo sem `proposal_token` é o de sempre: grava em `orders` e não chama a RPC da proposta', async () => {
    const f = ambiente({ extra: { inserted: { orders: { id: 'ord-1' } } } })
    const { proposal_token: _t, proposal_version: _v, ...semToken } = CONCLUIR({ customer_email: 'marina@exemplo.invalid' })
    const res = await route(f.deps, pedir('create-order', semToken))
    expect(res.status).toBe(200)
    expect(f.inserts.some((i) => i.table === 'orders')).toBe(true)
    expect(argsDoPedido(f)).toEqual([])
  })
})

describe('create-order com proposta — recusas e idempotência', () => {
  it('CON-10: versão velha ⇒ 409 com a frase da página, e nenhum pedido', async () => {
    const f = ambiente()
    const res = await route(f.deps, pedir('create-order', CONCLUIR({ proposal_version: 1 })))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: PROPOSAL_CHANGED, code: 'proposal_changed' })
    expect(argsDoPedido(f)).toEqual([])
  })

  it('CON-10: a versão que mudou entre a leitura e a RPC também volta 409', async () => {
    const f = ambiente({ extra: { rpcByFn: { account_exists: { data: false }, create_order_from_proposal: { data: { error: 'proposal_changed' } } } } })
    expect((await route(f.deps, pedir('create-order', CONCLUIR()))).status).toBe(409)
    expect(f.adminCalls).toEqual([])
  })

  it('CON-09: peça indisponível ⇒ 422 com o motivo e a posição, e nenhum pedido', async () => {
    const f = ambiente({ variacoes: [{ ...VARIACOES[0], stock: 0 }] })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: ITEM_UNAVAILABLE, code: 'item_unavailable', positions: [1] })
    expect(argsDoPedido(f)).toEqual([])
  })

  it.each([
    ['token desconhecido', null],
    ['cancelada', PROPOSTA({ status: 'cancelled' })],
    ['vencida', PROPOSTA({ expires_at: '2026-10-31T11:59:59Z' })],
  ])('%s ⇒ 404, sem pedido', async (_n, proposta) => {
    const f = ambiente({ proposta: proposta as any })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: PROPOSAL_UNAVAILABLE, code: 'unavailable' })
    expect(argsDoPedido(f)).toEqual([])
  })

  // Fecho da rodada 1 do Verifier (K05): toda fixtura tinha quantidade 1, então o saldo conferido
  // contra "maior que zero" e contra a QUANTIDADE davam o mesmo. Saldo 1 com quantidade 2 não vende.
  const DUAS = [{ ...LINHAS[0], quantity: 2 }, { ...LINHAS[1], quantity: 2 }]
  it.each([
    ['peça sem variação com saldo 1 e quantidade 2', [{ ...PRODUTOS[0], stock_total: 1 }, PRODUTOS[1]], VARIACOES, [0]],
    ['variação com saldo 1 e quantidade 2', PRODUTOS, [{ ...VARIACOES[0], stock: 1 }], [1]],
  ])('CON-09: %s ⇒ 422 na posição dela', async (_n, produtos, variacoes, posicoes) => {
    const f = ambiente({ produtos, variacoes, extra: { lists: { order_proposal_items: DUAS } } })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(422)
    expect((await res.json()).positions).toEqual(posicoes)
    expect(argsDoPedido(f)).toEqual([])
  })

  it('CON-09: saldo IGUAL à quantidade (2 e 2) vende — e a página mostra as duas disponíveis', async () => {
    const produtos = [{ ...PRODUTOS[0], stock_total: 2 }, PRODUTOS[1]]
    const variacoes = [{ ...VARIACOES[0], stock: 2 }]
    const f = ambiente({ produtos, variacoes, extra: { lists: { order_proposal_items: DUAS } } })
    expect((await route(f.deps, pedir('create-order', CONCLUIR()))).status).toBe(200)
    expect(argsDoPedido(f)).toHaveLength(1)

    const g = ambiente({ produtos: [{ ...PRODUTOS[0], stock_total: 1 }, PRODUTOS[1]], variacoes, extra: { lists: { order_proposal_items: DUAS } } })
    const { proposal } = await (await route(g.deps, pedir('get-proposal', { token: TOKEN }))).json()
    expect(proposal.lines.map((l: any) => l.available)).toEqual([false, true])
  })

  it('a RPC dizendo indisponível (venceu no meio) ⇒ 404', async () => {
    const f = ambiente({ extra: { rpcByFn: { create_order_from_proposal: { data: { error: 'unavailable' } } } } })
    expect((await route(f.deps, pedir('create-order', CONCLUIR()))).status).toBe(404)
  })

  it('CON-06: proposta já concluída devolve o MESMO pedido, sem RPC, com o acesso reemitido', async () => {
    const f = ambiente({ proposta: PROPOSTA({ status: 'completed', order_id: 'ord-9', version: 3 }) })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ order_id: 'ord-9', order_number: '0150', reused: true })
    expect(argsDoPedido(f)).toEqual([])
    const [u] = f.updates.filter((x) => x.table === 'orders')
    expect(u.values.guest_access_hash).toBe(await hashAccessToken(corpo.access_token))
  })

  it('CON-06: o segundo aparelho que perde a corrida recebe o pedido do primeiro, com acesso a ele', async () => {
    const f = ambiente({ extra: { rpcByFn: { create_order_from_proposal: { data: { order_id: 'ord-1o', order_number: '0200', reused: true } } } } })
    const res = await route(f.deps, pedir('create-order', CONCLUIR()))
    const corpo = await res.json()
    expect(corpo).toMatchObject({ order_id: 'ord-1o', reused: true })
    const [u] = f.updates.filter((x) => x.table === 'orders')
    expect(u.eq).toEqual(['id', 'ord-1o'])
    expect(u.values.guest_access_hash).toBe(await hashAccessToken(corpo.access_token))
    expect(f.adminCalls).toEqual([])
  })

  it.each([
    ['sem client_request_id', { client_request_id: '' }],
    ['sem versão', { proposal_version: undefined }],
    ['sem meio de pagamento', { payment_method: 'boleto' }],
  ])('%s ⇒ 400, nada lido', async (_n, over) => {
    const f = ambiente()
    expect((await route(f.deps, pedir('create-order', CONCLUIR(over)))).status).toBe(400)
    expect(argsDoPedido(f)).toEqual([])
  })

  it('retirada no escritório fora do RS ⇒ 422 pela mesma régua do caminho de sempre', async () => {
    const f = ambiente()
    const res = await route(
      f.deps,
      pedir('create-order', CONCLUIR({ shipping_service_id: 'retirada', shipping_cost: 0, address_zip: '01310100' })),
    )
    expect(res.status).toBe(422)
    expect(argsDoPedido(f)).toEqual([])
  })

  it('a RPC que falha ⇒ 500', async () => {
    const f = ambiente({ extra: { rpcByFn: { create_order_from_proposal: { error: { message: 'x' } } } } })
    expect((await route(f.deps, pedir('create-order', CONCLUIR()))).status).toBe(500)
  })
})
