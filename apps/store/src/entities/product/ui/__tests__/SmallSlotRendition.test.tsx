import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { OptionValues, Product, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { PAGE_MAX_AXES } from '../../lib/variantSelection'
import ColorPreview from '../ColorPreview'
import VariantPicker from '../VariantPicker'
import VariantSheet from '../VariantSheet'

/**
 * `PRF-02` (AC 5) — as vagas PEQUENAS também pedem rendição.
 *
 * A amostra de cor era o pior caso da loja inteira: 40px de vaga recebendo o original de 1024px, e
 * até seis delas por card, em toda a listagem. A vaga não fica maior por baixar mais byte — fica só
 * mais cara.
 *
 * O que se afirma aqui é o **DOM renderizado**: o `src` que o navegador vai buscar. jsdom devolve 0
 * para toda medida de layout, então o tamanho pedido é o que dá para provar em teste; o byte
 * entregue é medido em navegador, no fecho da feature.
 */

/** A forma real de um objeto público do Storage deste projeto — a única que vira rendição. */
const STORAGE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'
const RENDER =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images/pingente.webp'

const option = (name: string, values: string[], position = 0): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (option_values: OptionValues, over: Partial<ProductVariant> = {}): ProductVariant =>
  ({
    id: `v${++seq}`,
    product_id: 'p1',
    option_values,
    name: null,
    sku: null,
    price: 100,
    compare_price: null,
    stock: 10,
    weight_kg: null,
    image_url: null,
    is_active: true,
    position: seq,
    ...over,
  }) as ProductVariant

const produto = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pingente com cinzas',
    slug: 'pingente',
    price: 100,
    image_url: '',
    options: [],
    variants: [],
    stock_policy: 'track',
    ...over,
  }) as Product

/** Duas cores, cada uma com a sua foto — o caso que desenha a fileira do card (`COR-10`). */
const COM_COR = produto({
  options: [option('Cor', ['Prata', 'Ouro'])],
  variants: [
    variant({ Cor: 'Prata' }, { image_url: STORAGE }),
    variant({ Cor: 'Ouro' }, { image_url: `${STORAGE}?v=2` }),
  ],
})

/** Duas cores fotografadas em host de terceiro — a URL que NÃO é objeto do Storage deste projeto. */
const COR_EXTERNA = produto({
  options: [option('Cor', ['Prata', 'Ouro'])],
  variants: [
    variant({ Cor: 'Prata' }, { image_url: 'https://cdn.terceiro.example/prata.jpg' }),
    variant({ Cor: 'Ouro' }, { image_url: 'https://cdn.terceiro.example/ouro.jpg' }),
  ],
})

/** A segunda cor sem foto nenhuma — `COR-15`: palco vazio, e não `<img>` sem `src`. */
const COR_SEM_FOTO = produto({
  options: [option('Cor', ['Prata', 'Ouro'])],
  variants: [variant({ Cor: 'Prata' }, { image_url: STORAGE }), variant({ Cor: 'Ouro' })],
})

describe('ColorPreview — a amostra de cor pede 120, nunca o original (PRF-02 AC 5)', () => {
  it('cada miniatura busca a rendição de 120, com a qualidade do dono', () => {
    // A conta está no componente: 40px de vaga × `scale-[1.6]` de `COR-13` × DPR 2 = 128.
    const { container } = render(
      <ColorPreview product={COM_COR} selected={{}} onPick={vi.fn()} />,
    )

    const fotos = [...container.querySelectorAll('img')]
    expect(fotos.length).toBeGreaterThan(0)
    for (const img of fotos) {
      expect(img.getAttribute('src')).toContain('/render/image/public/')
      expect(img.getAttribute('src')).toContain('width=120')
      expect(img.getAttribute('src')).toContain('quality=75')
    }
  })

  it('nenhuma miniatura aponta para o objeto original de 1024px', () => {
    const { container } = render(
      <ColorPreview product={COM_COR} selected={{}} onPick={vi.fn()} />,
    )

    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('src')).not.toContain('/object/public/')
    }
  })

  it('cor SEM foto continua sem `<img>` — `COR-15` intacto', () => {
    // A rendição não pode ter transformado o palco vazio num `<img src="">`: o navegador
    // desenharia o ícone de imagem quebrada dentro da fileira de cores.
    const { container } = render(
      <ColorPreview product={COR_SEM_FOTO} selected={{}} onPick={vi.fn()} />,
    )

    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
})

describe('VariantPicker — o eixo por foto pede 180 (PRF-02 AC 5)', () => {
  it('a vaga de 56px com `scale-[1.6]` busca a rendição de 180', () => {
    const { container } = render(
      <VariantPicker
        product={COM_COR}
        max={PAGE_MAX_AXES}
        surface="page"
        selected={{}}
        onChange={vi.fn()}
      />,
    )

    const fotos = [...container.querySelectorAll('img')]
    expect(fotos).toHaveLength(2)
    for (const img of fotos) {
      expect(img.getAttribute('src')).toContain('width=180')
      expect(img.getAttribute('src')).not.toContain('/object/public/')
    }
  })

  it('foto de host externo passa inalterada, sem `srcset` e sem endpoint inventado', () => {
    const { container } = render(
      <VariantPicker
        product={COR_EXTERNA}
        max={PAGE_MAX_AXES}
        surface="page"
        selected={{}}
        onChange={vi.fn()}
      />,
    )

    const fotos = [...container.querySelectorAll('img')]
    expect(fotos).toHaveLength(2)
    for (const img of fotos) {
      expect(img.getAttribute('src')).toContain('cdn.terceiro.example')
      expect(img.getAttribute('src')).not.toContain('/render/image/')
    }
  })
})

describe('VariantSheet — a foto do cabeçalho pede 160 (PRF-02 AC 5)', () => {
  const renderSheet = (p: Product) =>
    render(
      <VariantSheet
        product={p}
        open
        onOpenChange={vi.fn()}
        selected={{}}
        onChange={vi.fn()}
        onConfirm={vi.fn()}
        price={100}
      />,
    )

  it('a vaga de 64px busca a rendição de 160', () => {
    const { baseElement } = renderSheet(produto({ ...COM_COR, image_url: STORAGE }))

    const foto = baseElement.querySelectorAll('img')[0]
    expect(foto?.getAttribute('src')).toBe(`${RENDER}?width=160&resize=contain&quality=75`)
  })

  it('produto de host externo passa inalterado, sem endpoint inventado', () => {
    // Banner ou foto importada de terceiro: reescrever a URL de outro host inventaria uma rota
    // que não existe, e a imagem simplesmente não carregaria.
    const externo = 'https://cdn.terceiro.example/foto.jpg'
    const { baseElement } = renderSheet(produto({ ...COM_COR, image_url: externo }))

    expect(baseElement.querySelectorAll('img')[0].getAttribute('src')).toBe(externo)
  })
})
