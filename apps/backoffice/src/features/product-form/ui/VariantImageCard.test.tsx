// PMD-06 e PFM-17 — imagem por variação e prévia da vitrine (lado do backoffice).

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProductImage, ProductOption, ProductVariant } from '@nanapin/supabase/types'

import VariantImageCard from './VariantImageCard'
import StorefrontPreview from './StorefrontPreview'
import { clearMissingVariantImages } from '../lib/variantImages'

const options: ProductOption[] = [
  { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 },
  { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
]

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

describe('VariantImageCard — vincular imagem à linha (PMD-06 AC 1-2)', () => {
  it('mostra uma linha por variação, com o rótulo da grade', () => {
    render(
      <VariantImageCard
        variants={[
          variant({ option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' } }),
          variant({ option_values: { Tamanho: '4,5 cm', Acabamento: 'Brilhante' } }),
        ]}
        options={options}
        images={images}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByText('3,5 cm · Fosco')).toBeInTheDocument()
    expect(screen.getByText('4,5 cm · Brilhante')).toBeInTheDocument()
  })

  it('variação sem imagem própria é marcada como `usa a principal`', () => {
    render(
      <VariantImageCard variants={[variant()]} options={options} images={images} onChange={vi.fn()} />,
    )

    expect(screen.getByText('usa a principal')).toBeInTheDocument()
    expect(screen.getByLabelText('4,5 cm · Fosco: usar a principal')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('escolher uma imagem da galeria grava a URL na variação', () => {
    const onChange = vi.fn()
    const linha = variant()
    render(
      <VariantImageCard variants={[linha]} options={options} images={images} onChange={onChange} />,
    )

    fireEvent.click(screen.getByLabelText('4,5 cm · Fosco: usar imagem 2'))

    expect(onChange).toHaveBeenCalledWith([{ ...linha, image_url: 'https://cdn/fosco.webp' }])
  })

  it('voltar para `Principal` limpa o vínculo', () => {
    const onChange = vi.fn()
    const linha = variant({ image_url: 'https://cdn/fosco.webp' })
    render(
      <VariantImageCard variants={[linha]} options={options} images={images} onChange={onChange} />,
    )

    expect(screen.queryByText('usa a principal')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('4,5 cm · Fosco: usar a principal'))

    expect(onChange).toHaveBeenCalledWith([{ ...linha, image_url: null }])
  })

  it('sem imagens na galeria, explica o que fazer em vez de oferecer escolha vazia', () => {
    render(<VariantImageCard variants={[variant()]} options={options} images={[]} onChange={vi.fn()} />)

    expect(
      screen.getByText('Envie imagens na aba Mídia para poder vincular uma a cada variação.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/usar imagem/)).not.toBeInTheDocument()
  })
})

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
