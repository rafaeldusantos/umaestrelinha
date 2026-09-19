// As QUATRO PORTAS (`handlers.ts`) — roteamento, autorização e a forma da resposta.
//
// O que o MOTOR faz depois de autorizado (pré-condição, claim, provedor, orçamento) é medido em
// `dispatch.test.ts`. Aqui mede-se a camada HTTP: quem entra, quem é barrado, e que status sai. A
// separação é a mesma de `handlers.ts` × `dispatch.ts` — testar as duas coisas no mesmo arquivo foi
// o que a feature 42 desfez.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, createResendProvider } from '../../../../packages/core/src/notifications/index.ts'
import { createFakeFetch, createFakeSupabase, type FetchRoute } from '../../_shared/testing/fakes.ts'
import type { NotificationEnv } from '../dispatch.ts'
import { DEFAULT_RESEND_FROM, type Deps, configCheck, draftRefusal, route } from '../handlers.ts'
import { isValidFrom } from '../render/layout.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const OUTRO_ID = '7c9e0000-0000-4000-8000-0000000000ff'
const ADMIN = { id: 'a1b2c3d4-0000-4000-8000-000000000001' }
const CLIENTE = { id: 'c0000000-0000-4000-8000-000000000002' }
const CUSTOMER_ID = 'cus00000-0000-4000-8000-000000000003'
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-sem-sub.assinatura'

const ENV: NotificationEnv = {
  resendApiKey: 're_test_key',
  resendFrom: 'Uma Estrelinha <onboarding@resend.dev>',
  storePublicUrl: 'https://umaestrelinha.com.br',
  adminPublicUrl: 'https://painel.umaestrelinha.com.br',
}

const OK_ROUTE: FetchRoute = { match: 'api.resend.com', body: { id: 'msg-abc-123' } }

function orderRow(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    customer_id: CUSTOMER_ID,
    order_number: 'NP-ABC123',
    customer_name: 'Mariana Souza',
    customer_email: 'mariana@exemplo.invalid',
    customer_phone: '5551999990000',
    status: 'pending',
    payment_status: 'approved',
    paid_at: '2026-07-30T12:00:00Z',
    mp_order_id: 'ORDTST01KYM',
    tracking_code: null,
    shipping_carrier: null,
    material_status: 'nao_aplicavel',
    material_tracking_code: null,
    subtotal: 48,
    shipping_cost: 12.5,
    discount: 0,
    pix_discount: 0,
    total: 60.5,
    address_street: 'Rua das Flores',
    address_number: '42',
    address_complement: null,
    address_neighborhood: 'Centro',
    address_city: 'São Paulo',
    address_state: 'SP',
    address_zip: '01001-000',
    order_items: [{ product_name: 'Pingente Gota', size: 'M', finish: 'Fosco', quantity: 2, unit_price: 12 }],
    ...over,
  }
}

function settingsRows(ligados: string[] = []) {
  const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
  for (const e of ligados) events[e].email.enabled = true
  return [
    { key: 'notifications', value: { events, post_delivery_days: 7 } },
    { key: 'general', value: { email: 'adri@loja.umaestrelinha.com.br', whatsapp: '(51) 99999-0000' } },
    { key: 'material', value: { recipient: 'Adri Muniz', street: 'Rua do Ateliê', number: '10', city: 'Porto Alegre', state: 'RS', zip: '90000-000' } },
  ]
}

interface SetupOptions {
  user?: { id: string } | null
  isAdmin?: boolean
  order?: Record<string, unknown> | null
  customer?: { id: string } | null
  claimId?: string | null
  routes?: FetchRoute[]
  env?: Partial<NotificationEnv>
  ligados?: string[]
  rpcByFn?: Record<string, { data?: unknown; error?: unknown }>
}

function setup(options: SetupOptions = {}) {
  const supabase = createFakeSupabase({
    user: options.user === undefined ? ADMIN : options.user,
    rows: {
      orders: options.order === undefined ? orderRow() : options.order,
      customers: options.customer === undefined ? { id: CUSTOMER_ID } : options.customer,
    },
    lists: { store_settings: settingsRows(options.ligados ?? []) },
    rpcByFn: {
      has_role: { data: options.isAdmin ?? true },
      claim_order_notification: { data: options.claimId === undefined ? 'claim-row-1' : options.claimId },
      finish_order_notification: { data: null },
      ...(options.rpcByFn ?? {}),
    },
  })
  const fetchDouble = createFakeFetch(options.routes ?? [OK_ROUTE])
  const deps = {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: { ...ENV, ...(options.env ?? {}) },
    providers: [createResendProvider({ apiKey: 're_test_key', from: ENV.resendFrom })],
  }
  return { supabase, fetchDouble, deps }
}

function request(action: string, body: unknown, jwt: string | null = 'jwt-do-admin') {
  return new Request(`http://local/functions/v1/send-notification?action=${action}`, {
    method: 'POST',
    headers: jwt ? { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' } : {},
    body: JSON.stringify(body),
  })
}

/** Coleta as linhas de log estruturado para asseverar o que NÃO aparece nelas. */
function captureLogs() {
  const lines: Record<string, unknown>[] = []
  vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    try {
      lines.push(JSON.parse(String(line)))
    } catch {
      /* linha não-JSON não interessa aqui */
    }
  })
  return lines
}

afterEach(() => {
  vi.restoreAllMocks()
})

// =================================================================================================
// Roteamento e CORS
// =================================================================================================

describe('EML-08 — OPTIONS e action inválida', () => {
  it('OPTIONS → 200 com CORS, sem tocar em nenhuma action', async () => {
    const { deps, fetchDouble } = setup()

    const response = await route(deps, new Request('http://local/functions/v1/send-notification', { method: 'OPTIONS' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('action desconhecida → 400 nomeando as CINCO portas, sem chamada externa', async () => {
    const { deps, fetchDouble } = setup()

    const response = await route(deps, new Request('http://local/functions/v1/send-notification?action=xpto'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('send, trigger, notify, preview, config-check')
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('a resposta de erro carrega CORS — o painel chama de outra origem', async () => {
    const { deps } = setup()

    const response = await route(deps, new Request('http://local/functions/v1/send-notification?action=xpto'))

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

// =================================================================================================
// NTF-08 — autorização das portas de admin
// =================================================================================================

describe('NTF-08 — `send`, `trigger` e `preview` são admin-only', () => {
  it.each(['send', 'trigger', 'preview'])('%s sem header Authorization → 401', async (action) => {
    const { deps, fetchDouble } = setup()

    const response = await route(deps, request(action, { event: 'order_paid', trigger: 'payment_approved', order_id: ORDER_ID }, null))

    expect(response.status).toBe(401)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it.each(['send', 'trigger', 'preview'])('%s com a anon key como bearer → 401 (o JWT é válido, mas não tem `sub`)', async (action) => {
    const { deps } = setup({ user: null })

    const response = await route(deps, request(action, { event: 'order_paid', trigger: 'payment_approved', order_id: ORDER_ID }, ANON_JWT))

    expect(response.status).toBe(401)
  })

  it.each(['send', 'trigger', 'preview'])('%s com cliente logado que não é admin → 403', async (action) => {
    const { deps, fetchDouble } = setup({ user: CLIENTE, isAdmin: false })

    const response = await route(deps, request(action, { event: 'order_paid', trigger: 'payment_approved', order_id: ORDER_ID }))

    expect(response.status).toBe(403)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('falha da RPC `has_role` FECHA o acesso (403) e loga distinto, em vez de virar mistério', async () => {
    const linhas = captureLogs()
    const { deps } = setup({ rpcByFn: { has_role: { error: { message: 'timeout' } } } })

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))

    expect(response.status).toBe(403)
    expect(linhas.some((l) => l.status === 'admin_check_failed')).toBe(true)
  })

  it('a checagem usa a função canônica `has_role` com o id do usuário', async () => {
    const { deps, supabase } = setup()

    await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))

    expect(supabase.rpcs.find((r) => r.fn === 'has_role')?.args).toEqual({ _user_id: ADMIN.id, _role: 'admin' })
  })

  it('EML-02: autorização vence validação — não-admin com evento inválido responde 403, não 400', async () => {
    const { deps } = setup({ user: CLIENTE, isAdmin: false })

    const response = await route(deps, request('send', { event: 'nao_existe', order_id: 'nem-uuid-e' }))

    expect(response.status).toBe(403)
  })
})

// =================================================================================================
// NTF-13 — a porta da CLIENTE (`notify`)
// =================================================================================================

describe('NTF-13 — `notify` autoriza por DONA DO PEDIDO, não por papel', () => {
  const corpo = { order_id: ORDER_ID, trigger: 'material_tracking_set' }

  it('sem header → 401', async () => {
    const { deps } = setup()

    expect((await route(deps, request('notify', corpo, null))).status).toBe(401)
  })

  it('a dona do pedido passa — mesmo NÃO sendo admin', async () => {
    const { deps } = setup({
      user: CLIENTE,
      isAdmin: false,
      order: orderRow({ material_status: 'material_enviado', material_tracking_code: 'BB1BR' }),
      ligados: ['material_tracking_registered'],
    })

    const response = await route(deps, request('notify', corpo))

    expect(response.status).toBe(200)
  })

  it('pedido de OUTRA pessoa → 404, e NÃO 403: distinguir entregaria a existência de pedidos alheios', async () => {
    const { deps, fetchDouble } = setup({
      user: CLIENTE,
      isAdmin: false,
      order: orderRow({ customer_id: 'de-outra-pessoa' }),
    })

    const response = await route(deps, request('notify', corpo))

    expect(response.status).toBe(404)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('pedido inexistente → 404, a MESMA resposta de "não é seu"', async () => {
    const { deps } = setup({ user: CLIENTE, isAdmin: false, order: null })

    expect((await route(deps, request('notify', { ...corpo, order_id: OUTRO_ID }))).status).toBe(404)
  })

  it('usuário sem linha em `customers` (convidada) → 404', async () => {
    const { deps } = setup({ user: CLIENTE, isAdmin: false, customer: null })

    expect((await route(deps, request('notify', corpo))).status).toBe(404)
  })

  it.each(['payment_approved', 'order_status_changed', 'material_status_changed', 'pix_created'])(
    'gatilho %s NÃO é permitido nesta porta → 400, mesmo para a dona do pedido',
    async (trigger) => {
      const { deps, fetchDouble } = setup({ user: CLIENTE, isAdmin: false })

      const response = await route(deps, request('notify', { order_id: ORDER_ID, trigger }))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('não permitido')
      expect(fetchDouble.calls).toHaveLength(0)
    },
  )

  it('order_id inválido → 400 ANTES de qualquer leitura de dono', async () => {
    const { deps, supabase } = setup({ user: CLIENTE, isAdmin: false })

    const response = await route(deps, request('notify', { order_id: 'abc', trigger: 'material_tracking_set' }))

    expect(response.status).toBe(400)
    expect(supabase.rpcs).toHaveLength(0)
  })
})

// =================================================================================================
// Validação do payload e forma da resposta
// =================================================================================================

describe('NTF-08 — validação de `send`', () => {
  it.each([
    ['ausente', undefined],
    ['desconhecido', 'order_refunded'],
    ['não-string', 123],
    ['vazio', ''],
  ])('event %s → 400, sem leitura de pedido e sem chamada ao Resend', async (_label, event) => {
    const { deps, fetchDouble, supabase } = setup()

    const response = await route(deps, request('send', { event, order_id: ORDER_ID }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('event inválido')
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_notification')).toHaveLength(0)
  })

  it.each([
    ['ausente', undefined],
    ['não-uuid', 'abc'],
    ['numérico', 123],
    ['uuid truncado', '5b8f0b1e-9c2a-4f37-8a11'],
  ])('order_id %s → 400 e zero chamadas ao Resend', async (_label, orderId) => {
    const { deps, fetchDouble } = setup()

    const response = await route(deps, request('send', { event: 'order_paid', order_id: orderId }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('order_id')
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('`type` continua aceito no lugar de `event` — a janela de deploy tem o painel antigo no ar', async () => {
    const { deps } = setup()

    const response = await route(deps, request('send', { type: 'order_paid', order_id: ORDER_ID }))

    expect(response.status).toBe(200)
  })

  it('EML-01: to/subject/html/from mandados pelo chamador são IGNORADOS', async () => {
    const { deps, fetchDouble } = setup()

    await route(
      deps,
      request('send', {
        event: 'order_paid',
        order_id: ORDER_ID,
        to: 'atacante@exemplo.invalid',
        subject: 'spam',
        html: '<p>spam</p>',
        from: 'falso@exemplo.invalid',
      }),
    )

    const enviado = fetchDouble.calls[0].body
    expect(enviado.to).toBe('mariana@exemplo.invalid')
    expect(enviado.subject).not.toContain('spam')
    expect(enviado.html).not.toContain('spam')
    expect(enviado.from).toBe(ENV.resendFrom)
  })

  it('pedido inexistente → 404', async () => {
    const { deps } = setup({ order: null })

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))

    expect(response.status).toBe(404)
  })

  it('estado que não permite → 422, e o corpo nomeia a pré-condição', async () => {
    const { deps } = setup({ order: orderRow({ paid_at: null }) })

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toContain('order_not_paid')
  })

  it('sucesso → 200 com `sent: true` e o id do provedor', async () => {
    const { deps } = setup()

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ sent: true, id: 'msg-abc-123' })
  })

  it('já enviado → 200 com `sent: false` e o motivo, sem chamada ao provedor', async () => {
    const { deps, fetchDouble } = setup({ claimId: null })

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ sent: false, skipped: 'already_sent' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('falha do provedor → 200 com o slug no corpo (a requisição do chamador foi bem-formada)', async () => {
    const { deps } = setup({ routes: [{ match: 'api.resend.com', status: 403, body: { name: 'validation_error', message: 'x' } }] })

    const response = await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ sent: false, reason: 'resend_forbidden' })
  })

  it('o reenvio pode pedir UM canal', async () => {
    const { deps, supabase } = setup()

    await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID, channel: 'email' }))

    expect(supabase.rpcs.find((r) => r.fn === 'claim_order_notification')?.args).toMatchObject({ p_channel: 'email' })
  })

  it('o log NUNCA carrega o corpo do erro do provedor — ele ecoa o destinatário', async () => {
    const linhas = captureLogs()
    const { deps } = setup({
      routes: [{ match: 'api.resend.com', status: 403, body: { name: 'validation_error', message: 'You can only send to mariana@exemplo.invalid' } }],
    })

    await route(deps, request('send', { event: 'order_paid', order_id: ORDER_ID }))

    expect(JSON.stringify(linhas)).not.toContain('You can only send')
    expect(linhas.some((l) => l.status === 'resend_forbidden')).toBe(true)
  })
})

describe('NTF-08 — validação de `trigger`', () => {
  it.each([['ausente', undefined], ['desconhecido', 'aconteceu_algo'], ['não-string', 7]])(
    'trigger %s → 400',
    async (_label, trigger) => {
      const { deps } = setup()

      const response = await route(deps, request('trigger', { trigger, order_id: ORDER_ID }))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('trigger inválido')
    },
  )

  it('pedido inexistente → 404', async () => {
    const { deps } = setup({ order: null })

    const response = await route(deps, request('trigger', { trigger: 'payment_approved', order_id: ORDER_ID }))

    expect(response.status).toBe(404)
  })

  it('gatilho válido que não produz evento neste estado → 200 com lista vazia (não é 404)', async () => {
    const { deps } = setup({ order: orderRow({ status: 'processing' }) })

    const response = await route(deps, request('trigger', { trigger: 'order_status_changed', order_id: ORDER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results).toEqual([])
    expect(body.sent).toBe(false)
  })

  it('sucesso devolve o gatilho e um resultado por evento × canal', async () => {
    const { deps } = setup({ ligados: ['owner_order_paid'] })

    const response = await route(deps, request('trigger', { trigger: 'payment_approved', order_id: ORDER_ID }))
    const body = await response.json()

    expect(body.trigger).toBe('payment_approved')
    expect(body.results.map((r: { event: string }) => r.event)).toEqual(['order_paid', 'owner_order_paid'])
    expect(body.sent).toBe(true)
  })
})

// =================================================================================================
// PNL-05 — a prévia renderiza e NÃO toca em nada
// =================================================================================================

describe('PNL-05 — `preview`', () => {
  const rascunho = { event: 'order_paid', channel: 'email', draft: { lead: 'Oi. Um texto novo da dona.' } }

  it('devolve subject, html e text do RASCUNHO — sem salvar nada', async () => {
    const { deps } = setup()

    const response = await route(deps, request('preview', rascunho))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.html).toContain('Um texto novo da dona.')
    expect(body.text).toContain('Um texto novo da dona.')
    expect(body.subject.length).toBeGreaterThan(0)
  })

  it('NÃO reivindica linha, NÃO chama o provedor e NÃO grava', async () => {
    const { deps, supabase, fetchDouble } = setup()

    await route(deps, request('preview', rascunho))

    expect(supabase.rpcs.filter((r) => r.fn.startsWith('claim_'))).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn.startsWith('finish_'))).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('sem `order_id`, usa o pedido de EXEMPLO — e diz que usou', async () => {
    const { deps } = setup()

    const body = await (await route(deps, request('preview', rascunho))).json()

    expect(body.sample).toBe(true)
    // O número do pedido vive no ASSUNTO e na versão texto — o corpo HTML traz itens, totais e
    // endereço, não o número. Medido ao escrever este teste.
    expect(body.subject).toContain('UE-0042')
    expect(body.text).toContain('Pedido UE-0042')
  })

  it('com `order_id`, renderiza sobre o pedido real', async () => {
    const { deps } = setup()

    const body = await (await route(deps, request('preview', { ...rascunho, order_id: ORDER_ID }))).json()

    expect(body.sample).toBe(false)
    expect(body.subject).toContain('NP-ABC123')
    expect(body.text).toContain('Pedido NP-ABC123')
  })

  it('o rascunho vence o gravado, e o que ele não manda cai no gravado', async () => {
    const { deps } = setup()

    const body = await (await route(deps, request('preview', rascunho))).json()

    // `lead` veio do rascunho; `subject` não foi mandado e veio do default.
    expect(body.html).toContain('Um texto novo da dona.')
    expect(body.subject).toContain('Pagamento aprovado')
  })

  it('texto com URGÊNCIA fabricada → 422 com o motivo, sem renderizar', async () => {
    const { deps } = setup()

    const response = await route(deps, request('preview', { event: 'order_paid', draft: { lead: 'Corra, últimas unidades!' } }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(String(body.error).length).toBeGreaterThan(0)
  })

  it('variável DESCONHECIDA → 422 nomeando a variável', async () => {
    const { deps } = setup()

    const response = await route(deps, request('preview', { event: 'order_paid', draft: { lead: 'Oi {{nome_do_cliente}}' } }))
    const body = await response.json()

    expect(response.status).toBe(422)
    expect(body.error).toContain('{{nome_do_cliente}}')
  })

  it('evento de MATERIAL com exclamação → 422 — a régua de tom vale na function, não só no painel', async () => {
    const { deps } = setup()

    const response = await route(
      deps,
      request('preview', { event: 'material_received', draft: { lead: 'Seu material chegou!' } }),
    )

    expect(response.status).toBe(422)
  })

  it('campo acima do limite → 422', async () => {
    const { deps } = setup()

    const response = await route(deps, request('preview', { event: 'order_paid', draft: { lead: 'a'.repeat(5000) } }))

    expect(response.status).toBe(422)
  })

  it('event inválido → 400; channel inválido → 400', async () => {
    const { deps } = setup()

    expect((await route(deps, request('preview', { event: 'nao_existe' }))).status).toBe(400)
    expect((await route(deps, request('preview', { event: 'order_paid', channel: 'pombo' }))).status).toBe(400)
  })
})

describe('draftRefusal — a régua na ordem em que se explica', () => {
  const campos = (over: Record<string, unknown> = {}) => ({
    subject: 'Assunto',
    heading: 'Título',
    lead: 'Texto normal.',
    extra: ['Linha'],
    cta_label: 'Abrir',
    ...over,
  })

  it('texto limpo passa', () => {
    expect(draftRefusal('order_paid', campos())).toBeNull()
  })

  it('variável desconhecida vence a régua de tom — é o erro mais fácil de corrigir', () => {
    const r = draftRefusal('order_paid', campos({ lead: 'Corra {{inexistente}}' }))
    expect(r).toContain('{{inexistente}}')
  })

  it('recusa alcança TODOS os campos, não só o lead', () => {
    for (const campo of ['subject', 'heading', 'lead', 'cta_label']) {
      expect(draftRefusal('order_paid', campos({ [campo]: 'Últimas unidades' })), campo).not.toBeNull()
    }
    expect(draftRefusal('order_paid', campos({ extra: ['Ok', 'corra!'] }))).not.toBeNull()
  })

  it('exclamação só é recusada nos eventos de MATERIAL', () => {
    expect(draftRefusal('order_paid', campos({ lead: 'Pagamento aprovado!' }))).toBeNull()
    expect(draftRefusal('material_received', campos({ lead: 'Chegou!' }))).not.toBeNull()
  })
})

// =================================================================================================
// DLV-05 / DLV-10 — a porta `config-check`: o que a produção usa, e nada do que é segredo
//
// A razão de esta porta existir está em `handlers.ts`; a razão de ela ser MEDIDA assim está aqui.
// O sensor diário prova contra o Resend **o valor que a produção reporta**. Se este handler mentir
// — aprovando um remetente que o motor recusa, escondendo que caiu no default, ou deixando de dizer
// que o desvio de desenvolvimento está ligado —, o sensor fica verde sobre o cano fechado. É
// exatamente o que aconteceu entre 2026-09-06 e 2026-09-19, com treze dias de silêncio.
// =================================================================================================

/** Uma chave com forma de chave, para o caso que varre o corpo atrás dela. */
const CHAVE_DE_TESTE = 're_S3nS0r_chave_que_nao_pode_vazar_9f3a'
const DESVIO_DE_DEV = 'desvio+dev@exemplo.invalid'

const ENV_DE_PRODUCAO: NotificationEnv = {
  resendApiKey: CHAVE_DE_TESTE,
  resendFrom: 'Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>',
  storePublicUrl: 'https://umaestrelinha.com.br',
  adminPublicUrl: 'https://painel.umaestrelinha.com.br',
}

const CHAVES_DO_CONTRATO = [
  'from',
  'from_valid',
  'from_is_default',
  'has_api_key',
  'store_public_url',
  'admin_public_url',
  'dev_redirect_active',
]

/**
 * As dependências do sensor com DUAS armadilhas: um client que explode ao primeiro toque e um
 * `fetch` que explode ao ser chamado.
 *
 * Não é zelo — é a asserção de `DLV-05` escrita como dublê. Um teste que só conferisse o corpo
 * passaria com um `configCheck` que lesse o banco, e nesse mundo o sensor confundiria "o e-mail
 * quebrou" com "o Postgres caiu". Aqui a violação derruba o caso, nomeando a propriedade tocada.
 */
function depsDeSensor(over: Partial<NotificationEnv> = {}): Deps {
  return {
    supabase: new Proxy(
      {},
      {
        get(_alvo, prop) {
          throw new Error(`config-check tocou no client do Supabase: .${String(prop)}`)
        },
      },
    ),
    fetch: (() => {
      throw new Error('config-check chamou a rede')
    }) as unknown as typeof globalThis.fetch,
    env: { ...ENV_DE_PRODUCAO, ...over },
    providers: [],
  }
}

/** O corpo da resposta, pela porta de verdade (`route`), com GET e sem corpo de requisição. */
async function sensor(over: Partial<NotificationEnv> = {}) {
  const response = await route(
    depsDeSensor(over),
    new Request('http://local/functions/v1/send-notification?action=config-check'),
  )
  return { response, body: await response.json() }
}

describe('DLV-05 — os sete campos do contrato', () => {
  it('`from`: devolve o remetente que a produção está usando, letra por letra', async () => {
    const { body } = await sensor()

    expect(body.from).toBe('Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>')
  })

  it('`from_valid`: verdadeiro para um remetente bem formado', async () => {
    const { body } = await sensor()

    expect(body.from_valid).toBe(true)
  })

  it('`from_is_default`: falso quando o remetente é o do domínio da loja', async () => {
    const { body } = await sensor()

    expect(body.from_is_default).toBe(false)
  })

  it('`has_api_key`: verdadeiro quando a chave está preenchida', async () => {
    const { body } = await sensor()

    expect(body.has_api_key).toBe(true)
  })

  it('`store_public_url`: devolve a origem DA LOJA — é a base dos links de todo e-mail', async () => {
    const { body } = await sensor()

    expect(body.store_public_url).toBe('https://umaestrelinha.com.br')
  })

  it('`admin_public_url`: devolve a origem do PAINEL, que é outra implantação', async () => {
    const { body } = await sensor()

    expect(body.admin_public_url).toBe('https://painel.umaestrelinha.com.br')
  })

  it('`dev_redirect_active`: falso quando a env do desvio não existe', async () => {
    const { body } = await sensor()

    expect(body.dev_redirect_active).toBe(false)
  })
})

describe('DLV-05 — os estados que o sensor existe para acusar', () => {
  it('`from` malformada ⇒ `from_valid: false` — é 422 em TODOS os envios, não falha isolada', async () => {
    const { body } = await sensor({ resendFrom: 'Adri Muniz adri(arroba)loja' })

    expect(body.from_valid).toBe(false)
    // O valor continua sendo reportado: quem lê o alarme precisa ver O QUE está configurado.
    expect(body.from).toBe('Adri Muniz adri(arroba)loja')
  })

  it('`from` no default ⇒ `from_is_default: true` — 200 que só entrega ao dono da conta', async () => {
    const { body } = await sensor({ resendFrom: DEFAULT_RESEND_FROM })

    expect(body.from_is_default).toBe(true)
    // E ele é VÁLIDO em formato: sem este campo, o passo 2 do sensor aprovaria o apagão.
    expect(body.from_valid).toBe(true)
  })

  it('o default é reconhecido pelo ENDEREÇO, não pela frase — outro nome de exibição não engana', async () => {
    const { body } = await sensor({ resendFrom: 'Loja <onboarding@resend.dev>' })

    expect(body.from_is_default).toBe(true)
  })

  it('chave ausente, ou só com espaços, ⇒ `has_api_key: false`', async () => {
    expect((await sensor({ resendApiKey: undefined })).body.has_api_key).toBe(false)
    expect((await sensor({ resendApiKey: '' })).body.has_api_key).toBe(false)
    expect((await sensor({ resendApiKey: '   ' })).body.has_api_key).toBe(false)
  })

  it('`RESEND_DEV_REDIRECT_TO` preenchida ⇒ `dev_redirect_active: true` — nenhuma cliente recebe', async () => {
    const { body } = await sensor({ resendDevRedirectTo: DESVIO_DE_DEV })

    expect(body.dev_redirect_active).toBe(true)
  })

  it('`from_valid` é a MESMA régua do motor (`isValidFrom`), inclusive na vírgula sem aspas', async () => {
    const pares: Array<[string, boolean]> = [
      ['adri@loja.umaestrelinha.com.br', true],
      ['Adri <adri@loja.umaestrelinha.com.br>', true],
      // RFC 5322: display name com vírgula exige aspas. Uma régua nova, escrita "parecida", casaria
      // um par de sinais de menor/maior com arroba dentro e aprovaria o primeiro destes dois.
      ['Adri, Uma Estrelinha <adri@loja.umaestrelinha.com.br>', false],
      ['"Adri, Uma Estrelinha" <adri@loja.umaestrelinha.com.br>', true],
      ['adri@localhost', false],
      ['', false],
    ]

    for (const [from, esperado] of pares) {
      const { body } = await sensor({ resendFrom: from })
      expect(body.from_valid, from).toBe(esperado)
      // E o veredito é o da função do motor, não uma coincidência dos seis casos acima.
      expect(body.from_valid, from).toBe(isValidFrom(from))
    }
  })
})

describe('DLV-10 — o que a resposta NUNCA carrega', () => {
  it('a chave não aparece no corpo — nem o valor, nem prefixo, nem tamanho', async () => {
    const { body } = await sensor({ resendDevRedirectTo: DESVIO_DE_DEV })
    const serializado = JSON.stringify(body)

    expect(serializado).not.toContain(CHAVE_DE_TESTE)
    // Prefixo e sufixo separados: vazar "as primeiras letras, só para conferir" é vazar.
    expect(serializado).not.toContain(CHAVE_DE_TESTE.slice(0, 8))
    expect(serializado).not.toContain(CHAVE_DE_TESTE.slice(-8))
    // E o tamanho, que sozinho já estreita uma busca — nenhum campo o carrega como valor.
    expect(Object.values(body)).not.toContain(CHAVE_DE_TESTE.length)
  })

  it('o endereço do desvio de desenvolvimento não aparece — dele sai só o booleano', async () => {
    const { body } = await sensor({ resendDevRedirectTo: DESVIO_DE_DEV })

    expect(JSON.stringify(body)).not.toContain(DESVIO_DE_DEV)
    expect(body.dev_redirect_active).toBe(true)
  })

  it('o conjunto de chaves é EXATAMENTE as sete — nenhuma a mais', async () => {
    const { body } = await sensor({ resendDevRedirectTo: DESVIO_DE_DEV })

    // Igualdade de chaves, nunca "contém as sete": uma régua de presença aprovaria a oitava, que é
    // justamente o campo que alguém acrescentaria "só para depurar" e que levaria o segredo junto.
    expect(Object.keys(body).sort()).toEqual([...CHAVES_DO_CONTRATO].sort())
  })

  it('env vazia não faz chave SUMIR — `undefined` desaparece do JSON e viraria campo ausente', async () => {
    const { body } = await sensor({ resendFrom: undefined, storePublicUrl: undefined, adminPublicUrl: undefined })

    expect(Object.keys(body).sort()).toEqual([...CHAVES_DO_CONTRATO].sort())
    expect(body.from).toBe('')
    expect(body.store_public_url).toBe('')
    expect(body.admin_public_url).toBe('')
  })
})

describe('DLV-05 — a porta: aberta, síncrona e sem I/O', () => {
  it('responde 200 SEM header `Authorization` — é diagnóstico, não autorização', async () => {
    const requisicao = new Request('http://local/functions/v1/send-notification?action=config-check')
    expect(requisicao.headers.get('Authorization')).toBeNull()

    const response = await route(depsDeSensor(), requisicao)

    expect(response.status).toBe(200)
    expect((await response.json()).from).toBe('Adri - Uma Estrelinha <adri@loja.umaestrelinha.com.br>')
  })

  it('200 mesmo com TODA a configuração ruim — um 4xx confundiria "mal configurada" com "fora"', async () => {
    const { response, body } = await sensor({
      resendApiKey: '',
      resendFrom: 'nao-e-endereco',
      storePublicUrl: 'http://localhost:8082',
      resendDevRedirectTo: DESVIO_DE_DEV,
    })

    expect(response.status).toBe(200)
    expect(body.from_valid).toBe(false)
    expect(body.has_api_key).toBe(false)
    expect(body.dev_redirect_active).toBe(true)
  })

  it('não toca no client do Supabase nem na rede, e devolve a Response sem promessa no caminho', () => {
    // `configCheck` direto, sem `route`: é a assinatura SÍNCRONA que a AC cobra, e um `await` aqui
    // esconderia uma promessa pendente. As duas armadilhas de `depsDeSensor` fazem o resto.
    const response = configCheck(depsDeSensor())

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
  })

  it('a resposta carrega CORS — o sensor lê de outra origem', async () => {
    const { response } = await sensor()

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
