// Feature 79 (T13) — a porta das inscrições do aviso no celular, com dublês (`AD-004`).
//
// Cada ação × sucesso, validação, dono errado, 401, 403, `has_role` que erra, 429, 503 e `db_error`.
// Toda resposta lida aqui passa por `lidas`, e a última asserção do arquivo confere que NENHUM corpo
// de resposta ecoou um endpoint (`MAN-26`).
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PUSH_EVENTS } from '../../../../packages/core/src/notifications/index.ts'
import { createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import type { PushOutcome, PushSender, PushTarget } from '../../send-notification/push.ts'
import { type Deps, route } from '../handlers.ts'

const DONA = 'u-dona-0000-4000-8000-000000000001'
const OUTRA = 'u-outra-000-4000-8000-000000000002'
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/ENDPOINT-DA-DONA-SECRETO'
const ENDPOINT_DA_OUTRA = 'https://fcm.googleapis.com/fcm/send/ENDPOINT-DA-OUTRA-SECRETO'
const P256DH = 'B' + 'A'.repeat(86) // 65 bytes, começando com 0x04
const AUTH = 'AAAAAAAAAAAAAAAAAAAAAA' // 16 bytes
const VAPID_PUB = 'BCHAVE-PUBLICA-DO-MESMO-PAR'

interface Linha {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  events: string[]
  last_used_at: string
}

const linha = (over: Partial<Linha> = {}): Linha => ({
  id: 'sub-1',
  user_id: DONA,
  endpoint: ENDPOINT,
  p256dh: P256DH,
  auth: AUTH,
  events: [...PUSH_EVENTS],
  last_used_at: '2026-10-20T10:00:00Z',
  ...over,
})

/** Todo corpo de resposta lido nos testes — para a asserção final de `MAN-26`. */
const lidas: string[] = []

interface Setup {
  linhas?: Linha[]
  user?: { id: string } | null
  papel?: boolean | 'erro'
  claim?: { data?: unknown; error?: unknown }
  desfecho?: PushOutcome | 'lanca'
  semSender?: boolean
  semVapid?: boolean
  supabase?: Partial<FakeSupabaseOptions>
}

function setup(o: Setup = {}) {
  const linhas = o.linhas ?? [linha()]
  const enviados: Array<{ sub: PushTarget; message: unknown; ctx: unknown }> = []
  const sender: PushSender = {
    send: async (sub, message, ctx) => {
      enviados.push({ sub, message, ctx })
      if (o.desfecho === 'lanca') throw new Error('bug')
      return o.desfecho ?? { kind: 'sent' }
    },
  }
  const casa = (l: Linha, eqs: Array<[string, unknown]>) => eqs.every(([c, v]) => (l as unknown as Record<string, unknown>)[c] === v)
  const supabase = createFakeSupabase({
    user: o.user === undefined ? { id: DONA } : o.user,
    rows: {
      push_subscriptions: (_eq: unknown, _select: string, eqs: Array<[string, unknown]>) =>
        linhas.find((l) => casa(l, eqs)) ?? null,
    },
    lists: {
      push_subscriptions: (eqs: Array<[string, unknown]>) =>
        linhas.filter((l) => casa(l, eqs)).sort((a, b) => b.last_used_at.localeCompare(a.last_used_at)),
    },
    updatedRows: {
      push_subscriptions: (eqs: Array<[string, unknown]>, _is: unknown, values: Record<string, unknown>) => {
        const l = linhas.find((x) => casa(x, eqs))
        return l ? { ...l, ...values } : null
      },
    },
    rpcByFn: {
      has_role: o.papel === 'erro' ? { error: { message: 'boom' } } : { data: o.papel ?? true },
      claim_push_test: o.claim ?? { data: true },
    },
    ...o.supabase,
  })
  const deps: Deps = {
    supabase: supabase.client,
    ...(o.semSender ? {} : { sender }),
    ...(o.semVapid ? {} : { vapidPublicKey: VAPID_PUB }),
  }
  return { deps, supabase, enviados }
}

async function chamar(deps: Deps, action: string, body?: unknown, opcoes: { semHeader?: boolean; cru?: string } = {}) {
  const req = new Request(`http://local/functions/v1/atelie-avisos?action=${action}`, {
    method: 'POST',
    headers: opcoes.semHeader ? {} : { Authorization: 'Bearer jwt-da-dona' },
    body: opcoes.cru ?? JSON.stringify(body ?? {}),
  })
  const res = await route(deps, req)
  const texto = await res.text()
  lidas.push(texto)
  return { status: res.status, body: texto === '' ? null : JSON.parse(texto) }
}

const escritas = (s: ReturnType<typeof createFakeSupabase>) =>
  s.upserts.length + s.inserts.length + s.updates.length + s.deletes.length

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

const ACOES: Array<[string, unknown]> = [
  ['config', {}],
  ['status', { endpoint: ENDPOINT }],
  ['subscribe', { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } }],
  ['events', { endpoint: ENDPOINT, events: ['owner_order_paid'] }],
  ['unsubscribe', { endpoint: ENDPOINT }],
  ['test', { endpoint: ENDPOINT }],
]

describe('toda ação passa pelo papel antes de tocar em qualquer coisa (MAN-23)', () => {
  it.each(ACOES)('%s sem header ⇒ 401, nada lido nem gravado', async (acao, body) => {
    const { deps, supabase, enviados } = setup({ user: null })
    const r = await chamar(deps, acao, body, { semHeader: true })
    expect(r.status).toBe(401)
    expect(escritas(supabase)).toBe(0)
    expect(supabase.rpcs.filter((x) => x.fn !== 'has_role')).toEqual([])
    expect(enviados).toHaveLength(0)
  })

  it.each(ACOES)('%s de conta SEM papel ⇒ 403, nada gravado', async (acao, body) => {
    const { deps, supabase, enviados } = setup({ papel: false })
    const r = await chamar(deps, acao, body)
    expect(r.status).toBe(403)
    expect(escritas(supabase)).toBe(0)
    expect(supabase.reads).toHaveLength(0)
    expect(enviados).toHaveLength(0)
  })

  it.each(ACOES)('%s com `has_role` que ERRA ⇒ 403, nada gravado', async (acao, body) => {
    const { deps, supabase, enviados } = setup({ papel: 'erro' })
    const r = await chamar(deps, acao, body)
    expect(r.status).toBe(403)
    expect(escritas(supabase)).toBe(0)
    expect(supabase.rpcs.map((x) => x.fn)).toEqual(['has_role'])
    expect(enviados).toHaveLength(0)
  })

  it('o papel é conferido para o dono do JWT, com o papel admin', async () => {
    const { deps, supabase } = setup()
    await chamar(deps, 'status', { endpoint: ENDPOINT })
    expect(supabase.rpcs[0]).toEqual({ fn: 'has_role', args: { _user_id: DONA, _role: 'admin' } })
  })
})

describe('roteamento e corpo', () => {
  it('OPTIONS ⇒ preflight sem auth', async () => {
    const { deps } = setup()
    const res = await route(deps, new Request('http://local/x?action=status', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('ação desconhecida ⇒ 400 `unknown_action`', async () => {
    const { deps } = setup()
    expect(await chamar(deps, 'apagar-tudo', {})).toEqual({ status: 400, body: { error: 'unknown_action' } })
  })

  it('JSON malformado ⇒ 400 `invalid_body`', async () => {
    const { deps, supabase } = setup()
    expect(await chamar(deps, 'subscribe', undefined, { cru: '{nao é json' })).toEqual({ status: 400, body: { error: 'invalid_body' } })
    expect(escritas(supabase)).toBe(0)
  })

  it.each(['status', 'subscribe', 'events', 'unsubscribe', 'test'])('%s sem endpoint ⇒ 400 `invalid_endpoint`', async (acao) => {
    const { deps, supabase } = setup()
    expect(await chamar(deps, acao, { endpoint: '' })).toEqual({ status: 400, body: { error: 'invalid_endpoint' } })
    expect(escritas(supabase)).toBe(0)
  })
})

describe('config', () => {
  it('devolve a chave pública do mesmo par que assina', async () => {
    const { deps } = setup()
    expect(await chamar(deps, 'config')).toEqual({ status: 200, body: { applicationServerKey: VAPID_PUB } })
  })

  it('sem VAPID ⇒ 503 `push_unconfigured`', async () => {
    const { deps } = setup({ semVapid: true })
    expect(await chamar(deps, 'config')).toEqual({ status: 503, body: { error: 'push_unconfigured' } })
  })
})

describe('status (MAN-36)', () => {
  it('linha DA conta ⇒ subscribed, com os eventos dela', async () => {
    const { deps } = setup({ linhas: [linha({ events: ['owner_order_paid'] })] })
    expect(await chamar(deps, 'status', { endpoint: ENDPOINT })).toEqual({
      status: 200,
      body: { subscribed: true, events: ['owner_order_paid'] },
    })
  })

  it('endpoint de OUTRA conta ⇒ subscribed: false, sem os eventos dela', async () => {
    const { deps } = setup({ linhas: [linha({ user_id: OUTRA, events: ['owner_order_paid'] })] })
    expect(await chamar(deps, 'status', { endpoint: ENDPOINT })).toEqual({ status: 200, body: { subscribed: false, events: [] } })
  })

  it('endpoint desconhecido ⇒ subscribed: false', async () => {
    const { deps } = setup({ linhas: [] })
    expect(await chamar(deps, 'status', { endpoint: ENDPOINT })).toEqual({ status: 200, body: { subscribed: false, events: [] } })
  })

  it('a leitura é por endpoint, e a conta é comparada depois (para responder `false`, não 404)', async () => {
    const vistos: Array<Array<[string, unknown]>> = []
    const { deps } = setup({
      supabase: {
        rows: {
          push_subscriptions: (_e: unknown, _s: string, eqs: Array<[string, unknown]>) => {
            vistos.push(eqs)
            return linha()
          },
        },
      },
    })
    await chamar(deps, 'status', { endpoint: ENDPOINT })
    expect(vistos).toEqual([[['endpoint', ENDPOINT]]])
  })

  it('erro de banco ⇒ 500 `db_error`', async () => {
    const { deps } = setup({ supabase: { rows: { push_subscriptions: () => { throw new Error('x') } } } })
    expect(await chamar(deps, 'status', { endpoint: ENDPOINT })).toEqual({ status: 500, body: { error: 'db_error' } })
  })
})

describe('subscribe (MAN-25, MAN-27, MAN-28)', () => {
  const corpo = (over: Record<string, unknown> = {}) => ({ endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH }, ...over })

  it('dono NOVO ⇒ upsert por endpoint, da conta, com os quatro eventos', async () => {
    const { deps, supabase } = setup({ linhas: [] })
    const r = await chamar(deps, 'subscribe', corpo())
    expect(r).toEqual({ status: 200, body: { events: [...PUSH_EVENTS] } })
    expect(supabase.upserts).toHaveLength(1)
    const u = supabase.upserts[0]
    expect(u.table).toBe('push_subscriptions')
    expect(u.onConflict).toBe('endpoint')
    expect(u.values).toMatchObject({ endpoint: ENDPOINT, user_id: DONA, p256dh: P256DH, auth: AUTH, events: [...PUSH_EVENTS] })
    // O teto do teste é da conta, em `push_test_claims`: a inscrição não tem coluna dele (PGRST204).
    expect('last_test_at' in u.values).toBe(false)
  })

  it('o MESMO dono ⇒ os eventos que ela escolheu ficam', async () => {
    const { deps, supabase } = setup({ linhas: [linha({ events: ['owner_order_paid'] })] })
    const r = await chamar(deps, 'subscribe', corpo())
    expect(r.body).toEqual({ events: ['owner_order_paid'] })
    expect(supabase.upserts[0].values.events).toEqual(['owner_order_paid'])
    expect('last_test_at' in supabase.upserts[0].values).toBe(false)
  })

  it('endpoint de OUTRA conta ⇒ passa a ser do chamador, e os eventos voltam aos quatro (MAN-27)', async () => {
    const { deps, supabase } = setup({ linhas: [linha({ user_id: OUTRA, events: ['owner_order_paid'] })] })
    const r = await chamar(deps, 'subscribe', corpo())
    expect(r.body).toEqual({ events: [...PUSH_EVENTS] })
    expect(supabase.upserts[0].values).toMatchObject({ user_id: DONA, events: [...PUSH_EVENTS] })
    expect('last_test_at' in supabase.upserts[0].values).toBe(false)
  })

  it('a 11ª inscrição despeja a usada há mais tempo (MAN-28)', async () => {
    const onze = Array.from({ length: 11 }, (_, i) =>
      linha({ id: `sub-${i}`, endpoint: `${ENDPOINT}-${i}`, last_used_at: `2026-10-${String(10 + i).padStart(2, '0')}T10:00:00Z` }),
    )
    const { deps, supabase } = setup({ linhas: onze })
    await chamar(deps, 'subscribe', corpo({ endpoint: `${ENDPOINT}-10` }))
    const leitura = supabase.reads.find((x) => x.table === 'push_subscriptions')
    expect(leitura.eq).toEqual([['user_id', DONA]])
    expect(leitura.order).toEqual([['last_used_at', { ascending: false }]])
    expect(supabase.deletes).toEqual([{ table: 'push_subscriptions', eq: [], in: [['id', ['sub-0']]] }])
  })

  it('dez inscrições ⇒ nenhuma despejada', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => linha({ id: `sub-${i}`, endpoint: `${ENDPOINT}-${i}`, last_used_at: `2026-10-${10 + i}T10:00:00Z` }))
    const { deps, supabase } = setup({ linhas: dez })
    await chamar(deps, 'subscribe', corpo({ endpoint: `${ENDPOINT}-0` }))
    expect(supabase.deletes).toEqual([])
  })

  it.each([
    ['http://fcm.googleapis.com/fcm/send/x', 'not_https'],
    ['https://evil.example.com/push/x', 'host_not_allowed'],
    ['nao é url', 'invalid_url'],
  ])('endpoint %s ⇒ 400 `%s`, nada gravado', async (endpoint, slug) => {
    const { deps, supabase } = setup({ linhas: [] })
    expect(await chamar(deps, 'subscribe', corpo({ endpoint }))).toEqual({ status: 400, body: { error: slug } })
    expect(escritas(supabase)).toBe(0)
  })

  it.each([
    [{ p256dh: 'BBBB', auth: AUTH }, 'invalid_p256dh'],
    [{ p256dh: P256DH, auth: 'AAAA' }, 'invalid_auth'],
    [undefined, 'invalid_p256dh'],
  ])('chaves %j ⇒ 400 `%s`, nada gravado', async (keys, slug) => {
    const { deps, supabase } = setup({ linhas: [] })
    expect(await chamar(deps, 'subscribe', { endpoint: ENDPOINT, keys })).toEqual({ status: 400, body: { error: slug } })
    expect(escritas(supabase)).toBe(0)
  })

  it('upsert que erra ⇒ 500 `db_error`', async () => {
    const { deps } = setup({ linhas: [], supabase: { upsertErrorByTable: { push_subscriptions: { message: 'x' } } } })
    expect(await chamar(deps, 'subscribe', corpo())).toEqual({ status: 500, body: { error: 'db_error' } })
  })
})

describe('events (MAN-14)', () => {
  it('subconjunto válido ⇒ grava só na linha do chamador e devolve', async () => {
    const { deps, supabase } = setup()
    const r = await chamar(deps, 'events', { endpoint: ENDPOINT, events: ['owner_order_paid', 'owner_material_incoming'] })
    expect(r).toEqual({ status: 200, body: { events: ['owner_order_paid', 'owner_material_incoming'] } })
    expect(supabase.updates).toEqual([
      { table: 'push_subscriptions', values: { events: ['owner_order_paid', 'owner_material_incoming'] }, eq: ['user_id', DONA] },
    ])
  })

  it('lista vazia vale (nenhum aviso neste aparelho)', async () => {
    const { deps } = setup()
    expect((await chamar(deps, 'events', { endpoint: ENDPOINT, events: [] })).body).toEqual({ events: [] })
  })

  it.each([
    [['order_paid'], 'unknown_event'],
    [['owner_order_paid', 'owner_order_paid'], 'duplicate_event'],
    ['owner_order_paid', 'not_array'],
  ])('eventos %j ⇒ 400 `%s`, nada gravado', async (events, slug) => {
    const { deps, supabase } = setup()
    expect(await chamar(deps, 'events', { endpoint: ENDPOINT, events })).toEqual({ status: 400, body: { error: slug } })
    expect(escritas(supabase)).toBe(0)
  })

  it('linha de OUTRA conta ⇒ 404 `not_found`', async () => {
    const { deps } = setup({ linhas: [linha({ user_id: OUTRA })] })
    expect(await chamar(deps, 'events', { endpoint: ENDPOINT, events: [] })).toEqual({ status: 404, body: { error: 'not_found' } })
  })
})

describe('unsubscribe (MAN-15, MAN-30)', () => {
  it('existente ⇒ 200, apagando por endpoint E conta', async () => {
    const { deps, supabase } = setup()
    expect(await chamar(deps, 'unsubscribe', { endpoint: ENDPOINT })).toEqual({ status: 200, body: { ok: true } })
    expect(supabase.deletes).toEqual([{ table: 'push_subscriptions', eq: [['endpoint', ENDPOINT], ['user_id', DONA]] }])
  })

  it('ausente ⇒ 200 também (idempotente)', async () => {
    const { deps } = setup({ linhas: [] })
    expect(await chamar(deps, 'unsubscribe', { endpoint: ENDPOINT })).toEqual({ status: 200, body: { ok: true } })
  })

  it('delete que erra ⇒ 500', async () => {
    const { deps } = setup({ supabase: { deleteError: { message: 'x' } } })
    expect((await chamar(deps, 'unsubscribe', { endpoint: ENDPOINT })).status).toBe(500)
  })
})

describe('test (MAN-31, MAN-32, MAN-33)', () => {
  it('sucesso ⇒ `claim_push_test` com a conta e o endpoint, o aviso de teste, e NADA em order_notifications', async () => {
    const { deps, supabase, enviados } = setup()
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 200, body: { ok: true } })
    expect(supabase.rpcs.filter((x) => x.fn === 'claim_push_test').map((x) => x.args)).toEqual([
      { p_user_id: DONA, p_endpoint: ENDPOINT },
    ])
    expect(enviados).toHaveLength(1)
    expect(enviados[0].message).toEqual({ title: 'Avisos ligados', body: 'É assim que os pedidos vão chegar.', url: '/', tag: 'teste' })
    expect(enviados[0].sub).toEqual({ endpoint: ENDPOINT, p256dh: P256DH, auth: AUTH })
    const tocouNotificacoes = [...supabase.inserts, ...supabase.updates, ...supabase.upserts, ...supabase.deletes].some(
      (w) => w.table === 'order_notifications',
    )
    expect(tocouNotificacoes).toBe(false)
    expect(supabase.rpcs.some((x) => x.fn === 'claim_order_notification')).toBe(false)
  })

  it('`claim_push_test` falso ⇒ 429 `cooldown`, nada enviado', async () => {
    const { deps, enviados } = setup({ claim: { data: false } })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 429, body: { error: 'cooldown' } })
    expect(enviados).toHaveLength(0)
  })

  it('endpoint de OUTRA conta ⇒ 404, sem claim e sem envio', async () => {
    const { deps, supabase, enviados } = setup({ linhas: [linha({ user_id: OUTRA, endpoint: ENDPOINT_DA_OUTRA })] })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT_DA_OUTRA })).toEqual({ status: 404, body: { error: 'not_found' } })
    expect(supabase.rpcs.some((x) => x.fn === 'claim_push_test')).toBe(false)
    expect(enviados).toHaveLength(0)
  })

  it('`gone` ⇒ a linha é apagada e 410', async () => {
    const { deps, supabase } = setup({ desfecho: { kind: 'gone', http: 410 } })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 410, body: { error: 'gone' } })
    expect(supabase.deletes).toEqual([{ table: 'push_subscriptions', eq: [['id', 'sub-1']] }])
  })

  it.each([
    [{ kind: 'failed', reason: 'http', http: 500 } as PushOutcome],
    [{ kind: 'failed', reason: 'timeout' } as PushOutcome],
    ['lanca' as const],
  ])('falha %j ⇒ 502 `push_failed`, inscrição mantida', async (desfecho) => {
    const { deps, supabase } = setup({ desfecho })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 502, body: { error: 'push_failed' } })
    expect(supabase.deletes).toEqual([])
  })

  it('sem sender (sem VAPID) ⇒ 503', async () => {
    const { deps } = setup({ semSender: true })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 503, body: { error: 'push_unconfigured' } })
  })

  it('`claim_push_test` que erra ⇒ 500 `db_error`', async () => {
    const { deps, enviados } = setup({ claim: { error: { message: 'x' } } })
    expect(await chamar(deps, 'test', { endpoint: ENDPOINT })).toEqual({ status: 500, body: { error: 'db_error' } })
    expect(enviados).toHaveLength(0)
  })
})

// V02 (Verificador r1, P16): o log é o outro lugar por onde o endpoint pode vazar, e o
// `console.log` acima é silenciado — sem um espião que LEIA o que foi escrito, trocar `host` pelo
// endpoint inteiro em qualquer linha de log passava verde. A régua: nenhuma linha escrita contém o
// caminho do endpoint (nem as chaves), e as linhas de `subscribe` e `test` trazem o host.
describe('o log traz só o host (MAN-26)', () => {
  const escrito = () => (console.log as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c.map(String).join(' '))
  const semSegredo = (linhas: string[]) => {
    expect(linhas.length).toBeGreaterThan(0)
    for (const l of linhas) {
      expect(l).not.toContain('ENDPOINT-DA-DONA-SECRETO')
      expect(l).not.toContain(P256DH)
      expect(l).not.toContain(AUTH)
    }
  }

  it('subscribe ⇒ uma linha com o host, sem o endpoint', async () => {
    const { deps } = setup({ linhas: [] })
    await chamar(deps, 'subscribe', { endpoint: ENDPOINT, keys: { p256dh: P256DH, auth: AUTH } })
    semSegredo(escrito())
    expect(escrito().some((l) => l.includes('"host":"fcm.googleapis.com"'))).toBe(true)
  })

  it.each([
    ['sent', { kind: 'sent' } as PushOutcome],
    ['gone', { kind: 'gone', http: 410 } as PushOutcome],
    ['failed', { kind: 'failed', reason: 'http', http: 500 } as PushOutcome],
  ])('test %s ⇒ a linha do desfecho com o host, sem o endpoint', async (status, desfecho) => {
    const { deps } = setup({ desfecho })
    await chamar(deps, 'test', { endpoint: ENDPOINT })
    semSegredo(escrito())
    expect(escrito().some((l) => l.includes(`"status":"${status}"`) && l.includes('"host":"fcm.googleapis.com"'))).toBe(true)
  })
})

afterAll(() => {
  // MAN-26: o endpoint é credencial de entrega; nenhuma resposta o devolve.
  expect(lidas.length).toBeGreaterThan(60)
  for (const texto of lidas) {
    expect(texto).not.toContain('ENDPOINT-DA-DONA-SECRETO')
    expect(texto).not.toContain('ENDPOINT-DA-OUTRA-SECRETO')
    expect(texto).not.toContain(P256DH)
  }
})
