import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * `FAQL-02`, `FAQL-09` — a leitura da página de perguntas.
 *
 * O caso que carrega este arquivo é o do erro: aqui ele **sobe**, ao contrário de `useProductFaqs`.
 * Lá o FAQ é um pedaço da página do produto e engolir a falha custa uma seção; aqui a leitura é a
 * página inteira, e engolir produziria "ainda não há perguntas" com o banco fora do ar.
 */

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useFaqPage } from '../useFaqPage'

const chamada: { table?: string; columns?: string; orderBy?: string; ascending?: boolean } = {}

const respondWith = (data: unknown, error: unknown = null) => {
  fromMock.mockImplementation((table: string) => {
    chamada.table = table
    return {
      select: (columns: string) => {
        chamada.columns = columns
        return {
          order: (coluna: string, opts: { ascending: boolean }) => {
            chamada.orderBy = coluna
            chamada.ascending = opts?.ascending
            return Promise.resolve({ data, error })
          },
        }
      },
    }
  })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)

const entrada = (id: string, question: string, answer = 'Uma resposta.', is_active = true) => ({
  id,
  question,
  answer,
  is_active,
})

beforeEach(() => {
  fromMock.mockReset()
  delete chamada.table
  delete chamada.columns
})

describe('useFaqPage', () => {
  it('lê a colocação com o embed da entrada, ordenada por position', async () => {
    respondWith([])
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(chamada.table).toBe('faq_page_items')
    expect(chamada.columns).toContain('faq:faqs(id, question, answer, is_active)')
    expect(chamada.columns).toContain('answer_override')
    expect(chamada.orderBy).toBe('position')
    expect(chamada.ascending).toBe(true)
  })

  it('devolve os grupos resolvidos, na ordem dos assuntos', async () => {
    respondWith([
      { faq_id: 'c', category: 'cuidados', position: 0, faq: entrada('c', 'Como limpo?') },
      { faq_id: 'a', category: 'sobre', position: 0, faq: entrada('a', 'O que são?') },
    ])
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.map(g => g.category)).toEqual(['sobre', 'cuidados'])
    expect(result.current.data?.[0].items[0].question).toBe('O que são?')
  })

  it('pula a colocação cuja entrada a RLS escondeu — o embed vem null', async () => {
    respondWith([
      { faq_id: 'a', category: 'sobre', position: 0, faq: entrada('a', 'Viva?') },
      { faq_id: 'b', category: 'sobre', position: 1, faq: null },
    ])
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.[0].items).toHaveLength(1)
    expect(result.current.data?.[0].items[0].question).toBe('Viva?')
  })

  it('pula a entrada inativa pelo mesmo caminho', async () => {
    respondWith([
      { faq_id: 'a', category: 'sobre', position: 0, faq: entrada('a', 'Viva?') },
      { faq_id: 'b', category: 'sobre', position: 1, faq: entrada('b', 'Fora?', 'x', false) },
    ])
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.[0].items.map(i => i.question)).toEqual(['Viva?'])
  })

  // ⚠️ A divergência declarada de `useProductFaqs`. Sem este caso, trocar o `throw` por `return []`
  // passaria em tudo acima — e a página diria "ainda não há perguntas" com o banco fora do ar.
  it('o erro de leitura SOBE, e não vira lista vazia', async () => {
    respondWith(null, { message: 'connection refused' })
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
  })

  it('lista vazia sem erro é sucesso com zero grupos — o estado "ainda não publicada"', async () => {
    respondWith([])
    const { result } = renderHook(() => useFaqPage(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
    expect(result.current.isError).toBe(false)
  })
})
