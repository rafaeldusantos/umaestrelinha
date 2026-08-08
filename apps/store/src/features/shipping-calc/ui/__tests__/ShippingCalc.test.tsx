import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import ShippingCalc from '../ShippingCalc'
import { supabase } from '@estrelinha/supabase/client'

// SHP-02: a cotação da página de produto usa o MESMO mapper do checkout (`toQuotePayload`),
// então as dimensões reais do produto vão no payload em vez dos fallbacks 11/2/16/0.1.

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

beforeEach(() => {
  invokeMock.mockReset()
  invokeMock.mockResolvedValue({ data: [], error: null } as never)
})

describe('ShippingCalc — payload de cotação (SHP-02)', () => {
  it('envia as dimensões reais do produto, pelo mapper compartilhado toQuotePayload', async () => {
    render(<ShippingCalc product={product({ width_cm: 25, height_cm: 7, length_cm: 30, weight_kg: 0.85 })} />)

    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
    expect(invokeMock.mock.calls[0][1]?.body).toEqual({
      postal_code_to: '01310100',
      products: [
        {
          id: 'prod-1',
          width: 25,
          height: 7,
          length: 30,
          weight: 0.85,
          insurance_value: 12.9,
          quantity: 1,
        },
      ],
    })
  })

  it('produto sem dimensões cadastradas continua caindo nos fallbacks 11/2/16/0.1', async () => {
    render(<ShippingCalc product={product()} />)

    fireEvent.change(screen.getByPlaceholderText('00000-000'), { target: { value: '01310100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1))
    const body = invokeMock.mock.calls[0][1]?.body as { products: Record<string, number>[] }
    expect(body.products[0]).toMatchObject({ width: 11, height: 2, length: 16, weight: 0.1 })
  })
})
