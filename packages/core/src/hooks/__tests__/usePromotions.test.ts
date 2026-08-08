// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PRM-15 (dado) / PRM-16: a loja lê as MESMAS linhas que `mercado-pago/handlers.ts` lê e monta o
// MESMO `ProgressivePromotion`. O que se prova aqui é essa paridade — incluindo os quatro motivos
// pelos quais uma promoção existente não vale agora — mais o contrato de "erro é preço cheio, nunca
// total que pisca".

interface TierRow {
  min_qty: number
  value: number
}

interface PromotionRowFixture {
  id: string
  name: string
  discount_kind: 'unit_price' | 'percent'
  scope: 'all' | 'categories'
  stacks_with_coupon: boolean
  active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  promotion_tiers: TierRow[] | null
}

const { db } = vi.hoisted(() => ({
  db: {
    reads: [] as string[],
    selects: [] as string[],
    promotions: [] as unknown[],
    eligible: [] as unknown[],
    promotionsError: null as { message: string } | null,
    eligibleError: null as { message: string } | null,
  },
}))

vi.mock('@nanapin/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      db.reads.push(table)
      return {
        select: (columns: string) => {
          db.selects.push(columns)
          if (table === 'promotions') {
            return Promise.resolve({ data: db.promotions, error: db.promotionsError })
          }
          return {
            in: () => Promise.resolve({ data: db.eligible, error: db.eligibleError }),
          }
        },
      }
    },
  },
}))

import { PROMOTIONS_STALE_TIME, useActivePromotions } from '../usePromotions'

const PAST = '2020-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'

const promotion = (overrides: Partial<PromotionRowFixture> = {}): PromotionRowFixture => ({
  id: 'promo-1',
  name: 'Kit de bottons',
  discount_kind: 'unit_price',
  scope: 'all',
  stacks_with_coupon: false,
  active: true,
  valid_from: null,
  valid_until: null,
  created_at: '2026-08-01T00:00:00.000Z',
  promotion_tiers: [{ min_qty: 3, value: 5 }],
  ...overrides,
})

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

/** Renderiza e só devolve depois que a query resolveu de verdade. */
async function load(client = makeClient()) {
  const { result } = renderHook(() => useActivePromotions(), { wrapper: wrapperFor(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  return result
}

beforeEach(() => {
  db.reads = []
  db.selects = []
  db.promotions = []
  db.eligible = []
  db.promotionsError = null
  db.eligibleError = null
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useActivePromotions — as duas leituras', () => {
  it('lê `promotions` com `promotion_tiers` embutido e `promotion_eligible_products` — uma vez cada', async () => {
    db.promotions = [promotion({ scope: 'categories' })]
    db.eligible = [{ promotion_id: 'promo-1', product_id: 'p1' }]

    await load()

    expect(db.reads).toEqual(['promotions', 'promotion_eligible_products'])
    expect(db.selects[0]).toContain('promotion_tiers(min_qty, value)')
    expect(db.selects[1]).toBe('promotion_id, product_id')
  })

  it('escopo `all` não faz a leitura de elegibilidade e devolve a lista de elegíveis vazia', async () => {
    db.promotions = [promotion({ scope: 'all' })]

    const result = await load()

    expect(db.reads).toEqual(['promotions'])
    expect(result.current.data[0].eligibleProductIds).toEqual([])
  })

  it('nenhuma promoção vigente não dispara a leitura da view', async () => {
    db.promotions = [promotion({ active: false })]

    await load()

    expect(db.reads).toEqual(['promotions'])
  })
})

describe('useActivePromotions — o formato que a regra pura consome', () => {
  it('monta o `ProgressivePromotion` com faixas numéricas e os elegíveis da view', async () => {
    db.promotions = [
      promotion({
        scope: 'categories',
        stacks_with_coupon: true,
        promotion_tiers: [
          { min_qty: 5, value: 4.6 },
          { min_qty: 3, value: 5 },
        ],
      }),
    ]
    db.eligible = [
      { promotion_id: 'promo-1', product_id: 'p1' },
      { promotion_id: 'promo-1', product_id: 'p2' },
    ]

    const result = await load()

    expect(result.current.data).toEqual([
      {
        id: 'promo-1',
        name: 'Kit de bottons',
        discount_kind: 'unit_price',
        tiers: [
          { min_qty: 5, value: 4.6 },
          { min_qty: 3, value: 5 },
        ],
        scope: 'categories',
        eligibleProductIds: ['p1', 'p2'],
        stacks_with_coupon: true,
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ])
  })

  it('`value` que chega como string vira number — faixa é dinheiro, não texto', async () => {
    db.promotions = [
      promotion({ promotion_tiers: [{ min_qty: '3', value: '5.00' } as unknown as TierRow] }),
    ]

    const result = await load()

    expect(result.current.data[0].tiers).toEqual([{ min_qty: 3, value: 5 }])
  })

  it('cada promoção recebe só os elegíveis do próprio id', async () => {
    db.promotions = [
      promotion({ id: 'promo-1', scope: 'categories' }),
      promotion({ id: 'promo-2', scope: 'categories' }),
    ]
    db.eligible = [
      { promotion_id: 'promo-1', product_id: 'p1' },
      { promotion_id: 'promo-2', product_id: 'p2' },
    ]

    const result = await load()

    expect(result.current.data[0].eligibleProductIds).toEqual(['p1'])
    expect(result.current.data[1].eligibleProductIds).toEqual(['p2'])
  })

  it('promoção com escopo por categoria e nenhuma linha na view fica sem elegíveis (nunca "toda a loja")', async () => {
    db.promotions = [promotion({ scope: 'categories' })]
    db.eligible = []

    const result = await load()

    expect(result.current.data[0].scope).toBe('categories')
    expect(result.current.data[0].eligibleProductIds).toEqual([])
  })
})

describe('useActivePromotions — "vale agora?" decidido igual ao servidor', () => {
  it.each([
    ['inativa', { active: false }],
    ['expirada', { valid_until: PAST }],
    ['ainda não vigente', { valid_from: FUTURE }],
    ['sem nenhuma faixa', { promotion_tiers: [] }],
    ['com faixas nulas', { promotion_tiers: null }],
  ])('promoção %s não entra na lista', async (_label, overrides) => {
    db.promotions = [promotion(overrides as Partial<PromotionRowFixture>)]

    const result = await load()

    expect(result.current.data).toEqual([])
  })

  it('vigência que cobre o agora entra na lista', async () => {
    db.promotions = [promotion({ valid_from: PAST, valid_until: FUTURE })]

    const result = await load()

    expect(result.current.data).toHaveLength(1)
  })
})

describe('useActivePromotions — erro e carregando são "sem promoção"', () => {
  it('erro na leitura de `promotions` devolve lista vazia em vez de lançar', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    db.promotionsError = { message: 'relation does not exist' }

    const result = await load()

    expect(result.current.data).toEqual([])
  })

  it('erro na leitura da view descarta as promoções — nenhuma fantasma na lista', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    db.promotions = [promotion({ scope: 'categories' })]
    db.eligibleError = { message: 'permission denied for view' }

    const result = await load()

    expect(result.current.data).toEqual([])
  })

  it('carregando devolve lista vazia — o total nasce cheio e nunca pisca', () => {
    db.promotions = [promotion()]

    const { result } = renderHook(() => useActivePromotions(), {
      wrapper: wrapperFor(makeClient()),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toEqual([])
  })
})

describe('useActivePromotions — cache', () => {
  it('`staleTime` é o mesmo de `useStoreSettings`: 5 minutos', () => {
    expect(PROMOTIONS_STALE_TIME).toBe(1000 * 60 * 5)
  })

  it('um segundo consumidor no mesmo cache não refaz a leitura', async () => {
    db.promotions = [promotion()]
    const client = makeClient()

    await load(client)
    await load(client)

    expect(db.reads).toEqual(['promotions'])
  })
})
