import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart'
import { useShippingQuote } from '../useShippingQuote'
import { supabase } from '@estrelinha/supabase/client'

// SHP-01: cota via `melhor-envio?action=quote` e devolve as opções reais.
// SHP-03: CEP com menos de 8 dígitos não dispara cotação.
// SHP-10: resposta de um CEP anterior nunca aparece como resultado do CEP atual.

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

const invokeMock = vi.mocked(supabase.functions.invoke)

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Botton Sakura',
  slug: 'botton-sakura',
  price: 12.9,
  compare_price: null,
  category_id: 'cat-1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

const quote = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'PAC',
  company: 'Correios',
  price: '21.50',
  delivery_time: 6,
  delivery_range: { min: 4, max: 6 },
  ...overrides,
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
  >
    {children}
  </QueryClientProvider>
)

const bodyOf = (call: number) =>
  invokeMock.mock.calls[call][1]?.body as { postal_code_to: string; products: unknown[] }

beforeEach(() => {
  invokeMock.mockReset()
  useCartStore.setState({
    items: [
      { product: product({ width_cm: 25, weight_kg: 0.85 }), size: '', finish: '', quantity: 2,
        variantId: null, variantLabel: '', optionValues: {}, unitPrice: 12.9 },
    ],
  })
})

describe('useShippingQuote — disparo da cotação (SHP-01, SHP-03)', () => {
  it('CEP com menos de 8 dígitos NÃO dispara requisição', async () => {
    const { result } = renderHook(() => useShippingQuote('0131010'), { wrapper })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(invokeMock).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('CEP de 8 dígitos cota com o CEP limpo e o payload real do carrinho', async () => {
    invokeMock.mockResolvedValue({ data: [quote()], error: null })

    const { result } = renderHook(() => useShippingQuote('01310-100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invokeMock).toHaveBeenCalledTimes(1)
    expect(bodyOf(0).postal_code_to).toBe('01310100')
    expect(bodyOf(0).products).toEqual([
      {
        id: 'prod-1',
        width: 25,
        height: 2,
        length: 16,
        weight: 0.85,
        insurance_value: 12.9,
        quantity: 2,
      },
    ])
    expect(result.current.data).toEqual([quote()])
  })

  it('mudar o carrinho recota (a impressão digital do carrinho está na chave)', async () => {
    invokeMock.mockResolvedValue({ data: [quote()], error: null })

    const { result, rerender } = renderHook(() => useShippingQuote('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invokeMock).toHaveBeenCalledTimes(1)

    act(() => {
      useCartStore.setState({
        items: [
          { product: product({ width_cm: 25, weight_kg: 0.85 }), size: '', finish: '', quantity: 5,
            variantId: null, variantLabel: '', optionValues: {}, unitPrice: 12.9 },
        ],
      })
    })
    rerender()

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(2))
    expect((bodyOf(1).products[0] as { quantity: number }).quantity).toBe(5)
  })
})

describe('useShippingQuote — filtro de opções', () => {
  it('descarta opção com price nulo', async () => {
    invokeMock.mockResolvedValue({
      data: [quote({ id: 1, price: null }), quote({ id: 2, price: '34.90' })],
      error: null,
    })

    const { result } = renderHook(() => useShippingQuote('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map((q) => q.id)).toEqual([2])
  })

  it('descarta opção com price zerado ou negativo', async () => {
    invokeMock.mockResolvedValue({
      data: [quote({ id: 1, price: '0.00' }), quote({ id: 2, price: '-3.00' }), quote({ id: 3 })],
      error: null,
    })

    const { result } = renderHook(() => useShippingQuote('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map((q) => q.id)).toEqual([3])
  })
})

describe('useShippingQuote — vazio × erro são estados distintos (SHP-05)', () => {
  it('resposta sem opções devolve data: [] e NÃO é erro', async () => {
    invokeMock.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useShippingQuote('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
    expect(result.current.isError).toBe(false)
  })

  it('erro da edge function vira isError, sem lançar para o componente', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'FunctionsFetchError' } })

    const { result } = renderHook(() => useShippingQuote('01310100'), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.data).toBeUndefined()
  })
})

describe('useShippingQuote — resposta obsoleta descartada (SHP-10)', () => {
  it('a resposta do CEP anterior, mesmo chegando depois, não vira o resultado exibido', async () => {
    const pending = new Map<string, (value: unknown) => void>()
    invokeMock.mockImplementation((_fn, options) => {
      const cepDoPedido = (options?.body as { postal_code_to: string }).postal_code_to
      return new Promise((resolve) => pending.set(cepDoPedido, resolve)) as never
    })

    const { result, rerender } = renderHook(({ cep }) => useShippingQuote(cep), {
      wrapper,
      initialProps: { cep: '01310100' },
    })
    await waitFor(() => expect(pending.has('01310100')).toBe(true))

    // A cliente troca o CEP antes de a primeira cotação responder.
    rerender({ cep: '20040020' })
    await waitFor(() => expect(pending.has('20040020')).toBe(true))

    pending.get('20040020')!({ data: [quote({ id: 20, name: 'SEDEX' })], error: null })
    await waitFor(() => expect(result.current.data).toEqual([quote({ id: 20, name: 'SEDEX' })]))

    // A resposta obsoleta chega atrasada e não pode sobrescrever o resultado do CEP atual.
    pending.get('01310100')!({ data: [quote({ id: 10, name: 'PAC antigo' })], error: null })
    await new Promise((r) => setTimeout(r, 20))

    expect(result.current.data).toEqual([quote({ id: 20, name: 'SEDEX' })])
  })

  it('enquanto o novo CEP carrega, o resultado do CEP anterior não é exibido', async () => {
    invokeMock.mockResolvedValue({ data: [quote({ id: 10, name: 'PAC' })], error: null })

    const { result, rerender } = renderHook(({ cep }) => useShippingQuote(cep), {
      wrapper,
      initialProps: { cep: '01310100' },
    })
    await waitFor(() => expect(result.current.data).toEqual([quote({ id: 10, name: 'PAC' })]))

    invokeMock.mockImplementation(() => new Promise(() => {}) as never)
    rerender({ cep: '20040020' })

    expect(result.current.data).toBeUndefined()
  })
})
