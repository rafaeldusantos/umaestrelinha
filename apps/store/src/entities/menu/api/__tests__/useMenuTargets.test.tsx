import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Os destinos dos banners do painel — feature 39, `NAV-30`.
 *
 * O que se prova aqui é a **montagem tardia** e a **recusa do que não resolve**, e as duas são
 * invisíveis em tela:
 *
 * - Painel sem banner de produto **não faz consulta nenhuma**. O painel abre por hover, e uma
 *   requisição por passada do ponteiro seria uma a cada 120ms de travessia da barra.
 * - Produto apagado, inativo, ou **ainda não carregado** derruba o banner. A referência mora em
 *   jsonb, onde não cabe FK: destino pendurado é estado alcançável do banco, e um card levando a
 *   404 é pior que card nenhum.
 */

const { fromMock, selectMock, inMock, categoriesState } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  inMock: vi.fn(),
  categoriesState: { data: [] as unknown[] },
}))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))
vi.mock('@/entities/category', () => ({ useCategories: () => categoriesState }))

import { useMenuBanners, useMenuTargets } from '../useMenuTargets'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const categoria = (over: Record<string, unknown> & { id: string; name: string }) => ({
  slug: over.id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  icon: null,
  menu_desktop: true,
  menu_mobile: true,
  menu_banners: null,
  ...over,
})

const bannerDeProduto = (id: string, extra: Record<string, unknown> = {}) => ({
  target: { kind: 'product', id },
  title: 'Árvore da Vida',
  ...extra,
})

const produto = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Peça ${id}`,
  slug: `peca-${id}`,
  description: 'Feita com o que você envia.',
  is_active: true,
  ...over,
})

const respondeCom = (data: unknown[] | null, error: unknown = null) => {
  inMock.mockResolvedValue({ data, error })
}

beforeEach(() => {
  for (const mock of [fromMock, selectMock, inMock]) mock.mockReset()
  fromMock.mockReturnValue({ select: selectMock })
  selectMock.mockReturnValue({ in: inMock })
  respondeCom([])
  categoriesState.data = []
})

describe('useMenuTargets — a consulta que não acontece', () => {
  it('sem banner nenhum, nenhuma consulta é feita', () => {
    const { result } = renderHook(() => useMenuTargets(null, 'desktop'), { wrapper })

    expect(fromMock).not.toHaveBeenCalled()
    expect(result.current).toEqual([])
  })

  it('banner que aponta para CATEGORIA também não dispara consulta de produto', () => {
    // A categoria já está na mão (`useCategories`); só o produto exige ida ao banco.
    const raw = { desktop: [{ target: { kind: 'category', id: 'joias' } }], mobile: [] }
    renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('banner de produto na OUTRA superfície não dispara consulta nesta', () => {
    // A curadoria é por dispositivo até aqui: o mega menu não paga pelo banner do celular.
    const raw = { desktop: [], mobile: [bannerDeProduto('p1')] }
    renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('useMenuTargets — a consulta que acontece', () => {
  it('pede os produtos dos banners desta superfície, com `is_active` explícito', async () => {
    // `is_active` não pode ser presumido pela RLS: `admin full products` é `FOR ALL`, então um admin
    // logado NA LOJA veria um banner apontando para uma peça que ninguém mais vê.
    respondeCom([produto('p1')])
    const raw = { desktop: [bannerDeProduto('p1')], mobile: [] }
    const { result } = renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(fromMock).toHaveBeenCalledWith('products')
    expect(selectMock.mock.calls[0][0]).toContain('is_active')
    expect(inMock).toHaveBeenCalledWith('id', ['p1'])
  })

  it('dois banners para o MESMO produto pedem um id só', async () => {
    // O array de ids é a chave de cache: repetição produziria duas entradas para a mesma consulta.
    respondeCom([produto('p1')])
    const raw = { desktop: [bannerDeProduto('p1'), bannerDeProduto('p1')], mobile: [] }
    renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    await waitFor(() => expect(inMock).toHaveBeenCalled())
    expect(inMock).toHaveBeenCalledWith('id', ['p1'])
  })

  it('enquanto carrega devolve `undefined` — "ainda não sei" não é "não existe"', () => {
    const raw = { desktop: [bannerDeProduto('p1')], mobile: [] }
    const { result } = renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    // `resolveMenuTarget` trata lista ausente como destino não provado, e o banner não renderiza
    // antes da prova. Desenhar e corrigir faria o card piscar e, no produto apagado, levar a 404.
    expect(result.current).toBeUndefined()
  })

  it('falha de consulta vira lista vazia, e o menu continua de pé', async () => {
    respondeCom(null, { message: 'boom' })
    const raw = { desktop: [bannerDeProduto('p1')], mobile: [] }
    const { result } = renderHook(() => useMenuTargets(raw, 'desktop'), { wrapper })

    await waitFor(() => expect(result.current).toEqual([]))
  })
})

describe('useMenuBanners — o que não resolve não renderiza (NAV-30)', () => {
  const comBanners = (banners: unknown) =>
    (categoriesState.data = [
      categoria({ id: 'joias', name: 'Joias', menu_banners: banners }),
      categoria({ id: 'correntes', name: 'Correntes' }),
    ])

  it('painel fechado (`null`) devolve lista vazia sem consultar nada', () => {
    comBanners({ desktop: [bannerDeProduto('p1')], mobile: [] })
    const { result } = renderHook(() => useMenuBanners(null, 'desktop'), { wrapper })

    expect(result.current).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('destino de categoria existente e ativa renderiza, com a canônica dela', () => {
    comBanners({
      desktop: [{ target: { kind: 'category', id: 'correntes' }, badge: 'NOVIDADE' }],
      mobile: [],
    })
    const { result } = renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper })

    expect(result.current).toHaveLength(1)
    expect(result.current[0].href).toBe('/correntes')
    expect(result.current[0].badge).toBe('NOVIDADE')
    // Sem título escrito, o banner herda o nome do destino (`NAV-32`).
    expect(result.current[0].title).toBe('Correntes')
  })

  it('destino de categoria APAGADA não renderiza — o painel encolhe', () => {
    comBanners({ desktop: [{ target: { kind: 'category', id: 'nao-existe' } }], mobile: [] })
    const { result } = renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper })

    expect(result.current).toEqual([])
  })

  it('destino de produto INATIVO não renderiza', async () => {
    respondeCom([produto('p1', { is_active: false })])
    comBanners({ desktop: [bannerDeProduto('p1')], mobile: [] })
    const { result } = renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper })

    await waitFor(() => expect(inMock).toHaveBeenCalled())
    await waitFor(() => expect(result.current).toEqual([]))
  })

  it('destino de produto ativo renderiza na canônica `/produtos/:slug`', async () => {
    respondeCom([produto('p1')])
    comBanners({ desktop: [bannerDeProduto('p1')], mobile: [] })
    const { result } = renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper })

    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0].href).toBe('/produtos/peca-p1')
  })

  it('a superfície manda: o banner do celular não aparece no computador', () => {
    comBanners({
      desktop: [],
      mobile: [{ target: { kind: 'category', id: 'correntes' } }],
    })

    expect(renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper }).result.current).toEqual(
      [],
    )
    expect(
      renderHook(() => useMenuBanners('joias', 'mobile'), { wrapper }).result.current,
    ).toHaveLength(1)
  })

  it('jsonb malformado não lança dentro da renderização do header', () => {
    // `null`, array na raiz, superfície que não é lista e item que não é objeto são todos estados
    // alcançáveis do banco — e nenhum deles pode derrubar o menu.
    for (const bruto of [null, [], { desktop: 'nao-e-lista' }, { desktop: [null, 7, 'x'] }]) {
      comBanners(bruto)
      expect(
        renderHook(() => useMenuBanners('joias', 'desktop'), { wrapper }).result.current,
      ).toEqual([])
    }
  })
})
