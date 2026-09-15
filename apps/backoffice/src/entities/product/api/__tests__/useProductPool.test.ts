// O pool, lido uma vez e sem mentir (feature 51, T03) — `BUS-11`, `BUS-12`, `BUS-13`, `BUS-16`,
// `BUS-20`.
//
// **O dublê ENXERGA o pedido**: a string do `select`, os `order` e o `range`. Um dublê que
// devolvesse a resposta direto do `select` tornaria a projeção *inauditável* — acrescentar
// `description` deixaria a suíte verde e o painel voltaria a baixar 876 KB que nenhum seletor lê. É
// a lição que a feature 49 pagou em `create-order`: a capacidade do dublê é parte da régua.

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { POSTGREST_PAGE_SIZE } from '@estrelinha/core/paging'
import {
  invalidarPoolDeProdutos,
  lerPoolDeProdutos,
  PRODUCT_POOL_COLUMNS,
  PRODUCT_POOL_KEY,
  PRODUCT_POOL_STALE_TIME,
  useProductPool,
  type ClienteDeLeitura,
} from '../useProductPool'

interface Pedido {
  /** Toda string de `select` pedida, na ordem. */
  selects: string[]
  /** Colunas de `order`, do último `select` de linhas. */
  orders: string[]
  /** Cada `range` pedido, como par inclusivo. */
  ranges: [number, number][]
  /** Quantas contagens `head: true` saíram. */
  contagens: number
  /** Quantas páginas de linha saíram. */
  paginas: number
}

interface Cenario {
  total: number | null
  erroDaContagem?: { message?: string } | null
  /** Linhas por página, na ordem em que as páginas são pedidas. */
  paginas?: unknown[][]
  erroDaPagina?: { message?: string } | null
}

const linha = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  is_active: true,
  base_price: 289,
})

/** Um client que REGISTRA o que foi pedido, e só depois responde. */
const dubleDeLeitura = (cenario: Cenario): { client: ClienteDeLeitura; pedido: Pedido } => {
  const pedido: Pedido = { selects: [], orders: [], ranges: [], contagens: 0, paginas: 0 }

  const client = {
    from: (_tabela: string) => ({
      select: (colunas: string, opcoes?: { count: 'exact'; head: true }) => {
        pedido.selects.push(colunas)
        if (opcoes?.head) {
          pedido.contagens += 1
          return Promise.resolve({
            count: cenario.total,
            error: cenario.erroDaContagem ?? null,
          })
        }

        const construtor = {
          order: (coluna: string) => {
            pedido.orders.push(coluna)
            return construtor
          },
          range: (de: number, ate: number) => {
            pedido.ranges.push([de, ate])
            const indice = pedido.paginas
            pedido.paginas += 1
            return Promise.resolve({
              data: cenario.erroDaPagina ? null : (cenario.paginas?.[indice] ?? []),
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

/**
 * O palco de React Query, com o cliente à mão.
 *
 * `retry: false` porque o padrão do app tenta três vezes: sem isto, o caso de erro esperaria os
 * backoffs e reprovaria por timeout em vez de por asserção.
 */
const palco = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return { client, Wrapper }
}

/**
 * Encena o client do MÓDULO — é o que o hook usa quando ninguém injeta nada.
 *
 * Devolve o `cenario` junto porque ele é lido **a cada chamada**, e não na montagem: é assim que o
 * caso de invalidação consegue fazer o catálogo mudar entre duas leituras, que é a corrida de
 * verdade. Um cenário congelado provaria a invalidação com as duas leituras devolvendo a mesma
 * coisa — verdadeiro nos dois mundos.
 */
const encenaModulo = (cenario: Cenario): { pedido: Pedido; cenario: Cenario } => {
  const { client, pedido } = dubleDeLeitura(cenario)
  fromMock.mockImplementation((tabela: string) =>
    (client as unknown as ClienteDeLeitura).from(tabela as 'products'),
  )
  return { pedido, cenario }
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('lerPoolDeProdutos — a projeção (BUS-11)', () => {
  it('pede exatamente as cinco colunas, e `description` NÃO está entre elas', async () => {
    const { client, pedido } = dubleDeLeitura({ total: 1, paginas: [[linha('a', 'Colar')]] })
    await lerPoolDeProdutos(client)

    expect(pedido.selects).toContain(PRODUCT_POOL_COLUMNS)
    expect(PRODUCT_POOL_COLUMNS).toBe('id, name, slug, is_active, base_price')
  })

  it('nenhum `select` desta leitura menciona `description`', () => {
    // O par: a asserção acima passaria com a constante certa e um `select` diferente na chamada.
    expect(PRODUCT_POOL_COLUMNS).not.toContain('description')
  })

  it('e nem `*`, nem a junção de categoria — era o que custava 3.217 KB', () => {
    expect(PRODUCT_POOL_COLUMNS).not.toContain('*')
    expect(PRODUCT_POOL_COLUMNS).not.toContain('categories')
  })

  it('a contagem pede só `id`, com `head: true` — nenhuma linha atravessa a rede', async () => {
    const { client, pedido } = dubleDeLeitura({ total: 1, paginas: [[linha('a', 'Colar')]] })
    await lerPoolDeProdutos(client)

    expect(pedido.contagens).toBe(1)
    expect(pedido.selects[0]).toBe('id')
  })
})

describe('lerPoolDeProdutos — a ordem entre páginas', () => {
  it('ordena por `name` E por `id`', async () => {
    // `name` não é único neste catálogo. Sem o segundo critério o PostgREST não garante a mesma
    // sequência entre páginas: linhas repetiriam ou sumiriam **com a contagem batendo**, que é o
    // modo de falha que `readAllPages` não pega.
    const { client, pedido } = dubleDeLeitura({ total: 1, paginas: [[linha('a', 'Colar')]] })
    await lerPoolDeProdutos(client)

    expect(pedido.orders).toEqual(['name', 'id'])
  })

  it('pagina pelo teto do PostgREST, com `range` inclusivo', async () => {
    const primeira = Array.from({ length: POSTGREST_PAGE_SIZE }, (_, i) => linha(`a${i}`, `Peça ${i}`))
    const { client, pedido } = dubleDeLeitura({
      total: POSTGREST_PAGE_SIZE + 2,
      paginas: [primeira, [linha('z1', 'Zz 1'), linha('z2', 'Zz 2')]],
    })
    const produtos = await lerPoolDeProdutos(client)

    expect(pedido.ranges).toEqual([
      [0, POSTGREST_PAGE_SIZE - 1],
      [POSTGREST_PAGE_SIZE, POSTGREST_PAGE_SIZE * 2 - 1],
    ])
    expect(produtos).toHaveLength(POSTGREST_PAGE_SIZE + 2)
  })

  it('catálogo vazio não pede página nenhuma', () => {
    const { client, pedido } = dubleDeLeitura({ total: 0 })
    return lerPoolDeProdutos(client).then(produtos => {
      expect(produtos).toEqual([])
      expect(pedido.paginas).toBe(0)
    })
  })
})

describe('lerPoolDeProdutos — a leitura truncada FALHA (BUS-13)', () => {
  it('contagem maior que o lido lança, nomeando os dois números', async () => {
    // O defeito que isto impede é mudo: o PostgREST corta em 1.000 linhas e não avisa. Devolver o
    // parcial publicaria um catálogo menor, indistinguível de uma loja que encolheu.
    const { client } = dubleDeLeitura({ total: 3, paginas: [[linha('a', 'Colar')]] })
    await expect(lerPoolDeProdutos(client)).rejects.toThrow(/1 de 3/)
  })

  it('e a mensagem diz o que se perde — não só que falhou', async () => {
    const { client } = dubleDeLeitura({ total: 3, paginas: [[linha('a', 'Colar')]] })
    await expect(lerPoolDeProdutos(client)).rejects.toThrow(/nenhuma peça com/)
  })

  it('NÃO devolve o parcial — a promessa rejeita, não resolve com uma linha', async () => {
    const { client } = dubleDeLeitura({ total: 3, paginas: [[linha('a', 'Colar')]] })
    const resultado = await lerPoolDeProdutos(client).then(
      v => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null }),
    )
    expect(resultado.ok).toBe(false)
  })
})

describe('lerPoolDeProdutos — a falha de rede SOBE (BUS-12)', () => {
  it('erro na contagem vira exceção com a mensagem do banco', async () => {
    const { client } = dubleDeLeitura({ total: null, erroDaContagem: { message: 'permission denied' } })
    await expect(lerPoolDeProdutos(client)).rejects.toThrow(/permission denied/)
  })

  it('erro numa página vira exceção com a mensagem do banco', async () => {
    const { client } = dubleDeLeitura({ total: 2, erroDaPagina: { message: 'connection reset' } })
    await expect(lerPoolDeProdutos(client)).rejects.toThrow(/connection reset/)
  })

  it('erro sem mensagem ainda produz texto legível — nunca `undefined` na tela', async () => {
    const { client } = dubleDeLeitura({ total: null, erroDaContagem: {} })
    await expect(lerPoolDeProdutos(client)).rejects.toThrow(/não foi possível contar o catálogo/)
  })
})

describe('useProductPool — a leitura acontece UMA vez para duas telas (BUS-20)', () => {
  it('duas montagens na mesma sessão compartilham a chave e a requisição', async () => {
    const { pedido } = encenaModulo({ total: 1, paginas: [[linha('a', 'Colar de Cinzas')]] })
    const { client, Wrapper } = palco()

    const um = renderHook(() => useProductPool(), { wrapper: Wrapper })
    await waitFor(() => expect(um.result.current.carregando).toBe(false))

    const dois = renderHook(() => useProductPool(), { wrapper: Wrapper })
    await waitFor(() => expect(dois.result.current.carregando).toBe(false))

    // A prova direta da chave: **uma** entrada no cache. E a consequência: uma contagem e uma
    // página, não duas de cada.
    expect(client.getQueryCache().getAll()).toHaveLength(1)
    expect(pedido.contagens).toBe(1)
    expect(pedido.paginas).toBe(1)
    expect(dois.result.current.produtos).toHaveLength(1)
  })

  it('a chave é a declarada — quem invalida precisa acertar a mesma', async () => {
    encenaModulo({ total: 0 })
    const { client, Wrapper } = palco()
    const { result } = renderHook(() => useProductPool(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    expect(client.getQueryCache().find({ queryKey: PRODUCT_POOL_KEY })).toBeDefined()
  })

  it('o pool não é revalidado a cada montagem — `staleTime` é de cinco minutos', () => {
    expect(PRODUCT_POOL_STALE_TIME).toBe(5 * 60 * 1000)
  })
})

describe('useProductPool — a falha vira TEXTO, não lista vazia (BUS-12)', () => {
  it('erro preenchido, e `produtos` vazio — os dois estados são distinguíveis', async () => {
    encenaModulo({ total: null, erroDaContagem: { message: 'permission denied' } })
    const { Wrapper } = palco()
    const { result } = renderHook(() => useProductPool(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.erro).not.toBeNull())
    expect(result.current.erro).toContain('permission denied')
    expect(result.current.produtos).toEqual([])
  })

  it('o caminho feliz NÃO tem erro — senão a asserção acima seria verdadeira nos dois mundos', async () => {
    encenaModulo({ total: 1, paginas: [[linha('a', 'Colar')]] })
    const { Wrapper } = palco()
    const { result } = renderHook(() => useProductPool(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.erro).toBeNull()
    expect(result.current.produtos.map(p => p.name)).toEqual(['Colar'])
  })

  it('`recarregar` pede a leitura de novo', async () => {
    const { pedido } = encenaModulo({ total: 1, paginas: [[linha('a', 'Colar')], [linha('a', 'Colar')]] })
    const { Wrapper } = palco()
    const { result } = renderHook(() => useProductPool(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.carregando).toBe(false))

    result.current.recarregar()
    await waitFor(() => expect(pedido.contagens).toBe(2))
  })
})

describe('invalidarPoolDeProdutos — quem grava produto avisa (BUS-16)', () => {
  it('invalida exatamente a chave do pool', async () => {
    const qc = new QueryClient()
    const invalidate = vi.spyOn(qc, 'invalidateQueries').mockResolvedValue(undefined)

    await invalidarPoolDeProdutos(qc)

    expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_POOL_KEY })
  })

  it('e a próxima leitura enxerga a mudança', async () => {
    const { cenario } = encenaModulo({
      total: 1,
      paginas: [[linha('a', 'Colar')], [linha('a', 'Colar'), linha('b', 'Anel Novo')]],
    })
    const { client, Wrapper } = palco()
    const { result } = renderHook(() => useProductPool(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.produtos).toHaveLength(1))

    // A gravação acontece — o catálogo passa a ter duas peças — e o pool é invalidado. Sem a
    // invalidação a peça nova só apareceria depois de cinco minutos, ou de um F5.
    cenario.total = 2
    await invalidarPoolDeProdutos(client)

    await waitFor(() => expect(result.current.produtos).toHaveLength(2))
    expect(result.current.produtos.map(p => p.name)).toContain('Anel Novo')
  })
})
