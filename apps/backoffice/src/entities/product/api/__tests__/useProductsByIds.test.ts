// O nome das peças já escolhidas (feature 51, T03).
//
// **O dublê registra o `select` e o `.in()`.** Sem isso o filtro seria inauditável: trocar
// `in('id', …)` por `in('slug', …)`, ou perder o recorte de uuid, deixaria a suíte verde — e o
// editor de banner mostraria "sem nome" em **todos** os destinos por causa de um único valor que
// não é uuid.

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  idsConsultaveis,
  PRODUCTS_BY_IDS_COLUMNS,
  useProductsByIds,
} from '../useProductsByIds'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'
const UUID_C = '33333333-3333-4333-8333-333333333333'

interface Pedido {
  select: string | null
  in: { coluna: string; valores: string[] }[]
}

const linha = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  description: `<p>${name}</p>`,
  is_active: true,
})

const encena = (resultado: { data: unknown; error: unknown }): Pedido => {
  const pedido: Pedido = { select: null, in: [] }
  fromMock.mockImplementation(() => ({
    select: (colunas: string) => {
      pedido.select = colunas
      return {
        in: (coluna: string, valores: string[]) => {
          pedido.in.push({ coluna, valores: [...valores] })
          return Promise.resolve(resultado)
        },
      }
    },
  }))
  return pedido
}

/**
 * O palco de React Query.
 *
 * `staleTime: Infinity` não é conveniência: com o padrão de 0, a segunda montagem revalida por
 * ser **velha**, não por ter chave diferente — e a contagem de requisições deixaria de medir a
 * chave, que é o que os dois casos abaixo existem para provar. Mesmo motivo escrito em
 * `apps/store/src/entities/product/api/__tests__/useProductsByIds.test.tsx`.
 */
const palco = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return { client, Wrapper }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('idsConsultaveis — o recorte de uuid (22P02)', () => {
  it('descarta o que não é uuid', () => {
    // `products.id` é `uuid`, e um valor que não seja uuid dentro de `in('id', …)` derruba a
    // consulta INTEIRA com `22P02` — medido na feature 34. O destino do banner mora em jsonb, onde
    // qualquer string cabe.
    expect(idsConsultaveis([UUID_A, 'nuvemshop:Colar de Cinzas', ''])).toEqual([UUID_A])
  })

  it('desduplica e ORDENA — é o que torna a chave estável', () => {
    expect(idsConsultaveis([UUID_B, UUID_A, UUID_B])).toEqual([UUID_A, UUID_B])
  })

  it('lista sem nenhum uuid vira lista vazia, não um `in` com lixo', () => {
    expect(idsConsultaveis(['abc', 'nuvemshop:x'])).toEqual([])
  })
})

describe('useProductsByIds — a consulta', () => {
  it('pede as colunas do destino, `description` inclusa', async () => {
    // Aqui a `description` ENTRA de propósito: são no máximo quatro linhas, e é ela que alimenta o
    // placeholder do subtítulo do banner. O que ela nunca faz é descer para resultado de busca.
    const pedido = encena({ data: [linha(UUID_A, 'Colar')], error: null })
    const { result } = renderHook(() => useProductsByIds([UUID_A]), { wrapper: palco().Wrapper })

    await waitFor(() => expect(result.current.porId[UUID_A]).toBeDefined())
    expect(pedido.select).toBe(PRODUCTS_BY_IDS_COLUMNS)
    expect(PRODUCTS_BY_IDS_COLUMNS).toContain('description')
  })

  it('filtra por `id`, com os uuid RECORTADOS — o não-uuid não chega ao banco', async () => {
    const pedido = encena({ data: [linha(UUID_A, 'Colar')], error: null })
    const { result } = renderHook(
      () => useProductsByIds([UUID_A, 'nuvemshop:Colar', UUID_B]),
      { wrapper: palco().Wrapper },
    )

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(pedido.in).toHaveLength(1)
    expect(pedido.in[0].coluna).toBe('id')
    expect(pedido.in[0].valores).toEqual([UUID_A, UUID_B])
  })

  it('devolve o mapa por id', async () => {
    encena({ data: [linha(UUID_A, 'Colar'), linha(UUID_B, 'Anel')], error: null })
    const { result } = renderHook(() => useProductsByIds([UUID_A, UUID_B]), {
      wrapper: palco().Wrapper,
    })

    await waitFor(() => expect(Object.keys(result.current.porId)).toHaveLength(2))
    expect(result.current.porId[UUID_A].name).toBe('Colar')
    expect(result.current.porId[UUID_B].description).toBe('<p>Anel</p>')
  })

  it('sem id nenhum a consulta NÃO sai', () => {
    encena({ data: [], error: null })
    const { result } = renderHook(() => useProductsByIds([]), { wrapper: palco().Wrapper })

    expect(fromMock).not.toHaveBeenCalled()
    expect(result.current.porId).toEqual({})
  })

  it('lista só com não-uuid também não consulta — o recorte acontece ANTES', () => {
    encena({ data: [], error: null })
    renderHook(() => useProductsByIds(['nuvemshop:Colar']), { wrapper: palco().Wrapper })

    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('useProductsByIds — a chave é derivada dos ids ordenados', () => {
  it('`[a,b]` e `[b,a]` são a MESMA chave — uma entrada de cache, uma consulta', async () => {
    encena({ data: [linha(UUID_A, 'Colar')], error: null })
    const { client, Wrapper } = palco()

    const um = renderHook(() => useProductsByIds([UUID_A, UUID_B]), { wrapper: Wrapper })
    await waitFor(() => expect(um.result.current.carregando).toBe(false))

    const dois = renderHook(() => useProductsByIds([UUID_B, UUID_A]), { wrapper: Wrapper })
    await waitFor(() => expect(dois.result.current.carregando).toBe(false))

    expect(client.getQueryCache().getAll()).toHaveLength(1)
    expect(fromMock).toHaveBeenCalledTimes(1)
  })

  it('conjuntos DIFERENTES não compartilham cache', async () => {
    encena({ data: [], error: null })
    const { client, Wrapper } = palco()

    const um = renderHook(() => useProductsByIds([UUID_A, UUID_B]), { wrapper: Wrapper })
    await waitFor(() => expect(um.result.current.carregando).toBe(false))

    const dois = renderHook(() => useProductsByIds([UUID_A, UUID_C]), { wrapper: Wrapper })
    await waitFor(() => expect(dois.result.current.carregando).toBe(false))

    // Vizinha e não substituta: sem ela, uma chave constante passaria no caso acima e serviria o
    // segundo banner com o nome do primeiro.
    expect(client.getQueryCache().getAll()).toHaveLength(2)
    expect(fromMock).toHaveBeenCalledTimes(2)
  })
})

describe('useProductsByIds — a falha degrada para "sem nome"', () => {
  it('erro do PostgREST devolve mapa vazio, sem derrubar o editor', async () => {
    // Aqui a degradação é correta e é a que `useMenuProducts` já tinha: o banner continua editável
    // com o destino sem rótulo. O que **não** pode degradar é o pool — lá a lista vazia seria lida
    // como "não há peça".
    encena({ data: null, error: { message: 'permission denied' } })
    const { result } = renderHook(() => useProductsByIds([UUID_A]), { wrapper: palco().Wrapper })

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.porId).toEqual({})
  })
})
