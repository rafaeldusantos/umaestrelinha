import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeFetch, createFakeSupabase, type FetchRoute } from '../../_shared/testing/fakes.ts'
import { route, send } from '../handlers.ts'
import type { EmailEnv } from '../sender.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const ADMIN = { id: 'a1b2c3d4-0000-4000-8000-000000000001' }
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-sem-sub.assinatura'

const ENV: EmailEnv = {
  resendApiKey: 're_test_key',
  resendFrom: 'Uma Estrelinha <onboarding@resend.dev>',
  storePublicUrl: 'https://umaestrelinha.com.br',
}

const OK_ROUTE: FetchRoute = { match: 'api.resend.com', body: { id: 'msg-abc-123' } }

function orderRow(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    order_number: 'NP-ABC123',
    customer_name: 'Mariana Souza',
    customer_email: 'mariana@example.com',
    status: 'pending',
    payment_status: 'approved',
    paid_at: '2026-07-30T12:00:00Z',
    mp_order_id: 'ORDTST01KYM',
    tracking_code: null,
    shipping_carrier: null,
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
    order_items: [{ product_name: 'Botton Naruto', size: 'M', finish: 'Fosco', quantity: 2, unit_price: 12 }],
    ...over,
  }
}

interface SetupOptions {
  user?: { id: string } | null
  isAdmin?: boolean
  order?: Record<string, unknown> | null
  claimId?: string | null
  routes?: FetchRoute[]
  env?: Partial<EmailEnv>
  rpcByFn?: Record<string, { data?: unknown; error?: unknown }>
}

function setup(options: SetupOptions = {}) {
  const supabase = createFakeSupabase({
    user: options.user === undefined ? ADMIN : options.user,
    rows: { orders: options.order === undefined ? orderRow() : options.order },
    rpcByFn: {
      has_role: { data: options.isAdmin ?? true },
      claim_order_email: { data: options.claimId === undefined ? 'claim-row-1' : options.claimId },
      finish_order_email: { data: null },
      ...(options.rpcByFn ?? {}),
    },
  })
  const fetchDouble = createFakeFetch(options.routes ?? [OK_ROUTE])
  const deps = {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: { ...ENV, ...(options.env ?? {}) },
  }
  return { supabase, fetchDouble, deps }
}

function request(body: unknown, jwt: string | null = 'jwt-do-admin') {
  return new Request('http://local/functions/v1/send-email?action=send', {
    method: 'POST',
    headers: jwt ? { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' } : {},
    body: JSON.stringify(body),
  })
}

const paidBody = { type: 'order_paid', order_id: ORDER_ID }

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

// -------------------------------------------------------------------------------------------------
// CORS e roteamento
// -------------------------------------------------------------------------------------------------

describe('EML-08 — OPTIONS e action inválida', () => {
  it('OPTIONS → 200 com CORS, sem tocar em nenhuma action', async () => {
    const { deps, fetchDouble, supabase } = setup()

    const response = await route(deps, new Request('http://local/functions/v1/send-email', { method: 'OPTIONS' }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('action desconhecida → 400 com a chave única `error`, sem chamada externa', async () => {
    const { deps, fetchDouble } = setup()

    const response = await route(deps, new Request('http://local/functions/v1/send-email?action=xpto'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'action inválida. Use: send' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('a resposta de erro carrega os headers de CORS — o backoffice chama de outra origem (:8081)', async () => {
    const { deps } = setup()

    const response = await route(deps, request(paidBody, null))

    expect(response.status).toBe(401)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

// -------------------------------------------------------------------------------------------------
// Autorização — cada guard prova status E zero chamadas externas
// -------------------------------------------------------------------------------------------------

describe('EML-03 / EML-04 — autorização admin-only', () => {
  it('sem header Authorization → 401 e zero chamadas ao Resend', async () => {
    const { deps, fetchDouble, supabase } = setup()

    const response = await send(deps, request(paidBody, null), paidBody)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Não autenticado' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('anon key como bearer → getUser não devolve usuário → 401 e zero chamadas', async () => {
    // A anon key É um JWT válido do projeto, mas não tem `sub` — é o caso que fecha o navegador da loja.
    const { deps, fetchDouble } = setup({ user: null })

    const response = await send(deps, request(paidBody, ANON_JWT), paidBody)

    expect(response.status).toBe(401)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('cliente logado que não é admin → 403 e zero chamadas ao Resend', async () => {
    const { deps, fetchDouble, supabase } = setup({ isAdmin: false })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'Acesso restrito ao admin' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(0)
  })

  it('falha da RPC has_role fecha o acesso (403) e loga distinto, em vez de virar mistério', async () => {
    const lines = captureLogs()
    const { deps, fetchDouble } = setup({ rpcByFn: { has_role: { error: { message: 'boom' } } } })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(403)
    expect(fetchDouble.calls).toHaveLength(0)
    expect(lines.some((l) => l.status === 'admin_check_failed')).toBe(true)
  })

  it('a checagem de papel usa a função canônica has_role com o id do usuário', async () => {
    const { deps, supabase } = setup()

    await send(deps, request(paidBody), paidBody)

    expect(supabase.rpcs[0]).toEqual({
      fn: 'has_role',
      args: { _user_id: ADMIN.id, _role: 'admin' },
    })
  })
})

// -------------------------------------------------------------------------------------------------
// Validação de payload e precedência
// -------------------------------------------------------------------------------------------------

describe('EML-05 / EML-06 — validação do payload', () => {
  it.each([
    ['ausente', undefined],
    ['desconhecido', 'order_refunded'],
    ['não-string', 42],
    ['vazio', ''],
  ])('type %s → 400, sem leitura de pedido e sem chamada ao Resend', async (_label, type) => {
    const { deps, fetchDouble, supabase } = setup()
    const body = { type, order_id: ORDER_ID }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('type inválido')
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(0)
  })

  it.each([
    ['ausente', undefined],
    ['não-uuid', 'abc'],
    ['numérico', 123],
    ['uuid truncado', '5b8f0b1e-9c2a-4f37-8a11'],
  ])('order_id %s → 400 e zero chamadas ao Resend', async (_label, orderId) => {
    const { deps, fetchDouble } = setup()
    const body = { type: 'order_paid', order_id: orderId }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('order_id')
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('EML-02: autorização vence validação — não-admin com type inválido responde 403, não 400', async () => {
    const { deps } = setup({ isAdmin: false })
    const body = { type: 'order_refunded', order_id: 'nem-uuid-e' }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(403)
  })

  it('EML-01: to/subject/html/from mandados pelo chamador são IGNORADOS', async () => {
    const { deps, fetchDouble } = setup()
    const body = {
      ...paidBody,
      to: 'atacante@evil.com',
      subject: 'Assunto injetado',
      html: '<p>corpo injetado</p>',
      from: 'spoof@evil.com',
    }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(200)
    const sent = fetchDouble.calls[0].body
    expect(sent.to).toBe('mariana@example.com')
    expect(sent.from).toBe('Uma Estrelinha <onboarding@resend.dev>')
    expect(sent.subject).not.toContain('injetado')
    expect(sent.html).not.toContain('corpo injetado')
  })
})

// -------------------------------------------------------------------------------------------------
// Existência e pré-condição de estado
// -------------------------------------------------------------------------------------------------

describe('EML-07 / EML-09 / EML-10 — estado do pedido manda', () => {
  it('pedido inexistente → 404 e zero chamadas ao Resend', async () => {
    const { deps, fetchDouble, supabase } = setup({ order: null })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Pedido não encontrado' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(0)
  })

  it.each([
    ['order_paid', 'sem paid_at', { paid_at: null }, 'order_not_paid'],
    ['order_received', 'já aprovado', { payment_status: 'approved' }, 'order_not_pending'],
    ['order_received', 'sem mp_order_id', { payment_status: 'pending', mp_order_id: null }, 'no_mp_order'],
    ['order_shipped', 'status não é shipped', { status: 'paid', tracking_code: 'NA1' }, 'order_not_shipped'],
    ['order_shipped', 'sem rastreio', { status: 'shipped', tracking_code: null }, 'no_tracking_code'],
    ['order_shipped', 'rastreio em branco', { status: 'shipped', tracking_code: '   ' }, 'no_tracking_code'],
  ])('%s com %s → 422 (%s), SEM linha de claim e sem chamada ao Resend', async (type, _label, over, expected) => {
    const { deps, fetchDouble, supabase } = setup({ order: orderRow(over) })
    const body = { type, order_id: ORDER_ID }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(422)
    expect((await response.json()).error).toContain(expected)
    // Sem claim é o que mantém a tentativa RETENTÁVEL quando o estado completar (par status+rastreio).
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(0)
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it.each([
    ['order_paid', { paid_at: '2026-07-30T12:00:00Z' }],
    ['order_received', { payment_status: 'pending', mp_order_id: 'ORDTST01', paid_at: null }],
    ['order_shipped', { status: 'shipped', tracking_code: 'NA123456789BR' }],
  ])('%s com o estado exigido → 200 e um envio', async (type, over) => {
    const { deps, fetchDouble } = setup({ order: orderRow(over) })
    const body = { type, order_id: ORDER_ID }

    const response = await send(deps, request(body), body)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sent: true, id: 'msg-abc-123' })
    expect(fetchDouble.calls).toHaveLength(1)
  })
})

// -------------------------------------------------------------------------------------------------
// Idempotência
// -------------------------------------------------------------------------------------------------

describe('IDM-03 / IDM-07 — reivindicação e dedupe', () => {
  it('claim devolvendo null (já enviado) → 200 already_sent e ZERO chamadas ao Resend', async () => {
    const { deps, fetchDouble } = setup({ claimId: null })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sent: false, skipped: 'already_sent' })
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('o claim é feito com order_id e type, antes do envio', async () => {
    const { deps, supabase } = setup()

    await send(deps, request(paidBody), paidBody)

    expect(supabase.rpcs.find((r) => r.fn === 'claim_order_email')).toEqual({
      fn: 'claim_order_email',
      args: { p_order_id: ORDER_ID, p_type: 'order_paid' },
    })
  })

  it('IDM-07: manda Idempotency-Key derivada do par (order_id, type)', async () => {
    const { deps, fetchDouble } = setup()

    await send(deps, request(paidBody), paidBody)

    expect(fetchDouble.calls[0].headers['Idempotency-Key']).toBe(`order-email:${ORDER_ID}:order_paid`)
  })

  it('falha da RPC de claim não envia e devolve reason claim_failed', async () => {
    const { deps, fetchDouble } = setup({ rpcByFn: { claim_order_email: { error: { message: 'deadlock' } } } })

    const response = await send(deps, request(paidBody), paidBody)

    expect(await response.json()).toEqual({ sent: false, reason: 'claim_failed' })
    expect(fetchDouble.calls).toHaveLength(0)
  })
})

// -------------------------------------------------------------------------------------------------
// Envelope do Resend e desfecho
// -------------------------------------------------------------------------------------------------

describe('EML-11 — sucesso', () => {
  it('monta o POST no endpoint certo, com auth e content-type', async () => {
    const { deps, fetchDouble } = setup()

    await send(deps, request(paidBody), paidBody)

    const call = fetchDouble.calls[0]
    expect(call.url).toBe('https://api.resend.com/emails')
    expect(call.method).toBe('POST')
    expect(call.headers.Authorization).toBe('Bearer re_test_key')
    expect(call.headers['Content-Type']).toBe('application/json')
  })

  it('manda from, to, subject, html E text', async () => {
    const { deps, fetchDouble } = setup()

    await send(deps, request(paidBody), paidBody)

    const sent = fetchDouble.calls[0].body
    expect(sent.from).toBe('Uma Estrelinha <onboarding@resend.dev>')
    expect(sent.to).toBe('mariana@example.com')
    expect(sent.subject).toBe('Pagamento aprovado — pedido NP-ABC123')
    expect(sent.html).toContain('Pagamento aprovado!')
    expect(sent.text).toContain('Pedido NP-ABC123')
  })

  it('persiste provider_message_id via finish_order_email', async () => {
    const { deps, supabase } = setup()

    await send(deps, request(paidBody), paidBody)

    expect(supabase.rpcs.find((r) => r.fn === 'finish_order_email')).toEqual({
      fn: 'finish_order_email',
      args: { p_id: 'claim-row-1', p_provider_message_id: 'msg-abc-123', p_error: null },
    })
  })

  it('201 é sucesso — o status de sucesso não é documentado, então qualquer 2xx vale', async () => {
    const { deps } = setup({ routes: [{ match: 'api.resend.com', status: 201, body: { id: 'msg-201' } }] })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sent: true, id: 'msg-201' })
  })

  it('2xx sem `id` no corpo não é tratado como enviado', async () => {
    const { deps, supabase } = setup({ routes: [{ match: 'api.resend.com', status: 200, body: {} }] })

    const response = await send(deps, request(paidBody), paidBody)

    expect(await response.json()).toEqual({ sent: false, reason: 'resend_no_id' })
    const finish = supabase.rpcs.find((r) => r.fn === 'finish_order_email')
    expect(finish!.args.p_error).toContain('sem `id`')
  })
})

describe('EML-12 / RSD-01 / RSD-02 — desfechos de falha do provedor', () => {
  it.each([
    [401, 'missing_api_key', 'resend_unauthorized'],
    [403, 'validation_error', 'resend_forbidden'],
    [400, 'validation_error', 'resend_invalid'],
    [422, 'invalid_from_address', 'resend_invalid'],
    [429, 'rate_limit_exceeded', 'resend_rate_limited'],
    [429, 'daily_quota_exceeded', 'resend_quota_exceeded'],
    [429, 'monthly_quota_exceeded', 'resend_quota_exceeded'],
    [409, 'invalid_idempotent_request', 'resend_duplicate'],
    [500, 'application_error', 'resend_unavailable'],
    [503, 'application_error', 'resend_unavailable'],
  ])('HTTP %s (%s) → reason %s, linha em failed, e UMA só tentativa', async (status, name, expected) => {
    const { deps, fetchDouble, supabase } = setup({
      routes: [{ match: 'api.resend.com', status, body: { statusCode: status, name, message: 'detalhe' } }],
    })

    const response = await send(deps, request(paidBody), paidBody)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sent: false, reason: expected })
    // RSD-02: nunca retenta dentro da requisição.
    expect(fetchDouble.calls).toHaveLength(1)
    const finish = supabase.rpcs.find((r) => r.fn === 'finish_order_email')
    expect(finish!.args.p_provider_message_id).toBeNull()
    expect(finish!.args.p_error).toContain(String(status))
  })

  it('429 sem `name` no corpo cai em rate_limited — a shape do erro não é documentada', async () => {
    const { deps } = setup({ routes: [{ match: 'api.resend.com', status: 429, body: {} }] })

    expect(await (await send(deps, request(paidBody), paidBody)).json()).toEqual({
      sent: false,
      reason: 'resend_rate_limited',
    })
  })

  it('corpo não-JSON num erro não derruba o handler', async () => {
    const { deps } = setup({
      routes: [{ match: 'api.resend.com', status: 502, rawBody: '<html>gateway</html>' }],
    })

    expect(await (await send(deps, request(paidBody), paidBody)).json()).toEqual({
      sent: false,
      reason: 'resend_unavailable',
    })
  })

  it('queda de rede → resend_unavailable, linha em failed, pedido intacto', async () => {
    const { deps, supabase } = setup({ routes: [{ match: 'api.resend.com', networkError: true }] })

    const response = await send(deps, request(paidBody), paidBody)

    expect(await response.json()).toEqual({ sent: false, reason: 'resend_unavailable' })
    expect(supabase.rpcs.find((r) => r.fn === 'finish_order_email')!.args.p_error).toBeTruthy()
  })
})

// -------------------------------------------------------------------------------------------------
// Env e log
// -------------------------------------------------------------------------------------------------

describe('CFG-03 / CFG-04 — env', () => {
  it('CFG-03: RESEND_FROM malformado não envia nada — apagão silencioso é pior que erro visível', async () => {
    const { deps, fetchDouble, supabase } = setup({ env: { resendFrom: 'Uma Estrelinha <sem-arroba>' } })

    const response = await send(deps, request(paidBody), paidBody)

    expect(await response.json()).toEqual({ sent: false, reason: 'invalid_from' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(0)
  })

  it('CFG-04: RESEND_DEV_REDIRECT_TO troca o destinatário e prefixa o assunto com o real', async () => {
    const { deps, fetchDouble } = setup({ env: { resendDevRedirectTo: 'dev@umaestrelinha.com.br' } })

    await send(deps, request(paidBody), paidBody)

    const sent = fetchDouble.calls[0].body
    expect(sent.to).toBe('dev@umaestrelinha.com.br')
    expect(sent.subject).toBe('[dev → mariana@example.com] Pagamento aprovado — pedido NP-ABC123')
  })

  it('CFG-04: env vazia ou só com espaços não altera o destinatário', async () => {
    for (const value of ['', '   ', undefined]) {
      const { deps, fetchDouble } = setup({ env: { resendDevRedirectTo: value } })

      await send(deps, request(paidBody), paidBody)

      expect(fetchDouble.calls[0].body.to).toBe('mariana@example.com')
      expect(fetchDouble.calls[0].body.subject).not.toContain('[dev')
    }
  })

  it('STORE_PUBLIC_URL alimenta o link do e-mail', async () => {
    const { deps, fetchDouble } = setup({ env: { storePublicUrl: 'https://loja.exemplo.com/' } })

    await send(deps, request(paidBody), paidBody)

    expect(fetchDouble.calls[0].body.html).toContain('href="https://loja.exemplo.com/conta"')
  })
})

describe('EML-13 — o log não vaza PII', () => {
  it('sucesso: loga order_id, type, status e provider_message_id — nunca o destinatário', async () => {
    const lines = captureLogs()
    const { deps } = setup()

    await send(deps, request(paidBody), paidBody)

    const sent = lines.find((l) => l.status === 'sent')!
    expect(sent).toMatchObject({
      action: 'send-email',
      order_id: ORDER_ID,
      type: 'order_paid',
      provider_message_id: 'msg-abc-123',
    })
    expect(JSON.stringify(lines)).not.toContain('mariana@example.com')
  })

  it('403 do Resend: a mensagem ecoa o e-mail do destinatário, e ela NÃO entra no log', async () => {
    const lines = captureLogs()
    const { deps } = setup({
      routes: [
        {
          match: 'api.resend.com',
          status: 403,
          body: {
            statusCode: 403,
            name: 'validation_error',
            message: 'You can only send testing emails to your own email address (mariana@example.com).',
          },
        },
      ],
    })

    await send(deps, request(paidBody), paidBody)

    expect(lines.some((l) => l.status === 'resend_forbidden')).toBe(true)
    expect(JSON.stringify(lines)).not.toContain('mariana@example.com')
    expect(JSON.stringify(lines)).not.toContain('You can only send')
  })

  it('a pré-condição que falhou aparece no log, para diagnóstico', async () => {
    const lines = captureLogs()
    const { deps } = setup({ order: orderRow({ paid_at: null }) })

    await send(deps, request(paidBody), paidBody)

    expect(lines.find((l) => l.status === 'precondition_failed')).toMatchObject({
      precondition: 'order_not_paid',
    })
  })
})
