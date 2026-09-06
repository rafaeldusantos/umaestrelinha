import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * O mapper da categoria na loja — feature 39, `NAV-01`.
 *
 * **É o único lugar onde a linha crua vira dado da loja**, e por isso é onde o `AD-012` já bateu
 * três vezes no projeto. O que se prova aqui é o que um teste de componente nunca alcança: que os
 * defaults apontam para os lados certos, que as colunas novas do menu chegam, e que os campos
 * fantasmas **não voltam**.
 *
 * `emoji` era o terceiro caso do `AD-012`: declarado no tipo, lido pelo mapper, **inexistente em
 * migration nenhuma**. Nada acusava — o `select('*')` nunca trazia o campo, o mapper devolvia `''`,
 * e o `{cat.emoji && …}` da busca nunca renderizava. Tipo escrito à mão é afirmação, não
 * verificação.
 */

const { fromMock, selectMock, orderMock, eqMock, singleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orderMock: vi.fn(),
  eqMock: vi.fn(),
  singleMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useCategories, useCategoryBySlug } from '../useCategories'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

/** Uma linha como o `select('*')` a devolve — só as colunas que existem em migration. */
const linha = (over: Record<string, unknown> = {}) => ({
  id: 'joias',
  name: 'Joias Afetivas',
  slug: 'joias-afetivas',
  description: 'Peças feitas com o que você envia.',
  image_url: null,
  banner_url: null,
  color_accent: null,
  icon: 'gota-afetiva',
  parent_id: null,
  sort_order: 2,
  active: true,
  menu_desktop: true,
  menu_mobile: false,
  menu_banners: { desktop: [], mobile: [] },
  ...over,
})

const respondeCom = (data: unknown[] | null, error: unknown = null) => {
  orderMock.mockResolvedValue({ data, error })
}

const ler = async () => {
  const { result } = renderHook(() => useCategories(), { wrapper })
  await waitFor(() => expect(result.current.isFetching).toBe(false))
  return result
}

beforeEach(() => {
  for (const mock of [fromMock, selectMock, orderMock, eqMock, singleMock]) mock.mockReset()
  fromMock.mockReturnValue({ select: selectMock })
  selectMock.mockReturnValue({ order: orderMock, eq: eqMock })
  eqMock.mockReturnValue({ single: singleMock })
  respondeCom([])
})

describe('useCategories — as colunas do menu chegam à loja (NAV-01)', () => {
  it('a categoria ligada só no computador chega com `menu_mobile: false`', async () => {
    // As duas viajam separadas até o fim. Fundi-las aqui num `show_in_menu` derivado recriaria o
    // dono único que a feature acabou de dividir: barra e folha são DUAS curadorias.
    respondeCom([linha()])
    const result = await ler()

    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].menu_desktop).toBe(true)
    expect(result.current.data![0].menu_mobile).toBe(false)
  })

  it('traz a chave do ícone crua — quem julga o valor é `menuIconKey`, na hora de desenhar', async () => {
    // Validar aqui seria o segundo dono do catálogo de ícones: uma chave nova em `MENU_ICON_KEYS`
    // passaria a depender de este mapper ser atualizado junto, em silêncio.
    respondeCom([linha({ icon: 'chave-que-nao-existe' })])
    const result = await ler()

    expect(result.current.data![0].icon).toBe('chave-que-nao-existe')
  })

  it('entrega o jsonb dos banners como veio, sem validar campo a campo', async () => {
    // Mesmo motivo: quem sabe a forma do banner é `resolveMenuBanners`, e ele valida na leitura
    // porque a referência de destino mora em jsonb, onde não cabe FK.
    const banners = { desktop: [{ target: { kind: 'category', id: 'x' } }], mobile: [] }
    respondeCom([linha({ menu_banners: banners })])
    const result = await ler()

    expect(result.current.data![0].menu_banners).toEqual(banners)
  })
})

describe('useCategories — os defaults conservadores apontam para lados opostos', () => {
  it('coluna do menu ausente cai em `false` nas duas superfícies', async () => {
    // O default `true` poria TODA categoria na barra do topo — literalmente o bug que a feature 16
    // consertou, ressuscitado por uma coluna que não veio.
    respondeCom([linha({ menu_desktop: undefined, menu_mobile: null })])
    const result = await ler()

    expect(result.current.data![0].menu_desktop).toBe(false)
    expect(result.current.data![0].menu_mobile).toBe(false)
  })

  it('`active` ausente cai em `true` — sumir da vitrine é pior que aparecer', async () => {
    respondeCom([linha({ active: undefined })])
    const result = await ler()

    expect(result.current.data![0].active).toBe(true)
  })

  it('`icon` e `menu_banners` ausentes viram `null`, e não `undefined`', async () => {
    respondeCom([linha({ icon: undefined, menu_banners: undefined })])
    const result = await ler()

    expect(result.current.data![0].icon).toBeNull()
    expect(result.current.data![0].menu_banners).toBeNull()
  })

  it('`sort_order` ausente vira 0, nunca `NaN`', async () => {
    respondeCom([linha({ sort_order: null })])
    const result = await ler()

    expect(result.current.data![0].sort_order).toBe(0)
  })
})

describe('useCategories — os campos que NÃO voltam (AD-012)', () => {
  it('a categoria mapeada não tem `emoji` — a coluna nunca existiu', async () => {
    respondeCom([linha()])
    const result = await ler()

    expect('emoji' in result.current.data![0]).toBe(false)
  })

  it('não tem `show_in_menu` nem `menu_promo` — as duas são legado do banco', async () => {
    // `show_in_menu` virou coluna GERADA e `menu_promo` virou legado não lido. Mapeá-las daria à
    // loja uma segunda resposta para "esta categoria está no menu?" — e a resposta certa depende do
    // dispositivo, que uma booleana só não sabe dizer.
    respondeCom([linha({ show_in_menu: true, menu_promo: { category_id: 'x' } })])
    const result = await ler()

    expect('show_in_menu' in result.current.data![0]).toBe(false)
    expect('menu_promo' in result.current.data![0]).toBe(false)
  })
})

/**
 * **Falha e vazio deixaram de ser a mesma coisa** — `PRF-20`.
 *
 * Este bloco media o contrato ANTERIOR ("erro de consulta devolve lista vazia"), que era o defeito
 * que `AD-014` registrou em `useAdminCollections` e `BUG-20260809` em `useProducts`: o React Query
 * guarda um `[]` devolvido como **sucesso**, e nunca mais tenta.
 *
 * Passou a doer de verdade quando `useProducts` começou a ler a árvore por aqui (feature 40): com o
 * erro engolido, uma falha de rede faria a categoria da rota não ser encontrada, o hook devolveria
 * `[]` pelo ramo de `URL-04`, e uma coleção que existe apareceria **vazia** — sem erro em lugar
 * nenhum.
 *
 * O que as doze telas consumidoras veem **não mudou**: todas leem só `data`, que continua chegando
 * `undefined` na falha. O que mudou é que agora há um estado de erro, e o React Query repete.
 */
describe('useCategories — falha não derruba a loja, mas TAMBÉM não vira vazio', () => {
  it('erro de consulta SOBE — não vira lista vazia guardada como sucesso', async () => {
    respondeCom(null, { message: 'boom' })
    const result = await ler()

    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect((result.current.error as Error).message).toContain('boom')
  })

  it('resposta vazia de verdade continua sendo lista vazia — e sucesso', async () => {
    respondeCom([])
    const result = await ler()

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual([])
  })
})

describe('useCategoryBySlug — o mesmo mapper', () => {
  it('a categoria da rota chega com as colunas do menu', async () => {
    singleMock.mockResolvedValue({ data: linha({ menu_mobile: true }), error: null })
    const { result } = renderHook(() => useCategoryBySlug('joias-afetivas'), { wrapper })
    await waitFor(() => expect(result.current.isFetching).toBe(false))

    expect(result.current.data!.menu_mobile).toBe(true)
    expect(result.current.data!.icon).toBe('gota-afetiva')
    expect('emoji' in result.current.data!).toBe(false)
  })
})
