// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PRM-01/PRM-02/PRM-05/PRM-08 — o CRUD do admin.
//
// Três coisas se provam aqui, e nenhuma é sobre aritmética de desconto:
//
//   1. Gravar é UMA chamada de `upsert_promotion`. Um `insert` seguido de `delete`+`insert` em duas
//      tabelas seria cinco transações independentes, e a segunda falhar deixaria promoção meio-salva.
//   2. O admin vê TUDO — pausada, expirada, programada. `isLive` é filtro da loja.
//   3. Toda mutação invalida as DUAS chaves. Só a do admin faria a dona da loja salvar e a loja
//      continuar praticando o preço antigo por até 5 minutos (`PROMOTIONS_STALE_TIME`).

const { db } = vi.hoisted(() => ({
  db: {
    /** Tabelas alcançadas por `from()` — vazio numa gravação prova que ela foi só pela RPC. */
    tables: [] as string[],
    selects: [] as string[],
    orders: [] as { column: string; ascending: boolean }[],
    deletes: [] as string[],
    rpcs: [] as { fn: string; args: unknown }[],
    rows: [] as unknown[],
    /** As linhas de `orders` da leitura dos cartões (T23) — filtro `.gte`, não `.order`. */
    statsRows: [] as unknown[],
    gtes: [] as { column: string; value: string }[],
    selectError: null as { message: string } | null,
    statsError: null as { message: string } | null,
    deleteError: null as { message: string } | null,
    rpcError: null as { message: string } | null,
  },
}))

vi.mock('@nanapin/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      db.tables.push(table)
      return {
        select: (columns: string) => {
          db.selects.push(columns)
          return {
            order: (column: string, options: { ascending: boolean }) => {
              db.orders.push({ column, ascending: options.ascending })
              return Promise.resolve({ data: db.rows, error: db.selectError })
            },
            gte: (column: string, value: string) => {
              db.gtes.push({ column, value })
              return Promise.resolve({ data: db.statsRows, error: db.statsError })
            },
          }
        },
        delete: () => ({
          eq: (column: string, value: string) => {
            db.deletes.push(`${table}.${column}=${value}`)
            return Promise.resolve({ error: db.deleteError })
          },
        }),
      }
    },
    rpc: (fn: string, args: unknown) => {
      db.rpcs.push({ fn, args })
      return Promise.resolve({ data: 'promo-new', error: db.rpcError })
    },
  },
}))

import {
  ACTIVE_PROMOTIONS_KEY,
  ADMIN_PROMOTIONS_KEY,
  PROMOTION_STATS_WINDOW_DAYS,
  promotionCopyPayload,
  useAdminPromotions,
  useCreatePromotion,
  useDeletePromotion,
  usePromotionStats,
  useSetKitShowcase,
  useUpdatePromotion,
  type AdminPromotion,
} from '../usePromotions'

const PAST = '2020-01-01T00:00:00.000Z'
const FUTURE = '2999-01-01T00:00:00.000Z'

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'promo-1',
  name: 'Kit de bottons',
  type: 'progressive_qty',
  scope: 'categories',
  discount_kind: 'unit_price',
  stacks_with_coupon: false,
  is_kit_showcase: false,
  active: true,
  valid_from: null,
  valid_until: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  promotion_tiers: [{ min_qty: 3, value: 5 }],
  promotion_categories: [{ category_id: 'cat-bottons' }],
  ...overrides,
})

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
}

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

async function loadList(client = makeClient()) {
  const { result } = renderHook(() => useAdminPromotions(), { wrapper: wrapperFor(client) })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  return result
}

/** As chaves invalidadas, na ordem — a prova de que a loja também é avisada. */
function invalidatedKeys(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((call) => (call[0] as { queryKey: unknown }).queryKey)
}

const KIT_PAYLOAD = {
  name: 'Kit de bottons',
  scope: 'categories' as const,
  discount_kind: 'unit_price' as const,
  stacks_with_coupon: false,
  is_kit_showcase: true,
  active: true,
  valid_from: null,
  valid_until: null,
  tiers: [
    { min_qty: 3, value: 5 },
    { min_qty: 5, value: 4.6 },
  ],
  category_ids: ['cat-bottons'],
}

beforeEach(() => {
  db.tables = []
  db.selects = []
  db.orders = []
  db.deletes = []
  db.rpcs = []
  db.rows = []
  db.statsRows = []
  db.gtes = []
  db.selectError = null
  db.statsError = null
  db.deleteError = null
  db.rpcError = null
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAdminPromotions — o admin vê tudo', () => {
  it('promoção pausada e promoção expirada aparecem na listagem', async () => {
    db.rows = [
      row({ id: 'pausada', active: false }),
      row({ id: 'expirada', valid_until: PAST }),
      row({ id: 'programada', valid_from: FUTURE }),
    ]

    const result = await loadList()

    expect(result.current.data?.map((promo) => promo.id)).toEqual([
      'pausada',
      'expirada',
      'programada',
    ])
  })

  it('ordena por `created_at` desc', async () => {
    await loadList()

    expect(db.orders).toEqual([{ column: 'created_at', ascending: false }])
  })

  it('lê faixas e vínculos de categoria embutidos, numa leitura só', async () => {
    db.rows = [row()]

    await loadList()

    expect(db.tables).toEqual(['promotions'])
    expect(db.selects[0]).toContain('promotion_tiers(min_qty, value)')
    expect(db.selects[0]).toContain('promotion_categories(category_id)')
  })

  it('faixas gravadas fora de ordem saem ordenadas por `min_qty`', async () => {
    db.rows = [
      row({
        promotion_tiers: [
          { min_qty: 10, value: 4.2 },
          { min_qty: 3, value: 5 },
          { min_qty: 5, value: 4.6 },
        ],
      }),
    ]

    const result = await loadList()

    expect(result.current.data?.[0].tiers).toEqual([
      { min_qty: 3, value: 5 },
      { min_qty: 5, value: 4.6 },
      { min_qty: 10, value: 4.2 },
    ])
  })

  it('expõe os `categoryIds` do escopo, para o editor remontar os chips', async () => {
    db.rows = [
      row({ promotion_categories: [{ category_id: 'cat-anime' }, { category_id: 'cat-kpop' }] }),
    ]

    const result = await loadList()

    expect(result.current.data?.[0].categoryIds).toEqual(['cat-anime', 'cat-kpop'])
  })

  it('erro na leitura devolve lista vazia em vez de quebrar a tela', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    db.selectError = { message: 'permission denied for table promotions' }

    const result = await loadList()

    expect(result.current.data).toEqual([])
  })
})

describe('useCreatePromotion — uma transação, uma chamada (PRM-02, PRM-08)', () => {
  it('grava promoção, faixas e categorias numa única chamada de `upsert_promotion`', async () => {
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync(KIT_PAYLOAD)

    expect(db.rpcs).toEqual([{ fn: 'upsert_promotion', args: { payload: KIT_PAYLOAD } }])
  })

  it('não toca nenhuma tabela pelo client — nada de `insert` + `delete` encadeados', async () => {
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync(KIT_PAYLOAD)

    expect(db.tables).toEqual([])
  })

  it('devolve o id gravado pela RPC', async () => {
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await expect(result.current.mutateAsync(KIT_PAYLOAD)).resolves.toBe('promo-new')
  })

  it('falha da RPC rejeita com a mensagem do banco — a tela não pode achar que salvou', async () => {
    db.rpcError = { message: 'duplicate key value violates unique constraint' }
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await expect(result.current.mutateAsync(KIT_PAYLOAD)).rejects.toThrow(
      'duplicate key value violates unique constraint',
    )
  })

  it('invalida a listagem do admin E as promoções vigentes da loja', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(client) })

    await result.current.mutateAsync(KIT_PAYLOAD)

    expect(invalidatedKeys(spy)).toEqual([ADMIN_PROMOTIONS_KEY, ACTIVE_PROMOTIONS_KEY])
  })
})

describe('useUpdatePromotion — a mesma RPC, com id', () => {
  it('manda o `id` no payload de `upsert_promotion`', async () => {
    const { result } = renderHook(() => useUpdatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync({ id: 'promo-1', ...KIT_PAYLOAD })

    expect(db.rpcs).toEqual([
      { fn: 'upsert_promotion', args: { payload: { id: 'promo-1', ...KIT_PAYLOAD } } },
    ])
  })

  it('patch parcial não manda `tiers` nem `category_ids` — chave ausente preserva o que está gravado', async () => {
    const { result } = renderHook(() => useUpdatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync({ id: 'promo-1', name: 'Kit de bottons', active: false })

    const payload = (db.rpcs[0].args as { payload: Record<string, unknown> }).payload
    expect(payload).toEqual({ id: 'promo-1', name: 'Kit de bottons', active: false })
    expect('tiers' in payload).toBe(false)
    expect('category_ids' in payload).toBe(false)
  })

  it('invalida as duas chaves', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useUpdatePromotion(), { wrapper: wrapperFor(client) })

    await result.current.mutateAsync({ id: 'promo-1', name: 'Kit de bottons', active: false })

    expect(invalidatedKeys(spy)).toEqual([ADMIN_PROMOTIONS_KEY, ACTIVE_PROMOTIONS_KEY])
  })
})

describe('useDeletePromotion', () => {
  it('apaga a promoção por id e invalida as duas chaves', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useDeletePromotion(), { wrapper: wrapperFor(client) })

    await result.current.mutateAsync('promo-1')

    expect(db.deletes).toEqual(['promotions.id=promo-1'])
    expect(invalidatedKeys(spy)).toEqual([ADMIN_PROMOTIONS_KEY, ACTIVE_PROMOTIONS_KEY])
  })

  it('erro do banco rejeita a mutação', async () => {
    db.deleteError = { message: 'violates foreign key constraint' }
    const { result } = renderHook(() => useDeletePromotion(), { wrapper: wrapperFor(makeClient()) })

    await expect(result.current.mutateAsync('promo-1')).rejects.toThrow(
      'violates foreign key constraint',
    )
  })
})

// PRM-22 — duplicar.
//
// A cópia é um `upsert_promotion` **sem `id`**: o mesmo caminho do create. O que se prova aqui é o
// mapeamento, porque é nele que estão as duas armadilhas — `active` tem `default true` no banco (uma
// chave omitida criaria campanha vigente) e `is_kit_showcase` é único por índice parcial (a cópia não
// pode roubar a vitrine da original).
describe('promotionCopyPayload — a cópia (PRM-22)', () => {
  const admin = (overrides: Partial<AdminPromotion> = {}): AdminPromotion =>
    ({
      id: 'promo-kit',
      name: 'Kit de bottons',
      type: 'progressive_qty',
      scope: 'categories',
      discount_kind: 'unit_price',
      stacks_with_coupon: true,
      is_kit_showcase: true,
      active: true,
      valid_from: '2026-08-01T03:00:00.000Z',
      valid_until: '2026-08-31T03:00:00.000Z',
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
      tiers: [
        { min_qty: 3, value: 5 },
        { min_qty: 5, value: 4.6 },
      ],
      categoryIds: ['cat-bottons', 'cat-anime'],
      ...overrides,
    }) as AdminPromotion

  it('nasce inativa — e a chave vai explícita, porque a coluna tem `default true`', () => {
    const payload = promotionCopyPayload(admin())

    expect(payload.active).toBe(false)
    expect('active' in payload).toBe(true)
  })

  it('não herda a vitrine do kit', () => {
    const payload = promotionCopyPayload(admin({ is_kit_showcase: true }))

    expect(payload.is_kit_showcase).toBe(false)
  })

  it('sufixa o nome com ` (cópia)`', () => {
    expect(promotionCopyPayload(admin()).name).toBe('Kit de bottons (cópia)')
  })

  it('leva as faixas e os vínculos de categoria', () => {
    const payload = promotionCopyPayload(admin())

    expect(payload.tiers).toEqual([
      { min_qty: 3, value: 5 },
      { min_qty: 5, value: 4.6 },
    ])
    expect(payload.category_ids).toEqual(['cat-bottons', 'cat-anime'])
  })

  it('manda `tiers` e `category_ids` PRESENTES — ausentes, a cópia nasceria sem faixa nenhuma', () => {
    const payload = promotionCopyPayload(admin())

    expect('tiers' in payload).toBe(true)
    expect('category_ids' in payload).toBe(true)
  })

  it('preserva escopo, tipo de desconto, empilhamento e vigência', () => {
    const payload = promotionCopyPayload(admin())

    expect(payload.scope).toBe('categories')
    expect(payload.discount_kind).toBe('unit_price')
    expect(payload.stacks_with_coupon).toBe(true)
    expect(payload.valid_from).toBe('2026-08-01T03:00:00.000Z')
    expect(payload.valid_until).toBe('2026-08-31T03:00:00.000Z')
  })

  it('não leva o `id` da original — presente, seria um update dela, não uma cópia', () => {
    expect('id' in promotionCopyPayload(admin())).toBe(false)
  })

  it('não muta a promoção de origem, nem compartilha as faixas com ela', () => {
    const source = admin()
    const payload = promotionCopyPayload(source)

    payload.tiers![0].value = 99
    payload.category_ids!.push('cat-invadida')

    expect(source.name).toBe('Kit de bottons')
    expect(source.active).toBe(true)
    expect(source.is_kit_showcase).toBe(true)
    expect(source.tiers[0].value).toBe(5)
    expect(source.categoryIds).toEqual(['cat-bottons', 'cat-anime'])
  })

  it('a cópia entra pela MESMA RPC do create, numa chamada só', async () => {
    const { result } = renderHook(() => useCreatePromotion(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync(promotionCopyPayload(admin()))

    expect(db.rpcs).toHaveLength(1)
    expect(db.rpcs[0].fn).toBe('upsert_promotion')
    expect(db.tables).toEqual([])
  })
})

// PRM-24 — os números da listagem.
//
// Duas coisas se provam aqui, e as duas são sobre honestidade do número:
//
//   1. `null` é "não há o que medir" e `0` é "medi e deu zero". Sem essa distinção o cartão diria
//      "R$ 0,00 de desconto concedido" numa loja que não vendeu nada em 30 dias.
//   2. "Este pedido teve promoção?" é `promotion_discount > 0`, **não** `promotion_id is not null` —
//      a coluna do id fica nula de propósito quando duas promoções aplicaram no mesmo pedido, e pela
//      FK esse pedido cairia no lado "sem promoção".
describe('usePromotionStats — os cartões (PRM-24)', () => {
  const paidOrder = (discount: number, units: number[]) => ({
    promotion_discount: discount,
    order_items: units.map((quantity) => ({ quantity })),
  })

  async function loadStats(client = makeClient()) {
    const { result } = renderHook(() => usePromotionStats(), { wrapper: wrapperFor(client) })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    return result
  }

  it('lê `orders` uma vez, com os itens embutidos, filtrando pelos pagos da janela de 30 dias', async () => {
    await loadStats()

    expect(db.tables).toEqual(['orders'])
    expect(db.selects[0]).toBe('promotion_discount, order_items(quantity)')
    expect(db.gtes).toHaveLength(1)
    expect(db.gtes[0].column).toBe('paid_at')

    const days = (Date.now() - new Date(db.gtes[0].value).getTime()) / 86_400_000
    expect(Math.round(days)).toBe(PROMOTION_STATS_WINDOW_DAYS)
  })

  it('nenhum pedido pago na janela ⇒ os três números são `null`, nunca zero', async () => {
    db.statsRows = []

    const result = await loadStats()

    expect(result.current.data).toEqual({
      discountGranted: null,
      itemsWithPromotion: null,
      itemsWithoutPromotion: null,
    })
  })

  it('soma o `promotion_discount` dos pedidos pagos, sem ruído de ponto flutuante', async () => {
    db.statsRows = [paidOrder(11.7, [5]), paidOrder(0.1, [3]), paidOrder(0.2, [3])]

    const result = await loadStats()

    expect(result.current.data.discountGranted).toBe(12)
  })

  it('compara unidades por pedido entre quem teve e quem não teve desconto', async () => {
    db.statsRows = [
      paidOrder(11.7, [5]),
      paidOrder(4.2, [2, 1]),
      paidOrder(0, [2]),
      paidOrder(0, [1, 1]),
    ]

    const result = await loadStats()

    // com promoção: (5 + 3) / 2 = 4 · sem promoção: (2 + 2) / 2 = 2
    expect(result.current.data.itemsWithPromotion).toBe(4)
    expect(result.current.data.itemsWithoutPromotion).toBe(2)
  })

  it('pedido de DUAS promoções (sem `promotion_id`) conta como pedido COM promoção', async () => {
    // O `create-payment` deixa `promotion_id` nulo quando mais de uma campanha aplicou; o desconto
    // gravado é a única evidência de que houve promoção. Pela FK, este pedido cairia no lado errado.
    db.statsRows = [{ promotion_discount: 9.5, promotion_id: null, order_items: [{ quantity: 7 }] }]

    const result = await loadStats()

    expect(result.current.data.itemsWithPromotion).toBe(7)
    expect(result.current.data.itemsWithoutPromotion).toBe(null)
    expect(result.current.data.discountGranted).toBe(9.5)
  })

  it('houve pedido pago mas nenhum com promoção ⇒ desconto concedido é `0`, e é medida honesta', async () => {
    db.statsRows = [paidOrder(0, [2]), paidOrder(0, [4])]

    const result = await loadStats()

    expect(result.current.data.discountGranted).toBe(0)
    expect(result.current.data.itemsWithPromotion).toBe(null)
    expect(result.current.data.itemsWithoutPromotion).toBe(3)
  })

  it('pedido sem nenhum item embutido conta como pedido de zero unidade, sem `NaN`', async () => {
    db.statsRows = [{ promotion_discount: 5, order_items: null }]

    const result = await loadStats()

    expect(result.current.data.itemsWithPromotion).toBe(0)
    expect(Number.isNaN(result.current.data.itemsWithPromotion as number)).toBe(false)
  })

  it('erro na leitura devolve os três em `null` em vez de quebrar a listagem', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    db.statsError = { message: 'permission denied for table orders' }

    const result = await loadStats()

    expect(result.current.data).toEqual({
      discountGranted: null,
      itemsWithPromotion: null,
      itemsWithoutPromotion: null,
    })
  })
})

describe('useSetKitShowcase — exclusividade é do banco (PRM-05)', () => {
  it('chama a RPC `set_kit_showcase`, não dois updates do client', async () => {
    const { result } = renderHook(() => useSetKitShowcase(), { wrapper: wrapperFor(makeClient()) })

    await result.current.mutateAsync('promo-2')

    expect(db.rpcs).toEqual([{ fn: 'set_kit_showcase', args: { p_promotion_id: 'promo-2' } }])
    expect(db.tables).toEqual([])
  })

  it('erro da RPC rejeita — a tela não pode refletir uma vitrine que não trocou', async () => {
    db.rpcError = { message: 'Apenas administradores podem definir a vitrine do kit' }
    const { result } = renderHook(() => useSetKitShowcase(), { wrapper: wrapperFor(makeClient()) })

    await expect(result.current.mutateAsync('promo-2')).rejects.toThrow(
      'Apenas administradores podem definir a vitrine do kit',
    )
  })

  it('invalida as duas chaves', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useSetKitShowcase(), { wrapper: wrapperFor(client) })

    await result.current.mutateAsync('promo-2')

    expect(invalidatedKeys(spy)).toEqual([ADMIN_PROMOTIONS_KEY, ACTIVE_PROMOTIONS_KEY])
  })
})
