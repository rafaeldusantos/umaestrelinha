// PMD-06 AC 2-3 — a imagem em destaque acompanha a variação escolhida.
//
// O seletor vive no `ProductInfo` e a galeria é irmã dele: o que se prova aqui é a costura entre os
// dois, do jeito que a `ProductPage` a monta.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import type { OptionValues, Product, ProductImage, ProductOption, ProductVariant } from '@estrelinha/supabase/types'

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({ max_installments: 6, min_installment_value: 10, pix_enabled: true, pix_discount_percent: 5 }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('../ImageZoom', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

import { useProductPurchase } from '../../model/useProductPurchase'
import ProductGallery from '../ProductGallery'
import ProductInfo from '../ProductInfo'

const images: ProductImage[] = [
  { url: 'principal.webp', alt: 'Botton na bancada', source: 'upload' },
  { url: 'fosco.webp', alt: 'Botton fosco', source: 'upload' },
]

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (option_values: OptionValues, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values,
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

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  price: 4.9,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'anime',
  description: '',
  image_url: 'principal.webp',
  images,
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...over,
})

/**
 * A montagem da `ProductPage`: a página é dona do estado que liga o seletor à galeria — hoje via
 * `useProductPurchase`, que é quem avisa qual linha foi escolhida.
 */
const Page = ({ value }: { value: Product }) => {
  const [variantImage, setVariantImage] = useState<string | null>(null)
  const purchase = useProductPurchase(value, v => setVariantImage(v?.image_url ?? null))
  return (
    <MemoryRouter>
      <ProductGallery images={value.images} name={value.name} focusUrl={variantImage} />
      <ProductInfo product={value} purchase={purchase} />
    </MemoryRouter>
  )
}

/**
 * O `src` do palco. Só as imagens de CONTEÚDO entram: a miniatura tem `alt=""`, cujo role é
 * `presentation`, e é justamente isso que deixa a asserção "não mostra mais a `fosco.webp`" valer —
 * a foto segue existindo na fita de miniaturas, o que mudou é o destaque.
 */
const destaque = () =>
  screen
    .getAllByRole('img')
    .filter(el => el.tagName === 'IMG')
    .map(img => img.getAttribute('src'))

/** O chip do eixo — `VariantPicker` na superfície da página desenha `role="radio"`. */
const chip = (value: string) => screen.getByRole('radio', { name: value })

beforeEach(() => {
  seq = 0
})

describe('imagem por variação na página do produto (PMD-06)', () => {
  it('abre na imagem principal, mesmo com a grade montada', () => {
    render(
      <Page
        value={product({
          options: [option('Acabamento', ['Fosco', 'Brilhante'], 0)],
          variants: [
            variant({ Acabamento: 'Fosco' }, { image_url: 'fosco.webp' }),
            variant({ Acabamento: 'Brilhante' }),
          ],
        })}
      />,
    )

    expect(destaque()).toContain('principal.webp')
  })

  it('escolher a variação com imagem própria troca o destaque', () => {
    render(
      <Page
        value={product({
          options: [option('Acabamento', ['Fosco', 'Brilhante'], 0)],
          variants: [
            variant({ Acabamento: 'Fosco' }, { image_url: 'fosco.webp' }),
            variant({ Acabamento: 'Brilhante' }),
          ],
        })}
      />,
    )

    fireEvent.click(chip('Fosco'))

    expect(destaque()).toContain('fosco.webp')
  })

  it('variação SEM imagem própria volta para a principal', () => {
    render(
      <Page
        value={product({
          options: [option('Acabamento', ['Fosco', 'Brilhante'], 0)],
          variants: [
            variant({ Acabamento: 'Fosco' }, { image_url: 'fosco.webp' }),
            variant({ Acabamento: 'Brilhante' }),
          ],
        })}
      />,
    )

    fireEvent.click(chip('Fosco'))
    expect(destaque()).toContain('fosco.webp')

    fireEvent.click(chip('Brilhante'))

    expect(destaque()).toContain('principal.webp')
    expect(destaque()).not.toContain('fosco.webp')
  })

  it('imagem que já saiu da galeria não quebra o palco — cai na principal', () => {
    render(
      <Page
        value={product({
          options: [option('Acabamento', ['Fosco', 'Brilhante'], 0)],
          variants: [
            // Aponta para uma URL que não está mais em `images`: `image_url` é string, não FK.
            variant({ Acabamento: 'Fosco' }, { image_url: 'apagada.webp' }),
            variant({ Acabamento: 'Brilhante' }),
          ],
        })}
      />,
    )

    fireEvent.click(chip('Fosco'))

    expect(destaque()).toContain('principal.webp')
    expect(destaque()).not.toContain('apagada.webp')
  })
})
