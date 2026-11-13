import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCartStore } from '@/entities/cart/model/cartStore'

// A releitura do catálogo da sacola: a MESMA consulta da vitrine (com a campanha em vigência), relida
// ao voltar o foco à aba, e o preço e a campanha de agora gravados em cada linha.

const pedidos: string[] = []
const resposta = vi.hoisted(() => ({ rows: [] as unknown[] }))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: (colunas: string) => ({
        in: () => {
          pedidos.push(`${tabela}:${colunas.includes('product_campaigns') ? 'com-campanha' : 'sem'}`)
          return Promise.resolve({ data: resposta.rows, error: null })
        },
      }),
    }),
  },
}))

import { useCartCatalog } from '../useCartCatalog'

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-11-30T03:00:00.000Z',
}
const linhaDoBanco = (campanha: number | null) => ({
  id: 'p-black',
  name: 'Pingente',
  slug: 'pingente',
  base_price: 209.9,
  original_price: null,
  images: [],
  options: [],
  product_variants: [],
  product_campaigns: campanha ? [{ percent: campanha, campaigns: BLACK }] : [],
})

const montar = () => {
  // O padrão da loja (5 minutos): a consulta da sacola declara o próprio `staleTime`.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useCartCatalog(['p-black']), { wrapper })
}

beforeEach(() => {
  pedidos.length = 0
  useCartStore.setState({
    items: [
      {
        product: { id: 'p-black', name: 'Pingente', price: 209.9, variants: [], campaign: null },
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 209.9,
        quantity: 1,
      },
    ] as never,
  })
})

describe('useCartCatalog', () => {
  it('pede as peças da sacola pela consulta da vitrine, com a campanha embutida', async () => {
    resposta.rows = [linhaDoBanco(20)]
    montar()
    await waitFor(() => expect(useCartStore.getState().items[0].unitPrice).toBe(167.92))
    expect(pedidos).toEqual(['products:com-campanha'])
    expect(useCartStore.getState().items[0].product.campaign?.percent).toBe(20)
  })

  it('relê ao voltar o foco à aba: a campanha que acabou sai da linha', async () => {
    resposta.rows = [linhaDoBanco(20)]
    montar()
    await waitFor(() => expect(useCartStore.getState().items[0].unitPrice).toBe(167.92))

    resposta.rows = [linhaDoBanco(null)]
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(useCartStore.getState().items[0].unitPrice).toBe(209.9))
    expect(pedidos).toHaveLength(2)
    expect(useCartStore.getState().items[0].product.campaign).toBeNull()
    focusManager.setFocused(undefined)
  })
})
