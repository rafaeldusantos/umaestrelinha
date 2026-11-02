import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { BUY_TOGETHER_SELECT, useBuyTogetherData } from '../useBuyTogetherData'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A leitura do Compre Junto. O dublê registra a tabela, o `select`, o `eq` e a ordem: sem isso, trocar
 * a coluna do filtro ou perder o nome da FK deixaria a suíte verde e o bloco vazio em produção
 * (`PGRST201`, sem erro na tela).
 */

interface Pedido {
  tabela: string
  select: string | null
  eq: [string, unknown][]
  order: string[]
  in: [string, readonly string[]][]
}

const builder = (pedido: Pedido, resultado: { data: unknown; error: unknown }) => {
  const q: any = {
    eq: (c: string, v: unknown) => (pedido.eq.push([c, v]), q),
    in: (c: string, v: readonly string[]) => (pedido.in.push([c, v]), q),
    order: (c: string) => (pedido.order.push(c), q),
    limit: () => q,
    then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
      Promise.resolve(resultado).then(ok, err),
  }
  return q
}

const pedidos: Pedido[] = []
const encena = (porTabela: Record<string, { data: unknown; error: unknown }>) => {
  pedidos.length = 0
  fromMock.mockImplementation((tabela: string) => ({
    select: (colunas: string) => {
      const pedido: Pedido = { tabela, select: colunas, eq: [], order: [], in: [] }
      pedidos.push(pedido)
      return builder(pedido, porTabela[tabela] ?? { data: [], error: null })
    },
  }))
}

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const produto = (id: string) => ({
  id,
  name: `Peça ${id}`,
  slug: id,
  base_price: 30,
  category_id: 'c',
  categories: { slug: 's' },
  images: [],
  stock_total: 3,
})

const linhaDeLista = {
  id: 'a2',
  position: 1,
  kind: 'list',
  target_product_id: null,
  list_id: 'L1',
  target_variant_ids: null,
  hidden_on_variant_ids: ['vm'],
  list: {
    id: 'L1',
    name: 'Correntes',
    items: [
      { product_id: 'c1', position: 0, variant_ids: ['v9'] },
      { product_id: 'c2', position: 1, variant_ids: null },
    ],
  },
}
const linhaDePeca = {
  id: 'a1',
  position: 0,
  kind: 'product',
  target_product_id: 'x1',
  list_id: null,
  target_variant_ids: ['v1'],
  hidden_on_variant_ids: null,
  list: null,
}

beforeEach(() => fromMock.mockReset())

describe('useBuyTogetherData', () => {
  it('lê os adicionais DA JOIA, na ordem de posição, com a FK da lista nomeada', async () => {
    encena({ product_buy_together: { data: [], error: null } })
    renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(pedidos.length).toBeGreaterThan(0))
    const p = pedidos[0]
    expect(p.tabela).toBe('product_buy_together')
    expect(p.eq).toEqual([['product_id', 'main']])
    expect(p.order).toEqual(['position'])
    expect(p.select).toBe(BUY_TOGETHER_SELECT)
    expect(p.select).toContain('buy_together_lists!product_buy_together_list_id_fkey')
  })

  it('mapeia as colunas do banco para a forma da regra, e dá "todas" onde veio nulo', async () => {
    encena({
      product_buy_together: { data: [linhaDePeca, linhaDeLista], error: null },
      products: { data: [], error: null },
    })
    const { result } = renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.addons).toHaveLength(2))
    expect(result.current.addons).toEqual([
      {
        id: 'a1', position: 0, kind: 'product', targetProductId: 'x1', listId: null,
        targetVariantIds: ['v1'], hiddenOnVariantIds: [],
      },
      {
        id: 'a2', position: 1, kind: 'list', targetProductId: null, listId: 'L1',
        targetVariantIds: [], hiddenOnVariantIds: ['vm'],
      },
    ])
    expect(result.current.lists).toEqual([
      {
        id: 'L1',
        name: 'Correntes',
        items: [
          { productId: 'c1', position: 0, variantIds: ['v9'] },
          { productId: 'c2', position: 1, variantIds: [] },
        ],
      },
    ])
  })

  it('pede os produtos de todos os adicionais numa consulta só, sem o próprio principal', async () => {
    const comPrincipal = {
      ...linhaDeLista,
      list: { ...linhaDeLista.list, items: [...linhaDeLista.list.items, { product_id: 'main', position: 2, variant_ids: null }] },
    }
    encena({
      product_buy_together: { data: [linhaDePeca, comPrincipal], error: null },
      products: { data: [produto('x1'), produto('c1'), produto('c2')], error: null },
    })
    const { result } = renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const doProdutos = pedidos.filter(p => p.tabela === 'products')
    expect(doProdutos).toHaveLength(1)
    expect(doProdutos[0].in).toHaveLength(1)
    expect(doProdutos[0].in[0][0]).toBe('id')
    expect([...doProdutos[0].in[0][1]].sort()).toEqual(['c1', 'c2', 'x1'])
    expect(result.current.products.map(p => p.id).sort()).toEqual(['c1', 'c2', 'x1'])
  })

  it('sem adicional: não pede produto nenhum e não mostra nada', async () => {
    encena({ product_buy_together: { data: [], error: null } })
    const { result } = renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(pedidos.length).toBe(1))
    await Promise.resolve()
    expect(result.current.status).toBe('off')
    expect(pedidos.filter(p => p.tabela === 'products')).toHaveLength(0)
  })

  it('a leitura da configuração que falha vira erro, nunca lista vazia', async () => {
    encena({ product_buy_together: { data: null, error: { message: 'boom' } } })
    const { result } = renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('a leitura dos produtos que falha também é erro', async () => {
    encena({
      product_buy_together: { data: [linhaDePeca], error: null },
      products: { data: null, error: { message: 'boom' } },
    })
    const { result } = renderHook(() => useBuyTogetherData('main'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
