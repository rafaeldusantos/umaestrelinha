import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useCreatePayment,
  PAYMENT_UNAVAILABLE_MESSAGE,
  PAYMENT_TIMEOUT_MESSAGE,
  PAYMENT_TIMEOUT_MS,
} from '../useCreatePayment'
import { supabase } from '@estrelinha/supabase/client'

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

const invokeMock = vi.mocked(supabase.functions.invoke)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  invokeMock.mockReset()
})

describe('useCreatePayment', () => {
  it('PIX: invoca mercado-pago?action=create-payment com idempotency_key UUID e resolve com o QR', async () => {
    const pix = { qr_code: 'pix-copia-e-cola', qr_code_base64: null, expires_at: '2026-07-18T12:00:00.000-03:00' }
    invokeMock.mockResolvedValue({ data: pix, error: null })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    const response = await result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })

    expect(response).toEqual(pix)
    expect(invokeMock).toHaveBeenCalledWith('mercado-pago?action=create-payment', {
      body: {
        order_id: 'order-1',
        method: 'pix',
        idempotency_key: expect.stringMatching(UUID_RE),
      },
      // BUG-20260728-edge-runtime-sem-dns: o signal passou a fazer parte do contrato.
      signal: expect.any(AbortSignal),
    })
  })

  it('cartão: repassa o formData do Brick e resolve com status/status_detail', async () => {
    invokeMock.mockResolvedValue({ data: { status: 'approved', status_detail: 'accredited' }, error: null })
    const card = {
      token: 'tok_123',
      installments: 3,
      payment_method_id: 'master',
      issuer_id: '24',
      transaction_amount: 100,
      payer: { email: 'a@b.com' },
    }

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    const response = await result.current.mutateAsync({ order_id: 'order-1', method: 'card', card })

    expect(response).toEqual({ status: 'approved', status_detail: 'accredited' })
    const body = invokeMock.mock.calls[0][1]?.body as Record<string, unknown>
    expect(body.method).toBe('card')
    expect(body.card).toEqual(card)
  })

  it('erro da edge function (502) vira Error com a mensagem do body', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        context: new Response(
          JSON.stringify({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }),
          { status: 502 },
        ),
      },
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    await expect(result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })).rejects.toThrow(
      'Não foi possível iniciar o pagamento. Tente novamente.',
    )
  })

  it('erro sem body legível cai na mensagem amigável de fallback', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'FetchError' } })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    await expect(result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })).rejects.toThrow(
      PAYMENT_UNAVAILABLE_MESSAGE,
    )
  })

  it('gera idempotency_key NOVO a cada tentativa', async () => {
    invokeMock.mockResolvedValue({
      data: { qr_code: 'x', qr_code_base64: null, expires_at: '2026-07-18T12:00:00.000-03:00' },
      error: null,
    })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    await result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })
    await result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })

    const key1 = (invokeMock.mock.calls[0][1]?.body as Record<string, string>).idempotency_key
    const key2 = (invokeMock.mock.calls[1][1]?.body as Record<string, string>).idempotency_key
    expect(key1).toMatch(UUID_RE)
    expect(key2).toMatch(UUID_RE)
    expect(key1).not.toBe(key2)
  })
})

// BUG-20260728-edge-runtime-sem-dns — regressão do spinner infinito.
//
// `PixPayment` já tratava erro (catch → mensagem, finally → desliga o "Gerando código PIX..."),
// mas nada disso rodava: com o worker da edge function fora do ar, o Kong manteve a conexão
// aberta e `functions.invoke` **nunca resolveu**. `fetch` não tem timeout por padrão, então a
// promise ficou pendurada e a cliente ficou olhando um spinner eterno com o pedido já `pending`.
describe('useCreatePayment — timeout (BUG-20260728-edge-runtime-sem-dns)', () => {
  it('requisição que nunca responde é abortada e rejeita com mensagem acionável', async () => {
    vi.useFakeTimers()
    try {
      // Reproduz o Kong pendurado: só rejeita quando o signal aborta.
      invokeMock.mockImplementation(
        (_fn: string, opts?: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          }) as never,
      )

      const { result } = renderHook(() => useCreatePayment(), { wrapper })
      const pending = result.current.mutateAsync({ order_id: 'order-travado', method: 'pix' })
      const assertion = expect(pending).rejects.toThrow(PAYMENT_TIMEOUT_MESSAGE)

      await vi.advanceTimersByTimeAsync(PAYMENT_TIMEOUT_MS + 50)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('passa um AbortSignal para a edge function', async () => {
    invokeMock.mockResolvedValue({ data: { qr_code: 'x' }, error: null })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    await result.current.mutateAsync({ order_id: 'order-1', method: 'pix' })

    const opts = invokeMock.mock.calls[0][1] as { signal?: AbortSignal }
    expect(opts.signal).toBeInstanceOf(AbortSignal)
    expect(opts.signal?.aborted).toBe(false)
  })

  it('erro real da function continua vencendo o timeout na mensagem', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('boom') })

    const { result } = renderHook(() => useCreatePayment(), { wrapper })
    await expect(
      result.current.mutateAsync({ order_id: 'order-1', method: 'pix' }),
    ).rejects.toThrow(PAYMENT_UNAVAILABLE_MESSAGE)
  })
})
