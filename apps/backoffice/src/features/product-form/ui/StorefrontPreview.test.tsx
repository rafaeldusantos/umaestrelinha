// PFM-17 — o card como a loja mostra (lado do backoffice).
//
// Feature 81: estes casos moravam em `VariantImageCard.test.tsx`, apagado com o card (OPV-16), e
// vieram para cá sem uma linha alterada.

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ProductImage, ProductVariant } from '@estrelinha/supabase/types'

import StorefrontPreview from './StorefrontPreview'

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

describe('StorefrontPreview — o card como a loja mostra (PFM-17)', () => {
  it('mostra `a partir de` com o menor preço ativo da grade', () => {
    render(
      <StorefrontPreview
        name="Botton Sailor Moon"
        images={images}
        price={4.9}
        variants={[variant({ price: 9.4 }), variant({ price: 5.9 }), variant({ price: 7.9 })]}
      />,
    )

    expect(screen.getByText('a partir de R$ 5,90')).toBeInTheDocument()
  })

  it('variação pausada não entra na faixa — a loja não anuncia o que não vende', () => {
    render(
      <StorefrontPreview
        name="Botton Sailor Moon"
        images={images}
        price={4.9}
        variants={[variant({ price: 3.9, is_active: false }), variant({ price: 7.9 })]}
      />,
    )

    expect(screen.getByText('a partir de R$ 7,90')).toBeInTheDocument()
  })

  it('sem grade vendável, mostra o preço padrão do produto', () => {
    render(<StorefrontPreview name="Botton Sailor Moon" images={images} price={4.9} variants={[]} />)

    expect(screen.getByText('R$ 4,90')).toBeInTheDocument()
    expect(screen.queryByText(/a partir de/)).not.toBeInTheDocument()
  })

  it('usa a imagem principal com o alt cadastrado', () => {
    render(<StorefrontPreview name="Botton Sailor Moon" images={images} price={4.9} variants={[]} />)

    expect(screen.getByAltText('Lua prateada')).toHaveAttribute('src', 'https://cdn/principal.webp')
  })

  it('reflete a edição sem salvar: o nome digitado aparece no card', () => {
    const { rerender } = render(
      <StorefrontPreview name="Botton Sailor" images={images} price={4.9} variants={[]} />,
    )
    expect(screen.getByText('Botton Sailor')).toBeInTheDocument()

    rerender(
      <StorefrontPreview name="Botton Sailor Moon" images={images} price={4.9} variants={[]} />,
    )

    expect(screen.getByText('Botton Sailor Moon')).toBeInTheDocument()
  })

  it('produto ainda sem nome não mostra card em branco', () => {
    const { container } = render(
      <StorefrontPreview name="   " images={[]} price={0} variants={[]} />,
    )

    expect(screen.getByText('Produto sem nome')).toBeInTheDocument()
    // Sem imagem, nenhum `<img>`: `src` vazio faz o browser pedir a própria página como imagem.
    expect(within(container).queryByRole('img')).not.toBeInTheDocument()
  })
})
