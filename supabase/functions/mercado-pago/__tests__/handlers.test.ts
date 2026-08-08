import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPayment, route, webhook } from '../handlers.ts'
// STA-03 exige "mensagem que instrua a trocar de meio". A resposta ao front não carrega texto: ela
// carrega `status_detail`, e a loja o traduz com `friendlyMessage`. Importar a mesma função que a
// loja usa fecha a corrente inteira — sem isso, a AC fica satisfeita "por acidente" do fallback.
import { friendlyMessage } from '../../../../packages/core/src/payment/status.ts'
import { createDeps, createFakeFetch, createFakeSupabase, TEST_ENV } from './fakes.ts'

// Smoke tests do harness (T7). Escolhidos por serem verdadeiros ANTES e DEPOIS da migração para a
// API de Orders — não é teste descartável: nenhum dos dois muda de resposta quando o endpoint troca.
//
//   1. roteamento por `action` (o 400 de action desconhecida)
//   2. PAY-05 / WHK-02: webhook sem assinatura é rejeitado ANTES de qualquer consulta ao MP

const deps = () => createDeps(createFakeSupabase(), createFakeFetch())

describe('route — action inválida', () => {
  it.each([
    ['sem action', 'http://local/functions/v1/mercado-pago'],
    ['action desconhecida', 'http://local/functions/v1/mercado-pago?action=refund'],
  ])('%s → 400 com a lista de actions válidas', async (_label, url) => {
    const response = await route(deps(), new Request(url))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'action inválida. Use: create-payment, webhook',
    })
  })

  it('OPTIONS → 200 com CORS, sem tocar em nenhuma action', async () => {
    const response = await route(
      deps(),
      new Request('http://local/functions/v1/mercado-pago', { method: 'OPTIONS' }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

describe('webhook — assinatura ausente ou inválida (PAY-05, WHK-02)', () => {
  const webhookRequest = (headers: Record<string, string> = {}) =>
    new Request('http://local/functions/v1/mercado-pago?action=webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ type: 'payment', data: { id: '123' } }),
    })

  it('sem x-signature → 401 e NENHUMA chamada ao Mercado Pago', async () => {
    const fetchDouble = createFakeFetch()
    const response = await webhook(
      createDeps(createFakeSupabase(), fetchDouble),
      webhookRequest(),
      new URL('http://local/functions/v1/mercado-pago?action=webhook'),
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Assinatura inválida' })
    // O ponto do requisito: rejeita ANTES de consultar o MP, não depois.
    expect(fetchDouble.calls).toHaveLength(0)
  })

  it('x-signature com v1 que não bate com o segredo → 401', async () => {
    const fetchDouble = createFakeFetch()
    const response = await webhook(
      createDeps(createFakeSupabase(), fetchDouble),
      webhookRequest({ 'x-signature': 'ts=1700000000,v1=deadbeef', 'x-request-id': 'req-1' }),
      new URL('http://local/functions/v1/mercado-pago?action=webhook&data.id=123'),
    )

    expect(response.status).toBe(401)
    expect(fetchDouble.calls).toHaveLength(0)
  })
})

// =============================================================================================
// create-payment — fixtures compartilhadas (T8+)
// =============================================================================================

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const USER_ID = 'auth-user-1'
const PRODUCT_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
/** Produto da oferta do order bump — o mesmo uuid usado no cenário 4 do T16 (Among Us, R$ 4,90). */
const BUMP_PRODUCT_ID = 'ea3e07dd-2b07-48f0-bf8e-7e82075a6fa7'
const COUPON_ID = 'a7f3c1d2-4e5b-4a6c-9d8e-1f2a3b4c5d6e'
// Formatos MEDIDOS em sandbox no T16 (D8): a order é `ORDTST01K…` (maiúscula, prefixo de sandbox) e
// o payment é `PAY01K…` — não `01J…`/`pay_…` como a spec supunha. O caixa importa: é o que
// derrubou a assinatura do webhook (D2).
const MP_ORDER_ID = 'ORDTST01KYMAZV96DKQHXSZB5FG0K86E'
const MP_PAYMENT_ID = 'PAY01KYMAZV9MY6S2FZAC6FASWTYG'
/** CPF válido no dígito verificador — `buildPayer` só emite `identification` se passar. */
const ORDER_CPF = '39053344705'
/** Mesmo CPF com o último dígito verificador trocado: 11 dígitos, DV errado. */
const INVALID_CPF = '39053344704'
/**
 * O nome do pagador vem de `customers.name`, **não** de `orders.customer_name` (PGD-04). A fixture
 * mantém os dois diferentes de propósito: com nomes iguais, ler a coluna errada seria indistinguível.
 */
const CUSTOMER_NAME = 'Mariana Souza Lima'
const PAYER_FIRST_NAME = 'Mariana'
const PAYER_LAST_NAME = 'Souza Lima'

const ORDERS_ENDPOINT = 'https://api.mercadopago.com/v1/orders'

/** `products.base_price` (24) × quantity (2) — o `unit_price` de `order_items` é descartado. */
const EXPECTED_TOTAL = '48.00'

function paymentRows(orderOverrides: Record<string, unknown> = {}) {
  return {
    orders: {
      id: ORDER_ID,
      customer_id: 'cust-1',
      customer_email: 'nana@nanapin.test',
      customer_name: 'Nana Pin',
      payment_status: 'pending',
      shipping_cost: 0,
      coupon_id: null,
      mp_order_id: null,
      ...orderOverrides,
    },
    customers: { user_id: USER_ID, cpf: ORDER_CPF, name: CUSTOMER_NAME },
    // Sem bump e sem desconto PIX configurados: `store_settings` vazio nas duas leituras.
    store_settings: null,
  }
}

const paymentLists = {
  order_items: [{ product_id: PRODUCT_ID, quantity: 2, unit_price: 20 }],
  products: [{ id: PRODUCT_ID, base_price: 24 }],
}

const pixBody = { order_id: ORDER_ID, method: 'pix', idempotency_key: 'idem-abc' }

const cardBody = {
  order_id: ORDER_ID,
  method: 'card',
  idempotency_key: 'idem-abc',
  card: {
    token: 'card-token-xyz',
    payment_method_id: 'master',
    installments: 3,
    // CPF do Brick divergente do pedido — o do servidor tem de vencer (PGD-04).
    payer: { email: 'brick@nanapin.test', identification: { type: 'CPF', number: '00000000191' } },
  },
}

const paymentRequest = () =>
  new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-de-teste', 'Content-Type': 'application/json' },
  })

/** Resposta 2xx de `POST /v1/orders` — PIX aguardando transferência (caminho feliz). */
function mpOrderResponse(over: Record<string, unknown> = {}) {
  return {
    id: MP_ORDER_ID,
    status: 'action_required',
    status_detail: 'waiting_transfer',
    external_reference: ORDER_ID,
    expiration_time: '2026-07-28T12:30:00.000-03:00',
    transactions: {
      payments: [
        {
          id: MP_PAYMENT_ID,
          payment_method: { qr_code: 'PIX-COPIA-E-COLA', qr_code_base64: 'cXItYmFzZTY0' },
        },
      ],
    },
    ...over,
  }
}

describe('create-payment → POST /v1/orders (ORD-01…ORD-05)', () => {
  it('ORD-01/ORD-02/ORD-04: PIX vai para /v1/orders com o envelope da order e amount string', async () => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      pixBody,
    )

    const call = fetchDouble.calls.at(-1)!
    expect(call.url).toBe(`${ORDERS_ENDPOINT}`)
    expect(call.method).toBe('POST')
    expect(call.body.type).toBe('online')
    expect(call.body.processing_mode).toBe('automatic')
    expect(call.body.external_reference).toBe(ORDER_ID)
    expect(call.body.expiration_time).toBe('PT30M')
    // ORD-02: string com 2 casas, e os dois campos idênticos entre si.
    expect(call.body.total_amount).toBe(EXPECTED_TOTAL)
    expect(call.body.transactions.payments[0].amount).toBe(EXPECTED_TOTAL)
    // ORD-04
    expect(call.body.transactions.payments[0].payment_method).toEqual({
      id: 'pix',
      type: 'bank_transfer',
    })
    expect(call.body).not.toHaveProperty('date_of_expiration')
  })

  // PGD-04 no caminho PIX. Não é redundante com o cartão: o PIX é justamente o método que o MP
  // recusa quando o pagador não está identificado, e é o único onde o `payer` vem inteiro do
  // servidor (sem `mergePayer`). Asserção por VALOR e com `toEqual`, não pela presença da chave —
  // travar só a chave deixa passar um `payer: { email }` sem `identification`, que o MP rejeita.
  it('PGD-04: o PIX leva payer completo na raiz — CPF e nome derivados de customers', async () => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      pixBody,
    )

    const call = fetchDouble.calls.at(-1)!
    expect(call.body.payer).toEqual({
      email: 'nana@nanapin.test',
      // De `customers.name` ('Mariana Souza Lima'), não de `orders.customer_name` ('Nana Pin').
      first_name: PAYER_FIRST_NAME,
      last_name: PAYER_LAST_NAME,
      identification: { type: 'CPF', number: ORDER_CPF },
    })
    // O `payer` é da order (raiz), nunca do payment.
    expect(call.body.transactions.payments[0]).not.toHaveProperty('payer')
  })

  it('ORD-03: cartão manda token, installments e type credit_card no payment_method', async () => {
    const fetchDouble = createFakeFetch([
      { match: '/v1/orders', body: mpOrderResponse({ status: 'processed', status_detail: 'accredited' }) },
    ])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      cardBody,
    )

    const call = fetchDouble.calls.at(-1)!
    expect(call.body.transactions.payments[0].payment_method).toEqual({
      id: 'master',
      type: 'credit_card',
      token: 'card-token-xyz',
      installments: 3,
      // No Orders o descritor de fatura vive aqui, não na raiz da order (ORD-03).
      statement_descriptor: 'NANITA',
    })
    // PGD-04: o CPF do pedido sobrescreve o que veio do Brick, e o payer fica na RAIZ da order.
    // `toEqual` do objeto inteiro: o nome também é do servidor, e o email do Brick é preservado.
    expect(call.body.payer).toEqual({
      email: 'brick@nanapin.test',
      first_name: PAYER_FIRST_NAME,
      last_name: PAYER_LAST_NAME,
      identification: { type: 'CPF', number: ORDER_CPF },
    })
    expect(call.body.transactions.payments[0]).not.toHaveProperty('payer')
  })

  it('ORD-05: envia X-Idempotency-Key com a chave recebida do cliente', async () => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      pixBody,
    )

    const call = fetchDouble.calls.at(-1)!
    expect(call.headers['X-Idempotency-Key']).toBe('idem-abc')
    expect(call.headers['Authorization']).toBe('Bearer APP_USR-test-token')
  })

  // Regressão do bloqueador D1 (medido no T16): a Orders API valida o corpo por SCHEMA FECHADO —
  // qualquer propriedade extra na raiz derruba a requisição inteira com `unsupported_properties`.
  // `notification_url` era legítimo na raiz da Payments API e foi carregado por herança; o MP
  // devolveu 400 `additionalProperties '$.notification_url' not allowed` e nenhum pagamento
  // acontecia. Este teste trava a raiz por igualdade de chaves: qualquer campo novo acrescentado
  // ao corpo sem passar por `buildOrderPayload` quebra aqui, e não em produção.
  it.each([
    ['PIX', () => pixBody],
    ['cartão', () => cardBody],
  ])('D1: corpo enviado tem SÓ as chaves de raiz aceitas pela Orders API (%s)', async (_l, body) => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      body(),
    )

    const call = fetchDouble.calls.at(-1)!
    expect(Object.keys(call.body).sort()).toEqual([
      'expiration_time',
      'external_reference',
      'payer',
      'processing_mode',
      'total_amount',
      'transactions',
      'type',
    ])
    expect(call.body).not.toHaveProperty('notification_url')
    // No Orders o descritor vive em payment_method (ver orders.test.ts), nunca na raiz.
    expect(call.body).not.toHaveProperty('statement_descriptor')
  })
})

/** Captura o log estruturado (uma linha JSON por `console.log`) para as asserções de LOG-01. */
function captureLogs() {
  const lines: string[] = []
  vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    lines.push(String(line))
  })
  return lines
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('create-payment — persistência, resposta e erros do MP (ORD-06, ORD-07, PER-02/03, LOG-01)', () => {
  const okDeps = (fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])) => ({
    supabase: createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
    fetchDouble,
  })

  it('PER-02: grava mp_order_id (ORDTST01K…) e mp_payment_id (PAY01K…) antes de responder', async () => {
    const { supabase, fetchDouble } = okDeps()
    const response = await createPayment(
      createDeps(supabase, fetchDouble),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(200)
    const idsUpdate = supabase.updates.find((u) => 'mp_order_id' in u.values)
    expect(idsUpdate).toBeDefined()
    expect(idsUpdate!.table).toBe('orders')
    expect(idsUpdate!.eq).toEqual(['id', ORDER_ID])
    expect(idsUpdate!.values).toEqual(
      expect.objectContaining({ mp_order_id: MP_ORDER_ID, mp_payment_id: MP_PAYMENT_ID }),
    )
  })

  // ORD-06 reescrito (D5): `expires_at` é CALCULADO (now + 30 min), não o `expiration_time` da
  // resposta — o MP ecoa a duração `"PT30M"` que recebeu, e `new Date("PT30M")` é Invalid Date, o
  // que zerava o cronômetro do PIX na tela. Só `Date` é falseado: fingir setTimeout/setImmediate
  // travaria a leitura do corpo da Response.
  it('ORD-06/D5: PIX responde qr_code, qr_code_base64 e expires_at resolvido (now + 30 min)', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-07-28T12:00:00.000Z') })
    try {
      const { supabase, fetchDouble } = okDeps(
        // O MP ecoando a duração — exatamente o corpo medido no T16.
        createFakeFetch([
          { match: '/v1/orders', body: mpOrderResponse({ expiration_time: 'PT30M' }) },
        ]),
      )
      const response = await createPayment(
        createDeps(supabase, fetchDouble),
        paymentRequest(),
        pixBody,
      )

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({
        qr_code: 'PIX-COPIA-E-COLA',
        qr_code_base64: 'cXItYmFzZTY0',
        expires_at: '2026-07-28T12:30:00.000Z',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('D5: o echo "PT30M" do MP nunca chega ao expires_at da loja', async () => {
    const { supabase, fetchDouble } = okDeps(
      createFakeFetch([
        { match: '/v1/orders', body: mpOrderResponse({ expiration_time: 'PT30M' }) },
      ]),
    )
    const response = await createPayment(
      createDeps(supabase, fetchDouble),
      paymentRequest(),
      pixBody,
    )

    const body = await response.json()
    expect(body.expires_at).not.toBe('PT30M')
    // O que a tela faz com o campo: `new Date(expires_at).getTime()`. Não pode ser NaN.
    expect(Number.isNaN(new Date(body.expires_at).getTime())).toBe(false)
  })

  it.each([
    ['5xx do MP', { match: '/v1/orders', status: 500, body: { message: 'internal' } }],
    ['MP inalcançável (rede)', { match: '/v1/orders', networkError: true }],
    ['2xx sem id de order', { match: '/v1/orders', status: 201, body: { status: 'created' } }],
    // 5xx é falha de TRANSPORTE mesmo quando o corpo traz uma order: não dá para afirmar o desfecho.
    [
      '5xx com order em data',
      { match: '/v1/orders', status: 503, body: { data: { id: 'ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7' } } },
    ],
  ])('ORD-07: %s → 502 e NENHUMA gravação de mp_order_id', async (_label, route) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(supabase, createFakeFetch([route as never])),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: 'Não foi possível iniciar o pagamento. Tente novamente.',
    })
    // Asserção negativa: id vazio nunca chega ao banco.
    expect(supabase.updates.filter((u) => 'mp_order_id' in u.values)).toHaveLength(0)
  })

  it('ORD-07: 4xx do MP → 400 repassando a message do Mercado Pago', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(
        supabase,
        createFakeFetch([
          { match: '/v1/orders', status: 400, body: { message: 'invalid payer identification' } },
        ]),
      ),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'invalid payer identification' })
    expect(supabase.updates.filter((u) => 'mp_order_id' in u.values)).toHaveLength(0)
  })

  it('ORD-07: 4xx sem message → 400 com a mensagem genérica', async () => {
    const response = await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        createFakeFetch([{ match: '/v1/orders', status: 422, body: { error: 'bad_request' } }]),
      ),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Não foi possível criar o pagamento' })
  })

  // ORD-07, ramo do corpo não parseável. O 400 depende de existir mensagem do MP para repassar;
  // uma página de erro HTML (proxy/WAF na frente da API) não tem nenhuma, e aí o desfecho é
  // desconhecido — mesmo tratamento de indisponibilidade que o 5xx. É o ramo `!mpBody`.
  it('ORD-07: 4xx com corpo NÃO-JSON e sem order → 502, não 400', async () => {
    const lines = captureLogs()
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(
        supabase,
        createFakeFetch([
          {
            match: '/v1/orders',
            status: 403,
            rawBody: '<html><head><title>403 Forbidden</title></head><body>blocked</body></html>',
          },
        ]),
      ),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({
      error: 'Não foi possível iniciar o pagamento. Tente novamente.',
    })
    expect(supabase.updates.filter((u) => 'mp_order_id' in u.values)).toHaveLength(0)
    const entry = lines.map((l) => JSON.parse(l)).find((e) => e.status === 'mp_unavailable')
    expect(entry).toBeDefined()
    expect(entry.mp_http).toBe(403)
  })

  it('PER-03: a RPC recebe o id do PAYMENT em p_mp_payment_id, não o da order', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
      rpc: { data: true },
    })
    await createPayment(
      createDeps(
        supabase,
        createFakeFetch([
          {
            match: '/v1/orders',
            body: mpOrderResponse({ status: 'processed', status_detail: 'accredited' }),
          },
        ]),
      ),
      paymentRequest(),
      cardBody,
    )

    expect(supabase.rpcs).toEqual([
      {
        fn: 'apply_payment_approval',
        args: {
          p_order_id: ORDER_ID,
          p_mp_payment_id: MP_PAYMENT_ID,
          p_status_detail: 'accredited',
        },
      },
    ])
  })

  it('LOG-01: o log traz mp_order_id e booleanos, e o CPF nunca aparece', async () => {
    const lines = captureLogs()
    const { supabase, fetchDouble } = okDeps()
    await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    const entry = lines
      .map((line) => JSON.parse(line))
      .find((e) => e.action === 'create-payment' && e.mp_order_id)
    expect(entry).toBeDefined()
    expect(entry.mp_order_id).toBe(MP_ORDER_ID)
    expect(entry.bump_applied).toBe(false)
    expect(entry.payer_cpf_present).toBe(true)
    expect(lines.join('\n')).not.toContain(ORDER_CPF)
  })
})

// =============================================================================================
// Guards que antecedem QUALQUER chamada ao Mercado Pago
//
// Coverage Expectation da matriz (`tasks.md`, linha do layer de handlers): "caminho felizes +
// **cada** caminho de erro (401/403/409/422/400/502)". Todos estes ramos rodam antes do `fetch`,
// então o `expect(fetchDouble.calls).toHaveLength(0)` não é decoração: é o requisito. Um guard que
// responde o status certo DEPOIS de criar uma order no MP deixaria uma order órfã por request
// rejeitado.
// =============================================================================================

describe('create-payment — guards antes de qualquer chamada ao MP', () => {
  /** Ambiente inteiro válido; cada caso quebra exatamente uma coisa. */
  const guardEnv = (options: Parameters<typeof createFakeSupabase>[0] = {}) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
      ...options,
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
  }

  /** Requisição sem o header `Authorization` — o resto é idêntico ao `paymentRequest()`. */
  const anonymousRequest = () =>
    new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

  it('401: sem header Authorization → "Não autenticado" e nada sai daqui', async () => {
    const { supabase, fetchDouble, deps } = guardEnv()
    const response = await createPayment(deps, anonymousRequest(), pixBody)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Não autenticado' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  it('401: JWT que o auth.getUser rejeita → "Não autenticado" e nada sai daqui', async () => {
    const { supabase, fetchDouble, deps } = guardEnv({ user: null })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Não autenticado' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  // PAY-10: o pedido é do dono, não de quem manda um uuid válido. As duas formas de não ser dono.
  it.each([
    [
      'customers.user_id de outro usuário',
      { ...paymentRows(), customers: { user_id: 'auth-user-2', cpf: ORDER_CPF, name: CUSTOMER_NAME } },
    ],
    ['pedido sem customer_id (nenhum dono)', { ...paymentRows({ customer_id: null }), customers: null }],
  ])('403: %s → pedido não pertence ao usuário, e nada sai daqui', async (_label, rows) => {
    const { supabase, fetchDouble, deps } = guardEnv({ rows })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'Pedido não pertence ao usuário autenticado',
    })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  it('404: pedido inexistente → "Pedido não encontrado" e nada sai daqui', async () => {
    const { supabase, fetchDouble, deps } = guardEnv({ rows: { ...paymentRows(), orders: null } })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Pedido não encontrado' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  // PAY-02: só `pending`, `rejected` e `expired` podem gerar novo pagamento. `approved` é o caso
  // perigoso — cobrar de novo um pedido já pago.
  it.each([['approved'], ['refunded'], ['cancelled']])(
    '409: payment_status=%s não é retentável, e nada sai daqui',
    async (status) => {
      const { supabase, fetchDouble, deps } = guardEnv({
        rows: paymentRows({ payment_status: status }),
      })
      const response = await createPayment(deps, paymentRequest(), pixBody)

      expect(response.status).toBe(409)
      await expect(response.json()).resolves.toEqual({
        error: `Pedido não pode ser pago (payment_status=${status})`,
      })
      expect(fetchDouble.calls).toHaveLength(0)
      expect(supabase.updates).toHaveLength(0)
    },
  )

  it('422: pedido sem itens → "Pedido sem itens" e nada sai daqui', async () => {
    const { supabase, fetchDouble, deps } = guardEnv({
      lists: { order_items: [], products: [] },
    })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({ error: 'Pedido sem itens' })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  // Edge case da spec: `calculateOrderTotals` LANÇA quando o total fica abaixo de R$ 0,01, e o
  // handler traduz esse throw em 422. Cenário realista: cupom `fixed` que consome o subtotal
  // inteiro e frete zero — 5,00 − 5,00 = 0,00.
  it('422: total abaixo de R$ 0,01 → 422 traduzido do throw, e nada sai daqui', async () => {
    const { supabase, fetchDouble, deps } = guardEnv({
      rows: {
        ...paymentRows({ coupon_id: COUPON_ID, shipping_cost: 0 }),
        coupons: {
          type: 'fixed',
          value: 5,
          active: true,
          valid_from: null,
          valid_until: null,
          max_uses: null,
          used_count: 0,
        },
      },
      lists: {
        order_items: [{ product_id: PRODUCT_ID, quantity: 1, unit_price: 5 }],
        products: [{ id: PRODUCT_ID, base_price: 5 }],
      },
    })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({
      error: 'Total do pedido inválido: menor que R$ 0,01',
    })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  it.each([
    ['method fora de pix|card', { ...pixBody, method: 'boleto' }],
    ['sem idempotency_key', { order_id: ORDER_ID, method: 'pix' }],
    ['sem order_id', { method: 'pix', idempotency_key: 'idem-abc' }],
  ])('400: %s → mensagem de campos obrigatórios, e nada sai daqui', async (_label, body) => {
    const { supabase, fetchDouble, deps } = guardEnv()
    const response = await createPayment(deps, paymentRequest(), body)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'order_id, method (pix|card) e idempotency_key são obrigatórios',
    })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
  })

  it.each([
    ['sem token', { payment_method_id: 'master', installments: 1, payer: { email: 'b@n.test' } }],
    ['sem payment_method_id', { token: 'card-token-xyz', installments: 1, payer: { email: 'b@n.test' } }],
    ['sem payer.email', { token: 'card-token-xyz', payment_method_id: 'master', installments: 1 }],
    ['card ausente', undefined],
  ])('400: dados do cartão incompletos (%s), e nada sai daqui', async (_label, card) => {
    const { supabase, fetchDouble, deps } = guardEnv()
    const response = await createPayment(deps, paymentRequest(), { ...cardBody, card })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Dados do cartão incompletos' })
    expect(fetchDouble.calls).toHaveLength(0)
    // Este guard vem DEPOIS do recálculo, então o `total` já foi persistido — o que não pode
    // acontecer é a order existir no MP.
    expect(supabase.updates.filter((u) => 'mp_order_id' in u.values)).toHaveLength(0)
  })

  it('500: falha ao persistir total/pix_discount → nada é cobrado', async () => {
    const { supabase, fetchDouble, deps } = guardEnv({
      updateError: { message: 'permission denied for table orders' },
    })
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'Falha ao atualizar o pedido' })
    // O ponto: persistir o total é pré-condição de cobrar. Falhou ⇒ não cobra.
    expect(fetchDouble.calls).toHaveLength(0)
  })
})

// PGD-04, a metade que a feature 08 veio corrigir: um PIX sem pagador identificado é recusado pelo
// banco, então o pedido sem CPF válido para ANTES de qualquer I/O. O guard cobre "ausente" e
// "sujo" de uma vez, porque `buildPayer` omite `identification` nos dois casos.
describe('create-payment — guard de CPF do pagador (PGD-04)', () => {
  const CPF_REQUIRED_MESSAGE =
    'Informe um CPF válido para pagar. O Mercado Pago exige o CPF do pagador para emitir o PIX e para processar o cartão.'

  /** As três formas de o CPF não servir × os dois métodos — o AC vale para PIX **e** cartão. */
  const CPF_CASES: Array<[string, string | null]> = [
    ['customers.cpf null', null],
    ['11 dígitos com dígito verificador inválido', INVALID_CPF],
    ['dígitos todos iguais', '11111111111'],
  ]
  const METHOD_CASES: Array<[string, Record<string, unknown>]> = [
    ['PIX', pixBody],
    ['cartão', cardBody],
  ]

  it.each(
    CPF_CASES.flatMap(([cpfLabel, cpf]) =>
      METHOD_CASES.map(
        ([methodLabel, body]) =>
          [`${cpfLabel} · ${methodLabel}`, cpf, body] as [string, string | null, Record<string, unknown>],
      ),
    ),
  )('422 quando o CPF não serve (%s)', async (_label, cpf, body) => {
    const lines = captureLogs()
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: { ...paymentRows(), customers: { user_id: USER_ID, cpf, name: CUSTOMER_NAME } },
      lists: paymentLists,
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), body)

    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toEqual({ error: CPF_REQUIRED_MESSAGE })
    // O ponto do AC: NENHUMA order é criada no MP, e o pedido não é escrito.
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)

    const entry = lines.map((l) => JSON.parse(l)).find((e) => e.status === 'missing_payer_cpf')
    expect(entry).toBeDefined()
    expect(entry.order_id).toBe(ORDER_ID)
    expect(entry.payer_cpf_present).toBe(false)
    // LOG-01: nenhum CPF entra no log — nem o válido, nem o sujo que foi rejeitado.
    const logged = lines.join('\n')
    expect(logged).not.toContain(ORDER_CPF)
    if (cpf) expect(logged).not.toContain(cpf)
  })

  it('contraste: com o CPF válido o mesmo pedido chega ao MP', async () => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    const response = await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(200)
    expect(fetchDouble.calls).toHaveLength(1)
  })
})

// =============================================================================================
// BMP-04 no HANDLER — order bump ligado de verdade, com cupom `percent`
//
// Por que este arquivo e não `displayedEqualsCharged.test.ts`: aquele teste é um **espelho** do
// handler (`serverTotals` reimplementa a chamada), então ele prova a aritmética e é cego para
// deriva do handler real. O erro que ele não vê é o que o `CLAUDE.md` avisa em prosa: passar para
// `calculateOrderTotals` a lista JÁ descontada em vez de `preço cheio + bump`. Como
// `calculateOrderTotals` chama `applyOrderBump` por dentro e essa função **não é idempotente por
// composição**, o desconto entraria duas vezes — o item do bump cairia de 4,90 → 2,45 → 1,23 — e a
// cliente pagaria MENOS do que a tela mostrou. Nada quebraria: os totais seguiriam "coerentes".
//
// Números escolhidos para o valor **mudar** sob a dupla aplicação, e são os do cenário 4 do T16:
//   subtotal com bump 7,35 · cupom 10% ⇒ 0,735, o **meio centavo** que quebrou a igualdade na 08
//   correto: 7,35 − 0,74 − 0,33 (PIX 5%) + 9,90 frete = R$ 16,18  ← medido em sandbox
//   dupla aplicação: subtotal 6,13 ⇒ total R$ 15,02 (PIX) / R$ 15,29 (cartão)
// =============================================================================================

describe('create-payment — order bump + cupom percent: exibido == cobrado (BMP-04)', () => {
  /** `store_settings` é lido duas vezes, por `key` — a fixture discrimina pelo `.eq()`. */
  const bumpRows = (bumpEnabled: boolean) => ({
    ...paymentRows({ shipping_cost: 9.9, coupon_id: COUPON_ID }),
    store_settings: (eq: [string, unknown] | null) => {
      if (eq?.[1] === 'checkout') {
        return {
          value: {
            order_bump_enabled: bumpEnabled,
            order_bump_product_id: BUMP_PRODUCT_ID,
            order_bump_discount_percent: 50,
          },
        }
      }
      if (eq?.[1] === 'payment') return { value: { pix_discount_percent: 5 } }
      return null
    },
    coupons: {
      type: 'percent',
      value: 10,
      active: true,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      used_count: 0,
    },
  })

  /**
   * `order_items.unit_price` do item do bump está gravado **já descontado** (2,45), como a loja
   * persistiu; `products.base_price` é 4,90 nos dois. É o estado real medido no T16 — e o que
   * força o servidor a reler o preço cheio e aplicar o bump ele mesmo.
   */
  const bumpLists = {
    order_items: [
      { product_id: PRODUCT_ID, quantity: 1, unit_price: 4.9 },
      { product_id: BUMP_PRODUCT_ID, quantity: 1, unit_price: 2.45 },
    ],
    products: [
      { id: PRODUCT_ID, base_price: 4.9 },
      { id: BUMP_PRODUCT_ID, base_price: 4.9 },
    ],
  }

  const bumpEnv = (bumpEnabled: boolean) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: bumpRows(bumpEnabled),
      lists: bumpLists,
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
  }

  it.each([
    ['PIX', () => pixBody, '16.18', 0.33, 16.18],
    ['cartão', () => cardBody, '16.51', 0, 16.51],
  ])(
    'bump ligado (%s): o total enviado ao MP e o persistido são o do desconto aplicado UMA vez',
    async (_label, body, expectedAmount, expectedPixDiscount, expectedTotal) => {
      const lines = captureLogs()
      const { supabase, fetchDouble, deps } = bumpEnv(true)
      const response = await createPayment(deps, paymentRequest(), body())

      expect(response.status).toBe(200)

      // 1) O valor que vai para o MP — é o que a cliente paga de fato.
      const call = fetchDouble.calls.at(-1)!
      expect(call.url).toBe(ORDERS_ENDPOINT)
      expect(call.body.total_amount).toBe(expectedAmount)
      expect(call.body.transactions.payments[0].amount).toBe(expectedAmount)

      // 2) O valor persistido no pedido — é o que a tela de confirmação mostra.
      const persist = supabase.updates.find((u) => 'total' in u.values)
      expect(persist).toBeDefined()
      expect(persist!.table).toBe('orders')
      expect(persist!.eq).toEqual(['id', ORDER_ID])
      expect(persist!.values).toEqual({
        // 07/T13: o persist passou a incluir `subtotal`. 4,90 + 2,45 (bump 50%) = 7,35.
        subtotal: 7.35,
        total: expectedTotal,
        pix_discount: expectedPixDiscount,
        // 17/T9: o persist passou a incluir o par da promoção. Aqui não há promoção nenhuma, e é
        // por valor que se afirma: desconto ZERO e nenhuma campanha atribuída a este pedido.
        promotion_id: null,
        promotion_discount: 0,
      })

      // 3) O booleano que o cenário 4 do sandbox não conseguiu observar (o bloqueador D1 desviava
      //    antes desta linha de log).
      const entry = lines
        .map((l) => JSON.parse(l))
        .find((e) => e.action === 'create-payment' && e.mp_order_id)
      expect(entry.bump_applied).toBe(true)
    },
  )

  // Contraste por VALOR (cenário 5 do T16): o mesmo produto, agora item comum, é cobrado a preço
  // cheio — subtotal 9,80 contra 7,35. É a prova de que o desconto vem da oferta do lojista.
  it('bump desligado: preço cheio nos dois itens e bump_applied false', async () => {
    const lines = captureLogs()
    const { supabase, fetchDouble, deps } = bumpEnv(false)
    const response = await createPayment(deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // 9,80 − 0,98 (cupom 10%) − 0,44 (PIX 5%) + 9,90 (frete) = 18,28
    expect(fetchDouble.calls.at(-1)!.body.total_amount).toBe('18.28')
    expect(supabase.updates.find((u) => 'total' in u.values)!.values).toEqual({
      subtotal: 9.8,
      total: 18.28,
      pix_discount: 0.44,
      promotion_id: null,
      promotion_discount: 0,
    })
    const entry = lines
      .map((l) => JSON.parse(l))
      .find((e) => e.action === 'create-payment' && e.mp_order_id)
    expect(entry.bump_applied).toBe(false)
  })

  // O cupom entra na conta por `resolveCouponDiscount` sobre o subtotal JÁ com o bump — sem isso um
  // cupom `fixed` poderia descontar mais do que o pedido realmente vale.
  it('cupom inválido no momento do pagamento não desconta, e é logado', async () => {
    const lines = captureLogs()
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: {
        ...bumpRows(true),
        coupons: {
          type: 'percent',
          value: 10,
          active: false,
          valid_from: null,
          valid_until: null,
          max_uses: null,
          used_count: 0,
        },
      },
      lists: bumpLists,
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    // Sem cupom: 7,35 − 0,37 (PIX 5%) + 9,90 = 16,88
    expect(fetchDouble.calls.at(-1)!.body.total_amount).toBe('16.88')
    expect(lines.map((l) => JSON.parse(l)).some((e) => e.status === 'coupon_invalid')).toBe(true)
  })
})

// =============================================================================================
// BMP-04 — a CLASSE, não uma instância (lição L-007)
//
// `BMP-04` promete que "o valor cobrado seja **idêntico** ao exibido". Essa promessa não vive numa
// função: vive em **pares de linhas escritas à mão**, uma na loja
// (`apps/store/src/features/checkout/model/useCheckoutTotals.ts`) e uma no servidor
// (`handlers.ts`), que precisam concordar. O `describe` acima fechou UM par — o do order bump — e o
// argumento "os dois lados chamam o mesmo módulo" cobriu o resto por analogia, não por teste.
//
// Não cobriu: cada par abaixo foi provado desprotegido por mutação (V1…V4 da iteração 2 da
// re-verificação; ver `validation.md`). Um par por `it`, com o `file:line` dos DOIS lados citado, e
// sempre asseverando o valor **cobrado** (corpo do POST ao MP) + o **persistido** (o que a tela de
// confirmação lê) — nunca um espelho da aritmética.
//
// Regra para quem adicionar regra de valor no recálculo: se a linha nova tem um par na loja, ela
// entra aqui. `displayedEqualsCharged.test.ts` NÃO serve — ele reimplementa a chamada do handler e
// por construção é cego a deriva do handler real (medido: sob o mutante de duplo desconto o core
// seguiu 303/303 verde).
// =============================================================================================

describe('create-payment — os outros pares loja↔servidor: cobrado == exibido (BMP-04)', () => {
  /** Cupom válido em todos os eixos. Cada variante abaixo estraga **um** campo por vez. */
  const validCoupon = (over: Record<string, unknown> = {}) => ({
    type: 'percent',
    value: 10,
    active: true,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    used_count: 0,
    ...over,
  })

  /** `store_settings` é lido 2× por `key` — a fixture discrimina pelo `.eq()`, como `bumpRows`. */
  const settingsFixture =
    (checkout: Record<string, unknown> | null, pixDiscountPercent: number) =>
    (eq: [string, unknown] | null) => {
      if (eq?.[1] === 'checkout') return checkout === null ? null : { value: checkout }
      if (eq?.[1] === 'payment') return { value: { pix_discount_percent: pixDiscountPercent } }
      return null
    }

  /** Oferta do lojista completa e ligada — o estado do cenário 4 do T16. */
  const BUMP_50 = {
    order_bump_enabled: true,
    order_bump_product_id: BUMP_PRODUCT_ID,
    order_bump_discount_percent: 50,
  }

  interface EnvInput {
    order?: Record<string, unknown>
    /** `null` ⇒ nenhuma linha `store_settings.checkout` (bump não configurado). */
    checkout?: Record<string, unknown> | null
    pixDiscountPercent?: number
    coupon?: Record<string, unknown> | null
    lists: { order_items: unknown[]; products?: unknown[] }
  }

  const env = (input: EnvInput) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: {
        ...paymentRows(input.order ?? {}),
        store_settings: settingsFixture(input.checkout ?? null, input.pixDiscountPercent ?? 5),
        coupons: input.coupon ?? null,
      },
      lists: { products: [], ...input.lists },
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
  }

  /**
   * As duas pontas que a cliente enxerga, sempre juntas e sempre por valor: o `total_amount` do
   * corpo enviado ao MP (o que ela paga) e o `total`/`pix_discount` persistidos em `orders` (o que
   * `/pedido/:id` mostra). `toEqual` estrito no update: uma coluna extra no persist quebra.
   */
  const expectCharged = (
    e: ReturnType<typeof env>,
    expected: { amount: string; total: number; pixDiscount: number; subtotal: number },
  ) => {
    const call = e.fetchDouble.calls.at(-1)!
    expect(call.url).toBe(ORDERS_ENDPOINT)
    expect(call.body.total_amount).toBe(expected.amount)
    expect(call.body.transactions.payments[0].amount).toBe(expected.amount)

    const persist = e.supabase.updates.find((u) => 'total' in u.values)
    expect(persist).toBeDefined()
    expect(persist!.table).toBe('orders')
    expect(persist!.eq).toEqual(['id', ORDER_ID])
    expect(persist!.values).toEqual({
      subtotal: expected.subtotal,
      total: expected.total,
      pix_discount: expected.pixDiscount,
      // 17/T9: nenhum destes pares tem promoção cadastrada — o par da promoção é gravado zerado.
      promotion_id: null,
      promotion_discount: 0,
    })
  }

  const logsOf = (lines: string[]) => lines.map((l) => JSON.parse(l))

  // -------------------------------------------------------------------------------------------
  // PAR 1 — a base do cupom soma a QUANTIDADE
  // loja: `useCheckoutTotals.ts:95-99` (`applyOrderBump(...).reduce((s, i) => s + i.unit_price *
  // i.quantity, 0)`) ↔ servidor: `handlers.ts:312`.
  // Sem o `* i.quantity` no servidor a base do cupom fica menor que a exibida e a cliente paga
  // MAIS do que o rótulo do CTA mostrou. Sobrevivia porque toda fixture de cupom deste arquivo
  // usava `quantity: 1` — a multiplicação nunca era exercitada.
  // -------------------------------------------------------------------------------------------

  /** Item comum com `quantity: 3` (fora da oferta) + o item do bump com `quantity: 1`. */
  const quantityLists = {
    order_items: [
      { product_id: PRODUCT_ID, quantity: 3, unit_price: 4.9 },
      // Gravado já descontado pela loja; o servidor relê 4,90 de `products.base_price`.
      { product_id: BUMP_PRODUCT_ID, quantity: 1, unit_price: 2.45 },
    ],
    products: [
      { id: PRODUCT_ID, base_price: 4.9 },
      { id: BUMP_PRODUCT_ID, base_price: 4.9 },
    ],
  }

  it.each([
    ['PIX', () => pixBody, '24.56', 24.56, 0.77],
    ['cartão', () => cardBody, '25.33', 25.33, 0],
  ])(
    'item com quantity 3 + bump + cupom percent (%s): a base do cupom soma a quantidade',
    async (_label, body, amount, total, pixDiscount) => {
      const e = env({
        order: { shipping_cost: 9.9, coupon_id: COUPON_ID },
        checkout: BUMP_50,
        coupon: validCoupon(),
        lists: quantityLists,
      })
      const response = await createPayment(e.deps, paymentRequest(), body())

      expect(response.status).toBe(200)
      // Subtotal com bump = 3 × 4,90 + 2,45 = 17,15 ⇒ cupom 10% = 1,72.
      //   PIX:    17,15 − 1,72 − 0,77 (5%) + 9,90 = 24,56
      //   cartão: 17,15 − 1,72 + 9,90            = 25,33
      // Ignorando a quantidade a base cairia para 7,35 ⇒ cupom 0,74, e a cliente pagaria
      // 25,49 (PIX) / 26,31 (cartão) — quase R$ 1 acima do exibido.
      // Subtotal com bump = 3 x 4,90 + 2,45 = 17,15 (07/T13 passou a persisti-lo).
      expectCharged(e, { amount, total, pixDiscount, subtotal: 17.15 })
    },
  )

  // -------------------------------------------------------------------------------------------
  // PAR 2 — cupom `free_shipping` zera o FRETE no servidor
  // loja: `useCheckoutTotals.ts:104` (`coupon?.freeShipping ? 0 : (shipping?.cost ?? 0)`) ↔
  // servidor: `handlers.ts:354` (`shipping: freeShipping ? 0 : Number(order.shipping_cost || 0)`).
  // Âncora explícita — Edge Case da feature 08 (`.specs/features/08-checkout-one-page/spec.md:382`):
  // "WHEN o cupom aplicado tem `freeShipping = true` … todas as opções SHALL exibir 'Grátis' e
  // **cobrar 0**, e o desconto PIX SHALL continuar incidindo sobre (subtotal − desconto de cupom)".
  // Este par só tinha guarda no ESPELHO (`displayedEqualsCharged.test.ts:163-178`, onde quem zera o
  // frete é o helper `shippingOf`), nunca no handler.
  // -------------------------------------------------------------------------------------------

  it.each([
    ['PIX', () => pixBody, '45.60', 45.6, 2.4],
    ['cartão', () => cardBody, '48.00', 48, 0],
  ])('cupom free_shipping (%s): o frete cotado não entra no valor cobrado', async (
    _label,
    body,
    amount,
    total,
    pixDiscount,
  ) => {
    const e = env({
      order: { shipping_cost: 24.8, coupon_id: COUPON_ID },
      coupon: validCoupon({ type: 'free_shipping', value: 0 }),
      lists: paymentLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), body())

    expect(response.status).toBe(200)
    // 2 × 24 = 48; frete cotado 24,80 zerado pelo cupom; PIX 5% sobre (48 − 0) = 2,40.
    //   PIX 45,60 · cartão 48,00. Cobrando o frete seriam 70,40 / 72,80.
    // As duas regras compõem sem se anular: `free_shipping` não gera desconto de VALOR (o subtotal
    // é cobrado inteiro) e o desconto PIX segue incidindo.
    expectCharged(e, { amount, total, pixDiscount, subtotal: 48 })  // 2 x 24
  })

  // Mesmo par, o outro lado da condição: `freeShipping` é atribuído DENTRO do ramo `valid`
  // (`handlers.ts:337`). Se escapasse do ramo, um cupom `free_shipping` desativado zeraria o frete
  // no servidor e a cliente pagaria MENOS do que a loja exibiu — a loja não aplica cupom inválido
  // (`packages/core/src/hooks/useCoupons.ts:78-85`).
  it('cupom free_shipping inválido não zera o frete', async () => {
    const lines = captureLogs()
    const e = env({
      order: { shipping_cost: 24.8, coupon_id: COUPON_ID },
      coupon: validCoupon({ type: 'free_shipping', value: 0, active: false }),
      lists: paymentLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // 48 − 2,40 (PIX 5%) + 24,80 de frete = 70,40.
    expectCharged(e, { amount: '70.40', total: 70.4, pixDiscount: 2.4, subtotal: 48 })
    expect(logsOf(lines).some((x) => x.status === 'coupon_invalid')).toBe(true)
  })

  // -------------------------------------------------------------------------------------------
  // PAR 3 — janela de validade e teto de uso do cupom
  // loja: `packages/core/src/hooks/useCoupons.ts:78-85` — `validateCoupon` recusa `valid_from` no
  // futuro, `valid_until` no passado, `used_count >= max_uses` e `active: false` ANTES de a loja
  // exibir qualquer desconto ↔ servidor: `handlers.ts:324-329`, a revalidação dos MESMOS quatro
  // eixos no momento do pagamento (um cupom pode expirar entre a aplicação e o CTA).
  //
  // ⚠️ Âncora: NÃO existe AC para essa revalidação na 09 nem na 08 — a lógica entrou no diff por
  // MOVIMENTAÇÃO (T6, de `index.ts` para `handlers.ts`). O que ancora o teste é o par com a loja
  // acima + a Coverage Expectation da matriz de cobertura: "movimentação sem teste dos ramos
  // movidos é precisamente como comportamento desaparece em silêncio". As três cláusulas podiam ser
  // apagadas inteiras sem um único teste vermelho (mutação V3).
  // -------------------------------------------------------------------------------------------

  /** Um item comum + o item da oferta, ambos `quantity: 1` — o carrinho do cenário 4 do T16. */
  const bumpPairLists = {
    order_items: [
      { product_id: PRODUCT_ID, quantity: 1, unit_price: 4.9 },
      { product_id: BUMP_PRODUCT_ID, quantity: 1, unit_price: 2.45 },
    ],
    products: [
      { id: PRODUCT_ID, base_price: 4.9 },
      { id: BUMP_PRODUCT_ID, base_price: 4.9 },
    ],
  }

  it.each([
    ['valid_until no passado (expirado)', { valid_until: '2020-01-01T00:00:00.000Z' }],
    ['valid_from no futuro (ainda não vale)', { valid_from: '2999-01-01T00:00:00.000Z' }],
    ['used_count no teto de max_uses (esgotado)', { max_uses: 10, used_count: 10 }],
  ])('cupom fora da validade — %s — não desconta, e é logado', async (_label, over) => {
    const lines = captureLogs()
    const e = env({
      order: { shipping_cost: 9.9, coupon_id: COUPON_ID },
      checkout: BUMP_50,
      coupon: validCoupon(over),
      lists: bumpPairLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // Sem desconto de cupom: 7,35 (bump aplicado) − 0,37 (PIX 5%) + 9,90 = 16,88.
    expectCharged(e, { amount: '16.88', total: 16.88, pixDiscount: 0.37, subtotal: 7.35 })
    expect(logsOf(lines).some((x) => x.status === 'coupon_invalid')).toBe(true)
  })

  // Contraste indispensável: com os TRÊS campos preenchidos e satisfeitos o cupom desconta. Sem
  // ele, "qualquer campo não nulo ⇒ inválido" passaria pelos casos acima.
  it('contraste: dentro da janela e abaixo do teto, o cupom desconta', async () => {
    const lines = captureLogs()
    const e = env({
      order: { shipping_cost: 9.9, coupon_id: COUPON_ID },
      checkout: BUMP_50,
      coupon: validCoupon({
        valid_from: '2020-01-01T00:00:00.000Z',
        valid_until: '2999-01-01T00:00:00.000Z',
        max_uses: 10,
        used_count: 9,
      }),
      lists: bumpPairLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // 7,35 − 0,74 (cupom 10%) − 0,33 (PIX 5%) + 9,90 = 16,18 — o valor medido em sandbox no T16.
    expectCharged(e, { amount: '16.18', total: 16.18, pixDiscount: 0.33, subtotal: 7.35 })
    expect(logsOf(lines).some((x) => x.status === 'coupon_invalid')).toBe(false)
  })

  // -------------------------------------------------------------------------------------------
  // PAR 4 — a oferta do bump só liga quando o lojista LIGOU
  // loja: `useCheckoutTotals.ts:65-78` lê `useCheckoutSettings()`, que faz **merge** da linha de
  // `store_settings` sobre `DEFAULT_CHECKOUT` (`packages/core/src/hooks/useStoreSettings.ts:44` +
  // `packages/supabase/src/types/settings.ts:62-66`, onde `order_bump_enabled: false`) ↔ servidor:
  // `handlers.ts:298` (`=== true`).
  // Flag ausente ⇒ a loja exibe preço cheio. Com `!== false` o servidor aplicaria um desconto que a
  // loja não exibiu — cobrado MENOS que o exibido, e BMP-02 quer o bump só por decisão do lojista.
  // -------------------------------------------------------------------------------------------

  it('oferta do bump com o flag AUSENTE: preço cheio e bump_applied false', async () => {
    const lines = captureLogs()
    const e = env({
      order: { shipping_cost: 9.9, coupon_id: COUPON_ID },
      // A linha existe e a oferta está configurada — só o flag não está lá.
      checkout: {
        order_bump_product_id: BUMP_PRODUCT_ID,
        order_bump_discount_percent: 50,
      },
      coupon: validCoupon(),
      lists: bumpPairLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // Preço cheio nos dois itens: 9,80 − 0,98 (cupom 10%) − 0,44 (PIX 5%) + 9,90 = 18,28.
    // Ligando por ausência seriam 16,18 — R$ 2,10 abaixo do exibido.
    expectCharged(e, { amount: '18.28', total: 18.28, pixDiscount: 0.44, subtotal: 9.8 })
    const entry = logsOf(lines).find((x) => x.action === 'create-payment' && x.mp_order_id)
    expect(entry.bump_applied).toBe(false)
  })

  // Mesmo merge de defaults, o outro campo: `discount_percent` ausente cai no `?? 0`
  // (`handlers.ts:300`). Sem ele `Number(undefined)` é NaN, e NaN ATRAVESSA `calculateOrderTotals`
  // sem throw (`NaN < 0.01` é false) — o MP receberia `total_amount: "NaN"`, uma cobrança que não
  // dá para conciliar com nada do que foi exibido.
  it('bump ligado sem discount_percent: preço cheio, e o valor cobrado é um número', async () => {
    const e = env({
      order: { shipping_cost: 9.9, coupon_id: COUPON_ID },
      checkout: { order_bump_enabled: true, order_bump_product_id: BUMP_PRODUCT_ID },
      coupon: validCoupon(),
      lists: bumpPairLists,
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expectCharged(e, { amount: '18.28', total: 18.28, pixDiscount: 0.44, subtotal: 9.8 })
    expect(Number.isFinite(Number(e.fetchDouble.calls.at(-1)!.body.total_amount))).toBe(true)
  })

  // -------------------------------------------------------------------------------------------
  // PAR 5 — o preço vem de `products.base_price`, com fallback no `unit_price` PERSISTIDO
  // Sem par na loja: é uma linha só do servidor (`handlers.ts:286`), movida pelo T6, e está no
  // caminho do dinheiro. `order_items.product_id` é TEXT e `products.id` é uuid, então item legado
  // (sku que não é uuid) não entra no join — o preço tem de cair no `unit_price` do próprio
  // `order_items`. Com `?? 0` o pedido inteiro valeria zero e o guard de R$ 0,01 devolveria 422 num
  // pedido legítimo (a cliente veria "total inválido" num carrinho de R$ 25).
  // O caminho principal (base_price VENCE o unit_price do cliente, `CLAUDE.md`) já é asseverado
  // pelo `EXPECTED_TOTAL` de 48,00 sobre `unit_price: 20` — aqui é só o fallback.
  // -------------------------------------------------------------------------------------------

  it('item legado com product_id não-uuid: cobra o unit_price persistido, não zero', async () => {
    const e = env({
      pixDiscountPercent: 0,
      lists: { order_items: [{ product_id: 'legacy-sku-42', quantity: 2, unit_price: 12.5 }] },
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // 2 × 12,50 = 25,00, sem cupom, sem frete, sem desconto PIX.
    expectCharged(e, { amount: '25.00', total: 25, pixDiscount: 0, subtotal: 25 })
  })
})

// =============================================================================================
// T8 — desconto progressivo: de onde vêm as promoções, e quem é elegível (PRM-11)
//
// O que estes testes guardam, e o que a suíte já existente NÃO podia guardar: as 118 provas
// anteriores exercitam o caminho sem promoção nenhuma (o dublê devolve `null` para uma tabela sem
// fixture), então elas provam a NÃO-REGRESSÃO — e é de propósito que nenhuma delas foi tocada.
// Daqui para baixo é o comportamento novo.
// =============================================================================================

describe('create-payment — desconto progressivo por quantidade (PRM-11)', () => {
  /** Segundo produto, FORA do escopo — é ele que prova que a view filtra de verdade. */
  const OTHER_PRODUCT_ID = 'c9d8e7f6-a5b4-4c3d-9e2f-1a0b9c8d7e6f'
  const PROMO_ID = 'f1e2d3c4-b5a6-4978-8a6b-5c4d3e2f1a09'

  /** A faixa do kit: a partir de 3 unidades, cada uma sai a R$ 5,00. */
  const TIER_3_AT_5 = { min_qty: 3, value: 5 }

  const promotion = (over: Record<string, unknown> = {}) => ({
    id: PROMO_ID,
    discount_kind: 'unit_price',
    scope: 'all',
    stacks_with_coupon: false,
    active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2026-08-01T10:00:00.000Z',
    promotion_tiers: [TIER_3_AT_5],
    ...over,
  })

  const PAST = '2026-07-01T00:00:00.000Z'
  const FUTURE = '2027-01-01T00:00:00.000Z'

  interface PromoEnv {
    /** Ausente ⇒ a tabela não tem fixture ⇒ o dublê devolve `null` (nenhuma promoção cadastrada). */
    promotions?: unknown[]
    eligible?: unknown[]
    order_items?: unknown[]
    products?: unknown[]
    /** Só os casos de grade precisam: sem `variant_id` no item, o handler nem consulta a tabela. */
    product_variants?: unknown[]
    order?: Record<string, unknown>
    checkout?: Record<string, unknown> | null
  }

  /** 3 unidades a R$ 8,90 = R$ 26,70 cheio. Sem bump e com PIX 0%, a única variável é a faixa. */
  const env = (input: PromoEnv = {}) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: {
        ...paymentRows(input.order ?? {}),
        store_settings: (eq: [string, unknown] | null) =>
          eq?.[1] === 'checkout'
            ? input.checkout
              ? { value: input.checkout }
              : null
            : { value: { pix_discount_percent: 0 } },
        coupons: null,
      },
      lists: {
        order_items: input.order_items ?? [
          { product_id: PRODUCT_ID, quantity: 3, unit_price: 8.9 },
        ],
        products: input.products ?? [{ id: PRODUCT_ID, base_price: 8.9 }],
        ...(input.product_variants ? { product_variants: input.product_variants } : {}),
        ...(input.promotions ? { promotions: input.promotions } : {}),
        ...(input.eligible ? { promotion_eligible_products: input.eligible } : {}),
      },
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble) }
  }

  /**
   * As duas pontas por valor: o que o MP cobra e o que fica em `orders` — incluindo o par
   * `promotion_id`/`promotion_discount` da T9, que é o que o resumo, o e-mail e o backoffice leem
   * depois do pagamento.
   */
  const expectCharged = async (
    e: ReturnType<typeof env>,
    amount: string,
    subtotal: number,
    promotion: { id: string | null; discount: number } = { id: null, discount: 0 },
  ) => {
    const response = await createPayment(e.deps, paymentRequest(), pixBody)
    expect(response.status).toBe(200)

    const call = e.fetchDouble.calls.at(-1)!
    expect(call.url).toBe(ORDERS_ENDPOINT)
    expect(call.body.total_amount).toBe(amount)

    const persist = e.supabase.updates.find((u) => 'total' in u.values)!
    expect(persist.table).toBe('orders')
    expect(persist.values).toEqual({
      subtotal,
      total: Number(amount),
      pix_discount: 0,
      promotion_id: promotion.id,
      promotion_discount: promotion.discount,
    })
  }

  const PROMO_VARIANT_ID = '9a8b7c6d-5e4f-4a3b-9c8d-7e6f5a4b3c2d'

  /**
   * As mesmas 3 unidades, mas de um produto COM GRADE: `base_price` R$ 8,90 e a variação escolhida a
   * R$ 6,50. `price_source: 'variant'` está congelado no item (PST-03), então `resolveItemPrice`
   * devolve 6,50 — e é sobre 6,50 que a faixa incide, não sobre o base.
   *
   * A divergência entre os dois preços é o ponto do fixture: com `base_price === variant.price`, ler o
   * campo errado seria indistinguível.
   */
  const gradeItems = {
    order_items: [
      {
        id: 'oi-1',
        product_id: PRODUCT_ID,
        quantity: 3,
        unit_price: 6.5,
        variant_id: PROMO_VARIANT_ID,
        price_source: 'variant',
      },
    ],
    products: [{ id: PRODUCT_ID, base_price: 8.9 }],
    product_variants: [{ id: PROMO_VARIANT_ID, product_id: PRODUCT_ID, price: 6.5 }],
  }

  /** Dois produtos no pedido; só o primeiro entra no escopo da promoção. */
  const twoProducts = {
    order_items: [
      { product_id: PRODUCT_ID, quantity: 3, unit_price: 8.9 },
      { product_id: OTHER_PRODUCT_ID, quantity: 1, unit_price: 19.9 },
    ],
    products: [
      { id: PRODUCT_ID, base_price: 8.9 },
      { id: OTHER_PRODUCT_ID, base_price: 19.9 },
    ],
  }

  it('faixa alcançada em escopo `all`: as 3 unidades saem a R$ 5,00 (26,70 → 15,00)', async () => {
    await expectCharged(env({ promotions: [promotion()] }), '15.00', 15, {
      id: PROMO_ID,
      discount: 11.7,
    })
  })

  it('faixa em `percent` desconta o percentual da faixa (40% de 8,90 = 5,34 × 3)', async () => {
    const e = env({
      promotions: [promotion({ discount_kind: 'percent', promotion_tiers: [{ min_qty: 3, value: 40 }] })],
    })
    await expectCharged(e, '16.02', 16.02, { id: PROMO_ID, discount: 10.68 })
  })

  it('escopo por categoria desconta SÓ o produto que a view devolve', async () => {
    const e = env({
      ...twoProducts,
      promotions: [promotion({ scope: 'categories' })],
      eligible: [{ promotion_id: PROMO_ID, product_id: PRODUCT_ID }],
    })
    // 3 × 5,00 (elegível) + 1 × 19,90 (fora do escopo, preço cheio) = 34,90
    await expectCharged(e, '34.90', 34.9, { id: PROMO_ID, discount: 11.7 })
  })

  it('escopo por categoria sem nenhuma linha na view não desconta de ninguém', async () => {
    const e = env({ ...twoProducts, promotions: [promotion({ scope: 'categories' })] })
    // 3 × 8,90 + 19,90 = 46,60 — nunca "toda a loja" por falta de vínculo
    await expectCharged(e, '46.60', 46.6)
  })

  it('faixa NÃO alcançada (2 unidades numa faixa que começa em 3) mantém o preço cheio', async () => {
    const e = env({
      promotions: [promotion()],
      order_items: [{ product_id: PRODUCT_ID, quantity: 2, unit_price: 8.9 }],
    })
    await expectCharged(e, '17.80', 17.8)
  })

  it.each([
    ['inativa', { active: false }],
    ['expirada', { valid_until: PAST }],
    ['ainda não vigente', { valid_from: FUTURE }],
    ['sem nenhuma faixa', { promotion_tiers: [] }],
  ])('promoção %s é ignorada: cobra o preço cheio (26,70)', async (_label, over) => {
    await expectCharged(env({ promotions: [promotion(over)] }), '26.70', 26.7)
  })

  // -------------------------------------------------------------------------------------------
  // T9 — a guarda de teto (PRM-12) e o log (PRM-13)
  //
  // `orders.promotion_discount` é escrito pela LOJA na criação do pedido. Estes testes provam as
  // duas metades da propriedade que importa: (a) o número do cliente nunca vira o valor cobrado, e
  // (b) o servidor nunca cobra mais caro do que a tela mostrou.
  // -------------------------------------------------------------------------------------------

  it('promoção que sumiu depois do pedido: 422 promotion_no_longer_valid e NENHUMA chamada ao MP', async () => {
    const e = env({
      // A loja exibiu R$ 15,00 (desconto 11,70) e gravou isso no pedido…
      order: { promotion_discount: 11.7 },
      // …e agora a promoção está inativa: o recálculo dá desconto 0.
      promotions: [promotion({ active: false })],
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({
      error:
        'A promoção deste pedido mudou. Recarregue a sacola para ver o novo total antes de pagar.',
      code: 'promotion_no_longer_valid',
    })
    // O que separa "recusar" de "cobrar errado": nada foi enviado ao Mercado Pago.
    expect(e.fetchDouble.calls).toHaveLength(0)
    expect(e.supabase.updates.filter((u) => 'total' in u.values)).toHaveLength(0)
  })

  it('desconto igual ao exibido passa direto', async () => {
    const e = env({ order: { promotion_discount: 11.7 }, promotions: [promotion()] })
    await expectCharged(e, '15.00', 15, { id: PROMO_ID, discount: 11.7 })
  })

  it('promoção que MELHOROU entre o pedido e o pagamento cobra o melhor, sem erro', async () => {
    // A loja exibiu um desconto de 5,00; a faixa agora desconta 11,70. Recusar aqui seria erro onde
    // não havia problema — a cliente paga menos.
    const e = env({ order: { promotion_discount: 5 }, promotions: [promotion()] })
    await expectCharged(e, '15.00', 15, { id: PROMO_ID, discount: 11.7 })
  })

  it('desconto gravado ZERO com promoção vigente: cobra o recalculado, não o do cliente', async () => {
    // A metade "o número do cliente não manda": o pedido diz 0, o servidor desconta 11,70 e cobra
    // 15,00. Se o gravado fosse a fonte do valor cobrado, aqui sairia 26,70.
    const e = env({ order: { promotion_discount: 0 }, promotions: [promotion()] })
    await expectCharged(e, '15.00', 15, { id: PROMO_ID, discount: 11.7 })
  })

  it('desconto gravado absurdo não vira desconto: 422, e zero cobrança', async () => {
    const e = env({ order: { promotion_discount: 9999 }, promotions: [promotion()] })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    // O teto é auto-infligido: forjar um número alto só derruba o próprio pagamento. Em nenhum
    // caminho os 9999 chegam a `total_amount`.
    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('promotion_no_longer_valid')
    expect(e.fetchDouble.calls).toHaveLength(0)
  })

  // -------------------------------------------------------------------------------------------
  // Edge case explícito da spec: "WHEN um item elegível tem preço por variação THEN a faixa SHALL
  // incidir sobre o preço da VARIAÇÃO resolvido por `resolveItemPrice`, não sobre `base_price`".
  //
  // O par na loja é `apps/store/src/features/checkout/model/__tests__/useCheckoutTotals.test.tsx`
  // → 'a faixa incide sobre o preço da VARIAÇÃO, não sobre o base_price', com os MESMOS números.
  // Os dois testes juntos são a prova de que o número que a loja grava em
  // `orders.promotion_discount` é o que este servidor recalcula — que é o que impede o 422.
  // -------------------------------------------------------------------------------------------

  it('faixa sobre item com preço de VARIAÇÃO: incide sobre 6,50 e o desconto que a loja gravou passa', async () => {
    const e = env({
      ...gradeItems,
      promotions: [promotion()],
      // 4,50 é exatamente o que `useCheckoutTotals` calcula para este carrinho.
      order: { promotion_discount: 4.5 },
    })
    // 3 × 6,50 = 19,50 cheio; a faixa põe cada unidade a 5,00 ⇒ 15,00, desconto 4,50.
    // Pelo `base_price` (8,90) o desconto recalculado seria 11,70 — outro número dos dois lados.
    await expectCharged(e, '15.00', 15, { id: PROMO_ID, discount: 4.5 })
  })

  it('desconto derivado do base_price num item de grade cai na guarda: 422 e zero cobrança', async () => {
    const e = env({
      ...gradeItems,
      promotions: [promotion()],
      // 11,70 é o que a loja gravava quando lia `product.price` (8,90) em vez de `unitPrice` (6,50).
      // Este teste é o defeito congelado: com a loja consertada, nenhum pedido chega aqui assim.
      order: { promotion_discount: 11.7 },
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    expect((await response.json()).code).toBe('promotion_no_longer_valid')
    expect(e.fetchDouble.calls).toHaveLength(0)
  })

  it('PRM-13: o log traz promotion_id e tier_min_qty da faixa aplicada', async () => {
    const lines = captureLogs()
    const e = env({ promotions: [promotion()] })
    await createPayment(e.deps, paymentRequest(), pixBody)

    const entry = lines
      .map((l) => JSON.parse(l))
      .find((x) => x.action === 'create-payment' && x.mp_order_id)
    expect(entry.promotion_id).toBe(PROMO_ID)
    expect(entry.tier_min_qty).toBe(3)
    expect(entry.promotions_applied).toBe(1)
  })

  it('sem promoção aplicada, o log registra o par vazio', async () => {
    const lines = captureLogs()
    const e = env()
    await createPayment(e.deps, paymentRequest(), pixBody)

    const entry = lines
      .map((l) => JSON.parse(l))
      .find((x) => x.action === 'create-payment' && x.mp_order_id)
    expect(entry.promotion_id).toBe(null)
    expect(entry.tier_min_qty).toBe(null)
    expect(entry.promotions_applied).toBe(0)
  })

  it('o order bump continua valendo quando não há promoção nenhuma cadastrada', async () => {
    const e = env({
      order_items: [
        { product_id: PRODUCT_ID, quantity: 1, unit_price: 8.9 },
        { product_id: BUMP_PRODUCT_ID, quantity: 1, unit_price: 2.45 },
      ],
      products: [
        { id: PRODUCT_ID, base_price: 8.9 },
        { id: BUMP_PRODUCT_ID, base_price: 4.9 },
      ],
      checkout: {
        order_bump_enabled: true,
        order_bump_product_id: BUMP_PRODUCT_ID,
        order_bump_discount_percent: 50,
      },
    })
    // 8,90 + (4,90 × 50%) = 8,90 + 2,45 = 11,35
    await expectCharged(e, '11.35', 11.35)
  })
})

describe('create-payment — cartão em action_required (STA-03)', () => {
  it('detail ≠ waiting_transfer → grava payment_status rejected e responde 200 com status rejected', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(
        supabase,
        createFakeFetch([
          {
            match: '/v1/orders',
            body: mpOrderResponse({
              status: 'action_required',
              status_detail: 'pending_challenge',
            }),
          },
        ]),
      ),
      paymentRequest(),
      cardBody,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'rejected',
      status_detail: 'pending_challenge',
    })
    expect(
      supabase.updates.some((u) => u.values.payment_status === 'rejected'),
    ).toBe(true)
    // Recusa não aplica efeitos de aprovação.
    expect(supabase.rpcs).toHaveLength(0)
  })

  // A metade "mensagem" de STA-03: o `status_detail` devolvido tem de render um texto ACIONÁVEL na
  // tela. `pending_challenge` não tem chave própria (é 3DS, não recusa de cartão), então cai no
  // fallback — que por isso não pode ser um "Erro." genérico: é a única instrução que a cliente
  // recebe num pedido que a loja acabou de marcar `rejected`.
  it.each([['pending_challenge'], ['pending_capture'], ['pending_review_manual']])(
    'STA-03: o status_detail %s rende uma mensagem que manda trocar de meio de pagamento',
    async (statusDetail) => {
      const response = await createPayment(
        createDeps(
          createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
          createFakeFetch([
            {
              match: '/v1/orders',
              body: mpOrderResponse({ status: 'action_required', status_detail: statusDetail }),
            },
          ]),
        ),
        paymentRequest(),
        cardBody,
      )

      const body = await response.json()
      expect(body).toEqual({ status: 'rejected', status_detail: statusDetail })
      // O texto que a cliente lê, pela mesma função que a loja chama.
      expect(friendlyMessage(body.status_detail)).toMatch(/use outro método de pagamento/i)
    },
  )

  it('contraste: waiting_transfer (PIX) NÃO vira rejected — é o caminho feliz do QR', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(supabase, createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ qr_code: 'PIX-COPIA-E-COLA' }),
    )
    expect(supabase.updates.some((u) => u.values.payment_status === 'rejected')).toBe(false)
  })
})

// =============================================================================================
// D3 — cartão recusado: HTTP 402 com a order aninhada em `data`
// =============================================================================================

const REJECTED_MP_ORDER_ID = 'ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7'
const REJECTED_MP_PAYMENT_ID = 'PAY01KYMB0S2C8YD1XN4Q1BHXKGNK'

/**
 * Corpo EXATO medido no T16 (cenário 6, titular OTHE): status HTTP 402, a order em `data` e não na
 * raiz, `status_detail` da raiz genérico (`"failed"`) e o motivo acionável só no payment.
 */
const REJECTED_402_BODY = {
  errors: [
    {
      code: 'failed',
      message: 'The following transactions failed',
      details: [`${REJECTED_MP_PAYMENT_ID}: rejected_by_issuer`],
    },
  ],
  data: {
    id: REJECTED_MP_ORDER_ID,
    status: 'failed',
    status_detail: 'failed',
    transactions: {
      payments: [
        {
          id: REJECTED_MP_PAYMENT_ID,
          status: 'failed',
          status_detail: 'rejected_by_issuer',
        },
      ],
    },
  },
}

describe('create-payment — cartão recusado em 402 (D3, D6)', () => {
  const rejectedDeps = () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    return {
      supabase,
      deps: createDeps(
        supabase,
        createFakeFetch([{ match: '/v1/orders', status: 402, body: REJECTED_402_BODY }]),
      ),
    }
  }

  it('D3: 402 com a order em `data` → 200 com { status: rejected, status_detail } internos', async () => {
    const { supabase, deps } = rejectedDeps()
    const response = await createPayment(deps, paymentRequest(), cardBody)

    // Recusa é DESFECHO DE NEGÓCIO, não falha de transporte: o contrato de STA-03/STA-04 é emitido.
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      status: 'rejected',
      // D6: o detalhe acionável, não o "failed" genérico da raiz.
      status_detail: 'rejected_by_issuer',
    })
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('D3: a order recusada NÃO fica órfã — mp_order_id, mp_payment_id e detail são persistidos', async () => {
    const { supabase, deps } = rejectedDeps()
    await createPayment(deps, paymentRequest(), cardBody)

    const idsUpdate = supabase.updates.find((u) => 'mp_order_id' in u.values)
    expect(idsUpdate).toBeDefined()
    expect(idsUpdate!.table).toBe('orders')
    expect(idsUpdate!.eq).toEqual(['id', ORDER_ID])
    expect(idsUpdate!.values).toEqual(
      expect.objectContaining({
        mp_order_id: REJECTED_MP_ORDER_ID,
        mp_payment_id: REJECTED_MP_PAYMENT_ID,
        mp_status_detail: 'rejected_by_issuer',
        payment_status: 'rejected',
      }),
    )
  })

  it('D3: o log registra mp_http 402 — desfecho de negócio que chegou por não-2xx fica visível', async () => {
    const lines = captureLogs()
    const { deps } = rejectedDeps()
    await createPayment(deps, paymentRequest(), cardBody)

    const entry = lines
      .map((line) => JSON.parse(line))
      .find((e) => e.action === 'create-payment' && e.mp_order_id)
    expect(entry).toBeDefined()
    expect(entry.mp_order_id).toBe(REJECTED_MP_ORDER_ID)
    expect(entry.mp_http).toBe(402)
    expect(entry.status).toBe('failed')
  })

  it('D3: 4xx SEM order resolvível → 400 com a mensagem de errors[0].message', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows(),
      lists: paymentLists,
    })
    const response = await createPayment(
      createDeps(
        supabase,
        createFakeFetch([
          {
            match: '/v1/orders',
            status: 400,
            body: {
              errors: [
                {
                  code: 'unsupported_properties',
                  message: 'Properties not supported',
                  details: ["additionalProperties '$.notification_url' not allowed"],
                },
              ],
            },
          },
        ]),
      ),
      paymentRequest(),
      pixBody,
    )

    expect(response.status).toBe(400)
    // A mensagem do Orders mora em errors[0].message; `message` na raiz é o formato da API antiga.
    await expect(response.json()).resolves.toEqual({ error: 'Properties not supported' })
    expect(supabase.updates.filter((u) => 'mp_order_id' in u.values)).toHaveLength(0)
  })
})

describe('create-payment — cancelamento da order anterior (RTY-01…RTY-03)', () => {
  const OLD_MP_ORDER_ID = 'ORDTST01KAAAAAAAAAAAAAAAAAAAAAA'
  const CANCEL_URL = `${ORDERS_ENDPOINT}/${OLD_MP_ORDER_ID}/cancel`

  /** Rota do cancel ANTES da rota do create: a primeira que casa vence no `fakeFetch`. */
  const routes = (cancel: Record<string, unknown>) => [
    { match: '/cancel', ...cancel } as never,
    { match: '/v1/orders', body: mpOrderResponse() } as never,
  ]

  const retryingSupabase = () =>
    createFakeSupabase({
      user: { id: USER_ID },
      rows: paymentRows({ mp_order_id: OLD_MP_ORDER_ID, payment_status: 'rejected' }),
      lists: paymentLists,
    })

  it('RTY-01: pedido com mp_order_id e status retentável → cancela a anterior antes de criar a nova', async () => {
    const fetchDouble = createFakeFetch(routes({ status: 200, body: { id: OLD_MP_ORDER_ID } }))
    await createPayment(
      createDeps(retryingSupabase(), fetchDouble),
      paymentRequest(),
      pixBody,
    )

    const cancelCall = fetchDouble.calls.find((c) => c.url.endsWith('/cancel'))!
    expect(cancelCall).toBeDefined()
    expect(cancelCall.url).toBe(CANCEL_URL)
    expect(cancelCall.method).toBe('POST')
    expect(cancelCall.headers['Authorization']).toBe('Bearer APP_USR-test-token')
    expect(cancelCall.headers['X-Idempotency-Key']).toBeTruthy()
    // A ordem importa: cancelar depois de criar deixaria os dois pagáveis por um instante.
    expect(fetchDouble.calls.indexOf(cancelCall)).toBeLessThan(
      fetchDouble.calls.findIndex((c) => c.url === ORDERS_ENDPOINT),
    )
  })

  it.each([
    ['4xx (order já não é cancelável)', { status: 409, body: { message: 'not cancellable' } }],
    ['erro de rede', { networkError: true }],
  ])(
    'RTY-02: cancel falha com %s → loga previous_order_cancel_failed e cria a nova mesmo assim',
    async (_label, cancel) => {
      const lines = captureLogs()
      const fetchDouble = createFakeFetch(routes(cancel))
      const response = await createPayment(
        createDeps(retryingSupabase(), fetchDouble),
        paymentRequest(),
        pixBody,
      )

      expect(response.status).toBe(200)
      // A retentativa da cliente nunca é bloqueada por falha de limpeza.
      expect(fetchDouble.calls.some((c) => c.url === ORDERS_ENDPOINT && c.method === 'POST')).toBe(
        true,
      )
      const failure = lines
        .map((line) => JSON.parse(line))
        .find((e) => e.status === 'previous_order_cancel_failed')
      expect(failure).toBeDefined()
      expect(failure.mp_order_id).toBe(OLD_MP_ORDER_ID)
    },
  )

  it('pedido sem mp_order_id → o cancel NÃO é chamado', async () => {
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    await createPayment(
      createDeps(
        createFakeSupabase({ user: { id: USER_ID }, rows: paymentRows(), lists: paymentLists }),
        fetchDouble,
      ),
      paymentRequest(),
      pixBody,
    )

    expect(fetchDouble.calls.filter((c) => c.url.endsWith('/cancel'))).toHaveLength(0)
  })

  it('RTY-03: depois de criar, mp_order_id aponta para a order NOVA', async () => {
    const supabase = retryingSupabase()
    await createPayment(
      createDeps(supabase, createFakeFetch(routes({ status: 200, body: {} }))),
      paymentRequest(),
      pixBody,
    )

    const idsUpdate = supabase.updates.find((u) => 'mp_order_id' in u.values)!
    expect(idsUpdate.values.mp_order_id).toBe(MP_ORDER_ID)
    expect(idsUpdate.values.mp_order_id).not.toBe(OLD_MP_ORDER_ID)
  })
})

// =============================================================================================
// webhook — fixtures (T12+)
// =============================================================================================

const WEBHOOK_URL = 'http://local/functions/v1/mercado-pago?action=webhook'
const REQUEST_ID = 'req-webhook-1'
const TS = '1700000000'

/**
 * Assina o manifest do MP (`id:…;request-id:…;ts:…;`) com HMAC-SHA256 hex, de forma independente
 * de `webhookSignature.ts` — a assinatura tem de ser produzível por quem só conhece o protocolo.
 *
 * `lowercase` existe porque as duas formas ocorrem de verdade (D2): o template oficial lowerceia o
 * `data.id`, mas o MP assina o tópico `order` com o id **como emitido**, em maiúsculas.
 */
async function signManifest(dataId: string, lowercase = true): Promise<string> {
  const idPart = lowercase ? dataId.toLowerCase() : dataId
  const manifest = `id:${idPart};request-id:${REQUEST_ID};ts:${TS};`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TEST_ENV.mpWebhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(manifest))
  const v1 = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `ts=${TS},v1=${v1}`
}

/** Notificação assinada. `body` é o que o MP posta — nunca fonte de verdade (WHK-01). */
async function signedNotification(
  dataId: string,
  body: Record<string, unknown>,
  lowercase = true,
) {
  const url = new URL(`${WEBHOOK_URL}&data.id=${dataId}`)
  const req = new Request(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': await signManifest(dataId, lowercase),
      'x-request-id': REQUEST_ID,
    },
    body: JSON.stringify(body),
  })
  return { req, url }
}

/** Resposta de `GET /v1/orders/{id}`. */
function mpOrderLookup(over: Record<string, unknown> = {}) {
  return {
    id: MP_ORDER_ID,
    status: 'processed',
    status_detail: 'accredited',
    external_reference: ORDER_ID,
    transactions: { payments: [{ id: MP_PAYMENT_ID, status: 'processed' }] },
    ...over,
  }
}

const orderRow = (over: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  payment_status: 'pending',
  mp_payment_id: null,
  mp_order_id: MP_ORDER_ID,
  ...over,
})

describe('webhook — tópico order e consulta ao MP (WHK-01, WHK-03)', () => {
  it('WHK-01: type=order consulta GET /v1/orders/{data.id} com o access token', async () => {
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }])
    await webhook(
      createDeps(createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } }), fetchDouble),
      req,
      url,
    )

    expect(fetchDouble.calls).toHaveLength(1)
    expect(fetchDouble.calls[0].url).toBe(`${ORDERS_ENDPOINT}/${MP_ORDER_ID}`)
    expect(fetchDouble.calls[0].headers['Authorization']).toBe('Bearer APP_USR-test-token')
  })

  it('WHK-01: type=payment → { received: true } sem consultar o MP e sem tocar no pedido', async () => {
    const { req, url } = await signedNotification('123456', {
      type: 'payment',
      data: { id: '123456' },
    })
    const supabase = createFakeSupabase({ rows: { orders: orderRow() } })
    const fetchDouble = createFakeFetch()
    const response = await webhook(createDeps(supabase, fetchDouble), req, url)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(fetchDouble.calls).toHaveLength(0)
    expect(supabase.updates).toHaveLength(0)
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('WHK-01: o GET vence o corpo da notificação — a notificação mente e o pedido segue o GET', async () => {
    // A notificação diz "failed"; o GET diz "processed". Se o corpo fosse fonte de verdade, o
    // pedido não seria aprovado e a RPC não rodaria.
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
      status: 'failed',
      status_detail: 'cc_rejected_other_reason',
    })
    const supabase = createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } })
    await webhook(
      createDeps(
        supabase,
        createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup({ status: 'processed' }) }]),
      ),
      req,
      url,
    )

    expect(supabase.rpcs).toHaveLength(1)
    expect(supabase.rpcs[0].args.p_status_detail).toBe('accredited')
  })

  it('WHK-03: localiza o pedido por external_reference', async () => {
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
    })
    // Só responde quando o filtro é `id = <external_reference>` — prova o caminho primário.
    const supabase = createFakeSupabase({
      rows: { orders: (eq) => (eq?.[0] === 'id' && eq?.[1] === ORDER_ID ? orderRow() : null) },
      rpc: { data: true },
    })
    const response = await webhook(
      createDeps(supabase, createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }])),
      req,
      url,
    )

    expect(response.status).toBe(200)
    expect(supabase.rpcs[0].args.p_order_id).toBe(ORDER_ID)
  })

  it('WHK-03: sem external_reference, cai no fallback por mp_order_id', async () => {
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
    })
    const supabase = createFakeSupabase({
      rows: {
        orders: (eq) =>
          eq?.[0] === 'mp_order_id' && eq?.[1] === MP_ORDER_ID ? orderRow() : null,
      },
      rpc: { data: true },
    })
    const response = await webhook(
      createDeps(
        supabase,
        createFakeFetch([
          { match: '/v1/orders/', body: mpOrderLookup({ external_reference: undefined }) },
        ]),
      ),
      req,
      url,
    )

    expect(response.status).toBe(200)
    expect(supabase.rpcs[0].args.p_order_id).toBe(ORDER_ID)
  })

  it('WHK-03: nenhum caminho casa → { received: true } e log order_not_found', async () => {
    const lines = captureLogs()
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
    })
    const supabase = createFakeSupabase({ rows: { orders: null } })
    const response = await webhook(
      createDeps(supabase, createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }])),
      req,
      url,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    expect(supabase.updates).toHaveLength(0)
    expect(supabase.rpcs).toHaveLength(0)
    const entry = lines.map((l) => JSON.parse(l)).find((e) => e.status === 'order_not_found')
    expect(entry).toBeDefined()
    expect(entry.mp_order_id).toBe(MP_ORDER_ID)
  })
})

describe('webhook — manifest do tópico order (D2)', () => {
  // O defeito medido no T16: 8 de 8 notificações reais do MP responderam 401. O segredo estava
  // certo (64 caracteres, idêntico ao do painel) — o que não batia era o manifest: o `data.id` do
  // tópico `order` vem em MAIÚSCULAS e o lowercase do template oficial mudava a string assinada.
  it('D2: notificação assinada com o data.id MAIÚSCULO, SEM lowercase → 200 e efeitos aplicados', async () => {
    const { req, url } = await signedNotification(
      MP_ORDER_ID,
      { type: 'order', data: { id: MP_ORDER_ID } },
      false,
    )
    const supabase = createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } })
    const response = await webhook(
      createDeps(supabase, createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }])),
      req,
      url,
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    // Não é só o 200: a aprovação tem de ter sido aplicada de fato.
    expect(supabase.rpcs).toHaveLength(1)
    expect(supabase.rpcs[0].fn).toBe('apply_payment_approval')
  })

  it('D2: o template oficial (id em minúsculas) continua aceito — os dois candidatos valem', async () => {
    const { req, url } = await signedNotification(MP_ORDER_ID, {
      type: 'order',
      data: { id: MP_ORDER_ID },
    })
    const supabase = createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } })
    const response = await webhook(
      createDeps(supabase, createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }])),
      req,
      url,
    )

    expect(response.status).toBe(200)
    expect(supabase.rpcs).toHaveLength(1)
  })

  it('D2: assinatura de OUTRO segredo segue 401 nos dois candidatos', async () => {
    const { req, url } = await signedNotification(
      MP_ORDER_ID,
      { type: 'order', data: { id: MP_ORDER_ID } },
      false,
    )
    const fetchDouble = createFakeFetch()
    const response = await webhook(
      createDeps(createFakeSupabase(), fetchDouble, { mpWebhookSecret: 'outro-segredo' }),
      req,
      url,
    )

    expect(response.status).toBe(401)
    expect(fetchDouble.calls).toHaveLength(0)
  })
})

describe('webhook — transições, RPC e duplicidade (WHK-04, LOG-01)', () => {
  const notify = () =>
    signedNotification(MP_ORDER_ID, { type: 'order', data: { id: MP_ORDER_ID } })

  const lookup = (over: Record<string, unknown> = {}) =>
    createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup(over) }])

  it('WHK-04: alvo approved passa pela RPC apply_payment_approval com o id do payment', async () => {
    const { req, url } = await notify()
    const supabase = createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } })
    const response = await webhook(createDeps(supabase, lookup()), req, url)

    expect(response.status).toBe(200)
    expect(supabase.rpcs).toEqual([
      {
        fn: 'apply_payment_approval',
        args: {
          p_order_id: ORDER_ID,
          p_mp_payment_id: MP_PAYMENT_ID,
          p_status_detail: 'accredited',
        },
      },
    ])
    // Os efeitos são da RPC: o handler não grava payment_status por fora dela.
    expect(supabase.updates).toHaveLength(0)
  })

  it('WHK-04: transição não permitida por canTransition não regride o pedido', async () => {
    // approved → cancelled não está no mapa de transições: só o detail é gravado.
    const { req, url } = await notify()
    const supabase = createFakeSupabase({
      rows: { orders: orderRow({ payment_status: 'approved', mp_payment_id: MP_PAYMENT_ID }) },
    })
    await webhook(
      createDeps(supabase, lookup({ status: 'canceled', status_detail: 'by_collector' })),
      req,
      url,
    )

    expect(supabase.updates).toEqual([
      { table: 'orders', values: { mp_status_detail: 'by_collector' }, eq: ['id', ORDER_ID] },
    ])
    expect(supabase.rpcs).toHaveLength(0)
  })

  it('WHK-04: segundo approved de OUTRA order grava duplicate_approved_other_order e NÃO reaplica a RPC', async () => {
    const { req, url } = await notify()
    const supabase = createFakeSupabase({
      rows: {
        orders: orderRow({
          payment_status: 'approved',
          mp_order_id: 'ORDTST01KAAAAAAAAAAAAAAAAAAAAAA',
          mp_payment_id: 'PAY01KAAAAAAAAAAAAAAAAAAAAA',
        }),
      },
      rpc: { data: true },
    })
    const response = await webhook(createDeps(supabase, lookup()), req, url)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ received: true })
    // Não reaplica efeitos…
    expect(supabase.rpcs).toHaveLength(0)
    // …e não regride: só o marcador greppável entra em mp_status_detail.
    expect(supabase.updates).toHaveLength(1)
    expect(supabase.updates[0].values).toEqual({
      mp_status_detail: `duplicate_approved_other_order: ${MP_ORDER_ID} (accredited)`,
    })
  })

  it('WHK-04: webhook duplicado da MESMA order é no-op (RPC devolve false, só o detail é gravado)', async () => {
    const { req, url } = await notify()
    const supabase = createFakeSupabase({
      rows: { orders: orderRow({ payment_status: 'approved', mp_payment_id: MP_PAYMENT_ID }) },
      rpc: { data: false },
    })
    await webhook(createDeps(supabase, lookup()), req, url)

    expect(supabase.rpcs).toHaveLength(1)
    expect(supabase.updates).toEqual([
      { table: 'orders', values: { mp_status_detail: 'accredited' }, eq: ['id', ORDER_ID] },
    ])
  })

  // D7 (medido no T16): a RPC `apply_payment_approval` grava só `mp_payment_id` — o SQL dela é
  // intocado de propósito. Sem escrita no handler, um pedido localizado por `external_reference`
  // fica `approved` com `mp_order_id` null, e o fallback de lookup do WHK-03 fica cego para a
  // próxima notificação da mesma order.
  it('D7: caminho approved persiste mp_order_id quando o pedido ainda não tinha', async () => {
    const { req, url } = await notify()
    const supabase = createFakeSupabase({
      rows: { orders: orderRow({ mp_order_id: null }) },
      rpc: { data: true },
    })
    const response = await webhook(createDeps(supabase, lookup()), req, url)

    expect(response.status).toBe(200)
    expect(supabase.rpcs).toHaveLength(1)
    const write = supabase.updates.find((u) => 'mp_order_id' in u.values)
    expect(write).toBeDefined()
    expect(write!.table).toBe('orders')
    expect(write!.eq).toEqual(['id', ORDER_ID])
    expect(write!.values.mp_order_id).toBe(MP_ORDER_ID)
  })

  it('LOG-01: o log do webhook inclui mp_order_id', async () => {
    const lines = captureLogs()
    const { req, url } = await notify()
    await webhook(
      createDeps(
        createFakeSupabase({ rows: { orders: orderRow() }, rpc: { data: true } }),
        lookup(),
      ),
      req,
      url,
    )

    const entry = lines.map((l) => JSON.parse(l)).find((e) => e.action === 'webhook')
    expect(entry).toBeDefined()
    expect(entry.mp_order_id).toBe(MP_ORDER_ID)
    expect(entry.applied).toBe(true)
  })
})

// =================================================================================================
// Gatilhos de e-mail transacional (TRG-01…TRG-11, feature 10)
// =================================================================================================

const RESEND_ROUTE = { match: 'api.resend.com', body: { id: 'msg-email-1' } }

/**
 * Marca que só existe no `select` da releitura do e-mail (o join de `order_items`). É por ela que o
 * dublê distingue as DUAS leituras de `orders` com o mesmo filtro `id`.
 */
const EMAIL_SELECT_MARK = 'order_items ('

/** Linha que o motor de e-mail lê — estado do banco DEPOIS dos updates do handler. */
function emailOrderRow(over: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    order_number: 'NP-EMAIL01',
    customer_name: 'Nana Pin',
    customer_email: 'nana@nanapin.test',
    status: 'pending',
    payment_status: 'pending',
    paid_at: null,
    mp_order_id: MP_ORDER_ID,
    tracking_code: null,
    shipping_carrier: null,
    subtotal: 48,
    shipping_cost: 0,
    discount: 0,
    pix_discount: 0,
    total: 48,
    address_street: 'Rua A',
    address_number: '1',
    address_complement: null,
    address_neighborhood: 'Centro',
    address_city: 'São Paulo',
    address_state: 'SP',
    address_zip: '01001-000',
    order_items: [{ product_name: 'Botton Teste', size: 'M', finish: 'Fosco', quantity: 2, unit_price: 24 }],
    ...over,
  }
}

/**
 * Sem esta discriminação o gatilho daria FALSO VERDE: a fixture estática devolveria o estado de
 * ANTES dos updates também para a releitura do e-mail (`mp_order_id: null`, `paid_at: null`), a
 * pré-condição barraria, e nenhum e-mail sairia — com todos os testes passando.
 */
function ordersBySelect(handlerRow: unknown, emailRow: unknown) {
  return (_eq: [string, unknown] | null, select: string) =>
    select.includes(EMAIL_SELECT_MARK) ? emailRow : handlerRow
}

const EMAIL_RPCS = {
  apply_payment_approval: { data: true },
  claim_order_email: { data: 'claim-row-1' },
  finish_order_email: { data: null },
}

function emailSupabase(handlerOver: Record<string, unknown> = {}, emailOver: Record<string, unknown> = {}) {
  const base = paymentRows(handlerOver)
  return createFakeSupabase({
    user: { id: USER_ID },
    rows: { ...base, orders: ordersBySelect(base.orders, emailOrderRow(emailOver)) },
    lists: paymentLists,
    rpcByFn: EMAIL_RPCS,
  })
}

const resendCalls = (f: ReturnType<typeof createFakeFetch>) =>
  f.calls.filter((c) => c.url.includes('api.resend.com'))

/** Faz UMA rpc lançar de verdade (o dublê normal só devolve `error`). */
function poisonRpc(supabase: ReturnType<typeof createFakeSupabase>, fnName: string) {
  const original = supabase.client.rpc
  supabase.client.rpc = async (fn: string, args: Record<string, unknown>) => {
    if (fn === fnName) throw new Error('boom dentro do motor de e-mail')
    return original(fn, args)
  }
  return supabase
}

describe('create-payment — gatilho de e-mail (TRG-04, TRG-05, TRG-08, TRG-09, TRG-10)', () => {
  it('TRG-08: PIX criado com qr_code → UM order_received', async () => {
    const supabase = emailSupabase()
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }, RESEND_ROUTE])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect((await response.json()).qr_code).toBe('PIX-COPIA-E-COLA')
    const emails = resendCalls(fetchDouble)
    expect(emails).toHaveLength(1)
    expect(emails[0].body.subject).toBe('Pedido NP-EMAIL01 recebido — aguardando o PIX')
    expect(emails[0].body.to).toBe('nana@nanapin.test')
  })

  it('TRG-09: PIX sem qr_code → ZERO e-mails (não promete PIX que não existe)', async () => {
    const supabase = emailSupabase()
    const fetchDouble = createFakeFetch([
      {
        match: '/v1/orders',
        body: mpOrderResponse({ transactions: { payments: [{ id: MP_PAYMENT_ID, payment_method: {} }] } }),
      },
      RESEND_ROUTE,
    ])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })

  it('TRG-04: cartão aprovado → UM order_paid e ZERO order_received', async () => {
    const supabase = emailSupabase({}, { paid_at: '2026-07-30T12:00:00Z', payment_status: 'approved' })
    const fetchDouble = createFakeFetch([
      { match: '/v1/orders', body: mpOrderResponse({ status: 'processed', status_detail: 'accredited' }) },
      RESEND_ROUTE,
    ])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), cardBody)

    expect(response.status).toBe(200)
    const emails = resendCalls(fetchDouble)
    expect(emails).toHaveLength(1)
    expect(emails[0].body.subject).toBe('Pagamento aprovado — pedido NP-EMAIL01')
    expect(emails[0].body.subject).not.toContain('recebido')
  })

  it('TRG-04: aprovação já aplicada antes (RPC devolve false) → ZERO e-mails', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: {
        ...paymentRows(),
        orders: ordersBySelect(
          paymentRows().orders,
          emailOrderRow({ paid_at: '2026-07-30T12:00:00Z', payment_status: 'approved' }),
        ),
      },
      lists: paymentLists,
      rpcByFn: { ...EMAIL_RPCS, apply_payment_approval: { data: false } },
    })
    const fetchDouble = createFakeFetch([
      { match: '/v1/orders', body: mpOrderResponse({ status: 'processed', status_detail: 'accredited' }) },
      RESEND_ROUTE,
    ])

    await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), cardBody)

    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })

  it('TRG-05: cartão recusado → ZERO e-mails', async () => {
    const supabase = emailSupabase()
    const fetchDouble = createFakeFetch([
      {
        match: '/v1/orders',
        body: mpOrderResponse({ status: 'action_required', status_detail: 'rejected_by_issuer' }),
      },
      RESEND_ROUTE,
    ])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), cardBody)

    expect((await response.json()).status).toBe('rejected')
    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })

  it('TRG-10: retentativa de PIX no mesmo pedido → claim devolve null → ZERO e-mails novos', async () => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: { ...paymentRows(), orders: ordersBySelect(paymentRows().orders, emailOrderRow()) },
      lists: paymentLists,
      rpcByFn: { ...EMAIL_RPCS, claim_order_email: { data: null } },
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }, RESEND_ROUTE])

    await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    expect(supabase.rpcs.filter((r) => r.fn === 'claim_order_email')).toHaveLength(1)
    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })
})

describe('webhook — gatilho de e-mail (TRG-01, TRG-02, TRG-03)', () => {
  const notify = () => signedNotification(MP_ORDER_ID, { type: 'order', data: { id: MP_ORDER_ID } })

  const webhookSupabase = (rpcOver: Record<string, { data?: unknown; error?: unknown }> = {}, emailOver = {}) =>
    createFakeSupabase({
      rows: {
        orders: ordersBySelect(
          orderRow(),
          emailOrderRow({ paid_at: '2026-07-30T12:00:00Z', payment_status: 'approved', ...emailOver }),
        ),
      },
      rpcByFn: { ...EMAIL_RPCS, ...rpcOver },
    })

  it('TRG-01: approved com applied=true → UM order_paid', async () => {
    const { req, url } = await notify()
    const supabase = webhookSupabase()
    const fetchDouble = createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }, RESEND_ROUTE])

    const response = await webhook(createDeps(supabase, fetchDouble), req, url)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
    const emails = resendCalls(fetchDouble)
    expect(emails).toHaveLength(1)
    expect(emails[0].body.subject).toBe('Pagamento aprovado — pedido NP-EMAIL01')
  })

  it('TRG-02: webhook reentregue (RPC no-op, applied=false) → ZERO e-mails', async () => {
    const { req, url } = await notify()
    const supabase = webhookSupabase({ apply_payment_approval: { data: false } })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }, RESEND_ROUTE])

    await webhook(createDeps(supabase, fetchDouble), req, url)

    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })

  it.each(['refunded', 'expired', 'canceled'])(
    'TRG-03: transição %s (applied=true pelo update) → ZERO e-mails de aprovação',
    async (mpStatus) => {
      const { req, url } = await notify()
      const supabase = createFakeSupabase({
        rows: {
          orders: ordersBySelect(
            orderRow(),
            emailOrderRow({ paid_at: '2026-07-30T12:00:00Z', payment_status: 'approved' }),
          ),
        },
        rpcByFn: EMAIL_RPCS,
      })
      const fetchDouble = createFakeFetch([
        { match: '/v1/orders/', body: mpOrderLookup({ status: mpStatus }) },
        RESEND_ROUTE,
      ])

      await webhook(createDeps(supabase, fetchDouble), req, url)

      expect(resendCalls(fetchDouble)).toHaveLength(0)
    },
  )
})

describe('TRG-06 — falha de e-mail NUNCA altera a resposta do pagamento', () => {
  it('Resend fora do ar: PIX segue 200 com qr_code e expires_at', async () => {
    const supabase = emailSupabase()
    const fetchDouble = createFakeFetch([
      { match: '/v1/orders', body: mpOrderResponse() },
      { match: 'api.resend.com', networkError: true },
    ])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.qr_code).toBe('PIX-COPIA-E-COLA')
    expect(body.qr_code_base64).toBe('cXItYmFzZTY0')
    expect(body.expires_at).toBeTruthy()
  })

  it('Resend 403: PIX segue 200 — resposta idêntica à baseline sem e-mail', async () => {
    // Relógio congelado para a comparação valer de fato: `expires_at` deriva de `new Date()` e sem
    // isto as duas chamadas diferem em milissegundos, mascarando o que o teste quer provar.
    // Só `Date` é falseado — falsear `setTimeout` penduraria a leitura do corpo da Response.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-07-30T12:00:00Z') })
    try {
      const semEmail = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
      const baseline = await (
        await createPayment(createDeps(emailSupabase(), semEmail), paymentRequest(), pixBody)
      ).json()

      const fetchDouble = createFakeFetch([
        { match: '/v1/orders', body: mpOrderResponse() },
        { match: 'api.resend.com', status: 403, body: { name: 'validation_error', message: 'testing only' } },
      ])
      const comEmail = await (
        await createPayment(createDeps(emailSupabase(), fetchDouble), paymentRequest(), pixBody)
      ).json()

      expect(comEmail).toEqual(baseline)
      expect(comEmail.expires_at).toBe('2026-07-30T12:30:00.000Z')
      expect(resendCalls(fetchDouble)).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('motor de e-mail LANÇANDO: PIX segue 200 — o try/catch é carga, não decoração', async () => {
    const supabase = poisonRpc(emailSupabase(), 'claim_order_email')
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }, RESEND_ROUTE])

    const response = await createPayment(createDeps(supabase, fetchDouble), paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect((await response.json()).qr_code).toBe('PIX-COPIA-E-COLA')
    expect(resendCalls(fetchDouble)).toHaveLength(0)
  })

  it('motor de e-mail LANÇANDO no webhook: segue 200 {received:true}, sem 500 que faria o MP retentar', async () => {
    const { req, url } = await signedNotification(MP_ORDER_ID, { type: 'order', data: { id: MP_ORDER_ID } })
    const supabase = poisonRpc(
      createFakeSupabase({
        rows: {
          orders: ordersBySelect(
            orderRow(),
            emailOrderRow({ paid_at: '2026-07-30T12:00:00Z', payment_status: 'approved' }),
          ),
        },
        rpcByFn: EMAIL_RPCS,
      }),
      'claim_order_email',
    )
    const fetchDouble = createFakeFetch([{ match: '/v1/orders/', body: mpOrderLookup() }, RESEND_ROUTE])

    const response = await webhook(createDeps(supabase, fetchDouble), req, url)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ received: true })
  })
})

// =================================================================================================
// 07/T12–T14 — preço por variação no caixa (PST-01 AC 6–10, PST-09)
// =================================================================================================
// A aritmética de `resolveItemPrice` já tem 36 testes em `packages/core/src/pricing`. O que se prova
// AQUI é o que a lição L-007 do projeto diz que testar a função pura NÃO prova: que o HANDLER usa a
// função, que o valor chega ao Mercado Pago, e que preço não resolvível vira 422 ANTES da cobrança.
describe('create-payment — preço por variação (07/T12, T13, T14)', () => {
  const VARIANT_ID = 'c7d8e9f0-a1b2-4c3d-8e9f-0a1b2c3d4e5f'
  const OTHER_VARIANT_ID = '11112222-3333-4444-5555-666677778888'

  /** Item marcado como `variant`, apontando para uma linha de R$ 18,40. */
  const variantLists = (over: Record<string, unknown[]> = {}) => ({
    order_items: [{
      id: 'oi-1', product_id: PRODUCT_ID, quantity: 1, unit_price: 14.9,
      variant_id: VARIANT_ID, price_source: 'variant',
    }],
    products: [{ id: PRODUCT_ID, base_price: 14.9 }],
    product_variants: [{ id: VARIANT_ID, product_id: PRODUCT_ID, price: 18.4 }],
    ...over,
  })

  const envWith = (lists: Record<string, unknown[]>, env: Record<string, unknown> = {}) => {
    const supabase = createFakeSupabase({
      user: { id: USER_ID },
      rows: { ...paymentRows(), store_settings: null },
      lists,
    })
    const fetchDouble = createFakeFetch([{ match: '/v1/orders', body: mpOrderResponse() }])
    return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble, env as never) }
  }

  it('price_source variant cobra o preço da VARIAÇÃO, não o base_price', async () => {
    const e = envWith(variantLists())
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    // base_price é 14,90 e a variação custa 18,40. Cobrar 14,90 seria o bug que a feature existe
    // para matar — R$ 3,50 perdidos por pedido, calados.
    expect(e.fetchDouble.calls.at(-1)!.body.total_amount).toBe('18.40')
  })

  it('price_source base cobra o base_price mesmo com variação existindo', async () => {
    // PST-01 AC 6: o caminho é o GRAVADO no item, não o inferido do produto.
    const e = envWith(variantLists({
      order_items: [{
        id: 'oi-1', product_id: PRODUCT_ID, quantity: 1, unit_price: 99,
        variant_id: null, price_source: 'base',
      }],
    }))
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect(e.fetchDouble.calls.at(-1)!.body.total_amount).toBe('14.90')
  })

  it.each([
    ['variação inexistente', { product_variants: [] }],
    ['variação de OUTRO produto', {
      product_variants: [{ id: VARIANT_ID, product_id: OTHER_VARIANT_ID, price: 18.4 }],
    }],
    ['variação sem preço', {
      product_variants: [{ id: VARIANT_ID, product_id: PRODUCT_ID, price: null }],
    }],
  ])('%s → 422 e NENHUMA chamada ao Mercado Pago', async (_label, over) => {
    const e = envWith(variantLists(over))
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    // A prova que importa: o pedido impagável não virou cobrança.
    expect(e.fetchDouble.calls).toHaveLength(0)
    expect((await response.json()).error).toContain(VARIANT_ID)
  })

  it('nunca cai no unit_price do cliente quando o preço não resolve', async () => {
    // Antes da T12 havia `?? Number(i.unit_price)`. Com ele, este pedido seria cobrado a 14,90 —
    // um valor escolhido pelo browser.
    const e = envWith(variantLists({ product_variants: [] }))
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(422)
    expect(e.supabase.updates.find((u) => 'total' in u.values)).toBeUndefined()
  })

  it('flag desligada: cai em base_price com log de aviso, sem 422 (PST-09)', async () => {
    const lines = captureLogs()
    const e = envWith(variantLists({ product_variants: [] }), { strictVariantPricing: false })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect(e.fetchDouble.calls.at(-1)!.body.total_amount).toBe('14.90')
    expect(lines.map((l) => JSON.parse(l)).some((x) => x.status === 'variant_pricing_lenient')).toBe(
      true,
    )
  })

  it('T13: persiste subtotal E o unit_price recalculado de cada item', async () => {
    const e = envWith(variantLists())
    await createPayment(e.deps, paymentRequest(), pixBody)

    // Sem isto o item mostraria 14,90 num pedido que cobrou 18,40 — no histórico, no e-mail e no
    // backoffice.
    const orderUpdate = e.supabase.updates.find((u) => u.table === 'orders' && 'total' in u.values)
    expect(orderUpdate!.values.subtotal).toBe(18.4)

    const itemUpdate = e.supabase.updates.find((u) => u.table === 'order_items')
    expect(itemUpdate).toBeDefined()
    expect(itemUpdate!.values).toEqual({ unit_price: 18.4 })
    expect(itemUpdate!.eq).toEqual(['id', 'oi-1'])
  })

  it('item cujo unit_price já está certo não gera update redundante', async () => {
    const e = envWith(variantLists({
      order_items: [{
        id: 'oi-1', product_id: PRODUCT_ID, quantity: 1, unit_price: 18.4,
        variant_id: VARIANT_ID, price_source: 'variant',
      }],
    }))
    await createPayment(e.deps, paymentRequest(), pixBody)
    expect(e.supabase.updates.filter((u) => u.table === 'order_items')).toHaveLength(0)
  })

  it('pin personalizado (product_id não-uuid) segue usando o unit_price persistido', async () => {
    // A3: produto sintético, sem linha em `products`. Não há o que resolver.
    const e = envWith({
      order_items: [{
        id: 'oi-1', product_id: 'custom-1754000000000', quantity: 2, unit_price: 12.5,
        variant_id: null, price_source: 'base',
      }],
      products: [],
      product_variants: [],
    })
    const response = await createPayment(e.deps, paymentRequest(), pixBody)

    expect(response.status).toBe(200)
    expect(e.fetchDouble.calls.at(-1)!.body.total_amount).toBe('25.00')
  })
})
