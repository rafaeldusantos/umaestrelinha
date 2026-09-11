// O motor (`dispatch.ts`), com dublês — `AD-004`. Cobre o que a spec exige do NTF-04 ao NTF-07 e a
// bifurcação da aprovação (NTF-10), que é a razão de o gatilho existir.
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_NOTIFICATIONS,
  type NotificationProvider,
  createResendProvider,
} from '../../../../packages/core/src/notifications/index.ts'
import { createFakeFetch, createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { type NotificationDeps, dispatchEvent, dispatchTrigger } from '../dispatch.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const CLAIM_ID = 'c1a1m0000-0000-4000-8000-000000000001'

const ENV = {
  resendApiKey: 'test-key',
  resendFrom: 'Uma Estrelinha <loja@loja.umaestrelinha.com.br>',
  storePublicUrl: 'https://umaestrelinha.com.br',
  adminPublicUrl: 'https://painel.umaestrelinha.com.br',
}

const baseOrder = (over: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  order_number: 'UE-0042',
  customer_name: 'Mariana Souza',
  customer_email: 'mariana@exemplo.invalid',
  customer_phone: '5551999990000',
  status: 'pending',
  payment_status: 'approved',
  paid_at: '2026-09-07T10:00:00Z',
  mp_order_id: 'ORD-1',
  tracking_code: null,
  shipping_carrier: null,
  material_status: 'nao_aplicavel',
  material_tracking_code: null,
  subtotal: 249,
  shipping_cost: 24.9,
  discount: 0,
  pix_discount: 0,
  total: 273.9,
  address_street: 'Rua das Acácias',
  address_number: '128',
  address_complement: null,
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90000-000',
  order_items: [{ product_name: 'Pingente Gota', size: null, finish: null, quantity: 1, unit_price: 249 }],
  ...over,
})

/**
 * `store_settings` sobre os defaults, com os eventos do caso ligados ou desligados.
 *
 * `desligados` existe porque os quatro LEGADOS nascem ligados (`PNL-06`): para exercitar o caminho
 * "a dona desligou", é preciso desligar de propósito — passar uma lista vazia de `ligados` deixa
 * `order_paid` ligado, e o teste mediria o oposto do que diz medir.
 */
function settingsRows(
  ligados: string[] = [],
  general: Record<string, unknown> = { email: 'adri@loja.umaestrelinha.com.br' },
  desligados: string[] = [],
) {
  const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
  for (const e of ligados) events[e].email.enabled = true
  for (const e of desligados) events[e].email.enabled = false
  return [
    { key: 'notifications', value: { events, post_delivery_days: 7 } },
    { key: 'general', value: general },
    { key: 'material', value: { recipient: 'Adri Muniz', street: 'Rua do Ateliê', number: '10', complement: '', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', zip: '90000-000', notes: '' } },
  ]
}

interface SetupOptions {
  order?: Record<string, unknown> | null
  ligados?: string[]
  general?: Record<string, unknown>
  desligados?: string[]
  claim?: { data?: unknown; error?: unknown }
  resendStatus?: number
  resendBody?: unknown
  networkError?: boolean
  providers?: NotificationProvider[]
  supabase?: Partial<FakeSupabaseOptions>
}

function setup(options: SetupOptions = {}) {
  const fetchDouble = createFakeFetch([
    {
      match: 'api.resend.com',
      status: options.resendStatus ?? 200,
      body: options.resendBody ?? { id: 'resend-id-1' },
      networkError: options.networkError,
    },
  ])

  const supabase = createFakeSupabase({
    rows: { orders: options.order === null ? null : baseOrder(options.order ?? {}) },
    lists: { store_settings: settingsRows(options.ligados ?? [], options.general, options.desligados ?? []) },
    rpcByFn: {
      claim_order_notification: options.claim ?? { data: CLAIM_ID },
      finish_order_notification: { data: null },
    },
    ...options.supabase,
  })

  const deps: NotificationDeps = {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: ENV,
    providers: options.providers ?? [createResendProvider({ apiKey: ENV.resendApiKey, from: ENV.resendFrom })],
  }

  return { deps, fetchDouble, supabase }
}

const claims = (s: ReturnType<typeof createFakeSupabase>) => s.rpcs.filter((r) => r.fn === 'claim_order_notification')
const finishes = (s: ReturnType<typeof createFakeSupabase>) => s.rpcs.filter((r) => r.fn === 'finish_order_notification')

afterEach(() => {
  vi.restoreAllMocks()
})

// =================================================================================================
// NTF-04 — canal registrado ∧ habilitado ∧ com destinatário
// =================================================================================================

describe('NTF-04 — o que impede um envio, e o que ele NÃO deixa no banco', () => {
  it('evento DESLIGADO: `skipped:disabled`, e NENHUMA linha é reivindicada', async () => {
    // `order_paid` nasce LIGADO (é legado): desligar é o ato que se está medindo.
    const { deps, supabase, fetchDouble } = setup({ desligados: ['order_paid'] })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r).toEqual([{ ok: false, event: 'order_paid', channel: 'email', skipped: 'disabled' }])
    expect(claims(supabase)).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('cliente sem e-mail: `skipped:no_email`, sem linha e sem provedor', async () => {
    const { deps, supabase, fetchDouble } = setup({ ligados: ['order_paid'], order: { customer_email: '   ' } })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, skipped: 'no_email' })
    expect(claims(supabase)).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('e-mail da loja vazio: o aviso da DONA é `no_owner_contact` — e sai na pré-condição, antes do claim', async () => {
    const { deps, supabase } = setup({ ligados: ['owner_order_paid'], general: { email: '' } })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'owner_order_paid' })

    expect(r[0]).toMatchObject({ ok: false, precondition: 'no_owner_contact' })
    expect(claims(supabase)).toHaveLength(0)
  })

  it('pedido inexistente: nenhum resultado, nenhuma leitura de configuração, nenhuma linha', async () => {
    const { deps, supabase, fetchDouble } = setup({ order: null })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r).toEqual([])
    expect(claims(supabase)).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('sem provedor registrado para o canal pedido: `skipped:no_provider`, sem linha', async () => {
    const { deps, supabase } = setup({ ligados: ['order_paid'], providers: [] })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, skipped: 'no_provider' })
    expect(claims(supabase)).toHaveLength(0)
  })

  it('`RESEND_FROM` malformado derruba ANTES de tudo — é apagão silencioso, não falha isolada', async () => {
    const { deps, supabase, fetchDouble } = setup({ ligados: ['order_paid'] })
    deps.env = { ...ENV, resendFrom: 'sem-arroba' }

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: 'invalid_from' })
    expect(claims(supabase)).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })
})

// =================================================================================================
// NTF-05 — pré-condição e idempotência
// =================================================================================================

describe('NTF-05 — o estado manda, e o banco lembra', () => {
  it('pré-condição falha: devolve o motivo e NÃO reivindica — a tentativa segue retentável', async () => {
    const { deps, supabase } = setup({ ligados: ['order_paid'], order: { paid_at: null } })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r).toEqual([{ ok: false, event: 'order_paid', channel: null, precondition: 'order_not_paid' }])
    expect(claims(supabase)).toHaveLength(0)
  })

  it('já enviado (claim devolve null): `skipped:already_sent`, sem chamada ao provedor', async () => {
    const { deps, fetchDouble } = setup({ ligados: ['order_paid'], claim: { data: null } })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, skipped: 'already_sent' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('a reivindicação nomeia o TRIO (pedido, evento, canal) — é o índice único da migration', async () => {
    const { deps, supabase } = setup({ ligados: ['order_paid'] })

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(claims(supabase)[0].args).toEqual({ p_order_id: ORDER_ID, p_event: 'order_paid', p_channel: 'email' })
  })

  it('falha da RPC de claim não envia e devolve `claim_failed`', async () => {
    const { deps, fetchDouble } = setup({ ligados: ['order_paid'], claim: { error: { message: 'deadlock' } } })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: 'claim_failed' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('sucesso: fecha a linha com o id do provedor e sem erro', async () => {
    const { deps, supabase, fetchDouble } = setup({ ligados: ['order_paid'] })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toEqual({ ok: true, event: 'order_paid', channel: 'email', id: 'resend-id-1' })
    expect(finishes(supabase)[0].args).toEqual({
      p_id: CLAIM_ID,
      p_provider_message_id: 'resend-id-1',
      p_error: null,
    })
    expect(fetchDouble.calls[0].body.to).toBe('mariana@exemplo.invalid')
  })

  it('a chave de idempotência do provedor deriva do trio', async () => {
    const { deps, fetchDouble } = setup({ ligados: ['order_paid'] })

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(fetchDouble.calls[0].headers['Idempotency-Key']).toBe(`notification:${ORDER_ID}:order_paid:email`)
  })
})

// =================================================================================================
// NTF-06 — falha do provedor: slug no log, texto no banco, nunca lança
// =================================================================================================

describe('NTF-06 — desfechos de falha', () => {
  it.each([
    [401, 'resend_unauthorized'],
    [403, 'resend_forbidden'],
    [409, 'resend_duplicate'],
    [429, 'resend_rate_limited'],
    [400, 'resend_invalid'],
    [422, 'resend_invalid'],
    [500, 'resend_unavailable'],
  ])('HTTP %s → %s, linha em failed, e UMA só tentativa', async (status, slug) => {
    const { deps, supabase, fetchDouble } = setup({
      ligados: ['order_paid'],
      resendStatus: status as number,
      resendBody: { name: 'validation_error', message: 'algo' },
    })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: slug })
    expect(fetchDouble.calls).toHaveLength(1)
    expect(finishes(supabase)[0].args.p_provider_message_id).toBeNull()
    expect(String(finishes(supabase)[0].args.p_error)).toContain(String(status))
  })

  it('queda de rede → `resend_unavailable`, com a linha em failed', async () => {
    const { deps, supabase } = setup({ ligados: ['order_paid'], networkError: true })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: 'resend_unavailable' })
    expect(finishes(supabase)).toHaveLength(1)
  })

  it('2xx sem `id` no corpo NÃO é tratado como enviado', async () => {
    const { deps } = setup({ ligados: ['order_paid'], resendBody: {} })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: 'resend_no_id' })
  })

  it('o `error` gravado é RECORTADO a 500 caracteres — diagnóstico, não despejo', async () => {
    const { deps, supabase } = setup({
      ligados: ['order_paid'],
      resendStatus: 400,
      resendBody: { name: 'validation_error', message: 'x'.repeat(5000) },
    })

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(String(finishes(supabase)[0].args.p_error).length).toBe(500)
  })

  it('um provedor que LANÇA não derruba o motor — o contrato é nunca lançar', async () => {
    const explosivo: NotificationProvider = {
      channel: 'email',
      classifyFailure: () => 'x',
      send: async () => {
        throw new Error('bug do adaptador')
      },
    }
    const { deps } = setup({ ligados: ['order_paid'], providers: [explosivo] })

    await expect(dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })).resolves.toBeDefined()
  })

  it('texto gravado que viola a régua de tom NÃO sai: linha em failed com o motivo', async () => {
    // O painel recusa ao salvar, mas a linha pode ter vindo de outro caminho (Studio, migration).
    const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
    events.order_paid.email.enabled = true
    events.order_paid.email.fields.lead = 'Corra! últimas unidades'
    const supabase = createFakeSupabase({
      rows: { orders: baseOrder() },
      lists: { store_settings: [{ key: 'notifications', value: { events, post_delivery_days: 7 } }, { key: 'general', value: { email: 'adri@x.com' } }] },
      rpcByFn: { claim_order_notification: { data: CLAIM_ID }, finish_order_notification: { data: null } },
    })
    const fetchDouble = createFakeFetch([{ match: 'api.resend.com', body: { id: 'nao-devia' } }])
    const deps: NotificationDeps = {
      supabase: supabase.client,
      fetch: fetchDouble.fetch,
      env: ENV,
      providers: [createResendProvider({ apiKey: 'k', from: ENV.resendFrom })],
    }

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r[0]).toMatchObject({ ok: false, reason: 'copy_refused' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(String(finishes(supabase)[0].args.p_error)).toContain('copy_refused')
  })
})

// =================================================================================================
// NTF-07 — o orçamento de tempo é compartilhado, e o que não coube FICA VISÍVEL
// =================================================================================================

describe('NTF-07 — orçamento', () => {
  /** Provedor que consome tempo do relógio controlado. */
  function lento(consome: number, contador: { n: number }): NotificationProvider {
    return {
      channel: 'email',
      classifyFailure: () => 'x',
      send: async () => {
        agora += consome
        contador.n += 1
        return { ok: true, id: `id-${contador.n}` }
      },
    }
  }

  let agora = 1_000_000

  it('o segundo evento fica `budget_exhausted` COM linha — o que não coube é visível e reenviável', async () => {
    agora = 1_000_000
    vi.spyOn(Date, 'now').mockImplementation(() => agora)
    const contador = { n: 0 }
    const { deps, supabase } = setup({
      ligados: ['order_paid', 'owner_order_paid'],
      providers: [lento(2200, contador)],
    })

    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved', budgetMs: 2500 })

    // O da CLIENTE sai; o da dona é o que espera.
    expect(results[0]).toMatchObject({ ok: true, event: 'order_paid' })
    expect(results[1]).toMatchObject({ ok: false, event: 'owner_order_paid', reason: 'budget_exhausted' })
    expect(contador.n).toBe(1)

    // As DUAS linhas existem: a que saiu e a que não coube.
    expect(claims(supabase)).toHaveLength(2)
    expect(String(finishes(supabase)[1].args.p_error)).toContain('budget_exhausted')
  })

  it('orçamento zerado: nem o primeiro sai, e a linha diz por quê', async () => {
    const { deps, supabase, fetchDouble } = setup({ ligados: ['order_paid'] })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid', budgetMs: 0 })

    expect(r[0]).toMatchObject({ ok: false, reason: 'budget_exhausted' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(claims(supabase)).toHaveLength(1)
  })

  it('o `signal` do motor chega ao provedor — é ele que aborta o `fetch`', async () => {
    let recebido: AbortSignal | null = null
    const espiao: NotificationProvider = {
      channel: 'email',
      classifyFailure: () => 'x',
      send: async (_m, ctx) => {
        recebido = ctx.signal
        return { ok: true, id: 'x' }
      },
    }
    const { deps } = setup({ ligados: ['order_paid'], providers: [espiao] })

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(recebido).toBeInstanceOf(AbortSignal)
    expect(recebido!.aborted).toBe(false)
  })
})

// =================================================================================================
// NTF-10 — a bifurcação: o gatilho é o fato, `core` escolhe a mensagem
// =================================================================================================

describe('NTF-10 — `payment_approved` bifurca por material', () => {
  it('SEM material a esperar → `order_paid` (e o aviso da dona)', async () => {
    const { deps } = setup({ ligados: ['order_paid', 'owner_order_paid'], order: { material_status: 'nao_aplicavel' } })

    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.map((r) => r.event)).toEqual(['order_paid', 'owner_order_paid'])
    expect(results[0]).toMatchObject({ ok: true })
  })

  it('COM material a esperar → `material_instructions`, e NUNCA `order_paid`', async () => {
    const { deps } = setup({
      ligados: ['material_instructions', 'owner_order_paid'],
      order: { material_status: 'aguardando_material' },
    })

    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results.map((r) => r.event)).toEqual(['material_instructions', 'owner_order_paid'])
    expect(results.some((r) => r.event === 'order_paid')).toBe(false)
  })

  it('a ordem é cliente ANTES da dona — quando o tempo aperta, quem espera é o aviso interno', async () => {
    const { deps } = setup({ ligados: ['order_paid', 'owner_order_paid'] })

    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'payment_approved' })

    expect(results[0].event).toBe('order_paid')
    expect(results[1].event).toBe('owner_order_paid')
  })

  it('gatilho que não produz evento nenhum (status sem aviso) não toca no banco', async () => {
    const { deps, supabase } = setup({ ligados: ['order_cancelled'], order: { status: 'processing' } })

    const { results } = await dispatchTrigger(deps, { orderId: ORDER_ID, trigger: 'order_status_changed' })

    expect(results).toEqual([])
    expect(claims(supabase)).toHaveLength(0)
  })
})

// =================================================================================================
// Recuo para os defaults, redirect de dev, e o reenvio por canal
// =================================================================================================

describe('recuo, dev e reenvio', () => {
  it('sem a chave `notifications` no banco, os QUATRO legados continuam saindo', async () => {
    // Banco anterior à migration. O motor cai em `DEFAULT_NOTIFICATIONS`, onde eles nascem ligados.
    const supabase = createFakeSupabase({
      rows: { orders: baseOrder({ status: 'shipped', tracking_code: 'AA1BR' }) },
      lists: { store_settings: [] },
      rpcByFn: { claim_order_notification: { data: CLAIM_ID }, finish_order_notification: { data: null } },
    })
    const fetchDouble = createFakeFetch([{ match: 'api.resend.com', body: { id: 'r1' } }])
    const deps: NotificationDeps = {
      supabase: supabase.client,
      fetch: fetchDouble.fetch,
      env: ENV,
      providers: [createResendProvider({ apiKey: 'k', from: ENV.resendFrom })],
    }

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_shipped' })

    expect(r[0]).toMatchObject({ ok: true })
  })

  it('sem a chave `notifications`, um evento NOVO continua desligado', async () => {
    const supabase = createFakeSupabase({
      rows: { orders: baseOrder({ payment_status: 'expired' }) },
      lists: { store_settings: [] },
      rpcByFn: { claim_order_notification: { data: CLAIM_ID } },
    })
    const fetchDouble = createFakeFetch([{ match: 'api.resend.com', body: { id: 'r1' } }])
    const deps: NotificationDeps = {
      supabase: supabase.client,
      fetch: fetchDouble.fetch,
      env: ENV,
      providers: [createResendProvider({ apiKey: 'k', from: ENV.resendFrom })],
    }

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'pix_expired' })

    expect(r[0]).toMatchObject({ ok: false, skipped: 'disabled' })
  })

  it('`RESEND_DEV_REDIRECT_TO` desvia o destinatário e prefixa o assunto com o real', async () => {
    const { deps, fetchDouble } = setup({ ligados: ['order_paid'] })
    deps.env = { ...ENV, resendDevRedirectTo: 'dev@exemplo.invalid' }

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(fetchDouble.calls[0].body.to).toBe('dev@exemplo.invalid')
    expect(fetchDouble.calls[0].body.subject).toContain('[dev → mariana@exemplo.invalid]')
  })

  it('o reenvio pede UM canal, e só ele é tentado', async () => {
    const outro: NotificationProvider = { channel: 'whatsapp', classifyFailure: () => 'x', send: async () => ({ ok: true, id: 'w' }) }
    const { deps } = setup({
      ligados: ['order_paid'],
      providers: [createResendProvider({ apiKey: 'k', from: ENV.resendFrom }), outro],
    })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid', channel: 'email' })

    expect(r).toHaveLength(1)
    expect(r[0].channel).toBe('email')
  })

  it('sem canal pedido, TODOS os registrados são tentados — é o que a 43 liga sem tocar aqui', async () => {
    const outro: NotificationProvider = { channel: 'whatsapp', classifyFailure: () => 'x', send: async () => ({ ok: true, id: 'w' }) }
    const { deps } = setup({
      ligados: ['order_paid'],
      providers: [createResendProvider({ apiKey: 'k', from: ENV.resendFrom }), outro],
    })

    const r = await dispatchEvent(deps, { orderId: ORDER_ID, event: 'order_paid' })

    expect(r.map((x) => x.channel)).toEqual(['email', 'whatsapp'])
  })

  it('o endereço do ateliê chega ao texto vindo de `store_settings.material`, não de literal', async () => {
    const { deps, fetchDouble } = setup({
      ligados: ['material_instructions'],
      order: { material_status: 'aguardando_material' },
    })

    await dispatchEvent(deps, { orderId: ORDER_ID, event: 'material_instructions' })

    expect(fetchDouble.calls[0].body.text).toContain('Adri Muniz, Rua do Ateliê, 10')
  })
})
