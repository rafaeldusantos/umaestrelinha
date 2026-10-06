// Feature 61 · `ANL-05`/`ANL-06` — os dois hooks da chave secreta.
//
// O que importa provar:
// - a chave só viaja pela edge function `google-analytics`, nas três formas do contrato — e o
//   painel **nunca** abre a tabela (o dublê do client LANÇA em qualquer `from`);
// - a frase que a function escreve em `{ error }` chega à tela (o corpo de `FunctionsHttpError`);
// - gravar com sucesso **invalida a chave certa** do cache — a régua é o estado do cache, não "o
//   método foi chamado": invalidar a chave errada chamaria o método do mesmo jeito.

import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    functions: { invoke },
    from: () => {
      throw new Error('o painel não lê tabela nenhuma para a chave secreta')
    },
  },
}))

import {
  ANALYTICS_SECRET_STATUS_KEY,
  useAnalyticsSecretStatus,
  useSaveAnalyticsSecret,
} from '../useAnalyticsSecret'

const erroHttp = (corpo: unknown) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { json: async () => corpo },
})

let client: QueryClient
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

beforeEach(() => {
  invoke.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('useAnalyticsSecretStatus', () => {
  it('pergunta à function por GET, com `action=status`', async () => {
    invoke.mockResolvedValueOnce({
      data: { secret_configured: true, secret_updated_at: '2026-10-05T15:00:00.000Z' },
      error: null,
    })
    const { result } = renderHook(() => useAnalyticsSecretStatus(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invoke).toHaveBeenCalledWith('google-analytics?action=status', { method: 'GET' })
    expect(result.current.data).toEqual({
      secret_configured: true,
      secret_updated_at: '2026-10-05T15:00:00.000Z',
    })
  })

  it('sem chave guardada, devolve `secret_configured: false` e data nula', async () => {
    invoke.mockResolvedValueOnce({
      data: { secret_configured: false, secret_updated_at: null },
      error: null,
    })
    const { result } = renderHook(() => useAnalyticsSecretStatus(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ secret_configured: false, secret_updated_at: null })
  })

  it('a resposta nunca carrega o valor da chave para o estado — só os dois campos do contrato', async () => {
    // Se a function um dia devolvesse o valor por engano, o hook não o repassaria à tela.
    invoke.mockResolvedValueOnce({
      data: { secret_configured: true, secret_updated_at: null, secret: 'vazou' },
      error: null,
    })
    const { result } = renderHook(() => useAnalyticsSecretStatus(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(Object.keys(result.current.data!).sort()).toEqual([
      'secret_configured',
      'secret_updated_at',
    ])
  })

  it('falha de leitura é ERRO com a frase da function — nunca "não guardada"', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: erroHttp({ error: 'Só quem administra.' }) })
    const { result } = renderHook(() => useAnalyticsSecretStatus(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as Error).message).toBe('Só quem administra.')
    expect(result.current.data).toBeUndefined()
  })
})

describe('useSaveAnalyticsSecret', () => {
  it('manda a chave por POST no corpo, com `action=save-secret`, e devolve null', async () => {
    invoke.mockResolvedValueOnce({
      data: { ok: true, secret_updated_at: '2026-10-05T15:00:00.000Z' },
      error: null,
    })
    const { result } = renderHook(() => useSaveAnalyticsSecret(), { wrapper })

    let motivo: string | null = 'nao chamou'
    await act(async () => {
      motivo = await result.current.save('abc123')
    })

    expect(motivo).toBeNull()
    expect(invoke).toHaveBeenCalledWith('google-analytics?action=save-secret', {
      body: { secret: 'abc123' },
    })
  })

  it('sucesso INVALIDA o estado da chave — e só ele', async () => {
    client.setQueryData(ANALYTICS_SECRET_STATUS_KEY, { secret_configured: false, secret_updated_at: null })
    client.setQueryData(['google-analytics', 'last-send'], { last: null, declined: 0, failed: 0 })
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })

    const { result } = renderHook(() => useSaveAnalyticsSecret(), { wrapper })
    await act(async () => {
      await result.current.save('abc123')
    })

    expect(client.getQueryState(ANALYTICS_SECRET_STATUS_KEY)?.isInvalidated).toBe(true)
    expect(client.getQueryState(['google-analytics', 'last-send'])?.isInvalidated).toBe(false)
  })

  it('recusa da function (400) devolve a frase dela e NÃO invalida nada', async () => {
    client.setQueryData(ANALYTICS_SECRET_STATUS_KEY, { secret_configured: false, secret_updated_at: null })
    invoke.mockResolvedValueOnce({
      data: null,
      error: erroHttp({ error: 'A chave não pode ter espaços.' }),
    })

    const { result } = renderHook(() => useSaveAnalyticsSecret(), { wrapper })
    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.save('a b')
    })

    expect(motivo).toBe('A chave não pode ter espaços.')
    expect(client.getQueryState(ANALYTICS_SECRET_STATUS_KEY)?.isInvalidated).toBe(false)
  })

  it('corpo ilegível cai numa frase em português, nunca no texto cru do supabase-js', async () => {
    invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: {} },
    })
    const { result } = renderHook(() => useSaveAnalyticsSecret(), { wrapper })
    let motivo: string | null = null
    await act(async () => {
      motivo = await result.current.save('x')
    })
    expect(motivo).toBe('Não foi possível guardar a chave agora.')
  })
})
