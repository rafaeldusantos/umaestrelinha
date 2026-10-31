// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CEP_LOOKUP_KEY, useCepLookup } from '../useCepLookup'

// Feature 89 (`MON-04`): o dono da consulta de CEP é `core`, lida pela loja (reexporta) e pelo painel
// (endereço da proposta). A suíte de comportamento completa continua em
// `apps/store/src/entities/address/api/__tests__/useCepLookup.test.tsx`, rodando pela reexportação;
// esta prova o essencial aqui, para `core` não depender de outro workspace para ter o dono medido.

const fetchMock = vi.fn()

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }) },
    children,
  )

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('useCepLookup (core)', () => {
  it('a chave da consulta é a de sempre', () => {
    expect(CEP_LOOKUP_KEY).toBe('cep-lookup')
  })

  it('CEP incompleto não dispara requisição', async () => {
    const { result } = renderHook(() => useCepLookup('9001'), { wrapper })
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('CEP mascarado resolve rua, bairro, cidade e UF', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Porto Alegre', uf: 'RS' }),
    })
    const { result } = renderHook(() => useCepLookup('90010-000'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/90010000/json/')
    expect(result.current.data).toEqual({
      street: 'Rua A',
      neighborhood: 'Centro',
      city: 'Porto Alegre',
      state: 'RS',
      manual: false,
    })
  })

  it('CEP inexistente e falha de rede viram manual: true, sem erro', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })
    const a = renderHook(() => useCepLookup('00000000'), { wrapper })
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true))
    expect(a.result.current.data!.manual).toBe(true)

    fetchMock.mockRejectedValue(new Error('Failed to fetch'))
    const b = renderHook(() => useCepLookup('11111111'), { wrapper })
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true))
    expect(b.result.current.data!.manual).toBe(true)
    expect(b.result.current.isError).toBe(false)
  })
})
