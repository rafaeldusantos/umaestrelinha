import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCepLookup } from '../useCepLookup'

// SHP-03: CEP < 8 dígitos não dispara requisição; CEP não encontrado libera digitação manual.
// ADR-01: CEP resolvido devolve rua, bairro, cidade e UF (que o bloco exibe travados).

const fetchMock = vi.fn()

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {children}
  </QueryClientProvider>
)

const respondWith = (payload: unknown, ok = true) => {
  fetchMock.mockResolvedValue({ ok, json: async () => payload })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCepLookup — disparo (SHP-03)', () => {
  it('CEP com menos de 8 dígitos NÃO dispara requisição', async () => {
    const { result } = renderHook(() => useCepLookup('0131010'), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('CEP mascarado é normalizado para 8 dígitos na URL do ViaCEP', async () => {
    respondWith({ logradouro: 'Av. Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' })

    const { result } = renderHook(() => useCepLookup('01310-100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/01310100/json/')
  })
})

describe('useCepLookup — CEP resolvido (ADR-01)', () => {
  it('devolve rua, bairro, cidade, UF e manual: false', async () => {
    respondWith({ logradouro: 'Av. Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' })

    const { result } = renderHook(() => useCepLookup('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      street: 'Av. Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      manual: false,
    })
  })

  it('campo ausente na resposta vira string vazia, nunca undefined', async () => {
    respondWith({ logradouro: '', bairro: 'Centro', localidade: 'Rio de Janeiro', uf: 'RJ' })

    const { result } = renderHook(() => useCepLookup('20040020'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.street).toBe('')
    expect(result.current.data!.neighborhood).toBe('Centro')
    expect(result.current.data!.manual).toBe(false)
  })
})

describe('useCepLookup — fallback manual (SHP-03)', () => {
  it('`erro: true` do ViaCEP devolve manual: true sem lançar', async () => {
    respondWith({ erro: true })

    const { result } = renderHook(() => useCepLookup('00000000'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      street: '',
      neighborhood: '',
      city: '',
      state: '',
      manual: true,
    })
    expect(result.current.isError).toBe(false)
  })

  it('resposta não-ok do ViaCEP devolve manual: true sem lançar', async () => {
    respondWith({}, false)

    const { result } = renderHook(() => useCepLookup('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.manual).toBe(true)
    expect(result.current.isError).toBe(false)
  })

  it('falha de rede devolve manual: true sem lançar', async () => {
    fetchMock.mockRejectedValue(new Error('Failed to fetch'))

    const { result } = renderHook(() => useCepLookup('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.manual).toBe(true)
    expect(result.current.isError).toBe(false)
  })
})
