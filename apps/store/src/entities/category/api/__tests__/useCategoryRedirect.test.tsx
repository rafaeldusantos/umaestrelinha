import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * `SEO-02` (spec `23`, AC 8) — o slug antigo de uma categoria resolve pela tabela de redirect.
 *
 * O que se mede aqui é o hook: qual tabela, qual coluna, o que devolve — e, sobretudo, que ele
 * **não consulta nada** quando quem chama diz que o slug é categoria viva. Esse é o mesmo critério
 * que `useProduct.test.tsx` já aplica a `product_redirects`.
 */
const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useCategoryRedirect } from '../useCategoryRedirect'

const respondWith = (row: { category_id: string } | null) => {
  fromMock.mockImplementation(() => ({
    select: () => ({
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: row, error: null }) }),
    }),
  }))
}

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('useCategoryRedirect — a leitura do slug antigo (SEO-02)', () => {
  it('hit devolve o category_id do destino', async () => {
    respondWith({ category_id: 'c-filha' })

    const { result } = renderHook(() => useCategoryRedirect('joias-de-leite'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBe('c-filha')
  })

  it('sem hit devolve null — e é o `notfound` que a página vai mostrar', async () => {
    respondWith(null)

    const { result } = renderHook(() => useCategoryRedirect('nunca-existiu'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('procura por `from_slug` na tabela `category_redirects`', async () => {
    const eq = vi.fn(() => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }))
    fromMock.mockImplementation(() => ({ select: () => ({ eq }) }))

    const { result } = renderHook(() => useCategoryRedirect('joias-de-leite'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fromMock).toHaveBeenCalledWith('category_redirects')
    expect(eq).toHaveBeenCalledWith('from_slug', 'joias-de-leite')
  })
})

describe('useCategoryRedirect — o caminho normal não paga a leitura extra', () => {
  it('`enabled: false` não consulta nada — é a guarda de "só depois de o slug falhar"', async () => {
    respondWith({ category_id: 'c-filha' })

    const { result } = renderHook(
      () => useCategoryRedirect('joias-afetivas', { enabled: false }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.isFetching).toBe(false))
    expect(fromMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('slug vazio não consulta nada', async () => {
    respondWith({ category_id: 'c-filha' })

    renderHook(() => useCategoryRedirect(''), { wrapper })

    await waitFor(() => expect(fromMock).not.toHaveBeenCalled())
  })
})
