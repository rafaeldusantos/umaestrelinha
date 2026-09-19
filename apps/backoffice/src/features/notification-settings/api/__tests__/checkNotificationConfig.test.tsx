// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: invokeMock } },
}))

import { useNotificationConfigCheck } from '../checkNotificationConfig'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } })
  const Wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
  return { client, Wrapper }
}

const CONFIG_CHECK_KEY = ['send-notification', 'config-check']

/** Espera a query SETAR (nem `pending`, nem `fetching`) — nunca confunde "ainda carregando" (que
 * também produz `result.current === undefined`) com "falhou e assentou em undefined". */
async function waitSettled(client: QueryClient) {
  await waitFor(() => {
    const estado = client.getQueryState(CONFIG_CHECK_KEY)
    expect(estado?.status).not.toBe('pending')
    expect(estado?.fetchStatus).toBe('idle')
  })
}

beforeEach(() => {
  invokeMock.mockReset()
})

describe('useNotificationConfigCheck — sucesso', () => {
  it('devolve { adminPublicUrl } a partir de admin_public_url da resposta', async () => {
    invokeMock.mockResolvedValue({
      data: { from: 'x', from_valid: true, from_is_default: false, has_api_key: true, store_public_url: 'https://umaestrelinha.com.br', admin_public_url: 'https://painel.umaestrelinha.com.br', dev_redirect_active: false },
      error: null,
    })

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationConfigCheck(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current).toEqual({ adminPublicUrl: 'https://painel.umaestrelinha.com.br' }))
  })

  it('admin_public_url vazio (string) ainda é dado válido — não é tratado como erro', async () => {
    invokeMock.mockResolvedValue({ data: { admin_public_url: '' }, error: null })

    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationConfigCheck(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current).toEqual({ adminPublicUrl: '' }))
  })
})

describe('useNotificationConfigCheck — falha em silêncio (nunca lança, nunca vira erro)', () => {
  it('erro de rede (invoke lança) → undefined, e a query REALMENTE assentou (não é só "ainda carregando")', async () => {
    invokeMock.mockRejectedValue(new Error('network down'))

    const { client, Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationConfigCheck(), { wrapper: Wrapper })

    await waitSettled(client)
    expect(result.current).toBeUndefined()
  })

  it('function respondeu erro (status >= 400) → undefined, com a query assentada', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { name: 'FunctionsHttpError' } })

    const { client, Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationConfigCheck(), { wrapper: Wrapper })

    await waitSettled(client)
    expect(result.current).toBeUndefined()
  })

  it('resposta sem o campo `admin_public_url` → undefined, não um objeto pela metade', async () => {
    invokeMock.mockResolvedValue({ data: { from: 'x' }, error: null })

    const { client, Wrapper } = makeWrapper()
    const { result } = renderHook(() => useNotificationConfigCheck(), { wrapper: Wrapper })

    await waitSettled(client)
    expect(result.current).toBeUndefined()
  })
})
