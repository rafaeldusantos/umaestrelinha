import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { BUY_TOGETHER_SELECT, useBuyTogetherData } from '../useBuyTogetherData'
import { PRODUCT_CARD_SELECT } from '../../lib/mapProduct'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A leitura do Compre Junto. O dublê registra a tabela, o `select`, o `eq` e a ordem: sem isso, trocar
 * a coluna do filtro ou perder o nome da FK deixaria a suíte verde e o bloco vazio em produção
 * (`PGRST201`, sem erro na tela).
 *
 * É UMA ida ao banco, filtrada pelo SLUG da joia: é o que deixa a consulta sair junto com a do
 * produto, em vez de esperar o id dele — a cascata que fazia o bloco empurrar o botão de compra duas
 * vezes numa rede lenta.
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

const wrapper = (retry: number | false = false) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry, retryDelay: 60_000 } },
  })
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
  product_id: 'main',
  target_product_id: null,
  list_id: 'L1',
  target_variant_ids: null,
  hidden_on_variant_ids: ['vm'],
  discount_percent: null,
  main: { slug: 'pingente' },
  target: null,
  list: {
    id: 'L1',
    name: 'Correntes',
    items: [
      { product_id: 'c1', position: 0, variant_ids: ['v9'], product: produto('c1') },
      { product_id: 'c2', position: 1, variant_ids: null, product: produto('c2') },
    ],
  },
}
const linhaDePeca = {
  id: 'a1',
  position: 0,
  kind: 'product',
  product_id: 'main',
  target_product_id: 'x1',
  list_id: null,
  target_variant_ids: ['v1'],
  hidden_on_variant_ids: null,
  discount_percent: 10,
  main: { slug: 'pingente' },
  target: produto('x1'),
  list: null,
}

beforeEach(() => fromMock.mockReset())

describe('useBuyTogetherData', () => {
  it('é UMA ida ao banco: os adicionais da joia pelo SLUG, na ordem de posição, com os produtos embutidos', async () => {
    encena({ product_buy_together: { data: [linhaDePeca, linhaDeLista], error: null } })
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(pedidos).toHaveLength(1)
    const p = pedidos[0]
    expect(p.tabela).toBe('product_buy_together')
    expect(p.eq).toEqual([['main.slug', 'pingente']])
    expect(p.order).toEqual(['position'])
    expect(p.select).toBe(BUY_TOGETHER_SELECT)
    // O filtro pelo slug só recorta as linhas com o embed `!inner` da FK do principal.
    expect(p.select).toContain('main:products!product_buy_together_product_id_fkey!inner(slug)')
    // O desconto ao levar junto, que o bloco mostra como "de/por".
    expect(p.select.split(', ')).toContain('discount_percent')
    expect(p.select).toContain(
      `target:products!product_buy_together_target_product_id_fkey(${PRODUCT_CARD_SELECT})`,
    )
    expect(p.select).toContain('buy_together_lists!product_buy_together_list_id_fkey')
    expect(p.select).toContain(`product:products(${PRODUCT_CARD_SELECT})`)
  })

  it('mapeia as colunas do banco para a forma da regra, e dá "todas" onde veio nulo', async () => {
    encena({ product_buy_together: { data: [linhaDePeca, linhaDeLista], error: null } })
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.addons).toHaveLength(2))
    expect(result.current.addons).toEqual([
      {
        id: 'a1', position: 0, kind: 'product', targetProductId: 'x1', listId: null,
        targetVariantIds: ['v1'], hiddenOnVariantIds: [], discountPercent: 10,
      },
      {
        id: 'a2', position: 1, kind: 'list', targetProductId: null, listId: 'L1',
        targetVariantIds: [], hiddenOnVariantIds: ['vm'], discountPercent: null,
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

  it('os produtos vêm dos embeds, uma vez cada, sem o principal e sem a peça fora do ar', async () => {
    const comPrincipalERepetida = {
      ...linhaDeLista,
      list: {
        ...linhaDeLista.list,
        items: [
          ...linhaDeLista.list.items,
          { product_id: 'main', position: 2, variant_ids: null, product: produto('main') },
          { product_id: 'x1', position: 3, variant_ids: null, product: produto('x1') },
          // Fora do ar: a RLS de `products` não devolve a peça, e o embed chega nulo.
          { product_id: 'off', position: 4, variant_ids: null, product: null },
        ],
      },
    }
    const alvoFora = { ...linhaDePeca, id: 'a3', position: 2, target_product_id: 'off2', target: null }
    encena({
      product_buy_together: { data: [linhaDePeca, comPrincipalERepetida, alvoFora], error: null },
    })
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.products.map(p => p.id).sort()).toEqual(['c1', 'c2', 'x1'])
    expect(pedidos.filter(p => p.tabela === 'products')).toHaveLength(0)
  })

  it('sem adicional: não mostra nada', async () => {
    encena({ product_buy_together: { data: [], error: null } })
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    await waitFor(() => expect(pedidos.length).toBe(1))
    await waitFor(() => expect(result.current.status).toBe('off'))
    expect(result.current.products).toEqual([])
  })

  it('diz "carregando" desde o primeiro render até a primeira resposta', async () => {
    let solta: (v: { data: unknown; error: unknown }) => void = () => {}
    pedidos.length = 0
    fromMock.mockImplementation((tabela: string) => ({
      select: (colunas: string) => {
        const pedido: Pedido = { tabela, select: colunas, eq: [], order: [], in: [] }
        pedidos.push(pedido)
        const q: any = {
          eq: (c: string, v: unknown) => (pedido.eq.push([c, v]), q),
          order: (c: string) => (pedido.order.push(c), q),
          then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
            new Promise(r => { solta = r }).then(ok, err),
        }
        return q
      },
    }))
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(result.current.status).toBe('loading')
    solta({ data: [linhaDePeca], error: null })
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('a leitura que falha vira erro, nunca lista vazia', async () => {
    encena({ product_buy_together: { data: null, error: { message: 'boom' } } })
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.status).toBe('error'))
  })

  it('deixa de dizer "carregando" na PRIMEIRA falha, sem esperar as novas tentativas', async () => {
    encena({ product_buy_together: { data: null, error: { message: 'boom' } } })
    // `retry: 3` como na loja, e a próxima tentativa a um minuto: só a primeira falha acontece aqui.
    const { result } = renderHook(() => useBuyTogetherData('pingente'), { wrapper: wrapper(3) })
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(pedidos).toHaveLength(1)
  })

  it('sem slug a consulta não sai, e não diz "carregando"', async () => {
    encena({ product_buy_together: { data: [linhaDePeca], error: null } })
    const { result } = renderHook(() => useBuyTogetherData(''), { wrapper: wrapper() })
    expect(result.current.status).toBe('off')
    await Promise.resolve()
    expect(pedidos).toHaveLength(0)
  })
})
