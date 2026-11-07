import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { CART_BUY_TOGETHER_SELECT, useCartBuyTogether } from '../useCartBuyTogether'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * A leitura do Compre Junto da sacola. O dublê registra a tabela, o `select`, o `in` e a ordem: trocar
 * a coluna do filtro, esquecer o `discount_percent` ou perder o nome da FK deixaria a suíte verde e a
 * sacola a preço cheio em produção (`PGRST201`, sem erro na tela).
 */

interface Pedido {
  tabela: string
  select: string
  in: [string, readonly string[]][]
  order: string[]
}

const pedidos: Pedido[] = []
const respostas: { data: unknown; error: unknown }[] = []

beforeEach(() => {
  pedidos.length = 0
  respostas.length = 0
  fromMock.mockImplementation((tabela: string) => ({
    select: (colunas: string) => {
      const pedido: Pedido = { tabela, select: colunas, in: [], order: [] }
      pedidos.push(pedido)
      const resultado = respostas.shift() ?? { data: [], error: null }
      const q: any = {
        in: (c: string, v: readonly string[]) => (pedido.in.push([c, v]), q),
        order: (c: string) => (pedido.order.push(c), q),
        then: (ok: (v: unknown) => unknown, err?: (e: unknown) => unknown) =>
          Promise.resolve(resultado).then(ok, err),
      }
      return q
    },
  }))
})

const montar = (ids: string[]) => {
  // Um padrão como o da loja (5 minutos, `app/queryClient.ts`): a consulta da sacola tem de
  // declarar o próprio `staleTime`.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useCartBuyTogether(ids), { wrapper }) }
}

const linha = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  position: 0,
  kind: 'product',
  product_id: 'joia',
  target_product_id: 'corrente',
  list_id: null,
  target_variant_ids: null,
  hidden_on_variant_ids: ['v-curta'],
  discount_percent: 10,
  main: { id: 'joia', name: 'Pingente Estrela' },
  list: null,
  ...overrides,
})

describe('a configuração do Compre Junto que a sacola lê', () => {
  it('pede os adicionais das joias da sacola, com o percentual e as peças das listas, numa ida só', async () => {
    respostas.push({
      data: [
        linha(),
        linha({
          id: 'a2',
          position: 1,
          kind: 'list',
          target_product_id: null,
          list_id: 'L1',
          discount_percent: null,
          list: { id: 'L1', name: 'Correntes', items: [{ product_id: 'c2', position: 0, variant_ids: null }] },
        }),
      ],
      error: null,
    })
    const { result } = montar(['joia', 'corrente', 'joia'])
    await waitFor(() => expect(result.current.config).not.toBeNull())

    expect(pedidos).toHaveLength(1)
    expect(pedidos[0].tabela).toBe('product_buy_together')
    expect(pedidos[0].select).toBe(CART_BUY_TOGETHER_SELECT)
    expect(CART_BUY_TOGETHER_SELECT).toContain('discount_percent')
    expect(CART_BUY_TOGETHER_SELECT).toContain('products!product_buy_together_product_id_fkey(id, name)')
    expect(CART_BUY_TOGETHER_SELECT).toContain('buy_together_lists!product_buy_together_list_id_fkey')
    expect(pedidos[0].in).toEqual([['product_id', ['corrente', 'joia']]])
    expect(pedidos[0].order).toEqual(['position'])

    expect(result.current.config).toEqual({
      addons: [
        {
          id: 'a1', mainProductId: 'joia', position: 0, kind: 'product', targetProductId: 'corrente',
          listId: null, targetVariantIds: [], hiddenOnVariantIds: ['v-curta'], discountPercent: 10,
        },
        {
          id: 'a2', mainProductId: 'joia', position: 1, kind: 'list', targetProductId: null,
          listId: 'L1', targetVariantIds: [], hiddenOnVariantIds: ['v-curta'], discountPercent: null,
        },
      ],
      lists: [{ id: 'L1', name: 'Correntes', items: [{ productId: 'c2', position: 0, variantIds: [] }] }],
    })
    expect(result.current.mainNames.get('joia')).toBe('Pingente Estrela')
  })

  it('sem nenhum adicional com desconto, não há entrada a passar: a sacola é a de sempre', async () => {
    respostas.push({ data: [linha({ discount_percent: null })], error: null })
    const { result } = montar(['joia'])
    await waitFor(() => expect(result.current.mainNames.size).toBe(1))
    expect(result.current.config).toBeNull()
  })

  it('a falha da leitura deixa a sacola a preço cheio', async () => {
    respostas.push({ data: null, error: { message: 'boom' } })
    const { result } = montar(['joia'])
    await waitFor(() => expect(pedidos).toHaveLength(1))
    expect(result.current.config).toBeNull()
  })

  it('sacola vazia não pede nada', () => {
    montar([])
    expect(pedidos).toHaveLength(0)
  })

  it('a dona muda o percentual: a próxima leitura traz o valor novo', async () => {
    respostas.push({ data: [linha()], error: null })
    respostas.push({ data: [linha({ discount_percent: 25 })], error: null })
    const { result, client } = montar(['joia', 'corrente'])
    await waitFor(() => expect(result.current.config?.addons[0].discountPercent).toBe(10))

    // `staleTime: 0`: a consulta já nasce velha, e qualquer nova leitura (montar o checkout, voltar à
    // aba) pede de novo.
    expect(client.getQueryState(['cart-buy-together', ['corrente', 'joia']])?.isInvalidated).toBe(false)
    expect(client.getQueryCache().find({ queryKey: ['cart-buy-together', ['corrente', 'joia']] })?.isStale()).toBe(true)

    await act(async () => {
      await client.refetchQueries({ queryKey: ['cart-buy-together'] })
    })
    await waitFor(() => expect(result.current.config?.addons[0].discountPercent).toBe(25))
    expect(pedidos).toHaveLength(2)
  })
})
