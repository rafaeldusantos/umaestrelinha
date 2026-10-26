// Feature 79 (T09) — o ramo do aviso no celular do motor, `deliverPush`, com dublês (`AD-004`).
//
// Um caso por passo de §4.2 do design. O dublê do client REGISTRA tabela, filtro, RPC e argumentos:
// a lista de inscrições é devolvida por uma fixtura que OBEDECE o `.contains('events', …)` lido, e
// só por isso "o aparelho com o evento desligado não recebe" (`MAN-02`) é auditável — um dublê que
// devolvesse a lista inteira aprovaria a leitura sem o filtro.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase, type ReadCall } from '../../_shared/testing/fakes.ts'
import { type PushOutcome, type PushSender, type PushTarget, deliverPush } from '../push.ts'

const ORDER = {
  id: 'b3c1d2e4-0000-4000-8000-000000000244',
  order_number: '0244',
  total: 189,
}
const NBSP = ' '
const CLAIM_ID = 'c1a1m000-0000-4000-8000-000000000079'

const DONA = 'u-dona-0000-4000-8000-000000000001'
const OUTRA = 'u-outra-000-4000-8000-000000000002'

const P256DH = 'BP' + 'a'.repeat(85)
const AUTH = 'segredo-de-16-by'

interface Linha {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  events: string[]
}

const todos = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']

const linha = (id: string, over: Partial<Linha> = {}): Linha => ({
  id,
  user_id: DONA,
  endpoint: `https://fcm.googleapis.com/fcm/send/ENDPOINT-SECRETO-${id}`,
  p256dh: P256DH,
  auth: AUTH,
  events: [...todos],
  ...over,
})

/** A fixtura obedece o `contains` registrado, como o PostgREST faria com `events @> {…}`. */
const listaQueObedece = (linhas: Linha[]) => (_eqs: unknown, _select: string, read: ReadCall) => {
  let saida = linhas
  for (const [col, valor] of read.contains) {
    saida = saida.filter((l) => (valor as string[]).every((v) => (l as unknown as Record<string, string[]>)[col].includes(v)))
  }
  return saida
}

interface SetupOptions {
  linhas?: Linha[]
  /** `has_role` por usuário: true, false, null (resposta sem erro e sem booleano) ou 'erro'. Ausente ⇒ true. */
  papel?: Record<string, boolean | null | 'erro'>
  claim?: { data?: unknown; error?: unknown } | ((args: Record<string, unknown>) => { data?: unknown; error?: unknown })
  desfecho?: (sub: PushTarget) => PushOutcome | Promise<PushOutcome>
  semPush?: boolean
  listError?: unknown
}

function setup(o: SetupOptions = {}) {
  const enviados: Array<{ sub: PushTarget; message: unknown; ctx: { timeoutMs: number } }> = []
  const sender: PushSender = {
    send: async (sub, message, ctx) => {
      enviados.push({ sub, message, ctx })
      return o.desfecho ? await o.desfecho(sub) : { kind: 'sent' }
    },
  }
  const supabase = createFakeSupabase({
    lists: { push_subscriptions: listaQueObedece(o.linhas ?? [linha('a')]) },
    ...(o.listError ? { listErrorByTable: { push_subscriptions: o.listError } } : {}),
    rpcByFn: {
      has_role: (args) => {
        const v = o.papel && String(args._user_id) in o.papel ? o.papel[String(args._user_id)] : true
        return v === 'erro' ? { error: { message: 'boom' } } : { data: v }
      },
      claim_order_notification: o.claim ?? { data: CLAIM_ID },
      finish_order_notification: { data: null },
    },
  })
  const deps = { supabase: supabase.client, ...(o.semPush ? {} : { push: { sender } }) }
  return { deps, supabase, enviados }
}

const longe = () => Date.now() + 8000
const claims = (s: ReturnType<typeof createFakeSupabase>) => s.rpcs.filter((r) => r.fn === 'claim_order_notification')
const finishes = (s: ReturnType<typeof createFakeSupabase>) => s.rpcs.filter((r) => r.fn === 'finish_order_notification')
const apagados = (s: ReturnType<typeof createFakeSupabase>) =>
  s.deletes.filter((d) => d.table === 'push_subscriptions').flatMap((d) => (d.in ?? []).flatMap(([, ids]) => ids))

let logs: string[] = []
beforeEach(() => {
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('deliverPush — os passos de §4.2', () => {
  it('1. sem `push` nas deps ⇒ `no_provider`, e nada é lido nem reivindicado (MAN-37)', async () => {
    const { deps, supabase } = setup({ semPush: true })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', skipped: 'no_provider' })
    expect(supabase.reads).toHaveLength(0)
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('2. a leitura pede `events` CONTENDO o evento, com as colunas nomeadas (MAN-02)', async () => {
    const { deps, supabase } = setup()
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    const leitura = supabase.reads.find((r) => r.table === 'push_subscriptions')
    expect(leitura.contains).toEqual([['events', ['owner_order_paid']]])
    expect(leitura.select).toBe('id, user_id, endpoint, p256dh, auth')
  })

  it('2. o aparelho com o evento DESLIGADO não recebe; o outro, com ele ligado, recebe (MAN-02)', async () => {
    const { deps, enviados } = setup({
      linhas: [linha('desligado', { events: ['owner_order_received'] }), linha('ligado')],
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados.map((e) => e.sub.endpoint)).toEqual([linha('ligado').endpoint])
    expect(r).toEqual({ ok: true, event: 'owner_order_paid', channel: 'push', id: 'push:1/1' })
  })

  it('2. leitura que erra ⇒ falha sem claim', async () => {
    const { deps, supabase, enviados } = setup({ listError: { message: 'down' } })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', reason: 'subscriptions_read_failed' })
    expect(claims(supabase)).toHaveLength(0)
    expect(enviados).toHaveLength(0)
  })

  it('3. dono SEM papel ⇒ as inscrições dele são apagadas e não recebem; o admin recebe (MAN-18)', async () => {
    const { deps, supabase, enviados } = setup({
      linhas: [linha('dela'), linha('ex1', { user_id: OUTRA }), linha('ex2', { user_id: OUTRA })],
      papel: { [OUTRA]: false },
    })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados.map((e) => e.sub.endpoint)).toEqual([linha('dela').endpoint])
    expect(apagados(supabase).sort()).toEqual(['ex1', 'ex2'])
  })

  it('3. `has_role` perguntado UMA vez por usuário distinto, com o papel admin', async () => {
    const { deps, supabase } = setup({
      linhas: [linha('a'), linha('b'), linha('c', { user_id: OUTRA })],
    })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(supabase.rpcs.filter((r) => r.fn === 'has_role').map((r) => r.args)).toEqual([
      { _user_id: DONA, _role: 'admin' },
      { _user_id: OUTRA, _role: 'admin' },
    ])
  })

  it('3. `has_role` que ERRA ⇒ aquele dono nem recebe nem é apagado; o outro recebe', async () => {
    const { deps, supabase, enviados } = setup({
      linhas: [linha('instavel', { user_id: OUTRA }), linha('dela')],
      papel: { [OUTRA]: 'erro' },
    })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados.map((e) => e.sub.endpoint)).toEqual([linha('dela').endpoint])
    expect(apagados(supabase)).toEqual([])
    expect(logs.some((l) => l.includes('admin_check_failed'))).toBe(true)
  })

  // V05 (Verificador r1, F11): só `true` é admin. Uma resposta sem erro e sem booleano (null) não
  // pode virar permissão de envio — `!== false` no lugar de `=== true` mandaria o aviso.
  it('3. `has_role` que responde null ⇒ aquele dono não recebe; o outro recebe', async () => {
    const { deps, enviados } = setup({
      linhas: [linha('nulo', { user_id: OUTRA }), linha('dela')],
      papel: { [OUTRA]: null },
    })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados.map((e) => e.sub.endpoint)).toEqual([linha('dela').endpoint])
  })

  it('4. endpoint fora da lista de hosts ⇒ apagado, não enviado (MAN-25)', async () => {
    const { deps, supabase, enviados } = setup({
      linhas: [linha('fora', { endpoint: 'https://evil.example.com/push/x' }), linha('ok')],
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados.map((e) => e.sub.endpoint)).toEqual([linha('ok').endpoint])
    expect(apagados(supabase)).toEqual(['fora'])
    expect(r).toMatchObject({ ok: true, id: 'push:1/1' })
  })

  it('5. zero elegíveis ⇒ `no_device` e NENHUM claim (MAN-20)', async () => {
    const { deps, supabase, enviados } = setup({ linhas: [linha('x', { events: ['owner_order_received'] })] })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', skipped: 'no_device' })
    expect(claims(supabase)).toHaveLength(0)
    expect(enviados).toHaveLength(0)
  })

  it('5. só inscrições de conta sem papel ⇒ `no_device`, sem claim, e elas apagadas', async () => {
    const { deps, supabase } = setup({ linhas: [linha('ex', { user_id: OUTRA })], papel: { [OUTRA]: false } })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toMatchObject({ skipped: 'no_device' })
    expect(claims(supabase)).toHaveLength(0)
    expect(apagados(supabase)).toEqual(['ex'])
  })

  it('6. o claim é por (pedido, evento, canal push)', async () => {
    const { deps, supabase } = setup()
    await deliverPush(deps, 'owner_order_received', ORDER, longe())
    expect(claims(supabase).map((c) => c.args)).toEqual([
      { p_order_id: ORDER.id, p_event: 'owner_order_received', p_channel: 'push' },
    ])
  })

  it('6. claim nulo ⇒ `already_sent` e ZERO envios (MAN-05)', async () => {
    const { deps, enviados, supabase } = setup({ claim: { data: null } })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', skipped: 'already_sent' })
    expect(enviados).toHaveLength(0)
    expect(finishes(supabase)).toHaveLength(0)
  })

  it('6. claim que erra ⇒ `claim_failed` e zero envios', async () => {
    const { deps, enviados } = setup({ claim: { error: { message: 'x' } } })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toMatchObject({ ok: false, reason: 'claim_failed' })
    expect(enviados).toHaveLength(0)
  })

  it('7. orçamento curto ⇒ `budget_exhausted`, com finish e zero envios (MAN-19)', async () => {
    const { deps, supabase, enviados } = setup()
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, Date.now() + 100)
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', reason: 'budget_exhausted' })
    expect(enviados).toHaveLength(0)
    const f = finishes(supabase)
    expect(f).toHaveLength(1)
    expect(f[0].args.p_id).toBe(CLAIM_ID)
    expect(String(f[0].args.p_error)).toMatch(/^budget_exhausted: restavam/)
  })

  it('8. cada envio recebe o tempo que sobra do orçamento', async () => {
    const { deps, enviados } = setup()
    await deliverPush(deps, 'owner_order_paid', ORDER, Date.now() + 3000)
    expect(enviados[0].ctx.timeoutMs).toBeGreaterThan(2500)
    expect(enviados[0].ctx.timeoutMs).toBeLessThanOrEqual(3000)
  })

  it('9. 2 de 3 entregues ⇒ finish com `p_error = null` e `push:2/3`; o resultado é ok (MAN-09)', async () => {
    const { deps, supabase } = setup({
      linhas: [linha('a'), linha('b'), linha('c')],
      desfecho: (sub) => (sub.endpoint.endsWith('-b') ? { kind: 'failed', reason: 'http', http: 429 } : { kind: 'sent' }),
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(finishes(supabase).map((f) => f.args)).toEqual([
      { p_id: CLAIM_ID, p_provider_message_id: 'push:2/3', p_error: null },
    ])
    expect(r).toEqual({ ok: true, event: 'owner_order_paid', channel: 'push', id: 'push:2/3' })
  })

  it('9. 0 de 2 ⇒ finish com `p_error` com o resumo dos motivos, e o resultado é falha', async () => {
    const { deps, supabase } = setup({
      linhas: [linha('a'), linha('b')],
      desfecho: (sub) =>
        sub.endpoint.endsWith('-a') ? { kind: 'failed', reason: 'http', http: 500 } : { kind: 'failed', reason: 'timeout' },
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(finishes(supabase).map((f) => f.args)).toEqual([
      { p_id: CLAIM_ID, p_provider_message_id: null, p_error: 'push:0/2 — http_500, timeout' },
    ])
    expect(r).toEqual({ ok: false, event: 'owner_order_paid', channel: 'push', reason: 'push_failed' })
  })

  it('8. `gone` ⇒ a linha é apagada e as outras seguem enviadas (MAN-04)', async () => {
    const { deps, supabase, enviados } = setup({
      linhas: [linha('morta'), linha('viva')],
      desfecho: (sub) => (sub.endpoint.endsWith('-morta') ? { kind: 'gone', http: 410 } : { kind: 'sent' }),
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados).toHaveLength(2)
    expect(apagados(supabase)).toEqual(['morta'])
    expect(r).toMatchObject({ ok: true, id: 'push:1/2' })
  })

  it('8. `failed` NÃO apaga a inscrição (MAN-07)', async () => {
    const { deps, supabase } = setup({ desfecho: () => ({ kind: 'failed', reason: 'http', http: 429 }) })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(apagados(supabase)).toEqual([])
  })

  it('8. um sender que LANÇA conta como falha daquele aparelho, sem derrubar o ramo', async () => {
    const { deps, supabase } = setup({
      linhas: [linha('a'), linha('b')],
      desfecho: (sub) => {
        if (sub.endpoint.endsWith('-a')) throw new Error('bug')
        return { kind: 'sent' }
      },
    })
    const r = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r).toMatchObject({ ok: true, id: 'push:1/2' })
    expect(finishes(supabase)).toHaveLength(1)
  })

  it('8. `sent` ⇒ `last_used_at` gravado só nas entregues', async () => {
    const { deps, supabase } = setup({
      linhas: [linha('a'), linha('b')],
      desfecho: (sub) => (sub.endpoint.endsWith('-a') ? { kind: 'sent' } : { kind: 'failed', reason: 'timeout' }),
    })
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    const u = supabase.updates.filter((x) => x.table === 'push_subscriptions')
    expect(u).toHaveLength(1)
    expect(Object.keys(u[0].values)).toEqual(['last_used_at'])
    expect(Number.isNaN(Date.parse(String(u[0].values.last_used_at)))).toBe(false)
    expect(u[0].in).toEqual([['id', ['a']]])
  })

  it('a mensagem enviada é a de MAN-08, por extenso', async () => {
    const { deps, enviados } = setup()
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados[0].message).toEqual({
      title: 'Pedido #0244 pago',
      body: `R$${NBSP}189,00`,
      url: `/pedidos/${ORDER.id}`,
      tag: `pedido-${ORDER.id}-owner_order_paid`,
    })
    expect(enviados[0].sub).toEqual({ endpoint: linha('a').endpoint, p256dh: P256DH, auth: AUTH })
  })
})

describe('deliverPush — a retentativa, com o claim de verdade (MAN-05, MAN-07)', () => {
  /** A semântica de `claim_order_notification`/`finish_order_notification` da migration `42`. */
  function memoria() {
    const estado = new Map<string, 'pending' | 'sent' | 'failed'>()
    return {
      claim: (args: Record<string, unknown>) => {
        const chave = `${args.p_order_id}|${args.p_event}|${args.p_channel}`
        if (estado.get(chave) === 'sent') return { data: null }
        estado.set(chave, 'pending')
        return { data: chave }
      },
      finish: (args: Record<string, unknown>) => {
        estado.set(String(args.p_id), args.p_error === null ? 'sent' : 'failed')
        return { data: null }
      },
    }
  }

  it('linha `failed` ⇒ o claim a devolve de novo, a retentativa envia; depois de `sent`, nada mais', async () => {
    const m = memoria()
    let falhar = true
    const enviados: string[] = []
    const sender: PushSender = {
      send: async (sub) => {
        enviados.push(sub.endpoint)
        return falhar ? { kind: 'failed', reason: 'http', http: 503 } : { kind: 'sent' }
      },
    }
    const supabase = createFakeSupabase({
      lists: { push_subscriptions: listaQueObedece([linha('a'), linha('b')]) },
      rpcByFn: { has_role: { data: true }, claim_order_notification: m.claim, finish_order_notification: m.finish },
    })
    const deps = { supabase: supabase.client, push: { sender } }

    const r1 = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r1).toMatchObject({ ok: false, reason: 'push_failed' })
    // Exatamente UMA chamada por aparelho — sem retentativa dentro do mesmo envio (MAN-07).
    expect(enviados).toEqual([linha('a').endpoint, linha('b').endpoint])

    falhar = false
    const r2 = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r2).toMatchObject({ ok: true, id: 'push:2/2' })
    expect(enviados).toHaveLength(4)

    const r3 = await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(r3).toMatchObject({ ok: false, skipped: 'already_sent' })
    expect(enviados).toHaveLength(4)
  })

  it('uma entrega PARCIAL fecha `sent`: a retentativa não manda de novo a quem já recebeu (MAN-01)', async () => {
    const m = memoria()
    const enviados: string[] = []
    const sender: PushSender = {
      send: async (sub) => {
        enviados.push(sub.endpoint)
        return sub.endpoint.endsWith('-a') ? { kind: 'sent' } : { kind: 'failed', reason: 'timeout' }
      },
    }
    const supabase = createFakeSupabase({
      lists: { push_subscriptions: listaQueObedece([linha('a'), linha('b')]) },
      rpcByFn: { has_role: { data: true }, claim_order_notification: m.claim, finish_order_notification: m.finish },
    })
    const deps = { supabase: supabase.client, push: { sender } }
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    await deliverPush(deps, 'owner_order_paid', ORDER, longe())
    expect(enviados).toHaveLength(2)
  })
})

describe('deliverPush — o log traz só hosts (MAN-26)', () => {
  it('nenhuma linha de log contém o endpoint inteiro nem as chaves, em sucesso e em falha', async () => {
    const linhas = [linha('a'), linha('b'), linha('fora', { endpoint: 'https://evil.example.com/push/SEGREDO' })]
    for (const desfecho of [
      () => ({ kind: 'sent' }) as PushOutcome,
      () => ({ kind: 'failed', reason: 'http', http: 500 }) as PushOutcome,
    ]) {
      logs = []
      const { deps } = setup({ linhas, desfecho })
      await deliverPush(deps, 'owner_order_paid', ORDER, longe())
      expect(logs.length).toBeGreaterThan(0)
      for (const l of logs) {
        for (const x of linhas) expect(l).not.toContain(x.endpoint)
        expect(l).not.toContain('ENDPOINT-SECRETO')
        expect(l).not.toContain('SEGREDO')
        expect(l).not.toContain(P256DH)
        expect(l).not.toContain(AUTH)
      }
      const final = JSON.parse(logs[logs.length - 1])
      expect(final).toMatchObject({ channel: 'push', order_id: ORDER.id, event: 'owner_order_paid', total: 2 })
      expect(final.hosts).toEqual(['fcm.googleapis.com', 'fcm.googleapis.com'])
    }
  })
})
