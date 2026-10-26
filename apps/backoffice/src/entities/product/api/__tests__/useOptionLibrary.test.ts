// A leitura da biblioteca de opções — feature 81, T04 (OPV-21, OPV-22).
//
// **O dublê ENXERGA o pedido** (`select`, `order`, `range`, contagem): uma resposta devolvida direto
// do `select` tornaria a projeção e a paginação inauditáveis.

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: vi.fn() } }))

import { POSTGREST_PAGE_SIZE } from '@estrelinha/core/paging'
import {
  lerBibliotecaDeOpcoes,
  OPTION_LIBRARY_COLUMNS,
  OPTION_LIBRARY_KEY,
  useOptionLibrary,
} from '../useOptionLibrary'
import { invalidarPoolDeProdutos, PRODUCT_POOL_KEY, type ClienteDeLeitura } from '../useProductPool'

interface Pedido {
  selects: string[]
  orders: string[]
  ranges: [number, number][]
  contagens: number
  paginas: number
}

interface Cenario {
  total: number | null
  erroDaContagem?: { message?: string } | null
  paginas?: unknown[][]
  erroDaPagina?: { message?: string } | null
}

const comOpcoes = (name: string, values: string[]) => ({ options: [{ name, values, position: 0 }] })

const duble = (cenario: Cenario): { client: ClienteDeLeitura; pedido: Pedido } => {
  const pedido: Pedido = { selects: [], orders: [], ranges: [], contagens: 0, paginas: 0 }
  const client = {
    from: () => ({
      select: (colunas: string, opcoes?: { count: 'exact'; head: true }) => {
        pedido.selects.push(colunas)
        if (opcoes?.head) {
          pedido.contagens += 1
          return Promise.resolve({ count: cenario.total, error: cenario.erroDaContagem ?? null })
        }
        const construtor = {
          order: (coluna: string) => {
            pedido.orders.push(coluna)
            return construtor
          },
          range: (de: number, ate: number) => {
            pedido.ranges.push([de, ate])
            const i = pedido.paginas
            pedido.paginas += 1
            return Promise.resolve({
              data: cenario.erroDaPagina ? null : (cenario.paginas?.[i] ?? []),
              error: cenario.erroDaPagina ?? null,
            })
          },
        }
        return construtor
      },
    }),
  }
  return { client: client as unknown as ClienteDeLeitura, pedido }
}

const palco = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return { client, Wrapper }
}

describe('lerBibliotecaDeOpcoes — o que é pedido', () => {
  it('pede SÓ a coluna `options`, e conta antes com `head: true` sobre `id`', async () => {
    const { client, pedido } = duble({ total: 1, paginas: [[comOpcoes('Tamanho', ['P'])]] })
    await lerBibliotecaDeOpcoes(client)

    expect(OPTION_LIBRARY_COLUMNS).toBe('options')
    expect(pedido.selects).toEqual(['id', 'options'])
    expect(pedido.contagens).toBe(1)
  })

  it('ordena por um critério único (`id`) e pagina pelo teto do PostgREST', async () => {
    const primeira = Array.from({ length: POSTGREST_PAGE_SIZE }, () => comOpcoes('Tamanho', ['P']))
    const { client, pedido } = duble({
      total: POSTGREST_PAGE_SIZE + 1,
      paginas: [primeira, [comOpcoes('Cor', ['Rosa'])]],
    })
    const lib = await lerBibliotecaDeOpcoes(client)

    // Cada página ordenada por `id`, e só por ele.
    expect(pedido.orders).toEqual(['id', 'id'])
    expect(pedido.ranges).toEqual([
      [0, POSTGREST_PAGE_SIZE - 1],
      [POSTGREST_PAGE_SIZE, POSTGREST_PAGE_SIZE * 2 - 1],
    ])
    // A peça da segunda página entrou na biblioteca: a leitura não parou no teto.
    expect(lib.map(e => [e.name, e.count])).toEqual([
      ['Tamanho', POSTGREST_PAGE_SIZE],
      ['Cor', 1],
    ])
  })

  it('devolve a biblioteca montada (nome, contagem, valores e conjuntos)', async () => {
    const { client } = duble({
      total: 2,
      paginas: [[comOpcoes('Tamanho', ['3,5 cm', '4,5 cm']), comOpcoes('tamanho', ['5,5 cm'])]],
    })
    expect(await lerBibliotecaDeOpcoes(client)).toEqual([
      {
        name: 'Tamanho',
        count: 2,
        values: ['3,5 cm', '4,5 cm', '5,5 cm'],
        sets: [
          { values: ['3,5 cm', '4,5 cm'], count: 1 },
          { values: ['5,5 cm'], count: 1 },
        ],
      },
    ])
  })

  it('catálogo vazio não pede página nenhuma', async () => {
    const { client, pedido } = duble({ total: 0 })
    expect(await lerBibliotecaDeOpcoes(client)).toEqual([])
    expect(pedido.paginas).toBe(0)
  })

  it('leitura truncada FALHA — nunca uma biblioteca menor', async () => {
    const { client } = duble({ total: 3, paginas: [[comOpcoes('Tamanho', ['P'])]] })
    await expect(lerBibliotecaDeOpcoes(client)).rejects.toThrow(/1 de 3/)
  })
})

describe('useOptionLibrary — OPV-21: falha ou carga em curso ⇒ biblioteca vazia, sem bloquear', () => {
  it('erro na leitura ⇒ `library` vazia e o erro em texto', async () => {
    const { client } = duble({ total: null, erroDaContagem: { message: 'permission denied' } })
    const { Wrapper } = palco()
    const { result } = renderHook(() => useOptionLibrary(client), { wrapper: Wrapper })

    expect(result.current.library).toEqual([])
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toContain('permission denied')
    expect(result.current.library).toEqual([])
  })

  it('o caminho feliz entrega a biblioteca e erro nulo', async () => {
    const { client } = duble({ total: 1, paginas: [[comOpcoes('Cor', ['Rosa'])]] })
    const { Wrapper } = palco()
    const { result } = renderHook(() => useOptionLibrary(client), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.library).toHaveLength(1))
    expect(result.current.error).toBeNull()
    expect(result.current.library[0].name).toBe('Cor')
  })
})

describe('useOptionLibrary — OPV-22: a chave mora sob o pool', () => {
  it('a chave começa por `PRODUCT_POOL_KEY`', () => {
    expect(OPTION_LIBRARY_KEY.slice(0, PRODUCT_POOL_KEY.length)).toEqual([...PRODUCT_POOL_KEY])
    expect(OPTION_LIBRARY_KEY.length).toBeGreaterThan(PRODUCT_POOL_KEY.length)
  })

  it('quem grava produto invalida o pool, e a biblioteca relê e enxerga o salvamento', async () => {
    const cenario: Cenario = {
      total: 1,
      paginas: [[comOpcoes('Tamanho', ['P'])], [comOpcoes('Tamanho', ['P']), comOpcoes('Banho', ['Ouro'])]],
    }
    const { client: leitor } = duble(cenario)
    const { client, Wrapper } = palco()
    const { result } = renderHook(() => useOptionLibrary(leitor), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.library).toHaveLength(1))

    cenario.total = 2
    await invalidarPoolDeProdutos(client)

    await waitFor(() => expect(result.current.library.map(e => e.name)).toContain('Banho'))
  })
})
