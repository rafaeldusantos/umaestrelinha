// Feature 88 (T06) — o motor pula os e-mails da cliente (`AVS-04`, `AVS-10`, `AVS-11`, `AVS-24`, `A-04`).
//
// Arquivo NOVO de propósito, no molde de `dispatchPush.test.ts`: `dispatch.test.ts` é a régua de que
// o motor SEM a opção continua idêntico (listas exatas de eventos), e fica sem asserção tocada. Aqui
// mora só o que a `88` acrescenta: com `customer: false`, cada e-mail da cliente que TERIA saído vira
// `skip_order_notification` (nenhuma chamada ao provedor), e os avisos à dona saem como sempre.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, createResendProvider } from '../../../../packages/core/src/notifications/index.ts'
import { createFakeFetch, createFakeSupabase } from '../../_shared/testing/fakes.ts'
import { type NotificationDeps, dispatchTrigger } from '../dispatch.ts'
import type { PushSender } from '../push.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const SKIP_ID = '5c1p0000-0000-4000-8000-000000000001'
const EMAIL_DA_CLIENTE = 'mariana@exemplo.invalid'
const EMAIL_DA_DONA = 'adri@loja.umaestrelinha.com.br'

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
  customer_email: EMAIL_DA_CLIENTE,
  customer_phone: '5551999990000',
  status: 'shipped',
  payment_status: 'approved',
  paid_at: '2026-09-07T10:00:00Z',
  mp_order_id: 'ORD-1',
  tracking_code: 'BR123456789BR',
  shipping_carrier: 'Correios',
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

/** O envelope chegando: o gatilho que produz um evento da CLIENTE e um da DONA. */
const ENVELOPE = { status: 'paid', tracking_code: null, material_status: 'material_enviado', material_tracking_code: 'AA123456789BR' }

function settingsRows(ligados: string[], desligados: string[] = []) {
  const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
  for (const e of ligados) events[e].email.enabled = true
  for (const e of desligados) events[e].email.enabled = false
  return [
    { key: 'notifications', value: { events, post_delivery_days: 7 } },
    { key: 'general', value: { email: EMAIL_DA_DONA } },
    { key: 'material', value: {} },
  ]
}

interface Setup {
  order?: Record<string, unknown>
  ligados?: string[]
  desligados?: string[]
  skip?: { data?: unknown; error?: unknown }
  comPush?: boolean
}

function setup(o: Setup = {}) {
  const fetchDouble = createFakeFetch([{ match: 'api.resend.com', status: 200, body: { id: 'resend-1' } }])
  const supabase = createFakeSupabase({
    rows: { orders: pedido(o.order ?? {}) },
    lists: {
      store_settings: settingsRows(o.ligados ?? [], o.desligados ?? []),
      push_subscriptions: [
        {
          id: 'sub-1',
          user_id: 'u-dona',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
          p256dh: 'BP' + 'a'.repeat(85),
          auth: 'segredo-de-16-by',
          events: ['owner_material_incoming'],
        },
      ],
    },
    rpcByFn: {
      // O ramo do celular confere o papel de quem é dona de cada aparelho (feature `79`).
      has_role: { data: true },
      claim_order_notification: (args) => ({ data: `claim-${args.p_event}-${args.p_channel}` }),
      finish_order_notification: { data: null },
      skip_order_notification: o.skip ?? { data: SKIP_ID },
    },
  })
  const avisosNoCelular: Array<{ title: string }> = []
  const sender: PushSender = {
    send: async (_sub, message) => {
      avisosNoCelular.push(message)
      return { kind: 'sent' }
    },
  }
  const deps: NotificationDeps = {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: ENV,
    providers: [createResendProvider({ apiKey: ENV.resendApiKey, from: ENV.resendFrom })],
    ...(o.comPush ? { push: { sender } } : {}),
  }
  return { deps, supabase, fetchDouble, avisosNoCelular }
}

const rpcsDe = (s: ReturnType<typeof createFakeSupabase>, fn: string) => s.rpcs.filter((r) => r.fn === fn)

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

describe('customer: false — o e-mail da cliente que TERIA saído vira `skipped` (AVS-04, AVS-10)', () => {
  it('"Pedido postado": `skip_order_notification` com pedido, evento e canal, e NENHUMA chamada ao provedor', async () => {
    const { deps, supabase, fetchDouble } = setup()
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    expect(rpcsDe(supabase, 'skip_order_notification').map((r) => r.args)).toEqual([
      { p_order_id: ORDER_ID, p_event: 'order_shipped', p_channel: 'email' },
    ])
    expect(rpcsDe(supabase, 'claim_order_notification')).toEqual([])
    expect(fetchDouble.calls).toHaveLength(0)
    expect(results).toEqual([{ ok: false, event: 'order_shipped', channel: 'email', skipped: 'admin_opt_out' }])
  })

  it('o aviso à DONA do mesmo gatilho sai normalmente (A-04): e-mail para a dona, só ela no provedor', async () => {
    const { deps, supabase, fetchDouble } = setup({
      order: ENVELOPE,
      ligados: ['material_tracking_registered', 'owner_material_incoming'],
    })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'material_tracking_set', customer: false })

    expect(rpcsDe(supabase, 'skip_order_notification').map((r) => r.args)).toEqual([
      { p_order_id: ORDER_ID, p_event: 'material_tracking_registered', p_channel: 'email' },
    ])
    expect(rpcsDe(supabase, 'claim_order_notification').map((r) => r.args)).toEqual([
      { p_order_id: ORDER_ID, p_event: 'owner_material_incoming', p_channel: 'email' },
    ])
    expect(fetchDouble.calls).toHaveLength(1)
    expect(fetchDouble.calls[0].body.to).toBe(EMAIL_DA_DONA)
    expect(results).toEqual([
      { ok: false, event: 'material_tracking_registered', channel: 'email', skipped: 'admin_opt_out' },
      { ok: true, event: 'owner_material_incoming', channel: 'email', id: 'resend-1' },
    ])
  })

  it('e o aviso à dona no CELULAR também sai, quando o canal existe', async () => {
    const { deps, avisosNoCelular } = setup({
      order: ENVELOPE,
      ligados: ['material_tracking_registered', 'owner_material_incoming'],
      comPush: true,
    })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'material_tracking_set', customer: false })

    expect(avisosNoCelular).toHaveLength(1)
    expect(results.filter((r) => r.channel === 'push')).toEqual([
      { ok: true, event: 'owner_material_incoming', channel: 'push', id: 'push:1/1' },
    ])
  })
})

describe('customer: false — o que NÃO sairia não grava nada (AVS-10)', () => {
  it('evento DESLIGADO: nem RPC nem envio', async () => {
    const { deps, supabase, fetchDouble } = setup({ desligados: ['order_shipped'] })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    expect(supabase.rpcs).toEqual([])
    expect(fetchDouble.calls).toHaveLength(0)
    expect(results).toEqual([{ ok: false, event: 'order_shipped', channel: 'email', skipped: 'disabled' }])
  })

  it('pré-condição falhando (enviado sem rastreio): nem RPC nem envio', async () => {
    const { deps, supabase, fetchDouble } = setup({ order: { tracking_code: null } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    expect(supabase.rpcs).toEqual([])
    expect(fetchDouble.calls).toHaveLength(0)
    expect(results).toEqual([{ ok: false, event: 'order_shipped', channel: null, precondition: 'no_tracking_code' }])
  })

  it('sem e-mail da cliente: nem RPC nem envio', async () => {
    const { deps, supabase, fetchDouble } = setup({ order: { customer_email: '  ' } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    expect(supabase.rpcs).toEqual([])
    expect(fetchDouble.calls).toHaveLength(0)
    expect(results).toEqual([{ ok: false, event: 'order_shipped', channel: 'email', skipped: 'no_email' }])
  })
})

describe('customer: false — os desfechos da RPC', () => {
  it('RPC devolvendo `null` (a linha já é `sent`, ou `pending`) ⇒ `skipped: already_sent`, sem envio', async () => {
    const { deps, fetchDouble } = setup({ skip: { data: null } })
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    expect(fetchDouble.calls).toHaveLength(0)
    expect(results).toEqual([{ ok: false, event: 'order_shipped', channel: 'email', skipped: 'already_sent' }])
  })

  it('RPC com erro ⇒ `reason: skip_failed`, sem lançar, sem envio — e a dona ainda é avisada', async () => {
    const { deps, fetchDouble } = setup({
      order: ENVELOPE,
      ligados: ['material_tracking_registered', 'owner_material_incoming'],
      skip: { data: null, error: { message: 'connection reset' } },
    })
    const report = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'material_tracking_set', customer: false })

    expect(report.orderFound).toBe(true)
    expect(report.results[0]).toEqual({ ok: false, event: 'material_tracking_registered', channel: 'email', reason: 'skip_failed' })
    expect(fetchDouble.calls.map((c) => c.body.to)).toEqual([EMAIL_DA_DONA])
  })
})

describe('sem a opção, o motor de sempre (AVS-03, AVS-24)', () => {
  it.each([
    ['ausente', undefined],
    ['`true`', true],
  ])('`customer` %s ⇒ claim, envio à cliente, e nenhuma chamada ao skip', async (_rotulo, customer) => {
    const { deps, supabase, fetchDouble } = setup()
    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer })

    expect(rpcsDe(supabase, 'skip_order_notification')).toEqual([])
    expect(rpcsDe(supabase, 'claim_order_notification').map((r) => r.args)).toEqual([
      { p_order_id: ORDER_ID, p_event: 'order_shipped', p_channel: 'email' },
    ])
    expect(fetchDouble.calls.map((c) => c.body.to)).toEqual([EMAIL_DA_CLIENTE])
    expect(results).toEqual([{ ok: true, event: 'order_shipped', channel: 'email', id: 'resend-1' }])
  })
})

describe('o log do pulo (Observabilidade)', () => {
  it('registra `skipped: admin_opt_out` com pedido e evento — sem o e-mail nem o texto da cliente', async () => {
    const { deps } = setup()
    await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed', customer: false })

    const linhas = logs.map((l) => JSON.parse(l) as Record<string, unknown>)
    expect(linhas).toContainEqual({
      action: 'send-notification',
      order_id: ORDER_ID,
      event: 'order_shipped',
      channel: 'email',
      status: 'skipped',
      skipped: 'admin_opt_out',
    })
    const tudo = logs.join('\n')
    expect(tudo).not.toContain(EMAIL_DA_CLIENTE)
    expect(tudo).not.toContain('Mariana')
  })
})
