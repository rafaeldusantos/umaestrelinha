import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { createTokenCipher, type TokenCipher } from '../../_shared/tokenCipher.ts'
import { hashAccessToken } from '../../../../packages/core/src/checkout/guestAccess.ts'
import { ORDER_ADMIN_NOTE_MAX } from '../../../../packages/core/src/orders/adminNote.ts'
import {
  NOTE_ON_ORDER,
  NOT_EDITABLE,
  PRICES_CHANGED,
  VERSION_CONFLICT,
  route,
  type Deps,
} from '../handlers.ts'

// A `order-proposals` — a porta do painel até a proposta (feature 89, T08).
//
// Toda recusa de acesso assere DUAS coisas: o status e que nada foi lido nem escrito além da
// pergunta do papel. Sem a segunda metade, um handler que conferisse o papel DEPOIS de gravar
// passaria nos testes de status — e teria gravado.

const ADRI = '11111111-1111-1111-1111-111111111111'
const P1 = 'aaaaaaaa-0000-4000-8000-000000000001'
const P2 = 'aaaaaaaa-0000-4000-8000-000000000002'
const V2A = 'bbbbbbbb-0000-4000-8000-00000000002a'
const V2B = 'bbbbbbbb-0000-4000-8000-00000000002b'
const PROP = 'cccccccc-0000-4000-8000-000000000001'
const CUPOM = 'dddddddd-0000-4000-8000-000000000001'

/** 2026-10-31 12:00 UTC. */
const AGORA = Date.parse('2026-10-31T12:00:00Z')
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000

const PRODUTOS = [
  {
    id: P1,
    name: 'Pingente Estrela',
    base_price: 100,
    image_url: 'https://img/p1.webp',
    is_active: true,
    requires_material: false,
    material_kinds: [],
    engraving_max_chars: null,
    options: [],
  },
  {
    id: P2,
    name: 'Anel Lua',
    base_price: 150,
    image_url: 'https://img/p2.webp',
    is_active: true,
    requires_material: true,
    material_kinds: ['cinzas'],
    engraving_max_chars: 10,
    options: [
      { name: 'Tamanho', position: 0, values: ['M'] },
      { name: 'Com gravação', position: 1, values: ['Sim', 'Não'] },
    ],
  },
]

const VARIACOES = [
  {
    id: V2A,
    product_id: P2,
    price: 150,
    option_values: { 'Com gravação': 'Sim', Tamanho: 'M' },
    image_url: 'https://img/v2a.webp',
    is_active: true,
  },
  {
    id: V2B,
    product_id: P2,
    price: 140,
    option_values: { 'Com gravação': 'Não', Tamanho: 'M' },
    image_url: null,
    is_active: false,
  },
]

const filtrarPorIn = (rows: any[], read: any) => {
  let saida = rows
  for (const [coluna, valores] of read.in as Array<[string, unknown[]]>) {
    saida = saida.filter((r) => valores.includes(r[coluna]))
  }
  return saida
}

const catalogo = (extra: Record<string, unknown> = {}) => ({
  products: (_eqs: unknown, _sel: string, read: any) => filtrarPorIn(PRODUTOS, read),
  product_variants: (_eqs: unknown, _sel: string, read: any) => filtrarPorIn(VARIACOES, read),
  promotions: [],
  ...extra,
})

/**
 * O dublê compartilhado não tem `.ilike()` — a leitura do cupom é a mesma da loja (`validateCoupon`).
 * Acrescentado AQUI, e não em `fakes.ts` (outro dono): delega ao `.eq()`, então a fixtura de linha
 * enxerga a coluna e o valor, e `ilikes` registra a chamada para a asserção.
 */
function ambiente(opts: FakeSupabaseOptions = {}) {
  const fake = createFakeSupabase({
    user: { id: ADRI },
    rpcByFn: { has_role: { data: true } },
    ...opts,
    lists: { ...catalogo(), ...(opts.lists ?? {}) },
  })
  const ilikes: Array<[string, string, unknown]> = []
  const original = fake.client.from
  fake.client.from = (tabela: string) => {
    const b = original(tabela)
    b.ilike = (coluna: string, valor: unknown) => {
      ilikes.push([tabela, coluna, valor])
      return b.eq(coluna, valor)
    }
    return b
  }
  const deps: Deps = { supabase: fake.client, now: () => AGORA }
  return { ...fake, ilikes, deps }
}

const pedir = (action: string, body?: unknown, init: RequestInit = {}) =>
  new Request(`http://local/order-proposals?action=${action}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-da-adri' },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  })

/** O corpo de uma proposta nova: o pingente e o anel com gravação. 100 + 150 × 2 = 400. */
const corpoNovo = (extra: Record<string, unknown> = {}) => ({
  idempotency_key: 'chave-1',
  customer_name: '  Maria Clara  ',
  customer_email: ' Maria@Exemplo.Invalid ',
  customer_phone: '(51) 99999-0000',
  customer_document: '123.456.789-09',
  address_zip: '91240-010',
  address_street: 'Rua das Flores',
  address_number: '10',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  lines: [
    { product_id: P1, variant_id: null, quantity: 1 },
    { product_id: P2, variant_id: V2A, quantity: 2, engraving_text: '  Lua  ' },
  ],
  expected_total: 400,
  ...extra,
})

const SAVE_OK = {
  data: {
    id: PROP,
    number: 'P-0001',
    version: 1,
    status: 'open',
    customer_id: 'eeeeeeee-0000-4000-8000-000000000001',
    created: true,
    changed: true,
    reused: false,
  },
}

const argsDoSave = (rpcs: Array<{ fn: string; args: any }>) =>
  rpcs.filter((r) => r.fn === 'save_order_proposal').map((r) => r.args.p)

const tabelasEscritas = (f: { inserts: any[]; updates: any[]; deletes: any[]; upserts: any[] }) => [
  ...f.inserts.map((i) => i.table),
  ...f.updates.map((u) => u.table),
  ...f.deletes.map((d) => d.table),
  ...f.upserts.map((u) => u.table),
]

let logs: string[]
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  })
})
afterEach(() => vi.restoreAllMocks())

// ---------------------------------------------------------------------------------------------
// SEG-05 — a porta, em TODA ação
// ---------------------------------------------------------------------------------------------

const ACOES: Array<[string, unknown]> = [
  ['list', {}],
  ['get', { id: PROP }],
  ['save', corpoNovo()],
  ['renew', { id: PROP }],
  ['cancel', { id: PROP }],
  ['log-sent', { id: PROP, channel: 'copy' }],
  ['note', { id: PROP, admin_note: 'Embrulhar para presente' }],
]

describe('order-proposals — autorização (SEG-05)', () => {
  it.each(ACOES)('%s sem Authorization responde 401, sem ler nem escrever nada', async (action, body) => {
    const f = ambiente({ user: null })
    const res = await route(
      f.deps,
      new Request(`http://local/order-proposals?action=${action}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )
    expect(res.status).toBe(401)
    expect(f.rpcs).toEqual([])
    expect(f.reads).toEqual([])
    expect(tabelasEscritas(f)).toEqual([])
  })

  it.each(ACOES)('%s sem papel admin responde 403, só com a pergunta do papel', async (action, body) => {
    const f = ambiente({ rpcByFn: { has_role: { data: false } } })
    const res = await route(f.deps, pedir(action, body))
    expect(res.status).toBe(403)
    expect(f.rpcs.map((r) => r.fn)).toEqual(['has_role'])
    expect(f.reads).toEqual([])
    expect(tabelasEscritas(f)).toEqual([])
  })

  it.each(ACOES)('%s com has_role falhando responde 403 — falha de verificação nunca é permissão', async (action, body) => {
    const f = ambiente({ rpcByFn: { has_role: { error: { message: 'boom' } } } })
    const res = await route(f.deps, pedir(action, body))
    expect(res.status).toBe(403)
    expect(tabelasEscritas(f)).toEqual([])
    expect(argsDoSave(f.rpcs)).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// save — criar (MON-11, PRC-01, SEG-01)
// ---------------------------------------------------------------------------------------------

describe('save — criar', () => {
  it('relê preço do banco, grava pela RPC e devolve o token UMA vez, cujo hash é o gravado', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpoNovo()))
    expect(res.status).toBe(200)
    const corpo = await res.json()

    expect(corpo.created).toBe(true)
    expect(typeof corpo.token).toBe('string')
    expect(corpo.token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(corpo.expires_at).toBe(new Date(AGORA + SETE_DIAS).toISOString())
    expect(corpo.summary).toMatchObject({ subtotal: 400, items_total: 400, coupon_discount: 0, manual_discount: 0 })

    const [p] = argsDoSave(f.rpcs)
    expect(p.token_hash).toBe(await hashAccessToken(corpo.token))
    expect(p.idempotency_key).toBe('chave-1')
    expect(p.expires_at).toBe(corpo.expires_at)
    expect(p.actor).toBe(ADRI)
    expect(p.id).toBeUndefined()
    expect(p.version).toBeUndefined()
    // O e-mail normalizado, o nome aparado, o CPF e o CEP só com dígitos.
    expect(p.customer_email).toBe('maria@exemplo.invalid')
    expect(p.customer_name).toBe('Maria Clara')
    expect(p.customer_document).toBe('12345678909')
    expect(p.address_zip).toBe('91240010')
    expect(p.customer_id).toBeNull()
    expect(p.subtotal).toBe(400)
    expect(p.items_total).toBe(400)
    expect(p.items).toEqual([
      {
        product_id: P1,
        variant_id: null,
        product_name: 'Pingente Estrela',
        product_image: 'https://img/p1.webp',
        variant_label: null,
        variant_options: null,
        quantity: 1,
        list_price: 100,
        unit_price: 100,
        engraving_text: null,
        requires_material: false,
        material_kinds: [],
      },
      {
        product_id: P2,
        variant_id: V2A,
        product_name: 'Anel Lua',
        product_image: 'https://img/v2a.webp',
        variant_label: 'M · Sim',
        variant_options: { 'Com gravação': 'Sim', Tamanho: 'M' },
        quantity: 2,
        list_price: 150,
        unit_price: 150,
        engraving_text: 'Lua',
        requires_material: true,
        material_kinds: ['cinzas'],
      },
    ])
  })

  it('o preço do corpo é ignorado: quem decide é o banco (PRC-01)', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const corpo = corpoNovo({
      lines: [{ product_id: P1, variant_id: null, quantity: 1, unit_price: 1, list_price: 1 }],
      expected_total: 100,
      subtotal: 1,
      items_total: 1,
    })
    const res = await route(f.deps, pedir('save', corpo))
    expect(res.status).toBe(200)
    const [p] = argsDoSave(f.rpcs)
    expect(p.items[0].unit_price).toBe(100)
    expect(p.subtotal).toBe(100)
    expect(p.items_total).toBe(100)
  })

  it('PRC-02: total diferente do que a tela mostrava ⇒ 409 prices_changed, com o resumo, e nada gravado', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpoNovo({ expected_total: 399 })))
    expect(res.status).toBe(409)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ error: PRICES_CHANGED, code: 'prices_changed', summary: { items_total: 400 } })
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  // Fecho da rodada 3 (F24): "o mesmo total" é ao centavo. Um centavo a mais ou a menos do que a
  // tela mostrava já é outro preço; só a diferença de arredondamento (abaixo de meio centavo) passa.
  it('PRC-02: um centavo de diferença já é 409; meio centavo de arredondamento não', async () => {
    for (const esperado of [400.01, 399.99]) {
      const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
      const res = await route(f.deps, pedir('save', corpoNovo({ expected_total: esperado })))
      expect(res.status).toBe(409)
      expect(argsDoSave(f.rpcs)).toEqual([])
    }
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    expect((await route(f.deps, pedir('save', corpoNovo({ expected_total: 400.004 })))).status).toBe(200)
  })

  it('o token nunca aparece em log — nem ele, nem o hash', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const corpo = await (await route(f.deps, pedir('save', corpoNovo()))).json()
    const hash = await hashAccessToken(corpo.token)
    expect(logs.length).toBeGreaterThan(0)
    for (const linha of logs) {
      expect(linha).not.toContain(corpo.token)
      expect(linha).not.toContain(hash)
    }
  })

  it('a promoção vigente é travada no unit_price (A-05); a vencida não entra', async () => {
    const promo = (over: Record<string, unknown>) => ({
      id: 'promo-1',
      discount_kind: 'percent',
      scope: 'all',
      stacks_with_coupon: false,
      active: true,
      valid_from: null,
      valid_until: null,
      created_at: '2026-01-01T00:00:00Z',
      promotion_tiers: [{ min_qty: 1, value: 10 }],
      ...over,
    })
    const viva = ambiente({
      lists: { promotions: [promo({})] },
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
    })
    const body = corpoNovo({ lines: [{ product_id: P1, variant_id: null, quantity: 1 }], expected_total: 90 })
    const ok = await route(viva.deps, pedir('save', body))
    expect(ok.status).toBe(200)
    const [p] = argsDoSave(viva.rpcs)
    expect(p.items[0]).toMatchObject({ list_price: 100, unit_price: 90 })
    expect(p.promotion_discount).toBe(10)
    expect(p.items_total).toBe(90)

    const vencida = ambiente({
      lists: { promotions: [promo({ valid_until: '2026-10-30T00:00:00Z' })] },
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
    })
    const res = await route(vencida.deps, pedir('save', { ...body, expected_total: 100 }))
    expect(res.status).toBe(200)
    expect(argsDoSave(vencida.rpcs)[0].items[0].unit_price).toBe(100)

    // Fecho da rodada 3 (F15): a promoção vigente pelas datas mas DESLIGADA também não entra —
    // a proposta travaria um desconto que a loja não oferece.
    const inativa = ambiente({
      lists: { promotions: [promo({ active: false })] },
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
    })
    const r2 = await route(inativa.deps, pedir('save', { ...body, expected_total: 100 }))
    expect(r2.status).toBe(200)
    expect(argsDoSave(inativa.rpcs)[0].items[0]).toMatchObject({ list_price: 100, unit_price: 100 })
    expect(argsDoSave(inativa.rpcs)[0].promotion_discount).toBe(0)
  })

  it('gravação em variação que não grava é descartada, nunca vai para a proposta', async () => {
    const semGravacao = VARIACOES.map((v) => (v.id === V2A ? { ...v, option_values: { Tamanho: 'M' } } : v))
    const f = ambiente({
      lists: { product_variants: (_e: unknown, _s: string, read: any) => filtrarPorIn(semGravacao, read) },
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
    })
    const res = await route(f.deps, pedir('save', corpoNovo()))
    expect(res.status).toBe(200)
    expect(argsDoSave(f.rpcs)[0].items[1].engraving_text).toBeNull()
  })

  it('reused (duplo clique): a mesma proposta volta SEM token — o gerado agora não foi gravado', async () => {
    const f = ambiente({
      rpcByFn: {
        has_role: { data: true },
        save_order_proposal: { data: { ...SAVE_OK.data, created: false, changed: false, reused: true } },
      },
    })
    const corpo = await (await route(f.deps, pedir('save', corpoNovo()))).json()
    expect(corpo).toMatchObject({ id: PROP, reused: true, created: false, token: null, expires_at: null })
  })

  it.each([
    ['sem idempotency_key', { idempotency_key: '' }],
    ['e-mail inválido', { customer_email: 'maria' }],
    ['sem nome', { customer_name: '   ' }],
    ['sem expected_total', { expected_total: undefined }],
    ['linha sem product_id válido', { lines: [{ product_id: 'x', quantity: 1 }] }],
  ])('%s ⇒ 400, sem ler o catálogo nem gravar', async (_nome, extra) => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpoNovo(extra)))
    expect(res.status).toBe(400)
    expect(f.reads).toEqual([])
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('a RPC que falha ⇒ 500', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: { error: { message: 'x' } } } })
    expect((await route(f.deps, pedir('save', corpoNovo()))).status).toBe(500)
  })
})

// ---------------------------------------------------------------------------------------------
// save — as recusas do catálogo, do cupom e do desconto
// ---------------------------------------------------------------------------------------------

describe('save — recusas', () => {
  const recusado = async (corpo: Record<string, unknown>, opts: FakeSupabaseOptions = {}) => {
    const f = ambiente({ ...opts, rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpo))
    return { res, corpo: await res.json(), f }
  }

  it('MON-05: peça com variações sem a variação escolhida ⇒ 422', async () => {
    const { res, corpo, f } = await recusado(
      corpoNovo({ lines: [{ product_id: P2, variant_id: null, quantity: 1 }], expected_total: 150 }),
    )
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('Escolha a variação de Anel Lua.')
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('variação pausada ⇒ 422', async () => {
    const { res, corpo } = await recusado(
      corpoNovo({ lines: [{ product_id: P2, variant_id: V2B, quantity: 1 }], expected_total: 140 }),
    )
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('A variação escolhida de Anel Lua está pausada.')
  })

  it('variação de OUTRO produto ⇒ 422', async () => {
    const { res, corpo } = await recusado(
      corpoNovo({ lines: [{ product_id: P1, variant_id: V2A, quantity: 1 }], expected_total: 150 }),
    )
    expect(res.status).toBe(422)
    expect(corpo.code).toBe('variant_not_found')
  })

  it('peça inativa e peça que não existe ⇒ 422', async () => {
    const inativos = PRODUTOS.map((p) => (p.id === P1 ? { ...p, is_active: false } : p))
    const a = await recusado(corpoNovo(), {
      lists: { products: (_e: unknown, _s: string, read: any) => filtrarPorIn(inativos, read) },
    })
    expect(a.res.status).toBe(422)
    expect(a.corpo.error).toBe('A peça Pingente Estrela não está à venda.')

    const b = await recusado(corpoNovo(), { lists: { products: [] } })
    expect(b.res.status).toBe(422)
    expect(b.corpo.code).toBe('product_not_found')
  })

  it('gravação acima do teto da peça ⇒ 422 com o texto da loja', async () => {
    const { res, corpo } = await recusado(
      corpoNovo({ lines: [{ product_id: P2, variant_id: V2A, quantity: 1, engraving_text: 'Maria Clara Sempre' }], expected_total: 150 }),
    )
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('A gravação tem 18 caracteres e o limite desta peça é 10.')
  })

  it('quantidade fora de 1..99 ⇒ 422 com a recusa de core', async () => {
    const { res, corpo } = await recusado(
      corpoNovo({ lines: [{ product_id: P1, variant_id: null, quantity: 100 }], expected_total: 10000 }),
    )
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('A quantidade de cada peça vai de 1 a 99.')
  })

  const CUPOM_BASE = {
    id: CUPOM,
    code: 'BEMVINDA',
    type: 'percent',
    value: 10,
    active: true,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    used_count: 0,
    min_order: null,
    first_order_only: false,
  }

  it('MON-07: cupom válido é lido por ilike do código em maiúsculas e travado como valor', async () => {
    const f = ambiente({
      rows: { coupons: (eq: [string, unknown] | null) => (eq?.[0] === 'code' && eq[1] === 'BEMVINDA' ? CUPOM_BASE : null) },
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
    })
    const res = await route(f.deps, pedir('save', corpoNovo({ coupon_code: ' bemvinda ', expected_total: 360 })))
    expect(res.status).toBe(200)
    expect(f.ilikes).toEqual([['coupons', 'code', 'BEMVINDA']])
    const [p] = argsDoSave(f.rpcs)
    expect(p).toMatchObject({ coupon_id: CUPOM, coupon_code: 'BEMVINDA', coupon_discount: 40, coupon_free_shipping: false, items_total: 360 })
  })

  it.each([
    ['inexistente', null, 'Cupom inválido.'],
    ['vencido', { ...CUPOM_BASE, valid_until: '2026-10-01T00:00:00Z' }, 'Cupom expirado.'],
    ['esgotado', { ...CUPOM_BASE, max_uses: 3, used_count: 3 }, 'Cupom esgotado.'],
    ['pedido mínimo', { ...CUPOM_BASE, min_order: 500 }, 'Pedido mínimo de R$ 500,00.'],
  ])('cupom %s ⇒ 422 com o texto da loja, nada gravado', async (_n, row, texto) => {
    const { res, corpo, f } = await recusado(corpoNovo({ coupon_code: 'BEMVINDA' }), { rows: { coupons: row } })
    expect(res.status).toBe(422)
    expect(corpo.error).toBe(texto)
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('cupom de primeira compra: e-mail que já comprou é recusado; que não comprou, passa', async () => {
    const primeira = { ...CUPOM_BASE, first_order_only: true }
    const ja = await recusado(corpoNovo({ coupon_code: 'BEMVINDA', expected_total: 360 }), {
      rows: { coupons: primeira },
      counts: { orders: 1 },
    })
    expect(ja.res.status).toBe(422)
    expect(ja.corpo.error).toBe('Cupom válido apenas no primeiro pedido.')

    const nunca = await recusado(corpoNovo({ coupon_code: 'BEMVINDA', expected_total: 360 }), {
      rows: { coupons: primeira },
      counts: { orders: 0 },
    })
    expect(nunca.res.status).toBe(200)
  })

  it('MON-08: desconto avulso em R$ com motivo é aplicado depois do cupom e gravado com o motivo', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(
      f.deps,
      pedir('save', corpoNovo({ manual_discount: { kind: 'amount', value: 20, reason: '  Combinado no WhatsApp ' }, expected_total: 380 })),
    )
    expect(res.status).toBe(200)
    expect(argsDoSave(f.rpcs)[0]).toMatchObject({
      manual_discount_kind: 'amount',
      manual_discount_value: 20,
      manual_discount_reason: 'Combinado no WhatsApp',
      manual_discount: 20,
      items_total: 380,
    })
  })

  // Fecho da rodada 1 do Verifier (C07): sem este caso o piso caía para "maior que zero" e o
  // `check` do banco (0,01..99,99) virava um 500 na tela da Adri, no lugar da frase.
  it('A-12: avulso de 0,005% ⇒ 422 com a frase, nada gravado; 0,01% passa', async () => {
    const { res, corpo, f } = await recusado(corpoNovo({ manual_discount: { kind: 'percent', value: 0.005, reason: 'Combinado' } }))
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('O desconto em percentual vai de 0,01% a 99,99%.')
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  // C06: o banco conta o motivo APARADO (`char_length(btrim(...))`) e o servidor grava aparado; a
  // régua de core conta igual. 120 caracteres com espaço em volta passam; 121 de texto não.
  it('MON-08: motivo de 120 caracteres com espaço em volta passa e é gravado aparado; 121 de texto ⇒ 422', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const motivo = 'm'.repeat(120)
    const res = await route(
      f.deps,
      pedir('save', corpoNovo({ manual_discount: { kind: 'amount', value: 20, reason: `  ${motivo}  ` }, expected_total: 380 })),
    )
    expect(res.status).toBe(200)
    expect(argsDoSave(f.rpcs)[0].manual_discount_reason).toBe(motivo)

    const { res: r2, corpo } = await recusado(corpoNovo({ manual_discount: { kind: 'amount', value: 20, reason: 'm'.repeat(121) } }))
    expect(r2.status).toBe(422)
    expect(corpo.error).toBe('O motivo do desconto vai até 120 caracteres.')
  })

  it('MON-08: avulso sem motivo ⇒ 422', async () => {
    const { res, corpo } = await recusado(corpoNovo({ manual_discount: { kind: 'percent', value: 10, reason: ' ' } }))
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('Escreva o motivo do desconto combinado.')
  })

  it('A-12: cupom e avulso que cabem sozinhos mas JUNTOS zeram os itens ⇒ 422, nada gravado', async () => {
    const fixo = { ...CUPOM_BASE, type: 'fixed', value: 60 }
    const { res, corpo, f } = await recusado(
      corpoNovo({
        lines: [{ product_id: P1, variant_id: null, quantity: 1 }],
        coupon_code: 'BEMVINDA',
        manual_discount: { kind: 'amount', value: 40, reason: 'Combinado' },
        expected_total: 0,
      }),
      { rows: { coupons: fixo } },
    )
    expect(res.status).toBe(422)
    expect(corpo.error).toBe('O desconto não pode zerar o pedido.')
    expect(argsDoSave(f.rpcs)).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// save — editar (LNK-05, CON-10)
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// save — a observação interna
// ---------------------------------------------------------------------------------------------

describe('save — a observação', () => {
  it('ao criar, a observação vai aparada à RPC', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpoNovo({ admin_note: '  Embrulhar para presente  ' })))
    expect(res.status).toBe(200)
    expect(argsDoSave(f.rpcs)[0].admin_note).toBe('Embrulhar para presente')
  })

  it('vazia ou só espaço vira null — não existe observação vazia', async () => {
    for (const vazio of ['', '   ', null]) {
      const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
      await route(f.deps, pedir('save', corpoNovo({ admin_note: vazio })))
      const [p] = argsDoSave(f.rpcs)
      expect(p).toHaveProperty('admin_note', null)
    }
  })

  it('ausente do corpo, a RPC não recebe a chave (e não a apaga na edição)', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    await route(f.deps, pedir('save', corpoNovo({ id: PROP, version: 2, idempotency_key: undefined })))
    expect(Object.keys(argsDoSave(f.rpcs)[0])).not.toContain('admin_note')
  })

  it('na edição, a observação vai à RPC junto do resto', async () => {
    const f = ambiente({
      rpcByFn: { has_role: { data: true }, save_order_proposal: { data: { ...SAVE_OK.data, version: 2, created: false } } },
    })
    await route(f.deps, pedir('save', corpoNovo({ id: PROP, version: 2, idempotency_key: undefined, admin_note: 'Ligar antes' })))
    const [p] = argsDoSave(f.rpcs)
    expect(p.id).toBe(PROP)
    expect(p.admin_note).toBe('Ligar antes')
  })

  it('acima do teto ⇒ 422 com a frase de core, ANTES do RPC; no teto passa (contado aparado, por ponto de código)', async () => {
    const acima = 'a'.repeat(ORDER_ADMIN_NOTE_MAX + 1)
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const res = await route(f.deps, pedir('save', corpoNovo({ admin_note: acima })))
    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ error: `A observação vai até ${ORDER_ADMIN_NOTE_MAX} caracteres.`, code: 'bad_admin_note' })
    expect(argsDoSave(f.rpcs)).toEqual([])
    expect(f.reads.find((r) => r.table === 'products')).toBeUndefined()

    const noTeto = `  ${'🌟'.repeat(ORDER_ADMIN_NOTE_MAX)}  `
    const g = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    expect((await route(g.deps, pedir('save', corpoNovo({ admin_note: noTeto })))).status).toBe(200)
    expect(argsDoSave(g.rpcs)[0].admin_note).toBe('🌟'.repeat(ORDER_ADMIN_NOTE_MAX))
  })

  it('observação que não é texto ⇒ 422, nada gravado', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    expect((await route(f.deps, pedir('save', corpoNovo({ admin_note: 42 })))).status).toBe(422)
    expect(argsDoSave(f.rpcs)).toEqual([])
  })
})

describe('save — editar', () => {
  it('manda id e versão, nunca token nem chave; o link continua o mesmo', async () => {
    const f = ambiente({
      rpcByFn: { has_role: { data: true }, save_order_proposal: { data: { ...SAVE_OK.data, version: 2, created: false } } },
    })
    const corpo = await (
      await route(f.deps, pedir('save', corpoNovo({ id: PROP, version: 1, idempotency_key: undefined })))
    ).json()
    const [p] = argsDoSave(f.rpcs)
    expect(p.id).toBe(PROP)
    expect(p.version).toBe(1)
    expect(p.token_hash).toBeUndefined()
    expect(p.expires_at).toBeUndefined()
    expect(p.idempotency_key).toBeUndefined()
    expect(corpo).toMatchObject({ version: 2, created: false, token: null })
  })

  it('editar sem versão ⇒ 400', async () => {
    const f = ambiente()
    expect((await route(f.deps, pedir('save', corpoNovo({ id: PROP })))).status).toBe(400)
  })

  it.each([
    ['version_conflict', 409, VERSION_CONFLICT],
    ['not_open', 409, NOT_EDITABLE],
    ['expired', 409, NOT_EDITABLE],
    ['not_found', 404, 'Proposta não encontrada.'],
    ['customer_email_mismatch', 422, 'O e-mail não é o da ficha escolhida.'],
  ])('o erro %s da RPC vira %i com a frase da tela', async (codigo, status, texto) => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: { data: { error: codigo } } } })
    const res = await route(f.deps, pedir('save', corpoNovo({ id: PROP, version: 3 })))
    expect(res.status).toBe(status)
    expect((await res.json()).error).toBe(texto)
  })
})

// ---------------------------------------------------------------------------------------------
// list e get
// ---------------------------------------------------------------------------------------------

const LINHA = (over: Record<string, unknown> = {}) => ({
  id: PROP,
  number: 'P-0001',
  status: 'open',
  version: 1,
  expires_at: '2026-11-05T12:00:00Z',
  viewed_at: null,
  order_id: null,
  customer_id: null,
  customer_name: 'Maria Clara',
  customer_email: 'maria@exemplo.invalid',
  customer_phone: null,
  customer_document: null,
  coupon_code: null,
  coupon_discount: 0,
  manual_discount_kind: null,
  manual_discount_value: null,
  manual_discount_reason: null,
  manual_discount: 0,
  subtotal: 100,
  promotion_discount: 0,
  items_total: 100,
  ...over,
})

describe('list (LNK-04)', () => {
  it('devolve o estado DERIVADO e o número do pedido das concluídas, sem pedir hash nem chave', async () => {
    const ORDER = 'ffffffff-0000-4000-8000-000000000001'
    const f = ambiente({
      lists: {
        order_proposals: [
          LINHA(),
          LINHA({ id: 'p2', viewed_at: '2026-10-31T10:00:00Z' }),
          LINHA({ id: 'p3', expires_at: '2026-10-31T12:00:00Z' }),
          LINHA({ id: 'p4', status: 'completed', order_id: ORDER }),
          LINHA({ id: 'p5', status: 'cancelled' }),
        ],
        orders: [{ id: ORDER, order_number: '0201' }],
      },
    })
    const res = await route(f.deps, pedir('list', {}))
    expect(res.status).toBe(200)
    const { proposals } = await res.json()
    expect(proposals.map((p: any) => p.state)).toEqual(['open', 'viewed', 'expired', 'completed', 'cancelled'])
    expect(proposals[3].order_number).toBe('0201')
    const leitura = f.reads.find((r) => r.table === 'order_proposals')!
    expect(leitura.select).not.toMatch(/token_hash|idempotency_key|\*/)
    expect(leitura.order).toEqual([['created_at', { ascending: false }]])
  })

  it('falha de leitura ⇒ 502, nunca lista vazia', async () => {
    const f = ambiente({ listErrorByTable: { order_proposals: { message: 'x' } } })
    expect((await route(f.deps, pedir('list', {}))).status).toBe(502)
  })

  it('cada proposta leva as peças resumidas (nome, foto, variação, quantidade), na ordem, com teto de 4 — e o relógio do servidor', async () => {
    const OUTRA = 'cccccccc-0000-4000-8000-000000000002'
    const peca = (proposal_id: string, position: number, extra: Record<string, unknown> = {}) => ({
      proposal_id,
      position,
      product_name: `Peça ${position}`,
      product_image: `https://img/${position}.webp`,
      variant_label: null,
      quantity: 1,
      unit_price: 999,
      engraving_text: 'segredo',
      ...extra,
    })
    const f = ambiente({
      lists: {
        order_proposals: [LINHA(), LINHA({ id: OUTRA })],
        // Fora de ordem de propósito, e com uma linha de outra proposta no meio.
        order_proposal_items: (_eqs: unknown, _sel: string, read: any) =>
          filtrarPorIn(
            [
              peca(PROP, 4),
              peca(PROP, 1, { variant_label: 'Prata · M', quantity: 2 }),
              peca(OUTRA, 0, { product_name: 'Anel Lua', product_image: null }),
              peca(PROP, 0),
              peca(PROP, 3),
              peca(PROP, 2),
            ],
            read,
          ),
      },
    })
    const res = await route(f.deps, pedir('list', {}))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo.agora).toBe('2026-10-31T12:00:00.000Z')
    const [primeira, segunda] = corpo.proposals
    expect(primeira.lines).toEqual([
      { product_name: 'Peça 0', product_image: 'https://img/0.webp', variant_label: null, quantity: 1 },
      { product_name: 'Peça 1', product_image: 'https://img/1.webp', variant_label: 'Prata · M', quantity: 2 },
      { product_name: 'Peça 2', product_image: 'https://img/2.webp', variant_label: null, quantity: 1 },
      { product_name: 'Peça 3', product_image: 'https://img/3.webp', variant_label: null, quantity: 1 },
    ])
    expect(primeira.lines_count).toBe(5)
    expect(segunda.lines).toEqual([{ product_name: 'Anel Lua', product_image: null, variant_label: null, quantity: 1 }])
    expect(segunda.lines_count).toBe(1)
    // Uma leitura só das peças, escopada pelas propostas lidas, sem preço, gravação nem material.
    const leituras = f.reads.filter((r) => r.table === 'order_proposal_items')
    expect(leituras).toHaveLength(1)
    expect(leituras[0].in).toEqual([['proposal_id', [PROP, OUTRA]]])
    expect(leituras[0].select).not.toMatch(/price|engraving|material/)
  })

  it('a leitura das peças falha ⇒ 502, nunca cartões sem peças', async () => {
    const f = ambiente({
      lists: { order_proposals: [LINHA()] },
      listErrorByTable: { order_proposal_items: { message: 'x' } },
    })
    expect((await route(f.deps, pedir('list', {}))).status).toBe(502)
  })
})

describe('get', () => {
  it('a proposta inteira, as linhas em ordem, o histórico e as ações do estado — sem o hash', async () => {
    let colunasPedidas = ''
    const f = ambiente({
      rows: {
        order_proposals: (eq: [string, unknown] | null, select: string) => {
          colunasPedidas = select
          return eq?.[1] === PROP ? LINHA({ manual_discount_reason: 'Combinado', admin_note: 'Só para o ateliê' }) : null
        },
      },
      lists: {
        order_proposal_items: [
          { position: 1, product_id: P2, quantity: 1, unit_price: 150 },
          { position: 0, product_id: P1, quantity: 1, unit_price: 100 },
        ],
        order_proposal_events: [{ kind: 'created', channel: null, actor: ADRI, created_at: '2026-10-31T09:00:00Z' }],
      },
    })
    const res = await route(f.deps, pedir('get', { id: PROP }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo.state).toBe('open')
    // Sem cifra gravada (e sem chave), o link não pode ser mostrado: a aberta renova pelo "Gerar link novo".
    expect(corpo.actions).toEqual({ edit: true, renew: true, renewLabel: 'Gerar link novo', cancel: true, duplicate: true, viewOrder: false })
    expect(corpo.token).toBeNull()
    expect(corpo.proposal.items.map((i: any) => i.position)).toEqual([0, 1])
    expect(corpo.proposal.events).toHaveLength(1)
    // O motivo é interno à loja, mas o painel o vê (HIS-02).
    expect(corpo.proposal.manual_discount_reason).toBe('Combinado')
    // A observação também: a coluna é pedida e devolvida.
    expect(corpo.proposal.admin_note).toBe('Só para o ateliê')
    expect(colunasPedidas.split(', ')).toContain('admin_note')
    expect(colunasPedidas).not.toMatch(/token_hash|idempotency_key|\*/)
    const leitura = f.reads.find((r) => r.table === 'order_proposal_items')!
    expect(leitura.eq).toEqual([['proposal_id', PROP]])
  })

  // HIS-01 pede "data e AUTOR". Achado na prova em navegador da T27: o painel mostrava o uuid de
  // `actor`, que não é autor nenhum para quem lê. A function resolve o e-mail de cada autor (uma
  // consulta por autor distinto) e devolve `actor_email`; sem a conta, `null` — nunca o uuid.
  it('cada evento leva o e-mail do autor, uma consulta por autor distinto; conta sumida ⇒ null', async () => {
    const OUTRA = '22222222-2222-2222-2222-222222222222'
    const f = ambiente({
      rows: { order_proposals: (eq: [string, unknown] | null) => (eq?.[1] === PROP ? LINHA() : null) },
      authUsers: { [ADRI]: { id: ADRI, email: 'adri@exemplo.invalid' } as any },
      lists: {
        order_proposal_items: [{ position: 0, product_id: P1, quantity: 1, unit_price: 100 }],
        order_proposal_events: [
          { kind: 'created', channel: null, actor: ADRI, created_at: '2026-10-31T09:00:00Z' },
          { kind: 'link_sent', channel: 'copy', actor: ADRI, created_at: '2026-10-31T09:01:00Z' },
          { kind: 'edited', channel: null, actor: OUTRA, created_at: '2026-10-31T09:02:00Z' },
          { kind: 'viewed', channel: null, actor: null, created_at: '2026-10-31T09:03:00Z' },
        ],
      },
    })
    const corpo = await (await route(f.deps, pedir('get', { id: PROP }))).json()
    expect(corpo.proposal.events.map((e: any) => e.actor_email)).toEqual([
      'adri@exemplo.invalid',
      'adri@exemplo.invalid',
      null,
      null,
    ])
    const consultas = f.adminCalls.filter((c) => c.method === 'getUserById').map((c) => c.id)
    expect(consultas.sort()).toEqual([ADRI, OUTRA].sort())
  })

  it('id inexistente ou malformado ⇒ 404', async () => {
    const f = ambiente({ rows: { order_proposals: null } })
    expect((await route(f.deps, pedir('get', { id: PROP }))).status).toBe(404)
    expect((await route(f.deps, pedir('get', { id: 'x' }))).status).toBe(404)
  })
})

// ---------------------------------------------------------------------------------------------
// renew (LNK-05, LNK-06)
// ---------------------------------------------------------------------------------------------

describe('renew', () => {
  const ITENS = [{ position: 0, product_id: P1, variant_id: null, quantity: 1, unit_price: 100, engraving_text: null }]
  const renovar = (row: Record<string, unknown>, opts: FakeSupabaseOptions = {}) =>
    ambiente({
      rows: { order_proposals: row },
      updatedRows: {
        order_proposals: (eqs: Array<[string, unknown]>) =>
          eqs.some(([c, v]) => c === 'version' && v === (row as any).version) ? { id: PROP, version: Number((row as any).version) + 1 } : null,
      },
      ...opts,
      lists: { order_proposal_items: ITENS, ...(opts.lists ?? {}) },
      rpcByFn: { has_role: { data: true }, save_order_proposal: { data: { ...SAVE_OK.data, version: 3 } }, ...(opts.rpcByFn ?? {}) },
    })

  it('expirada com o preço igual: troca hash, prazo e versão num update escopado, e devolve o token novo', async () => {
    const f = renovar(LINHA({ expires_at: '2026-10-20T00:00:00Z', version: 1, viewed_at: '2026-10-19T00:00:00Z' }))
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ id: PROP, version: 2, repriced: false, expires_at: new Date(AGORA + SETE_DIAS).toISOString() })

    const [u] = f.updates.filter((x) => x.table === 'order_proposals')
    expect(u.values).toMatchObject({ version: 2, viewed_at: null, expires_at: corpo.expires_at })
    expect(u.values.token_hash).toBe(await hashAccessToken(corpo.token))
    expect(argsDoSave(f.rpcs)).toEqual([])
    expect(f.inserts).toEqual([{ table: 'order_proposal_events', values: { proposal_id: PROP, kind: 'renewed', actor: ADRI } }])
    for (const linha of logs) expect(linha).not.toContain(corpo.token)
  })

  it('o update é escopado por id, versão lida e status aberto (o link antigo morre aqui)', async () => {
    let eqsVistos: Array<[string, unknown]> = []
    const f = renovar(LINHA({ version: 4 }), {
      updatedRows: {
        order_proposals: (eqs: Array<[string, unknown]>) => {
          eqsVistos = eqs
          return { id: PROP, version: 5 }
        },
      },
    })
    expect((await route(f.deps, pedir('renew', { id: PROP }))).status).toBe(200)
    expect(eqsVistos).toEqual([
      ['id', PROP],
      ['version', 4],
      ['status', 'open'],
    ])
  })

  it('preço mudou sem a Adri ter visto ⇒ 409 prices_changed e NADA gravado', async () => {
    const f = renovar(LINHA({ items_total: 90, subtotal: 90 }), {
      lists: { order_proposal_items: [{ ...ITENS[0], unit_price: 90 }] },
    })
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'prices_changed', summary: { items_total: 100 } })
    expect(f.updates).toEqual([])
    expect(f.inserts).toEqual([])
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('preço mudou e a Adri confirmou o total novo ⇒ renova e trava os preços novos pela RPC', async () => {
    const f = renovar(LINHA({ items_total: 90, subtotal: 90, version: 1 }), {
      lists: { order_proposal_items: [{ ...ITENS[0], unit_price: 90 }] },
    })
    const res = await route(f.deps, pedir('renew', { id: PROP, expected_total: 100 }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ repriced: true, version: 3 })
    const [p] = argsDoSave(f.rpcs)
    expect(p).toMatchObject({ id: PROP, version: 2, items_total: 100 })
    expect(p.items[0].unit_price).toBe(100)
    expect(p.token_hash).toBeUndefined()
  })

  // Fecho da rodada 1 do Verifier (F12): duas linhas trocando de preço com o TOTAL igual. Sem a
  // comparação por linha, a renovação passaria como "preço igual" e o link novo cobraria os
  // `unit_price` antigos, que o catálogo não tem mais.
  it('LNK-06: preço de LINHA mudou com o total igual ⇒ 409 prices_changed, nada gravado', async () => {
    const trocados = [
      { position: 0, product_id: P1, variant_id: null, quantity: 1, unit_price: 150, engraving_text: null },
      { position: 1, product_id: P2, variant_id: V2A, quantity: 1, unit_price: 100, engraving_text: null },
    ]
    const f = renovar(LINHA({ items_total: 250, subtotal: 250 }), { lists: { order_proposal_items: trocados } })
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'prices_changed', summary: { items_total: 250 } })
    expect(f.updates).toEqual([])
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('LNK-06: o mesmo total confirmado pela Adri ⇒ renova e trava os preços DE HOJE por linha', async () => {
    const trocados = [
      { position: 0, product_id: P1, variant_id: null, quantity: 1, unit_price: 150, engraving_text: null },
      { position: 1, product_id: P2, variant_id: V2A, quantity: 1, unit_price: 100, engraving_text: null },
    ]
    const f = renovar(LINHA({ items_total: 250, subtotal: 250, version: 1 }), { lists: { order_proposal_items: trocados } })
    const res = await route(f.deps, pedir('renew', { id: PROP, expected_total: 250 }))
    expect(res.status).toBe(200)
    expect((await res.json()).repriced).toBe(true)
    expect(argsDoSave(f.rpcs)[0].items.map((i: any) => i.unit_price)).toEqual([100, 150])
  })

  it('outra aba renovou antes (o update não acha a linha) ⇒ 409 version_conflict, sem evento nem token', async () => {
    const f = renovar(LINHA(), { updatedRows: { order_proposals: null } })
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(409)
    const corpo = await res.json()
    expect(corpo).toMatchObject({ code: 'version_conflict' })
    expect(corpo.token).toBeUndefined()
    expect(f.inserts).toEqual([])
  })

  it.each([
    ['concluída', { status: 'completed' }],
    ['cancelada', { status: 'cancelled' }],
  ])('LNK-06: %s não renova ⇒ 409, nada lido do catálogo nem gravado', async (_n, over) => {
    const f = renovar(LINHA(over))
    expect((await route(f.deps, pedir('renew', { id: PROP }))).status).toBe(409)
    expect(f.updates).toEqual([])
    expect(f.reads.find((r) => r.table === 'products')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------------------------
// cancel e log-sent
// ---------------------------------------------------------------------------------------------

describe('cancel (LNK-05)', () => {
  it('aberta: update escopado por status aberto, e o evento', async () => {
    let eqsVistos: Array<[string, unknown]> = []
    const f = ambiente({
      rows: { order_proposals: LINHA() },
      updatedRows: {
        order_proposals: (eqs: Array<[string, unknown]>) => {
          eqsVistos = eqs
          return { id: PROP }
        },
      },
    })
    const res = await route(f.deps, pedir('cancel', { id: PROP }))
    expect(res.status).toBe(200)
    expect(f.updates[0].values).toMatchObject({ status: 'cancelled' })
    expect(eqsVistos).toEqual([
      ['id', PROP],
      ['status', 'open'],
    ])
    expect(f.inserts).toEqual([{ table: 'order_proposal_events', values: { proposal_id: PROP, kind: 'cancelled', actor: ADRI } }])
  })

  it.each([
    ['expirada', { expires_at: '2026-10-01T00:00:00Z' }],
    ['concluída', { status: 'completed' }],
    ['cancelada', { status: 'cancelled' }],
  ])('%s ⇒ 409, nada gravado', async (_n, over) => {
    const f = ambiente({ rows: { order_proposals: LINHA(over) } })
    expect((await route(f.deps, pedir('cancel', { id: PROP }))).status).toBe(409)
    expect(tabelasEscritas(f)).toEqual([])
  })

  it('concluída entre a leitura e o update (nenhuma linha casou) ⇒ 409, sem evento', async () => {
    const f = ambiente({ rows: { order_proposals: LINHA() }, updatedRows: { order_proposals: null } })
    expect((await route(f.deps, pedir('cancel', { id: PROP }))).status).toBe(409)
    expect(f.inserts).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// note — a observação em qualquer status não concluído
// ---------------------------------------------------------------------------------------------

describe('note', () => {
  const anotar = (row: Record<string, unknown>, updated: unknown = { id: PROP, admin_note: 'Ligar antes' }) =>
    ambiente({ rows: { order_proposals: row }, updatedRows: { order_proposals: updated } })

  it.each([
    ['aberta', {}],
    ['vista', { viewed_at: '2026-10-31T10:00:00Z' }],
    ['expirada', { expires_at: '2026-10-01T00:00:00Z' }],
    ['cancelada', { status: 'cancelled' }],
  ])('%s: grava SÓ a coluna, escopada pelos status não concluídos — sem versão, sem updated_at, sem evento', async (_n, over) => {
    const f = anotar(LINHA(over))
    const res = await route(f.deps, pedir('note', { id: PROP, admin_note: '  Ligar antes  ' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: PROP, admin_note: 'Ligar antes' })
    expect(f.updates).toEqual([
      { table: 'order_proposals', values: { admin_note: 'Ligar antes' }, eq: ['id', PROP], in: [['status', ['open', 'cancelled']]] },
    ])
    expect(f.inserts).toEqual([])
    expect(argsDoSave(f.rpcs)).toEqual([])
  })

  it('vazia apaga (null)', async () => {
    const f = anotar(LINHA({ admin_note: 'antiga' }), { id: PROP, admin_note: null })
    const res = await route(f.deps, pedir('note', { id: PROP, admin_note: '   ' }))
    expect(res.status).toBe(200)
    expect(f.updates[0].values).toEqual({ admin_note: null })
  })

  it.each([
    ['concluída', { status: 'completed', order_id: 'ffffffff-0000-4000-8000-000000000001' }],
    ['com pedido', { order_id: 'ffffffff-0000-4000-8000-000000000001' }],
  ])('%s ⇒ 409 com a frase (a observação agora é a do pedido), nada gravado', async (_n, over) => {
    const f = anotar(LINHA(over))
    const res = await route(f.deps, pedir('note', { id: PROP, admin_note: 'x' }))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: NOTE_ON_ORDER, code: 'completed' })
    expect(tabelasEscritas(f)).toEqual([])
  })

  it('concluída entre a leitura e o update (nenhuma linha casou) ⇒ 409', async () => {
    const f = anotar(LINHA(), null)
    expect((await route(f.deps, pedir('note', { id: PROP, admin_note: 'x' }))).status).toBe(409)
    expect(f.inserts).toEqual([])
  })

  it('acima do teto ⇒ 422 antes de ler ou gravar', async () => {
    const f = anotar(LINHA())
    const res = await route(f.deps, pedir('note', { id: PROP, admin_note: 'a'.repeat(ORDER_ADMIN_NOTE_MAX + 1) }))
    expect(res.status).toBe(422)
    expect(f.reads).toEqual([])
    expect(tabelasEscritas(f)).toEqual([])
  })

  it('sem admin_note no corpo ⇒ 400; id malformado ⇒ 404; proposta inexistente ⇒ 404', async () => {
    const f = anotar(LINHA())
    expect((await route(f.deps, pedir('note', { id: PROP }))).status).toBe(400)
    expect((await route(f.deps, pedir('note', { id: 'x', admin_note: 'a' }))).status).toBe(404)
    const g = ambiente({ rows: { order_proposals: null } })
    expect((await route(g.deps, pedir('note', { id: PROP, admin_note: 'a' }))).status).toBe(404)
    expect(tabelasEscritas(f)).toEqual([])
    expect(tabelasEscritas(g)).toEqual([])
  })

  it('falha ao gravar ⇒ 500', async () => {
    const f = ambiente({ rows: { order_proposals: LINHA() }, updateError: { message: 'x' } })
    expect((await route(f.deps, pedir('note', { id: PROP, admin_note: 'a' }))).status).toBe(500)
  })
})

describe('log-sent (LNK-03)', () => {
  it.each(['whatsapp', 'copy'])('registra "Link enviado" com o canal %s e o autor', async (canal) => {
    const f = ambiente({ rows: { order_proposals: LINHA({ viewed_at: '2026-10-31T10:00:00Z' }) } })
    const res = await route(f.deps, pedir('log-sent', { id: PROP, channel: canal }))
    expect(res.status).toBe(200)
    expect(f.inserts).toEqual([
      { table: 'order_proposal_events', values: { proposal_id: PROP, kind: 'link_sent', channel: canal, actor: ADRI } },
    ])
  })

  it('canal fora da lista ⇒ 400, nada gravado', async () => {
    const f = ambiente({ rows: { order_proposals: LINHA() } })
    expect((await route(f.deps, pedir('log-sent', { id: PROP, channel: 'email' }))).status).toBe(400)
    expect(f.inserts).toEqual([])
  })

  it('link que não vale mais ⇒ 409', async () => {
    const f = ambiente({ rows: { order_proposals: LINHA({ expires_at: '2026-10-01T00:00:00Z' }) } })
    expect((await route(f.deps, pedir('log-sent', { id: PROP, channel: 'copy' }))).status).toBe(409)
    expect(f.inserts).toEqual([])
  })

  it('falha ao gravar o evento ⇒ 500', async () => {
    const f = ambiente({ rows: { order_proposals: LINHA() }, insertErrorByTable: { order_proposal_events: { message: 'x' } } })
    expect((await route(f.deps, pedir('log-sent', { id: PROP, channel: 'copy' }))).status).toBe(500)
  })
})

describe('roteamento', () => {
  it('OPTIONS responde o preflight', async () => {
    const f = ambiente()
    const res = await route(f.deps, new Request('http://local/order-proposals?action=save', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(f.rpcs).toEqual([])
  })

  it('ação desconhecida ⇒ 400; corpo malformado ⇒ 400', async () => {
    const f = ambiente()
    expect((await route(f.deps, pedir('apagar', {}))).status).toBe(400)
    const malformado = new Request('http://local/order-proposals?action=save', {
      method: 'POST',
      headers: { Authorization: 'Bearer x' },
      body: '{',
    })
    expect((await route(f.deps, malformado)).status).toBe(400)
    expect(f.rpcs).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// O link sempre: a cifra do token, o `save_address` e a foto da linha
// ---------------------------------------------------------------------------------------------

/** 32 bytes fixos, em base64 — só para os testes. */
const CHAVE = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => i + 1)))
const OUTRA_CHAVE = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, i) => 200 - i)))
const TOKEN = 'tok_'.padEnd(43, 'x')

describe('createTokenCipher', () => {
  it('cifra e decifra o mesmo token, com IV novo a cada cifra', async () => {
    const c = (await createTokenCipher(CHAVE))!
    const a = await c.encrypt(TOKEN)
    const b = await c.encrypt(TOKEN)
    expect(a).not.toBe(b)
    expect(a).not.toContain(TOKEN)
    expect(await c.decrypt(a)).toBe(TOKEN)
    expect(await c.decrypt(b)).toBe(TOKEN)
  })

  it('cifra de outra chave, corrompida ou de outro formato ⇒ null, nunca lança', async () => {
    const c = (await createTokenCipher(CHAVE))!
    const outra = (await createTokenCipher(OUTRA_CHAVE))!
    const cifra = await outra.encrypt(TOKEN)
    expect(await c.decrypt(cifra)).toBeNull()
    expect(await c.decrypt(`${cifra.slice(0, -2)}AA`)).toBeNull()
    expect(await c.decrypt('v2.abc')).toBeNull()
    expect(await c.decrypt(null)).toBeNull()
  })

  it.each([undefined, null, '', '   ', 'curta', btoa('dezesseis bytes!')])('chave %j inutilizável ⇒ sem cifra', async (raw) => {
    expect(await createTokenCipher(raw as string)).toBeNull()
  })
})

describe('get — o link enquanto aberta', () => {
  const comCifra = async (over: Record<string, unknown>, chave: TokenCipher | null) => {
    const cifrador = (await createTokenCipher(CHAVE))!
    const cifra = await cifrador.encrypt(TOKEN)
    const selects: string[] = []
    const f = ambiente({
      rows: {
        order_proposals: (eq: [string, unknown] | null, select: string) => {
          selects.push(select)
          return eq?.[1] === PROP ? LINHA({ token_cipher: cifra, token_hash: 'hash-x', ...over }) : null
        },
      },
      lists: { order_proposal_items: [], order_proposal_events: [] },
    })
    f.deps.tokenCipher = chave
    return { f, cifra, selects }
  }

  it.each([
    ['aberta', {}],
    ['vista', { viewed_at: '2026-10-31T10:00:00Z' }],
  ])('%s com cifra e chave ⇒ devolve o token; nem a cifra nem o hash saem, e o log não carrega nenhum', async (_n, over) => {
    const { f, cifra, selects } = await comCifra(over, await createTokenCipher(CHAVE))
    const res = await route(f.deps, pedir('get', { id: PROP }))
    const texto = await res.clone().text()
    const corpo = await res.json()
    expect(corpo.token).toBe(TOKEN)
    expect(corpo.actions).toMatchObject({ renew: false, renewLabel: null, edit: true, cancel: true })
    expect(corpo.proposal).not.toHaveProperty('token_cipher')
    expect(corpo.proposal).not.toHaveProperty('token_hash')
    expect(texto).not.toContain(cifra)
    expect(texto).not.toContain('hash-x')
    for (const linha of logs) {
      expect(linha).not.toContain(TOKEN)
      expect(linha).not.toContain(cifra)
    }
    // A cifra é pedida ao banco (é por ela que o link volta), e o hash não.
    expect(selects[0]).toContain('token_cipher')
    expect(selects[0]).not.toContain('token_hash')
  })

  it.each([
    ['expirada', { expires_at: '2026-10-20T00:00:00Z' }, 'Renovar prazo'],
    ['cancelada', { status: 'cancelled' }, null],
    ['concluída', { status: 'completed' }, null],
  ])('%s com cifra ⇒ sem token (o link morreu)', async (_n, over, rotulo) => {
    const { f } = await comCifra(over, await createTokenCipher(CHAVE))
    const corpo = await (await route(f.deps, pedir('get', { id: PROP }))).json()
    expect(corpo.token).toBeNull()
    expect(corpo.actions.renewLabel).toBe(rotulo)
  })

  it('aberta com cifra mas SEM a chave ⇒ sem token, e renovar vira "Gerar link novo"', async () => {
    const { f } = await comCifra({}, null)
    const corpo = await (await route(f.deps, pedir('get', { id: PROP }))).json()
    expect(corpo.token).toBeNull()
    expect(corpo.actions).toMatchObject({ renew: true, renewLabel: 'Gerar link novo' })
  })
})

describe('save — a cifra e o save_address', () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
    ['sim', false],
  ])('save_address %j chega à RPC como %j', async (valor, esperado) => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    const corpo = valor === undefined ? corpoNovo() : corpoNovo({ save_address: valor })
    expect((await route(f.deps, pedir('save', corpo))).status).toBe(200)
    expect(argsDoSave(f.rpcs)[0].save_address).toBe(esperado)
  })

  it('com a chave, a cifra nasce junto do hash e decifra o token da resposta', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    f.deps.tokenCipher = await createTokenCipher(CHAVE)
    const corpo = await (await route(f.deps, pedir('save', corpoNovo()))).json()
    const [p] = argsDoSave(f.rpcs)
    expect(p.token_hash).toBe(await hashAccessToken(corpo.token))
    expect(typeof p.token_cipher).toBe('string')
    expect(await f.deps.tokenCipher!.decrypt(p.token_cipher)).toBe(corpo.token)
    for (const linha of logs) {
      expect(linha).not.toContain(corpo.token)
      expect(linha).not.toContain(p.token_cipher)
    }
  })

  it('sem a chave, só o hash (o comportamento de antes)', async () => {
    const f = ambiente({ rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK } })
    await route(f.deps, pedir('save', corpoNovo()))
    const [p] = argsDoSave(f.rpcs)
    expect(p.token_hash).toEqual(expect.any(String))
    expect(p).not.toHaveProperty('token_cipher')
  })

  it('editar não manda cifra nem hash (o link continua o mesmo)', async () => {
    const f = ambiente({
      rows: { order_proposals: LINHA() },
      rpcByFn: { has_role: { data: true }, save_order_proposal: { data: { ...SAVE_OK.data, created: false } } },
    })
    f.deps.tokenCipher = await createTokenCipher(CHAVE)
    await route(f.deps, pedir('save', corpoNovo({ id: PROP, version: 1, idempotency_key: undefined })))
    const [p] = argsDoSave(f.rpcs)
    expect(p).not.toHaveProperty('token_cipher')
    expect(p).not.toHaveProperty('token_hash')
  })
})

describe('renew — só a expirada, ou a aberta sem link', () => {
  const ITENS = [{ position: 0, product_id: P1, variant_id: null, quantity: 1, unit_price: 100, engraving_text: null }]
  const renovar = async (over: Record<string, unknown>, chave: string | null, cifraGravada: boolean) => {
    const cifrador = (await createTokenCipher(CHAVE))!
    const row = LINHA({ version: 1, token_cipher: cifraGravada ? await cifrador.encrypt('token-antigo'.padEnd(43, 'y')) : null, ...over })
    const f = ambiente({
      rows: { order_proposals: row },
      updatedRows: { order_proposals: { id: PROP, version: 2 } },
      lists: { order_proposal_items: ITENS },
    })
    f.deps.tokenCipher = chave ? await createTokenCipher(chave) : null
    return f
  }

  it('aberta COM cifra (link disponível) ⇒ 409 not_renewable, nada lido do catálogo nem gravado', async () => {
    const f = await renovar({}, CHAVE, true)
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('not_renewable')
    expect(f.updates).toEqual([])
    expect(f.inserts).toEqual([])
    expect(f.reads.find((r) => r.table === 'products')).toBeUndefined()
  })

  it('aberta SEM cifra, com a chave ⇒ renova, e a proposta sai com cifra do token novo', async () => {
    const f = await renovar({}, CHAVE, false)
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    const [u] = f.updates.filter((x) => x.table === 'order_proposals')
    expect(u.values.token_hash).toBe(await hashAccessToken(corpo.token))
    expect(await f.deps.tokenCipher!.decrypt(u.values.token_cipher)).toBe(corpo.token)
  })

  it('expirada com cifra ⇒ hash e cifra do MESMO token novo, no mesmo update', async () => {
    const f = await renovar({ expires_at: '2026-10-20T00:00:00Z' }, CHAVE, true)
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(200)
    const corpo = await res.json()
    const updates = f.updates.filter((x) => x.table === 'order_proposals')
    expect(updates).toHaveLength(1)
    expect(updates[0].values.token_hash).toBe(await hashAccessToken(corpo.token))
    expect(await f.deps.tokenCipher!.decrypt(updates[0].values.token_cipher)).toBe(corpo.token)
    for (const linha of logs) expect(linha).not.toContain(updates[0].values.token_cipher)
  })

  it('sem a chave ⇒ grava só o hash: a cifra antiga sai, e o `get` seguinte não devolve token', async () => {
    const f = await renovar({}, null, true)
    const res = await route(f.deps, pedir('renew', { id: PROP }))
    expect(res.status).toBe(200)
    const [u] = f.updates.filter((x) => x.table === 'order_proposals')
    expect(u.values.token_hash).toEqual(expect.any(String))
    expect(u.values.token_cipher).toBeNull()
  })

  it('cifra de outra chave (a chave trocou) ⇒ o link não está disponível, e a aberta renova', async () => {
    const f = await renovar({}, OUTRA_CHAVE, true)
    expect((await route(f.deps, pedir('renew', { id: PROP }))).status).toBe(200)
  })
})

describe('a foto gravada na linha: variação → images[0] → image_url', () => {
  const comPecas = (produtos: any[]) =>
    ambiente({
      rpcByFn: { has_role: { data: true }, save_order_proposal: SAVE_OK },
      lists: {
        products: (_eqs: unknown, _sel: string, read: any) => filtrarPorIn(produtos, read),
      },
    })
  const fotos = (f: ReturnType<typeof ambiente>) => argsDoSave(f.rpcs)[0].items.map((i: any) => i.product_image)

  it('a leitura pede a primeira foto da galeria com o apelido `capa`', async () => {
    const f = comPecas(PRODUTOS)
    await route(f.deps, pedir('save', corpoNovo()))
    const leitura = f.reads.find((r) => r.table === 'products')!
    expect(leitura.select).toContain('capa:images->0->>url')
  })

  it('variação com foto ⇒ a dela; sem foto da variação ⇒ a primeira da galeria; sem galeria ⇒ a coluna antiga', async () => {
    const P3 = 'aaaaaaaa-0000-4000-8000-000000000003'
    const produtos = [
      { ...PRODUTOS[0], capa: 'https://img/p1-galeria.webp' },
      { ...PRODUTOS[1], capa: 'https://img/p2-galeria.webp' },
      { ...PRODUTOS[0], id: P3, name: 'Sem galeria', capa: null },
    ]
    const f = comPecas(produtos)
    const res = await route(
      f.deps,
      pedir(
        'save',
        corpoNovo({
          lines: [
            { product_id: P1, variant_id: null, quantity: 1 },
            { product_id: P2, variant_id: V2A, quantity: 2, engraving_text: 'Lua' },
            { product_id: P3, variant_id: null, quantity: 1 },
          ],
          expected_total: 500,
        }),
      ),
    )
    expect(res.status).toBe(200)
    expect(fotos(f)).toEqual(['https://img/p1-galeria.webp', 'https://img/v2a.webp', 'https://img/p1.webp'])
  })
})
