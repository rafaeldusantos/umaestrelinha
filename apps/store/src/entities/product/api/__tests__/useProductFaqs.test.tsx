import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ReactNode } from 'react'

/**
 * `FAQ-04`, `FAQ-09` — a leitura das perguntas do produto.
 *
 * O que este arquivo prova além do óbvio: que a consulta é **própria**, e que o vínculo cuja entrada
 * a RLS escondeu (`faq: null`) é pulado em vez de virar uma pergunta em branco na página.
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useProductFaqs } from '../useProductFaqs'

interface Chamada {
  table?: string
  columns?: string
  productId?: unknown
  orderBy?: string
  ascending?: boolean
}

const chamada: Chamada = {}

const respondWith = (data: unknown, error: unknown = null) => {
  fromMock.mockImplementation((table: string) => {
    chamada.table = table
    return {
      select: (columns: string) => {
        chamada.columns = columns
        return {
          eq: (_coluna: string, valor: unknown) => {
            chamada.productId = valor
            return {
              order: (coluna: string, opts: { ascending: boolean }) => {
                chamada.orderBy = coluna
                chamada.ascending = opts?.ascending
                return Promise.resolve({ data, error })
              },
            }
          },
        }
      },
    }
  })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const vinculo = (over: Record<string, unknown> = {}) => ({
  faq_id: 'f1',
  position: 0,
  answer_override: null,
  faq: { id: 'f1', question: 'O anel é ajustável?', answer: 'Sim, dentro de dois números.', is_active: true },
  ...over,
})

beforeEach(() => {
  fromMock.mockReset()
  delete chamada.table
  delete chamada.columns
  delete chamada.productId
  delete chamada.orderBy
  delete chamada.ascending
})

describe('useProductFaqs — a consulta', () => {
  it('lê `product_faqs` do produto, com embed da entrada, ordenado por position', async () => {
    respondWith([vinculo()])

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(chamada.table).toBe('product_faqs')
    expect(chamada.columns).toBe(
      'faq_id, position, answer_override, faq:faqs(id, question, answer, is_active)',
    )
    expect(chamada.productId).toBe('prod-1')
    expect(chamada.orderBy).toBe('position')
    expect(chamada.ascending).toBe(true)
  })

  it('não consulta nada sem `productId`', async () => {
    respondWith([vinculo()])

    const { result } = renderHook(() => useProductFaqs(undefined), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('useProductFaqs — o que devolve', () => {
  it('devolve a pergunta resolvida com a resposta da biblioteca', async () => {
    respondWith([vinculo()])

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([
      {
        id: 'f1',
        question: 'O anel é ajustável?',
        answer: 'Sim, dentro de dois números.',
        overridden: false,
      },
    ])
  })

  it('usa a resposta própria do vínculo quando ela existe', async () => {
    respondWith([vinculo({ answer_override: 'Esta peça é de tamanho fixo.' })])

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].answer).toBe('Esta peça é de tamanho fixo.')
    expect(result.current.data![0].overridden).toBe(true)
  })

  // O caso que a RLS produz de verdade — provado por probe HTTP em 2026-08-16.
  it('pula o vínculo cuja entrada a RLS escondeu (`faq: null`), mantendo os demais', async () => {
    respondWith([
      vinculo({ faq_id: 'a', position: 0, faq: { id: 'a', question: 'P a', answer: 'R a', is_active: true } }),
      vinculo({ faq_id: 'b', position: 1, faq: null }),
      vinculo({ faq_id: 'c', position: 2, faq: { id: 'c', question: 'P c', answer: 'R c', is_active: true } }),
    ])

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map(f => f.id)).toEqual(['a', 'c'])
  })

  it('produto sem vínculo devolve lista vazia', async () => {
    respondWith([])

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  it('erro de leitura devolve [] — a seção some, a página vive', async () => {
    respondWith(null, { message: 'boom' })

    const { result } = renderHook(() => useProductFaqs('prod-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
    expect(result.current.isError).toBe(false)
  })
})

// `FAQ-09`: a listagem de categoria não pode passar a baixar FAQ de 24 produtos por página.
describe('PRODUCT_SELECT continua sem FAQ', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const MAPPER = join(resolve(HERE, '../..'), 'lib/mapProduct.ts')
  const FONTE = readFileSync(MAPPER, 'utf8')

  it('o mapper foi encontrado', () => {
    expect(FONTE).toContain('PRODUCT_SELECT')
    expect(FONTE.length).toBeGreaterThan(500)
  })

  it('`PRODUCT_SELECT` não menciona `faq` em ponto nenhum', () => {
    const inicio = FONTE.indexOf('PRODUCT_SELECT')
    const bloco = FONTE.slice(inicio, inicio + 1200)

    expect(bloco).not.toMatch(/faq/i)
  })
})
