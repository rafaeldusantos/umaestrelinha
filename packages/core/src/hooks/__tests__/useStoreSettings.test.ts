// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CHECKOUT,
  DEFAULT_SHIPPING,
} from '@estrelinha/supabase/types/settings'

// BMP-01: store_settings ganha a chave `checkout`; sem ela em DEFAULTS o `fetchAllSettings`
//         descarta a linha (`useStoreSettings.ts` → `if (key in map)`).
// SHP-09: `handling_days` em ShippingSettings, default 2.

const { selectMock } = vi.hoisted(() => ({ selectMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: selectMock }) },
}))

import { useCheckoutSettings, useShippingSettings, useStoreSettings } from '../useStoreSettings'

const rows = (data: Array<{ key: string; value: unknown }>) => {
  selectMock.mockResolvedValue({ data, error: null })
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

/** Renderiza as settings e só devolve depois que a query resolveu de verdade. */
async function loadSettings() {
  const { result } = renderHook(
    () => ({
      query: useStoreSettings(),
      checkout: useCheckoutSettings(),
      shipping: useShippingSettings(),
    }),
    { wrapper: makeWrapper() },
  )
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
  return result
}

beforeEach(() => {
  selectMock.mockReset()
})

describe('useCheckoutSettings', () => {
  it('devolve os defaults quando não existe linha `checkout` no banco', async () => {
    rows([{ key: 'general', value: { store_name: 'Nanita' } }])
    const result = await loadSettings()
    expect(result.current.checkout).toEqual({
      order_bump_enabled: false,
      order_bump_product_id: null,
      order_bump_discount_percent: 50,
    })
  })

  it('a linha `checkout` do banco sobrevive ao fetchAllSettings e não é descartada', async () => {
    rows([
      {
        key: 'checkout',
        value: {
          order_bump_enabled: true,
          order_bump_product_id: 'prod-1',
          order_bump_discount_percent: 30,
        },
      },
    ])
    const result = await loadSettings()
    expect(result.current.checkout).toEqual({
      order_bump_enabled: true,
      order_bump_product_id: 'prod-1',
      order_bump_discount_percent: 30,
    })
  })

  it('linha `checkout` parcial completa os campos ausentes com os defaults', async () => {
    rows([{ key: 'checkout', value: { order_bump_enabled: true } }])
    const result = await loadSettings()
    expect(result.current.checkout.order_bump_enabled).toBe(true)
    expect(result.current.checkout.order_bump_product_id).toBeNull()
    expect(result.current.checkout.order_bump_discount_percent).toBe(50)
  })

  it('erro na consulta devolve os defaults, inclusive a chave `checkout`', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })
    const result = await loadSettings()
    expect(result.current.checkout).toEqual(DEFAULT_CHECKOUT)
  })
})

describe('handling_days em ShippingSettings', () => {
  it('DEFAULT_SHIPPING.handling_days é 2', () => {
    expect(DEFAULT_SHIPPING.handling_days).toBe(2)
  })

  it('linha `shipping` sem handling_days mantém o default 2 sem perder os outros campos', async () => {
    rows([
      {
        key: 'shipping',
        value: { free_shipping_threshold: 200, default_shipping_cost: 12.5, origin_zip: '01310100' },
      },
    ])
    const result = await loadSettings()
    expect(result.current.shipping.handling_days).toBe(2)
    expect(result.current.shipping.free_shipping_threshold).toBe(200)
  })

  it('linha `shipping` com handling_days sobrescreve o default', async () => {
    rows([{ key: 'shipping', value: { handling_days: 5 } }])
    const result = await loadSettings()
    expect(result.current.shipping.handling_days).toBe(5)
  })
})
