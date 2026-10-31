// Feature 89, T10 — o `create-payment` de um pedido montado pelo painel cobra o TRAVADO.
//
//   PRC-03  o `create-payment` usa os preços travados e o desconto avulso da proposta, em vez de
//           reler `products`, promoções e cupom;
//   PRC-05  cupom de frete grátis zera o frete da entrega escolhida;
//   PRC-06  o valor cobrado no Mercado Pago é o total que o link mostrou.
//
// Os números esperados são escritos POR EXTENSO a partir da AC, nunca recalculados com a função que
// o handler chama — derivar o esperado de `proposalPricing` provaria que ela é igual a si mesma.
// A paridade "o link mostra o que o MP cobra", com as duas serializações, mora em
// `packages/core/src/proposals/__tests__/proposalParity.test.ts`.

import { describe, expect, it } from 'vitest'
import { createPayment } from '../handlers.ts'
import { createDeps, createFakeFetch, createFakeSupabase, type FakeSupabaseOptions } from './fakes.ts'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'
const PROPOSAL_ID = '7e1d2c3b-4a59-4687-9a1b-2c3d4e5f6a7b'
const USER_ID = 'auth-user-1'
const PRODUCT_A = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e'
const PRODUCT_B = 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f'
const VARIANT_B = 'd3e4f5a6-b7c8-4d9e-8f1a-2b3c4d5e6f70'
const COUPON_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-3c4d5e6f7081'

const ORDERS_ENDPOINT = 'https://api.mercadopago.com/v1/orders'

/**
 * As linhas travadas: 20,00 × 2 (a promoção da época já dentro do preço) + 15,00 × 1 (variação).
 * Subtotal travado = 55,00. O catálogo de HOJE diz outra coisa (25 e 30), e a promoção acabou.
 */
const LINHAS = [
  { product_id: PRODUCT_A, variant_id: null, quantity: 2, unit_price: 20 },
  { product_id: PRODUCT_B, variant_id: VARIANT_B, quantity: 1, unit_price: 15 },
]

/** O pedido como `create_order_from_proposal` o grava: as mesmas linhas, com `product_id` em texto. */
const ITENS_DO_PEDIDO = LINHAS.map((l, i) => ({ id: `item-${i}`, ...l, price_source: l.variant_id ? 'variant' : 'base' }))

interface Cenario {
  order?: Record<string, unknown>
  proposal?: Record<string, unknown> | null
  orderItems?: unknown[]
  pixDiscountPercent?: number
  shippingSettings?: Record<string, unknown> | null
  /** A linha que o motor de e-mail relê (CON-05). */
  emailRow?: Record<string, unknown>
  /** RPCs extras (as do motor de e-mail). */
  rpcByFn?: FakeSupabaseOptions['rpcByFn']
}

function cenario(c: Cenario = {}) {
  /** Toda leitura de linha única, por tabela — é o que prova o que NÃO foi relido. */
  const leiturasDeLinha: string[] = []
  const espia =
    (table: string, valor: (eq: [string, unknown] | null, select: string) => unknown) =>
    (eq: [string, unknown] | null, select: string) => {
      leiturasDeLinha.push(table === 'store_settings' ? `store_settings:${String(eq?.[1])}` : table)
      return valor(eq, select)
    }

  const options: FakeSupabaseOptions = {
    user: { id: USER_ID },
    ...(c.rpcByFn ? { rpcByFn: c.rpcByFn } : {}),
    rows: {
      // A releitura do motor de e-mail (o `select` com o join de itens) vê o estado DEPOIS dos
      // updates do handler; sem `emailRow` no cenário, a mesma linha de sempre.
      orders: espia('orders', (_eq, select) => (c.emailRow && String(select).includes('order_items (') ? c.emailRow : {
        id: ORDER_ID,
        customer_id: 'cust-1',
        customer_email: 'cliente@estrelinha.test',
        customer_name: 'Ana Souza',
        payment_status: 'pending',
        proposal_id: PROPOSAL_ID,
        shipping_cost: 18.5,
        // O que a RPC gravou a partir da proposta. Um cupom de catálogo VENCIDO, de propósito.
        coupon_id: COUPON_ID,
        discount: 10,
        manual_discount: 5,
        promotion_discount: 10,
        mp_order_id: null,
        ...c.order,
      })),
      customers: espia('customers', () => ({ user_id: USER_ID, cpf: '39053344705', name: 'Ana Souza' })),
      order_proposals: espia('order_proposals', () =>
        c.proposal === null
          ? null
          : {
              id: PROPOSAL_ID,
              status: 'completed',
              order_id: ORDER_ID,
              coupon_discount: 10,
              coupon_free_shipping: false,
              manual_discount: 5,
              ...c.proposal,
            },
      ),
      store_settings: espia('store_settings', (eq) => {
        if (eq?.[1] === 'payment') return { value: { pix_discount_percent: c.pixDiscountPercent ?? 5 } }
        if (eq?.[1] === 'shipping') {
          return c.shippingSettings === undefined ? null : c.shippingSettings === null ? null : { value: c.shippingSettings }
        }
        // Uma oferta de bump LIGADA: o ramo travado não pode aplicá-la.
        if (eq?.[1] === 'checkout') {
          return { value: { order_bump_enabled: true, order_bump_product_id: PRODUCT_A, order_bump_discount_percent: 50 } }
        }
        return null
      }),
      // O cupom do pedido, hoje VENCIDO. O ramo de sempre o derrubaria; o travado nem o lê.
      coupons: espia('coupons', () => ({
        type: 'fixed',
        value: 10,
        active: true,
        valid_from: null,
        valid_until: '2020-01-01T00:00:00Z',
        max_uses: null,
        used_count: 0,
      })),
    },
    lists: {
      order_proposal_items: LINHAS,
      order_items: c.orderItems ?? ITENS_DO_PEDIDO,
      // O catálogo de hoje: preços diferentes dos travados, e a promoção encerrada.
      products: [
        { id: PRODUCT_A, base_price: 25 },
        { id: PRODUCT_B, base_price: 25 },
      ],
      product_variants: [{ id: VARIANT_B, product_id: PRODUCT_B, price: 30 }],
      promotions: [],
    },
  }
  const supabase = createFakeSupabase(options)
  const fetchDouble = createFakeFetch([
    {
      match: '/v1/orders',
      body: {
        id: 'ORDTST01KPROPOSTA',
        status: 'action_required',
        status_detail: 'waiting_transfer',
        external_reference: ORDER_ID,
        transactions: {
          payments: [{ id: 'PAY01KPROPOSTA', payment_method: { qr_code: 'PIX-COPIA', qr_code_base64: 'cXI=' } }],
        },
      },
    },
    { match: 'api.resend.com', body: { id: 'msg-proposta-1' } },
  ])
  return { supabase, fetchDouble, deps: createDeps(supabase, fetchDouble), leiturasDeLinha }
}

const request = () =>
  new Request('http://local/functions/v1/mercado-pago?action=create-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer jwt-de-teste', 'Content-Type': 'application/json' },
  })

const pix = { order_id: ORDER_ID, method: 'pix', idempotency_key: 'idem-proposta' }
const card = {
  order_id: ORDER_ID,
  method: 'card',
  idempotency_key: 'idem-proposta',
  card: {
    token: 'card-token',
    payment_method_id: 'visa',
    installments: 1,
    payer: { email: 'cliente@estrelinha.test' },
  },
}

const cobrado = (e: ReturnType<typeof cenario>) => {
  const chamada = e.fetchDouble.calls.find((c) => c.url === ORDERS_ENDPOINT)
  expect(chamada).toBeDefined()
  expect(chamada!.body.transactions.payments[0].amount).toBe(chamada!.body.total_amount)
  return chamada!.body.total_amount as string
}

const persistido = (e: ReturnType<typeof cenario>) => e.supabase.updates.filter((u) => 'total' in u.values)

describe('create-payment de pedido montado — cobra o travado (PRC-03)', () => {
  it('PIX: cobra 55 − cupom 10 − combinado 5 − PIX 5% + frete 18,50 = 56,50, com o cupom vencido e a promoção encerrada no catálogo', async () => {
    const e = cenario()
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    expect(cobrado(e)).toBe('56.50')
    expect(persistido(e)).toEqual([
      { table: 'orders', values: { subtotal: 55, pix_discount: 2, total: 56.5 }, eq: ['id', ORDER_ID] },
    ])
  })

  it('cartão: sem desconto PIX, 55 − 10 − 5 + 18,50 = 58,50', async () => {
    const e = cenario()
    const res = await createPayment(e.deps, request(), card)
    expect(res.status).toBe(200)
    expect(cobrado(e)).toBe('58.50')
    expect(persistido(e)[0].values).toEqual({ subtotal: 55, pix_discount: 0, total: 58.5 })
  })

  it('não relê catálogo, promoção, cupom nem a oferta do bump', async () => {
    const e = cenario()
    await createPayment(e.deps, request(), pix)
    const tabelasDeLista = e.supabase.reads.map((r) => r.table)
    for (const t of ['products', 'product_variants', 'promotions', 'promotion_eligible_products']) {
      expect(tabelasDeLista).not.toContain(t)
    }
    expect(e.leiturasDeLinha).not.toContain('coupons')
    // A oferta do bump é do caminho de sempre: no travado, ligá-la não muda nada, e nem é lida.
    expect(e.leiturasDeLinha).not.toContain('store_settings:checkout')
    expect(e.leiturasDeLinha).toContain('store_settings:payment')
    expect(e.leiturasDeLinha).toContain('store_settings:shipping')
  })

  it('lê as linhas DA PROPOSTA e confere o pedido pelo id', async () => {
    const e = cenario()
    await createPayment(e.deps, request(), pix)
    const linhas = e.supabase.reads.find((r) => r.table === 'order_proposal_items')
    expect(linhas?.eq).toEqual([['proposal_id', PROPOSAL_ID]])
    const itens = e.supabase.reads.find((r) => r.table === 'order_items')
    expect(itens?.eq).toEqual([['order_id', ORDER_ID]])
  })

  it('não regrava promoção, cupom nem combinado — só subtotal, PIX e total', async () => {
    const e = cenario()
    await createPayment(e.deps, request(), pix)
    expect(e.supabase.updates.filter((u) => u.table === 'order_items')).toEqual([])
    for (const u of persistido(e)) {
      expect(Object.keys(u.values).sort()).toEqual(['pix_discount', 'subtotal', 'total'])
    }
  })

  it('o log estruturado diz que o ramo foi o da proposta', async () => {
    const linhas: string[] = []
    const original = console.log
    console.log = (l: string) => linhas.push(l)
    try {
      const e = cenario()
      await createPayment(e.deps, request(), pix)
    } finally {
      console.log = original
    }
    const final = linhas.map((l) => JSON.parse(l)).find((l) => l.mp_order_id === 'ORDTST01KPROPOSTA')
    expect(final).toMatchObject({ action: 'create-payment', proposal_id: PROPOSAL_ID, bump_applied: false })
    expect(final.promotion_id).toBeUndefined()
  })
})

describe('create-payment de pedido montado — o frete (PRC-05, A-11)', () => {
  it('cupom de frete grátis travado zera o frete da entrega escolhida: cartão 55 − 5 = 50,00', async () => {
    const e = cenario({ proposal: { coupon_discount: 0, coupon_free_shipping: true } })
    await createPayment(e.deps, request(), card)
    expect(cobrado(e)).toBe('50.00')
  })

  it('faixa de frete grátis atingida (itens 40,00 ≥ 40,00): cartão 40,00', async () => {
    const e = cenario({ shippingSettings: { free_shipping_enabled: true, free_shipping_threshold: 40 } })
    await createPayment(e.deps, request(), card)
    expect(cobrado(e)).toBe('40.00')
  })

  it('um centavo abaixo da faixa cobra o frete: cartão 58,50', async () => {
    const e = cenario({ shippingSettings: { free_shipping_enabled: true, free_shipping_threshold: 40.01 } })
    await createPayment(e.deps, request(), card)
    expect(cobrado(e)).toBe('58.50')
  })

  it('a faixa desligada não zera, mesmo atingida', async () => {
    const e = cenario({ shippingSettings: { free_shipping_enabled: false, free_shipping_threshold: 10 } })
    await createPayment(e.deps, request(), card)
    expect(cobrado(e)).toBe('58.50')
  })
})

describe('create-payment de pedido montado — só o pedido que a proposta ligou', () => {
  const recusado = async (c: Cenario) => {
    const e = cenario(c)
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(422)
    expect(e.fetchDouble.calls.filter((x) => x.url === ORDERS_ENDPOINT)).toEqual([])
    expect(e.supabase.updates).toEqual([])
    return e
  }

  it('proposta que aponta para OUTRO pedido: 422, sem cobrança', async () => {
    await recusado({ proposal: { order_id: 'outro-pedido' } })
  })

  it('proposta ainda aberta (o pedido não nasceu pela RPC): 422', async () => {
    await recusado({ proposal: { status: 'open', order_id: null } })
  })

  it('proposta inexistente: 422', async () => {
    await recusado({ proposal: null })
  })

  it('uma linha a mais no pedido: 422', async () => {
    await recusado({
      orderItems: [...ITENS_DO_PEDIDO, { id: 'item-x', product_id: PRODUCT_A, variant_id: null, quantity: 1, unit_price: 0.01 }],
    })
  })

  // A chave da linha começa pelo `product_id`, e as travadas são comparadas às do pedido por índice
  // DEPOIS de ordenadas. O caso de cima acrescenta uma linha que ordena ANTES das travadas, e o
  // índice a pega; este acrescenta uma que ordena POR ÚLTIMO, e só a comparação de tamanho a pega
  // (rodada 2 do Verifier, R32). Sem ela, a linha a mais seria cobrada pelo total travado (BL-030).
  it('uma linha a mais no pedido que ordena depois das travadas: 422', async () => {
    const intruso = 'ffffffff-ffff-4fff-bfff-ffffffffffff'
    expect([...LINHAS.map((l) => l.product_id), intruso].sort().at(-1)).toBe(intruso)
    await recusado({
      orderItems: [...ITENS_DO_PEDIDO, { id: 'item-x', product_id: intruso, variant_id: null, quantity: 1, unit_price: 0.01 }],
    })
  })

  it('uma linha com outro preço no pedido: 422', async () => {
    await recusado({ orderItems: [{ ...ITENS_DO_PEDIDO[0], unit_price: 1 }, ITENS_DO_PEDIDO[1]] })
  })

  it('a mesma linha com outra quantidade: 422', async () => {
    await recusado({ orderItems: [{ ...ITENS_DO_PEDIDO[0], quantity: 3 }, ITENS_DO_PEDIDO[1]] })
  })

  it('o pedido montado continua exigindo a prova de posse: sem JWT nem token, 401 antes de ler a proposta', async () => {
    const e = cenario()
    const res = await createPayment(
      e.deps,
      new Request('http://local/functions/v1/mercado-pago?action=create-payment', { method: 'POST' }),
      pix,
    )
    expect(res.status).toBe(401)
    expect(e.leiturasDeLinha).not.toContain('order_proposals')
  })
})

describe('create-payment sem proposta — o ramo de sempre não lê a proposta', () => {
  it('pedido sem `proposal_id` nunca toca `order_proposals` nem `order_proposal_items`', async () => {
    const e = cenario({ order: { proposal_id: null, coupon_id: null, discount: 0, manual_discount: 0, promotion_discount: 0 } })
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    expect(e.leiturasDeLinha).not.toContain('order_proposals')
    expect(e.supabase.reads.map((r) => r.table)).not.toContain('order_proposal_items')
    // E recalcula pelo catálogo de hoje: 25 × 2 + 30 = 80, sem cupom, PIX 5% = 4,00, + 18,50.
    expect(cobrado(e)).toBe('94.50')
  })
})

// Fecho da rodada 1 do Verifier da 89 (CON-05, "e-mails"): o pedido montado recebe o MESMO e-mail
// do caminho de sempre. Antes era inferência — o gatilho é por `order_id`, não pela origem —, sem
// nenhum caso que o medisse no ramo travado.
describe('create-payment de pedido montado — o e-mail de sempre (CON-05)', () => {
  const linhaDoEmail = {
    id: ORDER_ID,
    order_number: '0201',
    customer_name: 'Ana Souza',
    customer_email: 'cliente@estrelinha.test',
    status: 'pending',
    payment_status: 'pending',
    paid_at: null,
    mp_order_id: 'ORDTST01KPROPOSTA',
    tracking_code: null,
    shipping_carrier: null,
    subtotal: 55,
    shipping_cost: 18.5,
    discount: 10,
    pix_discount: 2,
    total: 56.5,
    address_street: 'Rua A',
    address_number: '1',
    address_complement: null,
    address_neighborhood: 'Centro',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    address_zip: '91240-010',
    order_items: [{ product_name: 'Pingente Estrela', size: null, finish: null, quantity: 2, unit_price: 20 }],
  }
  const rpcs = { claim_order_notification: { data: 'claim-proposta-1' }, finish_order_notification: { data: null } }

  it('PIX do pedido montado com QR ⇒ o `order_received` sai para o e-mail do pedido', async () => {
    const e = cenario({ emailRow: linhaDoEmail, rpcByFn: rpcs })
    const res = await createPayment(e.deps, request(), pix)
    expect(res.status).toBe(200)
    const emails = e.fetchDouble.calls.filter((c) => c.url.includes('api.resend.com'))
    expect(emails.length).toBeGreaterThanOrEqual(1)
    expect(emails[0].body.to).toBe('cliente@estrelinha.test')
    expect(emails[0].body.subject).toBe('Pedido #0201 recebido — aguardando o PIX')
    expect(e.supabase.rpcs.filter((r) => r.fn === 'claim_order_notification').map((r) => r.args.p_event ?? r.args.event)).toContain('order_received')
  })
})
