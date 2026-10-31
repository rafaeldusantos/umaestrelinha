import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { QuoteProductPayload } from '@estrelinha/core/shipping'
import { supabase } from '@estrelinha/supabase/client'
import { useCartStore } from '@/entities/cart'
import { useShippingQuote } from '../useShippingQuote'

/* eslint-disable @typescript-eslint/no-explicit-any */

// Feature 89 · T22 (CON-04): a cotação do pedido montado manda as PEÇAS DO PEDIDO ao melhor-envio,
// nunca a sacola da cliente — que pode ter outras peças (edge case "sacola intocada").

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

const PECAS: QuoteProductPayload[] = [
  { id: 'peca-1', width: 11, height: 2, length: 16, weight: 0.1, insurance_value: 180, quantity: 1 },
]

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('useShippingQuote com as peças injetadas', () => {
  it('manda as peças, e não a sacola', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: [{ id: 1, name: 'PAC', company: 'Correios', price: '14.90', delivery_time: 6 }],
      error: null,
    } as any)
    useCartStore.setState({
      items: [
        { product: { id: 'da-sacola', price: 50 } as any, size: '', finish: '', quantity: 3, variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50 },
      ],
    } as any)

    const { result } = renderHook(() => useShippingQuote('04538-133', PECAS), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(supabase.functions.invoke).toHaveBeenCalledWith('melhor-envio?action=quote', {
      body: { postal_code_to: '04538133', products: PECAS },
    })
  })
})
