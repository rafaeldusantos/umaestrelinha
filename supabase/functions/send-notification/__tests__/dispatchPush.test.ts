// Feature 79 (T10) — `forEvent` em duas metades independentes (design §4.2).
//
// Arquivo NOVO de propósito: `dispatch.test.ts` é a régua de que a metade do e-mail continua
// idêntica, e fica sem asserção tocada. Aqui mora só o que a feature acrescenta — a metade do push,
// que roda pelo GATILHO, para os quatro `owner_*`, qualquer que tenha sido o desfecho do e-mail.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, createResendProvider } from '../../../../packages/core/src/notifications/index.ts'
import { createFakeFetch, createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { type NotificationDeps, dispatchEvent, dispatchTrigger } from '../dispatch.ts'
import type { PushSender } from '../push.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const DONA = 'u-dona-0000-4000-8000-000000000001'

const ENV = {
  resendApiKey: 'test-key',
  resendFrom: 'Uma Estrelinha <loja@loja.umaestrelinha.com.br>',
  storePublicUrl: 'https://umaestrelinha.com.br',
  adminPublicUrl: 'https://painel.umaestrelinha.com.br',
}

const pedido = (over: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  order_number: '0244',
  customer_name: 'Mariana Souza',
  customer_email: 'mariana@exemplo.invalid',
  customer_phone: '5551999990000',
  status: 'paid',
  payment_status: 'approved',
  paid_at: '2026-09-07T10:00:00Z',
  mp_order_id: 'ORD-1',
  tracking_code: null,
  shipping_carrier: null,
  shipping_service_id: '1',
  material_status: 'nao_aplicavel',
  material_tracking_code: null,
  subtotal: 189,
  shipping_cost: 0,
  discount: 0,
  pix_discount: 0,
  total: 189,
  address_street: 'Rua das Acácias',
  address_number: '128',
  address_complement: null,
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90000-000',
  order_items: [{ product_name: 'Pingente Gota', size: null, finish: null, quantity: 1, unit_price: 189 }],
  ...over,
})

function settingsRows(ligados: string[], general: Record<string, unknown>, desligados: string[] = []) {
  const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
  for (const e of ligados) events[e].email.enabled = true
  for (const e of desligados) events[e].email.enabled = false
  return [
    { key: 'notifications', value: { events, post_delivery_days: 7 } },
    { key: 'general', value: general },
    { key: 'material', value: {} },
  ]
}

const inscricao = {
  id: 'sub-1',
  user_id: DONA,
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'BP' + 'a'.repeat(85),
  auth: 'segredo-de-16-by',
  events: ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming'],
}

interface Setup {
  order?: Record<string, unknown>
  ligados?: string[]
  desligados?: string[]
  general?: Record<string, unknown>
  env?: Partial<typeof ENV>
  semPush?: boolean
  pushQueLanca?: boolean
}

function setup(o: Setup = {}) {
  const fetchDouble = createFakeFetch([{ match: 'api.resend.com', status: 200, body: { id: 'resend-1' } }])
  const supabase = createFakeSupabase({
    rows: { orders: pedido(o.order ?? {}) },
    lists: {
      store_settings: settingsRows(o.ligados ?? ['owner_order_paid'], o.general ?? { email: 'adri@loja.umaestrelinha.com.br' }, o.desligados ?? []),
      push_subscriptions: [inscricao],
    },
    rpcByFn: {
      has_role: { data: true },
      claim_order_notification: (args) => ({ data: `claim-${args.p_event}-${args.p_channel}` }),
      finish_order_notification: { data: null },
    },
  })
  if (o.pushQueLanca) {
    const from = supabase.client.from
    supabase.client.from = (t: string) => {
      if (t === 'push_subscriptions') throw new Error('bug no ramo push')
      return from(t)
    }
  }
  const enviados: Array<{ title: string }> = []
  const sender: PushSender = {
    send: async (_sub, message) => {
      enviados.push(message)
      return { kind: 'sent' }
    },
  }
  const deps: NotificationDeps = {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: { ...ENV, ...(o.env ?? {}) },
    providers: [createResendProvider({ apiKey: ENV.resendApiKey, from: ENV.resendFrom })],
    ...(o.semPush ? {} : { push: { sender } }),
  }
  return { deps, supabase, enviados, fetchDouble }
}

const doPush = (results: Array<{ channel: string | null }>) => results.filter((r) => r.channel === 'push')

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('MAN-06 — o push sai qualquer que seja o desfecho do e-mail', () => {
  it('remetente MALFORMADO: o e-mail sai `invalid_from` E o push sai', async () => {
    const { deps, enviados } = setup({ env: { resendFrom: 'não é remetente' } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    const dona = results.filter((r) => r.event === 'owner_order_paid')
    expect(dona).toEqual([
      { ok: false, event: 'owner_order_paid', channel: 'email', reason: 'invalid_from' },
      { ok: true, event: 'owner_order_paid', channel: 'push', id: 'push:1/1' },
    ])
    expect(enviados.map((m) => m.title)).toEqual(['Pedido #0244 pago'])
  })

  it('e-mail da dona VAZIO: `no_owner_contact` no e-mail e o push sai', async () => {
    const { deps, enviados } = setup({ general: { email: '' } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.filter((r) => r.event === 'owner_order_paid')).toEqual([
      { ok: false, event: 'owner_order_paid', channel: null, precondition: 'no_owner_contact' },
      { ok: true, event: 'owner_order_paid', channel: 'push', id: 'push:1/1' },
    ])
    expect(enviados).toHaveLength(1)
  })

  it('e-mail DESLIGADO: `disabled` e o push sai', async () => {
    const { deps, enviados } = setup({ ligados: [], desligados: ['owner_order_paid'] })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.filter((r) => r.event === 'owner_order_paid')).toEqual([
      { ok: false, event: 'owner_order_paid', channel: 'email', skipped: 'disabled' },
      { ok: true, event: 'owner_order_paid', channel: 'push', id: 'push:1/1' },
    ])
    expect(enviados).toHaveLength(1)
  })

  it('estado ERRADO (não pago): nenhum dos dois, e o push nem lê inscrição', async () => {
    const { deps, enviados, supabase } = setup({ order: { paid_at: null } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.filter((r) => r.event === 'owner_order_paid')).toEqual([
      { ok: false, event: 'owner_order_paid', channel: null, precondition: 'order_not_paid' },
      { ok: false, event: 'owner_order_paid', channel: 'push', precondition: 'order_not_paid' },
    ])
    expect(enviados).toHaveLength(0)
    expect(supabase.reads.filter((r) => r.table === 'push_subscriptions')).toHaveLength(0)
  })

  it('`invalid_from` + estado errado juntos: o e-mail diz `invalid_from`, como antes', async () => {
    const { deps, enviados } = setup({ env: { resendFrom: 'x' }, order: { paid_at: null } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.filter((r) => r.event === 'owner_order_paid')).toEqual([
      { ok: false, event: 'owner_order_paid', channel: 'email', reason: 'invalid_from' },
      { ok: false, event: 'owner_order_paid', channel: 'push', precondition: 'order_not_paid' },
    ])
    expect(enviados).toHaveLength(0)
  })
})

describe('MAN-38 / MAN-01 — onde a metade do push existe', () => {
  it('o REENVIO (`dispatchEvent`) de um `owner_*` nunca chega ao push', async () => {
    const { deps, enviados, supabase } = setup()
    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'owner_order_paid' })

    expect(doPush(r)).toEqual([])
    expect(enviados).toHaveLength(0)
    expect(supabase.reads.filter((x) => x.table === 'push_subscriptions')).toHaveLength(0)
  })

  it('evento da CLIENTE não tem push: só o `owner_*` do gatilho chama o sender', async () => {
    const { deps, enviados } = setup()
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(doPush(results).map((r) => (r as { event: string }).event)).toEqual(['owner_order_paid'])
    expect(enviados).toHaveLength(1)
  })

  it('gatilho só da cliente (pedido enviado) ⇒ zero chamadas de push', async () => {
    const { deps, enviados } = setup({ ligados: ['order_shipped'], order: { status: 'shipped', tracking_code: 'AA1BR' } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed' })

    expect(doPush(results)).toEqual([])
    expect(enviados).toHaveLength(0)
  })

  it('a ordem no relatório: o e-mail do evento ANTES do push do evento', async () => {
    const { deps } = setup()
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.map((r) => [r.event, r.channel])).toEqual([
      ['order_paid', 'email'],
      ['owner_order_paid', 'email'],
      ['owner_order_paid', 'push'],
    ])
  })

  // V01 (Verificador r1, F14): a ordem do RELATÓRIO acima é verdadeira também com o push rodando
  // antes e o resultado empilhado depois. A régua é temporal: no instante em que o aviso sai, o
  // e-mail da dona do mesmo evento já tem de ter ido ao Resend — é o que faz o push ser o último a
  // gastar o orçamento do caixa (design §4.2, `MAN-19`).
  it('o push sai DEPOIS do e-mail da dona: no instante do envio, o Resend já recebeu o e-mail dela', async () => {
    const { deps, fetchDouble } = setup()
    const paraADonaNoEnvio: number[] = []
    deps.push = {
      sender: {
        send: async () => {
          paraADonaNoEnvio.push(
            fetchDouble.calls.filter((c) => JSON.stringify(c.body?.to ?? '').includes('adri@loja.umaestrelinha.com.br')).length,
          )
          return { kind: 'sent' }
        },
      },
    }
    await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(paraADonaNoEnvio).toEqual([1])
  })

  it('`pix_created` ⇒ o push de `owner_order_received`', async () => {
    const { deps, enviados } = setup({
      ligados: ['owner_order_received'],
      order: { status: 'pending', payment_status: 'pending', paid_at: null },
    })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'pix_created' })

    expect(doPush(results)).toEqual([{ ok: true, event: 'owner_order_received', channel: 'push', id: 'push:1/1' }])
    expect(enviados.map((m) => m.title)).toEqual(['Pedido #0244 recebido'])
  })

  it('sem `push` nas deps: o relatório é o de antes (fora da lista de canais) e nada é lido', async () => {
    const { deps, supabase } = setup({ semPush: true })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(doPush(results)).toEqual([])
    expect(results.map((r) => r.event)).toEqual(['order_paid', 'owner_order_paid'])
    expect(supabase.reads.filter((x) => x.table === 'push_subscriptions')).toHaveLength(0)
  })
})

describe('AD-008 — uma exceção no ramo push não leva o relatório junto', () => {
  it('`deliverPush` que lança ⇒ `unexpected_error` em `channel: push`, e os e-mails continuam no relatório', async () => {
    const { deps, fetchDouble } = setup({ pushQueLanca: true })
    const r = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(r.orderFound).toBe(true)
    expect(r.results).toEqual([
      { ok: true, event: 'order_paid', channel: 'email', id: 'resend-1' },
      { ok: true, event: 'owner_order_paid', channel: 'email', id: 'resend-1' },
      { ok: false, event: 'owner_order_paid', channel: 'push', reason: 'unexpected_error' },
    ])
    expect(fetchDouble.calls).toHaveLength(2)
  })
})
