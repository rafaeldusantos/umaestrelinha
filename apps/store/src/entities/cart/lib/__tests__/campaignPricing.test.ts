import { describe, expect, it } from 'vitest'
import { offerPricing } from '@estrelinha/core/shopping'
import { mapDbToProduct } from '@/entities/product/lib/mapProduct'
import type { CartItem } from '../../model/cartStore'
import { cartLineCampaign, cartLineCampaignPrice } from '../campaignPricing'

// A peça sem grade com o "de/por" gravado na variação única (a forma do catálogo importado),
// marcada com 10% numa campanha em vigência. A sacola compra a peça sem variação escolhida.
const LINHA = {
  id: 'p-mc',
  base_price: 349.9,
  original_price: null,
  options: [],
  product_variants: [{ id: 'v-mc', price: 349.9, compare_price: 374, is_active: true, position: 0, option_values: {} }],
  product_campaigns: [
    {
      percent: 10,
      campaigns: {
        id: 'camp-bf',
        name: 'Black Friday',
        badge_text: 'Black Friday',
        band_color: '#161514',
        accent_color: '#C2A063',
        ends_at: '2026-12-01T03:00:00Z',
      },
    },
  ],
}

const itemDa = (product: ReturnType<typeof mapDbToProduct>): CartItem =>
  ({ product, quantity: 1, unitPrice: product.price, variantId: null }) as unknown as CartItem

describe('cartLineCampaignPrice — a peça sem grade com "de/por" na variação', () => {
  it('a linha sem variação escolhida: "de" R$ 374,00 por R$ 336,60 — nunca "de" R$ 349,90 por R$ 314,91', () => {
    const item = itemDa(mapDbToProduct(LINHA))
    expect(cartLineCampaign(item)?.pricing).toEqual({ percent: 10, compare_price: 374 })
    const preco = cartLineCampaignPrice(item)
    expect(preco?.full).toBe(374)
    expect(preco?.charged).toBe(336.6)
  })

  it('o mesmo par que o feed do Google anuncia para a linha', () => {
    const preco = cartLineCampaignPrice(itemDa(mapDbToProduct(LINHA)))
    const oferta = offerPricing(
      { price: 349.9, compare_price: 374, stock: 1 },
      { percent: 10, starts_at: '2026-11-01T03:00:00Z', ends_at: '2026-12-01T03:00:00Z' },
    )
    expect([preco?.full, preco?.charged]).toEqual([oferta.price, oferta.salePrice])
  })
})
