import { afterEach, describe, expect, it, vi } from 'vitest'

import { toAnalyticsItem } from '@estrelinha/core/analytics'
import { mapDbToProduct, PRODUCT_CARD_SELECT, PRODUCT_SELECT } from '@/entities/product/lib/mapProduct'
import { cartLineItem, productItem } from '@/shared/lib/analytics/items'
import { recortar } from '@/test/postgrestRecorte'

// O SERVIDOR, importado de verdade — a function e o dublê de banco dela, por caminho relativo (o
// mesmo grafo que o Deno resolve). Nada é reimplementado aqui.
import { sendPurchase } from '../../../../../../../supabase/functions/mercado-pago/analytics.ts'
import {
  createFakeFetch,
  createFakeSupabase,
} from '../../../../../../../supabase/functions/_shared/testing/fakes.ts'

/**
 * Feature 61 — **o `item_category` da loja e o do servidor são o MESMO, para o mesmo produto.**
 *
 * Molde de `core/shopping/__tests__/shoppingParity.test.ts`: as duas pontas medidas pelo que elas
 * de fato PRODUZEM, nunca pela função intermediária. Do lado da loja, a linha do banco é recortada
 * pelo `select` que a loja envia, passa por `mapDbToProduct` e por `productItem`. Do lado do
 * servidor, a MESMA linha é recortada pelo `select` que `sendPurchase` envia ao dublê, e o valor é
 * lido do corpo que ele manda ao Google.
 *
 * A primeira entrega da 61 tinha as duas pontas divergindo: a loja lia `category_slug` — a coluna
 * LEGADA `products.category_id`, nula nos 691 produtos (medido) —, e o servidor mandava o NOME pela
 * régua certa. O GA4 recebia duas categorias para a mesma peça, e o relatório por categoria não
 * ligava vitrine à compra. Se este arquivo puder ser satisfeito por duas implementações separadas, o
 * dono único falhou.
 */

const PEDIDO_ID = 'a3f1c2d4-0000-4000-8000-000000000061'

const LINHA_DO_PEDIDO = {
  id: PEDIDO_ID,
  order_number: '0261',
  total: 100,
  shipping_cost: 0,
  discount: 0,
  promotion_discount: 0,
  pix_discount: 0,
  coupon_code: null,
  ga_client_id: '123456.789012',
  ga_session_id: '1728000000',
  analytics_declined: false,
}

const LIGADO = { enabled: true, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' }

/** Uma categoria como o banco a tem — com mais colunas do que qualquer `select` pede. */
const cat = (slug: string, sort_order: number, name = slug.toUpperCase(), active = true) => ({
  id: `id-${slug}`,
  slug,
  name,
  sort_order,
  banner_url: null,
  active,
})

/**
 * Uma linha COMPLETA de `products`, como o banco a tem hoje: a coluna legada `category_id` NULA (é o
 * estado dos 691 produtos) e os vínculos N:N com a categoria embutida.
 */
const produto = (product_categories: unknown[]) => ({
  id: 'prod-61',
  nuvemshop_id: 140827061,
  name: 'Pingente de leite materno',
  slug: 'pingente-de-leite-materno',
  base_price: 100,
  original_price: null,
  description: '<p>x</p>',
  images: [],
  options: [],
  stock_policy: 'track',
  stock_total: 3,
  low_stock_threshold: 1,
  is_new: false,
  is_featured: false,
  tags: [],
  category_id: null,
  categories: null,
  product_variants: [],
  product_categories,
})

const CASOS: [string, unknown[]][] = [
  [
    'menor sort_order vence — contra a position e contra a ordem de chegada',
    [
      { category_id: 'c-colares', position: 0, categories: cat('colares', 4) },
      { category_id: 'c-joias', position: 7, categories: cat('joias-afetivas', 1) },
    ],
  ],
  [
    'empate em sort_order ⇒ menor position',
    [
      { category_id: 'c-a', position: 3, categories: cat('alfa', 2) },
      { category_id: 'c-b', position: 1, categories: cat('beta', 2) },
    ],
  ],
  [
    'empate nos dois ⇒ menor category_id (e o nome em ordem contrária, para recusar régua por nome)',
    [
      { category_id: 'c-z', position: 0, categories: cat('zeta', 0, 'Aaa') },
      { category_id: 'c-m', position: 0, categories: cat('mi', 0, 'Zzz') },
    ],
  ],
  [
    'vínculo cuja categoria não resolveu não concorre',
    [
      { category_id: 'c-x', position: 0, categories: null },
      { category_id: 'c-y', position: 5, categories: cat('linha-pet', 9) },
    ],
  ],
  [
    // A loja lê com a chave publicável e a RLS (`active = true`) esconde a inativa; o servidor lê com
    // service role e a vê. Sem o recorte de `active` em core, as duas pontas escolheriam diferente.
    'categoria INATIVA não concorre — a RLS a esconde da loja, e core a recorta no servidor',
    [
      { category_id: 'c-off', position: 0, categories: cat('colecao-desligada', 0, 'Desligada', false) },
      { category_id: 'c-on', position: 1, categories: cat('joias-afetivas', 3) },
    ],
  ],
  ['produto sem vínculo nenhum', []],
]

/** O que a chave PUBLICÁVEL vê: a policy `public read categories` devolve o embed nulo para a inativa. */
const comRlsPublica = (linha: Record<string, unknown>): Record<string, unknown> => ({
  ...linha,
  product_categories: (linha.product_categories as Record<string, unknown>[]).map(v => {
    const c = v.categories as { active?: boolean } | null
    return c && c.active === false ? { ...v, categories: null } : v
  }),
})

/** A loja: o `select` dela → `mapDbToProduct` → o item do GA4. */
const daLoja = (select: string, linha: Record<string, unknown>): string | undefined =>
  toAnalyticsItem(productItem(mapDbToProduct(recortar(select, comRlsPublica(linha))))).item_category

/** O servidor: `sendPurchase` contra o dublê, que recorta a linha pelo `select` que ele envia. */
const doServidor = async (linha: Record<string, unknown>): Promise<string | undefined> => {
  let status: string | null = null
  const fake = createFakeSupabase({
    rows: {
      store_settings: (eq: [string, unknown] | null) => (eq?.[1] === 'analytics' ? { value: LIGADO } : null),
      analytics_secrets: (eq: [string, unknown] | null) =>
        eq?.[1] === 'ga4_api_secret' ? { value: 'Xy9_kQ2-aBcDeFgHiJkLmN' } : null,
    },
    lists: {
      order_items: [
        { product_id: 'prod-61', product_name: 'Congelado', variant_label: null, unit_price: 100, quantity: 1 },
      ],
      products: (_eqs: Array<[string, unknown]>, select: string) => [recortar(select, linha)],
    },
    updatedRows: {
      orders: (_eqs: Array<[string, unknown]>, is: Array<[string, unknown]>, values: Record<string, unknown>) => {
        if (status !== null || !is.some(([c, v]) => c === 'ga_purchase_status' && v === null)) return null
        status = String(values.ga_purchase_status)
        return LINHA_DO_PEDIDO
      },
    },
  })
  const google = createFakeFetch([{ match: 'google-analytics.com/mp/collect', status: 204 }])
  await sendPurchase(
    { supabase: fake.client, fetch: google.fetch, storePublicUrl: 'https://umaestrelinha.com.br', now: () => 0 },
    PEDIDO_ID,
  )
  expect(google.calls, 'o servidor tem de ter enviado a compra').toHaveLength(1)
  return google.calls[0].body.events[0].params.items[0].item_category
}

afterEach(() => vi.restoreAllMocks())

describe('item_category — loja e servidor concordam (feature 61, EVT-13)', () => {
  it.each(CASOS)('%s', async (_nome, vinculos) => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const linha = produto(vinculos)
    const servidor = await doServidor(linha)

    for (const select of [PRODUCT_CARD_SELECT, PRODUCT_SELECT]) {
      expect(daLoja(select, linha), select).toBe(servidor)
    }
    // A sacola (`add_to_cart`, `begin_checkout`) passa pelo mesmo caminho.
    const p = mapDbToProduct(recortar(PRODUCT_CARD_SELECT, comRlsPublica(linha)))
    expect(toAnalyticsItem(cartLineItem({ product: p, unitPrice: 100, quantity: 1 })).item_category).toBe(
      servidor,
    )
  })

  it('a âncora: os casos com vínculo produzem um SLUG de verdade — paridade sobre o vazio não prova nada', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const esperados = ['joias-afetivas', 'beta', 'mi', 'linha-pet', 'joias-afetivas', undefined]
    const obtidos: (string | undefined)[] = []
    for (const [, vinculos] of CASOS) obtidos.push(await doServidor(produto(vinculos)))
    expect(obtidos).toEqual(esperados)
  })

  it('sensor: a leitura antiga da loja (`category_slug`, a coluna legada) DIVERGE do servidor', async () => {
    // É o defeito que este arquivo existe para recusar: com a coluna legada nula, a loja mandava
    // categoria vazia enquanto o servidor mandava a certa. Se esta asserção passar a ser igualdade,
    // os casos acima deixaram de discriminar.
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const linha = produto(CASOS[0][1])
    const antiga = mapDbToProduct(recortar(PRODUCT_CARD_SELECT, comRlsPublica(linha))).category_slug || undefined
    expect(antiga).not.toBe(await doServidor(linha))
  })
})
