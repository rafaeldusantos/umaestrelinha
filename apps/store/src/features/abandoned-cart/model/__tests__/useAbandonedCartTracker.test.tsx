import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'

// O que este arquivo protege, na ordem em que doeu:
//
// 1. A escrita passa por `track_abandoned_cart`. O caminho antigo era
//    "select id → update ou insert" direto na tabela, mas a RLS só deixa admin LER
//    `abandoned_carts`: para todo cliente o select volta vazio, o hook sempre insere, e a
//    partir do segundo snapshot bate no índice único parcial. O `catch {}` engolia o 23505
//    e o carrinho congelava no primeiro estado.
// 2. `customer_id` não vai no corpo. Quem preenche é o `auth.uid()` dentro da RPC.
// 3. Imagem `data:` não entra no snapshot. O botton personalizado carrega o PNG do canvas
//    inteiro em base64 — centenas de KB por item, a cada write, para um produto que a
//    recuperação descarta de qualquer jeito.

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc: rpcMock } }))

const authState = { user: null as { id: string; email: string } | null, customer: null as unknown }
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { useAbandonedCartTracker } from '../useAbandonedCartTracker'

const DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg'

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1', name: 'Botton Naruto', slug: 'naruto', price: 5.9, compare_price: null,
    category_id: 'c1', category_slug: 'anime', description: '', image_url: '',
    images: [{ url: 'https://cdn.nanita/naruto.png', alt: '', source: 'upload' }],
    stock_total: 10, low_stock_threshold: 5,
    is_new: false, is_featured: false, tags: [],
    ...over,
  }) as Product

const lastPayload = () => rpcMock.mock.calls.at(-1)?.[1]

beforeEach(() => {
  vi.useFakeTimers()
  rpcMock.mockReset().mockResolvedValue({ data: null, error: null })
  authState.user = null
  authState.customer = null
  useCartStore.setState({ items: [] })
  useCouponStore.setState({ applied: null })
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

/** Roda o hook e deixa o debounce de 3s vencer. */
const track = async () => {
  renderHook(() => useAbandonedCartTracker())
  await act(async () => {
    vi.advanceTimersByTime(3000)
  })
}

describe('useAbandonedCartTracker — caminho de escrita', () => {
  it('grava pela RPC track_abandoned_cart, não pela tabela', async () => {
    sessionStorage.setItem('nanapin-guest-email', 'cliente@nanita.com.br')
    useCartStore.getState().addItem(product(), '4,5 cm', 'Fosco')

    await track()

    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock.mock.calls[0][0]).toBe('track_abandoned_cart')
  })

  it('normaliza o e-mail e não manda customer_id no corpo', async () => {
    authState.user = { id: 'u-1', email: '  Cliente@Nanita.COM.br ' }
    useCartStore.getState().addItem(product(), '4,5 cm', 'Fosco')

    await track()

    expect(lastPayload().p_email).toBe('cliente@nanita.com.br')
    expect(lastPayload()).not.toHaveProperty('customer_id')
    expect(lastPayload()).not.toHaveProperty('p_customer_id')
  })

  it('não rastreia sem e-mail', async () => {
    useCartStore.getState().addItem(product(), '4,5 cm', 'Fosco')

    await track()

    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('não rastreia carrinho vazio', async () => {
    sessionStorage.setItem('nanapin-guest-email', 'cliente@nanita.com.br')

    await track()

    expect(rpcMock).not.toHaveBeenCalled()
  })
})

describe('useAbandonedCartTracker — snapshot dos itens', () => {
  it('descarta imagem embutida em data: URI (botton personalizado)', async () => {
    sessionStorage.setItem('nanapin-guest-email', 'cliente@nanita.com.br')
    useCartStore.getState().addItem(
      product({
        id: 'custom-1785677864786',
        name: 'Botton Personalizado',
        images: [{ url: DATA_URL, alt: '', source: 'mockup' }],
      }),
      '4,5 cm', 'Fosco',
    )

    await track()

    const [item] = lastPayload().p_items
    expect(item.product_name).toBe('Botton Personalizado')
    expect(item.product_image).toBeNull()
    expect(JSON.stringify(lastPayload())).not.toContain('base64')
  })

  it('preserva imagem hospedada', async () => {
    sessionStorage.setItem('nanapin-guest-email', 'cliente@nanita.com.br')
    useCartStore.getState().addItem(product(), '4,5 cm', 'Fosco')

    await track()

    expect(lastPayload().p_items[0].product_image).toBe('https://cdn.nanita/naruto.png')
  })

  it('usa o preço congelado da linha, não o base do produto', async () => {
    sessionStorage.setItem('nanapin-guest-email', 'cliente@nanita.com.br')
    useCartStore.getState().addItem(product({ price: 5.9 }), '', '', {
      variantId: 'v1',
      variantLabel: '5,5 cm · Brilho',
      optionValues: { Tamanho: '5,5 cm', Acabamento: 'Brilho' },
      unitPrice: 9.4,
    })

    await track()

    expect(lastPayload().p_items[0].unit_price).toBe(9.4)
  })
})
