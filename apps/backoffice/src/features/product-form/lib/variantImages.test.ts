// PMD-06 (edge case) — referência de imagem que morreu.
//
// Feature 81: estes casos moravam em `VariantImageCard.test.tsx`, apagado com o card (OPV-16). A
// regra continua viva — o modal Mídia a chama ao remover uma foto (OPV-27) — e os casos vieram para
// cá sem uma linha alterada.

import { describe, expect, it } from 'vitest'
import type { ProductImage, ProductVariant } from '@estrelinha/supabase/types'

import { clearMissingVariantImages } from './variantImages'

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
  name: null,
  sku: null,
  price: 7.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const images: ProductImage[] = [
  { url: 'https://cdn/principal.webp', alt: 'Lua prateada', source: 'upload' },
  { url: 'https://cdn/fosco.webp', alt: null, source: 'mockup' },
]

describe('clearMissingVariantImages — referência que morreu (PMD-06, edge case)', () => {
  it('imagem removida da galeria faz a variação voltar à principal', () => {
    const linhas = [
      variant({ image_url: 'https://cdn/fosco.webp' }),
      variant({ image_url: 'https://cdn/principal.webp' }),
    ]

    const next = clearMissingVariantImages(linhas, [images[0]])

    expect(next[0].image_url).toBeNull()
    expect(next[1].image_url).toBe('https://cdn/principal.webp')
  })

  it('não mexe em nada quando todas as imagens ainda existem', () => {
    const linhas = [variant({ image_url: 'https://cdn/fosco.webp' })]

    // Mesma referência: o formulário compara por identidade para saber se está sujo.
    expect(clearMissingVariantImages(linhas, images)).toBe(linhas)
  })

  it('galeria esvaziada limpa todos os vínculos', () => {
    const linhas = [variant({ image_url: 'https://cdn/fosco.webp' }), variant()]

    expect(clearMissingVariantImages(linhas, []).map(v => v.image_url)).toEqual([null, null])
  })
})
