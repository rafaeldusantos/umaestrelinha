import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// NTF-13 (feature 42): registrado o rastreio do material, a loja avisa a `send-notification`.
//
// O que se mede aqui é o CONTRATO do aviso, não o e-mail: a chamada acontece só quando o estado
// mudou, leva o GATILHO (não o evento), vai pela porta da cliente (`notify`), e uma falha dela
// **não** muda o resultado do registro. Esta última é a que importa: a cliente acabou de digitar o
// código com o envelope na mão, e dizer "não deu" porque um e-mail não saiu seria mentir sobre o
// que aconteceu no banco.

const { rpcMock, invokeMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  invokeMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { rpc: rpcMock, functions: { invoke: invokeMock } },
}))

import { useSetMaterialTracking } from '../useSetMaterialTracking'

const ORDER_ID = '5b8f0b1e-9c2a-4f37-8a11-2b3c4d5e6f70'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const render = () => renderHook(() => useSetMaterialTracking(ORDER_ID), { wrapper })

beforeEach(() => {
  rpcMock.mockReset()
  invokeMock.mockReset()
  invokeMock.mockResolvedValue({ data: { sent: true }, error: null })
})

describe('NTF-13 — o aviso do rastreio registrado', () => {
  it('registro bem-sucedido chama `?action=notify` com o GATILHO e o pedido', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenCalledWith('send-notification?action=notify', {
      body: { order_id: ORDER_ID, trigger: 'material_tracking_set' },
    })
  })

  it('manda o gatilho, NUNCA um evento — quais mensagens saem é decisão de `core` (`AD-032`)', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const corpo = invokeMock.mock.calls[0][1].body
    expect(corpo).not.toHaveProperty('event')
    expect(corpo).not.toHaveProperty('type')
  })

  it('a porta é `notify` — a `trigger` é admin-only, e a cliente não é admin', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invokeMock.mock.calls[0][0]).toContain('action=notify')
    expect(invokeMock.mock.calls[0][0]).not.toContain('action=trigger')
  })

  it('RECUSA da RPC não avisa ninguém — não houve fato a comunicar', async () => {
    rpcMock.mockResolvedValue({ data: { ok: false, status: 'nao_aplicavel', reason: 'not_allowed' }, error: null })
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.ok).toBe(false)
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('código vazio não chega à RPC nem ao aviso', async () => {
    const { result } = render()

    result.current.mutate('   ')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.reason).toBe('empty_code')
    expect(rpcMock).not.toHaveBeenCalled()
    expect(invokeMock).not.toHaveBeenCalled()
  })

  it('AVISO QUE FALHA não muda o resultado do registro — o estado no banco já mudou', async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, status: 'material_enviado', reason: null }, error: null })
    invokeMock.mockRejectedValue(new Error('function fora do ar'))
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toEqual({ ok: true, status: 'material_enviado', reason: null })
  })

  it('falha da RPC continua sendo erro — é o registro que não aconteceu', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'PGRST301' } })
    const { result } = render()

    result.current.mutate('AA123456789BR')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invokeMock).not.toHaveBeenCalled()
  })
})
