import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFakeFetch, createFakeSupabase, type FakeSupabaseOptions } from '../../_shared/testing/fakes.ts'
import { type PurchaseDeps, sendPurchase } from '../analytics.ts'
import { syntheticClientId } from '../../../../packages/core/src/analytics/purchase.ts'

// Feature 61 · T09 — `sendPurchase`: a compra no GA4, pelo servidor (CMP-02..08).
//
// O dublê do banco ENXERGA a reivindicação: a fixtura de `updatedRows` é uma função que recebe os
// `.eq()` e os `.is()` do update, e só devolve a linha quando o recorte `ga_purchase_status is
// null` está lá — como o banco faria. Sem isso, "uma vez só" seria verdadeiro nos dois mundos (a
// lição da `49`: dublê que não enxerga o filtro torna o filtro inauditável).

const PEDIDO_ID = 'a3f1c2d4-0000-4000-8000-000000000042'
const CHAVE = 'Xy9_kQ2-aBcDeFgHiJkLmN'
const AGORA = Date.parse('2026-10-05T18:00:00.000Z')

const LINHA_DO_PEDIDO = {
  id: PEDIDO_ID,
  order_number: '0244',
  total: 349.8,
  shipping_cost: 24.9,
  discount: 10,
  promotion_discount: 3,
  pix_discount: 2,
  coupon_code: 'AMOR10',
  ga_client_id: '123456.789012',
  ga_session_id: '1728000000',
  analytics_declined: false,
}

const LIGADO = { enabled: true, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' }

const ITENS = [
  { product_id: 'prod-a', product_name: 'Nome congelado A', variant_label: 'Prata 925', unit_price: 169.95, quantity: 2 },
  { product_id: 'prod-sumiu', product_name: 'Peça que saiu do catálogo', variant_label: null, unit_price: 9.9, quantity: 1 },
]
const PRODUTOS = [
  {
    id: 'prod-a',
    name: 'Pingente A',
    nuvemshop_id: 111,
    product_categories: [
      { category_id: 'c2', position: 1, categories: { slug: 'linha-pet', name: 'Linha Pet', sort_order: 2 } },
      { category_id: 'c1', position: 0, categories: { slug: 'joias-afetivas', name: 'Joias afetivas', sort_order: 0 } },
    ],
  },
]

/**
 * Um banco em que a reivindicação funciona COMO NO POSTGRES: a primeira casa (o status ainda é
 * nulo), a segunda não. A fixtura só devolve a linha quando o recorte `is null` foi enviado.
 */
function banco(extra: FakeSupabaseOptions = {}, linha: Record<string, unknown> = LINHA_DO_PEDIDO) {
  let status: string | null = null
  const fake = createFakeSupabase({
    rows: {
      store_settings: (eq: [string, unknown] | null) => (eq?.[1] === 'analytics' ? { value: LIGADO } : null),
      analytics_secrets: (eq: [string, unknown] | null) => (eq?.[1] === 'ga4_api_secret' ? { value: CHAVE } : null),
    },
    lists: { order_items: ITENS, products: PRODUTOS },
    updatedRows: {
      orders: (eqs: Array<[string, unknown]>, is: Array<[string, unknown]>, values: Record<string, unknown>) => {
        const recortaNulo = is.some(([c, v]) => c === 'ga_purchase_status' && v === null)
        const porId = eqs.some(([c, v]) => c === 'id' && v === PEDIDO_ID)
        if (!recortaNulo || !porId || status !== null) return null
        status = String(values.ga_purchase_status)
        return linha
      },
    },
    ...extra,
  })
  return fake
}

const okGoogle = () => createFakeFetch([{ match: 'google-analytics.com/mp/collect', status: 204 }])

const deps = (
  fake: ReturnType<typeof createFakeSupabase>,
  fetch: ReturnType<typeof createFakeFetch>,
  storePublicUrl = 'https://umaestrelinha.com.br',
): PurchaseDeps => ({ supabase: fake.client, fetch: fetch.fetch, storePublicUrl, now: () => AGORA })

/** Os desfechos gravados, sem a reivindicação. */
const desfechos = (fake: ReturnType<typeof createFakeSupabase>) =>
  fake.updates
    .filter((u) => u.table === 'orders' && u.values.ga_purchase_status !== 'sending')
    .map((u) => u.values)

let linhasDeLog: string[] = []
const capturarLog = () => {
  linhasDeLog = []
  vi.spyOn(console, 'log').mockImplementation((l: unknown) => void linhasDeLog.push(String(l)))
  vi.spyOn(console, 'error').mockImplementation((l: unknown) => void linhasDeLog.push(String(l)))
  vi.spyOn(console, 'warn').mockImplementation((l: unknown) => void linhasDeLog.push(String(l)))
}

afterEach(() => vi.restoreAllMocks())

// ---------------------------------------------------------------------------------------------

describe('sendPurchase — o caminho feliz (CMP-02)', () => {
  it('UMA chamada ao /mp/collect, com measurement_id e api_secret na query', async () => {
    capturarLog()
    const fake = banco()
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls).toHaveLength(1)
    const url = new URL(google.calls[0].url)
    expect(url.origin + url.pathname).toBe('https://www.google-analytics.com/mp/collect')
    expect(url.searchParams.get('measurement_id')).toBe('G-SQL517XDQZ')
    expect(url.searchParams.get('api_secret')).toBe(CHAVE)
    expect(google.calls[0].method).toBe('POST')
  })

  it('o corpo é o esperado, campo a campo — transaction_id CRU, desconto somado, itens do pedido', async () => {
    capturarLog()
    const fake = banco()
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls[0].body).toEqual({
      client_id: '123456.789012',
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: '0244',
            value: 349.8,
            currency: 'BRL',
            shipping: 24.9,
            discount: 15,
            coupon: 'AMOR10',
            session_id: '1728000000',
            items: [
              {
                item_id: '111',
                item_name: 'Pingente A',
                item_brand: 'Uma Estrelinha',
                item_category: 'joias-afetivas',
                item_variant: 'Prata 925',
                price: 169.95,
                quantity: 2,
                index: 0,
              },
              {
                // produto apagado depois da venda: o id cai no UUID e o nome no congelado
                item_id: 'prod-sumiu',
                item_name: 'Peça que saiu do catálogo',
                item_brand: 'Uma Estrelinha',
                price: 9.9,
                quantity: 1,
                index: 1,
              },
            ],
          },
        },
      ],
    })
  })

  it('a reivindicação é `sending`, por id, com o recorte `is null` — o dublê enxerga o filtro', async () => {
    capturarLog()
    const fake = banco()
    await sendPurchase(deps(fake, okGoogle()), PEDIDO_ID)

    expect(fake.updates[0]).toEqual({
      table: 'orders',
      values: { ga_purchase_status: 'sending' },
      eq: ['id', PEDIDO_ID],
      is: [['ga_purchase_status', null]],
    })
  })

  it('grava `sent` com o instante', async () => {
    capturarLog()
    const fake = banco()
    await sendPurchase(deps(fake, okGoogle()), PEDIDO_ID)
    expect(desfechos(fake)).toEqual([{ ga_purchase_status: 'sent', ga_purchase_at: new Date(AGORA).toISOString() }])
  })

  it('os itens vêm de order_items (pelo pedido) e o produto por id — duas leituras, sem embed', async () => {
    capturarLog()
    const vistos: Record<string, { eqs: Array<[string, unknown]>; select: string }> = {}
    const fake = banco({
      lists: {
        order_items: (eqs, select) => {
          vistos.order_items = { eqs, select }
          return ITENS
        },
        products: (eqs, select) => {
          vistos.products = { eqs, select }
          return PRODUTOS
        },
      },
    })
    await sendPurchase(deps(fake, okGoogle()), PEDIDO_ID)

    expect(vistos.order_items.eqs).toEqual([['order_id', PEDIDO_ID]])
    // order_items NÃO tem FK para products: embed aqui seria PGRST200 em produção.
    expect(vistos.order_items.select).not.toMatch(/products\s*\(/)
    // e a gravação do item (`engraving_text`) nem é pedida
    expect(vistos.order_items.select).not.toContain('engraving')
    expect(vistos.products.select).toContain('nuvemshop_id')
  })
})

describe('sendPurchase — uma vez só (CMP-03)', () => {
  it('a segunda chamada para o mesmo pedido não reivindica — zero fetch a mais', async () => {
    capturarLog()
    const fake = banco()
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls).toHaveLength(1)
    expect(desfechos(fake)).toHaveLength(1)
  })

  it('sensor: sem o recorte `is null`, o dublê NÃO devolve a linha — a régua discrimina', async () => {
    // Prova de que a fixtura mede o filtro: a mesma reivindicação, sem `.is()`, não casaria.
    const fake = banco()
    const { data } = await fake.client
      .from('orders')
      .update({ ga_purchase_status: 'sending' })
      .eq('id', PEDIDO_ID)
      .select('id')
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('erro na reivindicação: não envia, não lança', async () => {
    capturarLog()
    const fake = banco({ updateError: { code: 'x' } })
    const google = okGoogle()
    await expect(sendPurchase(deps(fake, google), PEDIDO_ID)).resolves.toBeUndefined()
    expect(google.calls).toHaveLength(0)
  })
})

describe('sendPurchase — quando não sai (CMP-04, CMP-06)', () => {
  it('a cliente recusou ⇒ `skipped_declined`, zero fetch', async () => {
    capturarLog()
    const fake = banco({}, { ...LINHA_DO_PEDIDO, analytics_declined: true })
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls).toHaveLength(0)
    expect(desfechos(fake)).toEqual([
      { ga_purchase_status: 'skipped_declined', ga_purchase_at: new Date(AGORA).toISOString() },
    ])
  })

  it('medição desligada ⇒ `skipped_disabled`, zero fetch', async () => {
    capturarLog()
    const fake = banco({
      rows: {
        store_settings: { value: { ...LIGADO, enabled: false } },
        analytics_secrets: { value: CHAVE },
      },
    })
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls).toHaveLength(0)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['skipped_disabled'])
  })

  it('sem chave ⇒ `skipped_disabled`, zero fetch', async () => {
    capturarLog()
    const fake = banco({ rows: { store_settings: { value: LIGADO }, analytics_secrets: null } })
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)

    expect(google.calls).toHaveLength(0)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['skipped_disabled'])
  })

  it('configuração ilegível ⇒ `skipped_disabled` (o padrão seguro)', async () => {
    capturarLog()
    const fake = banco({ rows: { store_settings: null, analytics_secrets: { value: CHAVE } } })
    const google = okGoogle()
    await sendPurchase(deps(fake, google), PEDIDO_ID)
    expect(google.calls).toHaveLength(0)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['skipped_disabled'])
  })

  it('recusou E desligado ⇒ o motivo é o desligado', async () => {
    capturarLog()
    const fake = banco(
      { rows: { store_settings: { value: { ...LIGADO, enabled: false } }, analytics_secrets: { value: CHAVE } } },
      { ...LINHA_DO_PEDIDO, analytics_declined: true },
    )
    await sendPurchase(deps(fake, okGoogle()), PEDIDO_ID)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['skipped_disabled'])
  })
})

describe('sendPurchase — falha nunca derruba o pagamento (CMP-07)', () => {
  it('fetch que REJEITA ⇒ `failed`, sem exceção para o chamador', async () => {
    capturarLog()
    const fake = banco()
    const google = createFakeFetch([{ match: 'mp/collect', networkError: true }])
    await expect(sendPurchase(deps(fake, google), PEDIDO_ID)).resolves.toBeUndefined()
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['failed'])
  })

  it('resposta não-2xx ⇒ `failed`', async () => {
    capturarLog()
    const fake = banco()
    await sendPurchase(deps(fake, createFakeFetch([{ match: 'mp/collect', status: 500 }])), PEDIDO_ID)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['failed'])
  })

  it('o Google que DEMORA é abortado no orçamento ⇒ `failed`', async () => {
    capturarLog()
    const fake = banco()
    let sinal: AbortSignal | undefined
    const lento = (async (_url: unknown, init?: RequestInit) => {
      sinal = init?.signal ?? undefined
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
      })
    }) as typeof globalThis.fetch
    const inicio = Date.now()
    await sendPurchase({ supabase: fake.client, fetch: lento, storePublicUrl: null, now: () => AGORA }, PEDIDO_ID, 30)

    expect(sinal).toBeDefined() // âncora: o fetch recebeu o sinal do AbortController
    expect(sinal?.aborted).toBe(true)
    expect(Date.now() - inicio).toBeLessThan(2000)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['failed'])
  })

  it('erro inesperado DEPOIS de reivindicar ⇒ grava `failed` (nunca fica `sending`), sem lançar', async () => {
    capturarLog()
    const fake = banco()
    const original = fake.client.from
    fake.client.from = (tabela: string) => {
      if (tabela === 'order_items') throw new Error('boom')
      return original(tabela)
    }
    const google = okGoogle()
    await expect(sendPurchase(deps(fake, google), PEDIDO_ID)).resolves.toBeUndefined()
    expect(google.calls).toHaveLength(0)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['failed'])
  })

  it('NENHUM log contém a chave, a URL ou o parâmetro `api_secret` — em nenhum desfecho', async () => {
    const cenarios: Array<() => Promise<void>> = [
      () => sendPurchase(deps(banco(), okGoogle()), PEDIDO_ID),
      () => sendPurchase(deps(banco(), createFakeFetch([{ match: 'mp/collect', networkError: true }])), PEDIDO_ID),
      () => sendPurchase(deps(banco(), createFakeFetch([{ match: 'mp/collect', status: 400 }])), PEDIDO_ID),
      () => sendPurchase(deps(banco({ updateError: { code: 'x' } }), okGoogle()), PEDIDO_ID),
    ]
    capturarLog()
    for (const cenario of cenarios) await cenario()

    expect(linhasDeLog.length).toBeGreaterThanOrEqual(4) // âncora: houve log em cada desfecho
    for (const linha of linhasDeLog) {
      expect(linha).not.toContain(CHAVE)
      expect(linha).not.toContain('api_secret')
      expect(linha).not.toContain('mp/collect')
    }
  })
})

describe('sendPurchase — o erro do Deno carrega a URL, e a URL carrega a chave (CMP-07)', () => {
  // O dublê de rede compartilhado rejeita com uma mensagem que NÃO cita a URL, então "o log não tem
  // a chave" era verdadeiro nos dois mundos (F6 da verificação). O `fetch` real do Deno rejeita com
  // `error sending request for url (<url inteira>)` — query string inclusa, e nela o `api_secret`.
  // Este dublê devolve exatamente essa forma, montada com a URL que a função de fato chamou.
  const fetchQueRejeitaComAUrl = (urls: string[]) =>
    (async (url: unknown) => {
      const alvo = String(url)
      urls.push(alvo)
      throw new TypeError('error sending request for url (' + alvo + '): connection refused')
    }) as typeof globalThis.fetch

  it('rede que cai com a URL na mensagem ⇒ `failed`, e NENHUM log tem a chave ou a query', async () => {
    capturarLog()
    const fake = banco()
    const urls: string[] = []
    await expect(
      sendPurchase({ supabase: fake.client, fetch: fetchQueRejeitaComAUrl(urls), storePublicUrl: null, now: () => AGORA }, PEDIDO_ID),
    ).resolves.toBeUndefined()

    // Âncoras: a URL chamada carregava mesmo a chave (senão a mensagem do erro não teria o que
    // vazar), e houve log do erro de envio.
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain('api_secret=' + CHAVE)
    expect(linhasDeLog.some((l) => l.includes('send_error'))).toBe(true)
    expect(desfechos(fake).map((d) => d.ga_purchase_status)).toEqual(['failed'])

    for (const linha of linhasDeLog) {
      expect(linha).not.toContain(CHAVE)
      expect(linha).not.toContain('api_secret')
      expect(linha).not.toContain('measurement_id=')
      expect(linha).not.toContain('error sending request')
    }
    // O que o log diz é o NOME do erro, que basta para distinguir rede de orçamento.
    expect(linhasDeLog.find((l) => l.includes('send_error'))).toContain('"error":"TypeError"')
  })

  it('erro inesperado cuja mensagem cita a chave ⇒ o log fica só com o nome', async () => {
    capturarLog()
    const fake = banco()
    const original = fake.client.from
    fake.client.from = (tabela: string) => {
      if (tabela === 'order_items') throw new Error('falhou com api_secret=' + CHAVE)
      return original(tabela)
    }
    await sendPurchase(deps(fake, okGoogle()), PEDIDO_ID)

    expect(linhasDeLog.some((l) => l.includes('unexpected_error'))).toBe(true) // âncora
    for (const linha of linhasDeLog) {
      expect(linha).not.toContain(CHAVE)
      expect(linha).not.toContain('api_secret')
    }
  })
})

describe('sendPurchase — ids e tráfego (CMP-05, CMP-08)', () => {
  it('sem ga_client_id ⇒ client_id sintético derivado do pedido', async () => {
    capturarLog()
    const google = okGoogle()
    await sendPurchase(deps(banco({}, { ...LINHA_DO_PEDIDO, ga_client_id: null }), google), PEDIDO_ID)
    expect(google.calls[0].body.client_id).toBe(syntheticClientId(PEDIDO_ID))
  })

  it('loja de homologação ⇒ traffic_type=internal; produção ⇒ sem a chave', async () => {
    capturarLog()
    const homolog = okGoogle()
    await sendPurchase(deps(banco(), homolog, 'https://umaestrelinha-store-five.vercel.app'), PEDIDO_ID)
    expect(homolog.calls[0].body.events[0].params.traffic_type).toBe('internal')

    const producao = okGoogle()
    await sendPurchase(deps(banco(), producao, 'https://www.umaestrelinha.com.br/'), PEDIDO_ID)
    expect(producao.calls[0].body.events[0].params).not.toHaveProperty('traffic_type')
  })
})

describe('item_category — o SLUG da categoria de exibição, pela régua de core (feature 61)', () => {
  // A régua (menor sort_order → menor position → menor category_id) é de `core/product`
  // (`displayCategory.test.ts` de lá). Aqui se prova a FIAÇÃO: o servidor pede o slug no embed e
  // chama o dono — e é o slug, não o nome, porque a loja manda o slug.
  const comProdutos = (produtos: unknown[]) => banco({ lists: { order_items: ITENS, products: produtos } })
  const categoriaDoPrimeiro = async (produtos: unknown[]) => {
    const google = okGoogle()
    await sendPurchase(deps(comProdutos(produtos), google), PEDIDO_ID)
    return google.calls[0].body.events[0].params.items[0].item_category
  }

  it('o select do produto pede `categories(slug, sort_order, active)` dentro do vínculo', async () => {
    capturarLog()
    const selects: string[] = []
    const google = okGoogle()
    await sendPurchase(
      deps(
        banco({
          lists: {
            order_items: ITENS,
            products: (_eqs: Array<[string, unknown]>, select: string) => {
              selects.push(select)
              return PRODUTOS
            },
          },
        }),
        google,
      ),
      PEDIDO_ID,
    )
    expect(selects).toHaveLength(1)
    expect(selects[0]).toContain('product_categories(category_id, position, categories(slug, sort_order, active))')
  })

  it('empate em sort_order ⇒ menor position, e sai o SLUG', async () => {
    capturarLog()
    expect(
      await categoriaDoPrimeiro([
        {
          id: 'prod-a',
          name: 'Pingente A',
          nuvemshop_id: 111,
          product_categories: [
            { category_id: 'b', position: 4, categories: { slug: 'pingentes', name: 'Pingentes', sort_order: 0 } },
            { category_id: 'a', position: 0, categories: { slug: 'joias-afetivas', name: 'Joias afetivas', sort_order: 0 } },
          ],
        },
      ]),
    ).toBe('joias-afetivas')
  })

  it('vínculo sem categoria resolvida ⇒ item sem item_category', async () => {
    capturarLog()
    expect(
      await categoriaDoPrimeiro([
        { id: 'prod-a', name: 'Pingente A', nuvemshop_id: 111, product_categories: [{ category_id: 'x', position: 0, categories: null }] },
      ]),
    ).toBeUndefined()
  })
})
