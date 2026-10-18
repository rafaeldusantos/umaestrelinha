import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Feature 66 — `FLT-21`, `FLT-26`. O dublê ENXERGA a tabela e o `select` pedidos: um dublê que
 * devolvesse dado para qualquer chamada aprovaria um hook que lê a tabela errada.
 */
const { fromMock, selectMock } = vi.hoisted(() => ({ fromMock: vi.fn(), selectMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  EMPTY_FILTER_CATALOG,
  FILTER_CATALOG_KEY,
  FILTER_CATALOG_SELECT,
  toFilterCatalog,
  useFilterCatalog,
} from '../useFilterCatalog'

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

const GRUPO = {
  id: 'g-acab',
  name: 'Acabamento',
  slug: 'acabamento',
  is_active: true,
  sort_order: 1,
  filter_values: [
    { id: 'v-prata', group_id: 'g-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
    { id: 'v-ouro', group_id: 'g-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 1 },
  ],
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fromMock.mockReset()
  selectMock.mockReset()
  fromMock.mockReturnValue({ select: selectMock })
})

describe('useFilterCatalog — a leitura (FLT-21)', () => {
  it('lê `filter_groups` com os valores embutidos, numa chamada só', async () => {
    selectMock.mockResolvedValue({ data: [GRUPO], error: null })
    const { result } = renderHook(() => useFilterCatalog(), { wrapper })
    await waitFor(() => expect(result.current.groups).toHaveLength(1))

    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('filter_groups')
    expect(selectMock).toHaveBeenCalledWith(FILTER_CATALOG_SELECT)
    expect(FILTER_CATALOG_SELECT).toContain('filter_values(id, group_id, name, slug, sort_order)')
  })

  it('devolve grupos e valores achatados na forma de `core/filters`', async () => {
    selectMock.mockResolvedValue({ data: [GRUPO], error: null })
    const { result } = renderHook(() => useFilterCatalog(), { wrapper })
    await waitFor(() => expect(result.current.values).toHaveLength(2))

    expect(result.current.groups).toEqual([
      { id: 'g-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 1 },
    ])
    expect(result.current.values.map(v => v.slug)).toEqual(['prata-925', 'ouro'])
  })

  it('guarda no cache pela chave `[filter-catalog]` — categoria e busca dividem a mesma leitura', async () => {
    selectMock.mockResolvedValue({ data: [GRUPO], error: null })
    renderHook(() => useFilterCatalog(), { wrapper })
    await waitFor(() => expect(client.getQueryData(['filter-catalog'])).toBeDefined())
    expect(FILTER_CATALOG_KEY).toEqual(['filter-catalog'])

    // Uma segunda montagem acerta o cache em vez de abrir consulta nova.
    renderHook(() => useFilterCatalog(), { wrapper })
    expect(fromMock).toHaveBeenCalledTimes(1)
  })
})

describe('useFilterCatalog — falha e carga não chegam à tela (FLT-26)', () => {
  it('enquanto carrega, devolve o catálogo VAZIO, nunca `undefined`', () => {
    selectMock.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFilterCatalog(), { wrapper })
    expect(result.current).toBe(EMPTY_FILTER_CATALOG)
    expect(result.current.groups).toEqual([])
  })

  it('com a leitura falhando, devolve o catálogo vazio — e a falha fica no cache como ERRO', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'rede' } })
    const { result } = renderHook(() => useFilterCatalog(), { wrapper })
    await waitFor(() =>
      expect(client.getQueryState(['filter-catalog'])?.status).toBe('error'),
    )
    expect(result.current).toBe(EMPTY_FILTER_CATALOG)
  })
})

describe('toFilterCatalog — linha torta é descartada, não quebra', () => {
  it('grupo sem slug sai; valor sem nome sai; o resto fica', () => {
    const out = toFilterCatalog([
      { ...GRUPO, filter_values: [...GRUPO.filter_values, { id: 'v-x', slug: 'x', sort_order: 2 }] },
      { id: 'g-sem-slug', name: 'Sem slug', is_active: true, sort_order: 0 },
    ])
    expect(out.groups.map(g => g.id)).toEqual(['g-acab'])
    expect(out.values.map(v => v.id)).toEqual(['v-prata', 'v-ouro'])
  })

  it('`is_active` só é verdadeiro com `true` — o painel logado na loja vê grupo inativo, e `core` o esconde', () => {
    const out = toFilterCatalog([{ ...GRUPO, is_active: null }])
    expect(out.groups[0].is_active).toBe(false)
  })

  it('o valor sem `group_id` herda o do grupo onde veio embutido', () => {
    const out = toFilterCatalog([
      { ...GRUPO, filter_values: [{ id: 'v1', name: 'Um', slug: 'um', sort_order: 0 }] },
    ])
    expect(out.values[0].group_id).toBe('g-acab')
  })
})
