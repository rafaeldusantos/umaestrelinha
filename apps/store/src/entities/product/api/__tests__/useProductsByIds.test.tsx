import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { LISTING_LIMIT, ProductQueryError } from '../useProducts'
import { useProductsByIds } from '../useProductsByIds'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * `DST-04` e `DST-17` — os produtos de uma curadoria, numa consulta só.
 *
 * **O dublê registra o `select`, o `.in()` e a janela.** Um dublê que devolvesse a Promise direto do
 * `select` tornaria o filtro *inauditável*: trocar `.in('id', …)` por `.in('slug', …)` — ou perder o
 * filtro inteiro, devolvendo o catálogo — deixaria a suíte verde, e o bloco desenharia peças que a
 * dona não escolheu. É a lição que a feature 49 pagou em `create-order`: a capacidade do dublê é
 * parte da régua.
 */

interface Pedido {
  select: string | null
  in: { column: string; values: readonly string[] }[]
  order: { column: string; ascending: boolean }[]
  limit: number | null
}

const criarBuilder = (pedido: Pedido, resolver: () => { data: unknown; error: unknown }) => {
  const q: any = {
    order: (column: string, options?: { ascending?: boolean }) => {
      pedido.order.push({ column, ascending: options?.ascending !== false })
      return q
    },
    limit: (count: number) => {
      pedido.limit = count
      return q
    },
    in: (column: string, values: readonly string[]) => {
      pedido.in.push({ column, values: [...values] })
      return q
    },
    then: (onOk: (v: unknown) => unknown, onErr?: (e: unknown) => unknown) =>
      Promise.resolve(resolver()).then(onOk, onErr),
  }
  return q
}

const encena = (resultado: { data: unknown; error: unknown }): Pedido => {
  const pedido: Pedido = { select: null, in: [], order: [], limit: null }
  fromMock.mockReturnValue({
    select: (colunas: string) => {
      pedido.select = colunas
      return criarBuilder(pedido, () => resultado)
    },
  })
  return pedido
}

const linha = (id: string, nome: string) => ({
  id,
  name: nome,
  slug: nome.toLowerCase().replace(/ /g, '-'),
  base_price: 289,
  category_id: 'c1',
  categories: { slug: 'joias-afetivas' },
  images: [],
  stock_total: 3,
})

const wrapper = () => palco().Wrapper

/**
 * Um palco com o cliente **à mão**, para os casos de chave.
 *
 * `staleTime: Infinity` é o que o app declara (`queryClient.test.ts` guarda que ele não é zero), e
 * aqui ele importa: com o padrão de 0, a segunda montagem revalida por ser *velha*, não por ter
 * chave diferente — e a contagem de requisições deixaria de medir a chave.
 */
const palco = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, Wrapper }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('useProductsByIds — a consulta dos escolhidos', () => {
  it('pede o `select` do CARD, e não o produto inteiro', () => {
    // Herda `cardSelect.test.ts`: o `select` da vitrine já é prendido àquilo que o `ProductCard`
    // desenha. Uma lista de colunas escrita à mão aqui seria um segundo dono dela.
    const pedido = encena({ data: [], error: null })
    renderHook(() => useProductsByIds(['a']), { wrapper: wrapper() })

    expect(pedido.select).toContain('id, name, slug')
    expect(pedido.select).toContain('base_price, original_price')
  })

  it('filtra por `id`, com EXATAMENTE os ids pedidos', async () => {
    const pedido = encena({ data: [linha('b', 'Pingente B')], error: null })
    const { result } = renderHook(() => useProductsByIds(['a', 'b']), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(pedido.in).toHaveLength(1)
    expect(pedido.in[0].column).toBe('id')
    expect(pedido.in[0].values).toEqual(['a', 'b'])
  })

  it('declara ordem e teto — a janela é a mesma de toda listagem', async () => {
    const pedido = encena({ data: [], error: null })
    const { result } = renderHook(() => useProductsByIds(['a', 'b', 'c']), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(pedido.order.map(o => o.column)).toEqual(['created_at', 'id'])
    // O teto é o número de ids, nunca o teto global: pedir 1.000 linhas para desenhar 3 seria
    // baixar o catálogo de graça.
    expect(pedido.limit).toBe(3)
    expect(pedido.limit).toBeLessThan(LISTING_LIMIT)
  })

  it('devolve os produtos já mapeados para o formato do card', async () => {
    encena({ data: [linha('a', 'Pingente A')], error: null })
    const { result } = renderHook(() => useProductsByIds(['a']), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].id).toBe('a')
    expect(result.current.data![0].price).toBe(289)
  })
})

describe('useProductsByIds — a lista vazia', () => {
  it('sem ids a consulta NÃO sai', () => {
    encena({ data: [], error: null })
    renderHook(() => useProductsByIds([]), { wrapper: wrapper() })

    expect(fromMock).not.toHaveBeenCalled()
  })

  it('sem ids o hook não fica em erro nem em sucesso — ele fica desligado', () => {
    encena({ data: [], error: null })
    const { result } = renderHook(() => useProductsByIds([]), { wrapper: wrapper() })

    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('useProductsByIds — a chave é ORDENADA', () => {
  it('`[a,b]` e `[b,a]` são a MESMA chave — uma entrada de cache, uma consulta', async () => {
    const pedido = encena({ data: [linha('a', 'Pingente A')], error: null })
    const { client, Wrapper } = palco()

    const um = renderHook(() => useProductsByIds(['a', 'b']), { wrapper: Wrapper })
    await waitFor(() => expect(um.result.current.isSuccess).toBe(true))

    const dois = renderHook(() => useProductsByIds(['b', 'a']), { wrapper: Wrapper })
    await waitFor(() => expect(dois.result.current.isSuccess).toBe(true))

    // A prova direta da chave: duas ordens, **uma** entrada no cache.
    expect(client.getQueryCache().getAll()).toHaveLength(1)
    // E a consequência: o segundo bloco é servido pelo primeiro, sem segunda ida ao banco.
    expect(fromMock).toHaveBeenCalledTimes(1)
    expect(pedido.in).toHaveLength(1)
  })

  it('conjuntos DIFERENTES não compartilham cache', async () => {
    encena({ data: [], error: null })
    const { client, Wrapper } = palco()

    const um = renderHook(() => useProductsByIds(['a', 'b']), { wrapper: Wrapper })
    await waitFor(() => expect(um.result.current.isSuccess).toBe(true))

    const dois = renderHook(() => useProductsByIds(['a', 'c']), { wrapper: Wrapper })
    await waitFor(() => expect(dois.result.current.isSuccess).toBe(true))

    // Vizinha e não substituta: sem ela, uma chave constante (`['products','ids']`) passaria no caso
    // acima e serviria o bloco de baixo com as peças do de cima.
    expect(client.getQueryCache().getAll()).toHaveLength(2)
    expect(fromMock).toHaveBeenCalledTimes(2)
  })
})

describe('useProductsByIds — a falha SOBE (DST-17)', () => {
  it('erro do PostgREST vira `ProductQueryError`, e não lista vazia', async () => {
    encena({ data: null, error: { message: 'permission denied' } })
    const { result } = renderHook(() => useProductsByIds(['a']), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ProductQueryError)
    // A distinção é o ponto: `[]` significaria "os escolhidos saíram do ar", que é outro estado e
    // manda a dona olhar o catálogo em vez da conexão.
    expect(result.current.data).toBeUndefined()
  })

  it('a mensagem do banco chega junto — falha muda não é diagnosticável', async () => {
    encena({ data: null, error: { message: 'permission denied' } })
    const { result } = renderHook(() => useProductsByIds(['a']), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toContain('permission denied')
  })
})
