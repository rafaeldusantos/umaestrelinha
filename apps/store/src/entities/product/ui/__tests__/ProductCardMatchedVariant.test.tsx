import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import ProductCard from '../ProductCard'

/**
 * Feature 67 · VFL-11..13, VFL-16 — o card que abre na variação pela qual a peça passou no filtro.
 *
 * A peça tem TRÊS eixos e o card mostra dois (`CARD_MAX_AXES`). É isso que torna as asserções de
 * preço discriminantes: a prata com gravação (R$ 130) e a prata sem gravação (R$ 95) têm a mesma cor
 * e a mesma letra, e `findVariant` pelos dois eixos visíveis acharia a de R$ 95 — a primeira do
 * array. Um card que derivasse o preço da seleção, e não da variação recebida, mostraria R$ 95.
 *
 * O "de" (R$ 160) só existe na linha casada, e a peça não tem "de": o selo de desconto só aparece se
 * o card leu a variação.
 */

const STORAGE = 'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images'
const RENDER = 'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images'

const linha = (over: Partial<ProductVariant>): ProductVariant => ({
  id: 'v',
  product_id: 'colar',
  option_values: {},
  name: null,
  sku: null,
  price: null,
  compare_price: null,
  stock: 3,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  nuvemshop_id: null,
  ...over,
})

const OURO = linha({
  id: 'v-ouro',
  option_values: { Cor: 'Folheado a Ouro', Letra: 'A', Gravação: 'Sem' },
  price: 60,
  image_url: `${STORAGE}/ouro.webp`,
  position: 0,
  nuvemshop_id: 1259936200,
})
const PRATA_SEM = linha({
  id: 'v-prata-sem',
  option_values: { Cor: 'Prata 925', Letra: 'A', Gravação: 'Sem' },
  price: 95,
  image_url: `${STORAGE}/prata.webp`,
  position: 1,
  nuvemshop_id: 1259936201,
})
const PRATA_COM = linha({
  id: 'v-prata-com',
  option_values: { Cor: 'Prata 925', Letra: 'A', Gravação: 'Com' },
  price: 130,
  compare_price: 160,
  image_url: null,
  position: 2,
  nuvemshop_id: 1259936202,
})
// Criada no painel: sem `nuvemshop_id`, o id público é o UUID.
const PRATA_B = linha({
  id: '3f1c2a8e-5b6d-4e7f-9a0b-1c2d3e4f5a6b',
  option_values: { Cor: 'Prata 925', Letra: 'B', Gravação: 'Sem' },
  price: 99,
  image_url: `${STORAGE}/prata-b.webp`,
  position: 3,
})

const colar = (): Product => ({
  id: 'colar',
  name: 'Colar coração com letra',
  slug: 'colar-coracao-com-letra',
  price: 50,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'colares',
  description: '',
  image_url: `${STORAGE}/capa.webp`,
  images: [],
  options: [
    { name: 'Cor', values: ['Folheado a Ouro', 'Prata 925'], position: 0 },
    { name: 'Letra', values: ['A', 'B'], position: 1 },
    { name: 'Gravação', values: ['Sem', 'Com'], position: 2 },
  ],
  // A prata SEM gravação vem antes da COM: é a que `findVariant` pelos dois eixos visíveis acharia.
  variants: [OURO, PRATA_SEM, PRATA_COM, PRATA_B],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
})

const Card = ({ v, p = colar() }: { v?: ProductVariant | null; p?: Product }) => (
  <MemoryRouter>
    <ProductCard product={p} index={0} matchedVariant={v} />
  </MemoryRouter>
)

const href = (c: HTMLElement) => c.querySelector('a')!.getAttribute('href')
const foto = (c: HTMLElement) => c.querySelector('img')!.getAttribute('src')
const precos = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('span.font-display, span.line-through')).map(s => s.textContent?.replace(/\s/g, ' '))
const selo = (c: HTMLElement) => c.querySelector('span.estrelinha-eyebrow')?.textContent ?? null

describe('ProductCard sem `matchedVariant` — o card de hoje (VFL-13)', () => {
  it('ausente e `null` renderizam EXATAMENTE o mesmo DOM', () => {
    const sem = render(<Card />).container.innerHTML
    const nulo = render(<Card v={null} />).container.innerHTML
    expect(nulo).toBe(sem)
  })

  it('o link é o da peça, sem `?variant=`', () => {
    const { container } = render(<Card />)
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
  })

  it('a foto é a capa, e o preço é o da primeira linha disponível — como sempre foi', () => {
    const { container } = render(<Card />)
    expect(foto(container)).toBe(`${RENDER}/capa.webp?width=480&resize=contain&quality=75`)
    expect(precos(container)).toEqual(['R$ 60,00'])
    expect(selo(container)).toBeNull()
  })
})

describe('ProductCard com `matchedVariant` — abre na variação que casou (VFL-11, VFL-12)', () => {
  it('o link leva `?variant=` com o `nuvemshop_id` — o id que o Google Shopping indexou', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra?variant=1259936202')
  })

  it('sem `nuvemshop_id`, o link leva o UUID da linha (o recuo de `publicVariantId`)', () => {
    const { container } = render(<Card v={PRATA_B} />)
    expect(href(container)).toBe(`/produtos/colar-coracao-com-letra?variant=${PRATA_B.id}`)
  })

  it('o preço e o "de" são os DA VARIAÇÃO — não os da primeira linha com a mesma cor e letra', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    expect(precos(container)).toEqual(['R$ 130,00', 'R$ 160,00'])
    expect(selo(container)).toBe('-19%')
  })

  it('a foto é a da variação, por rendição', () => {
    const { container } = render(<Card v={PRATA_B} />)
    expect(foto(container)).toBe(`${RENDER}/prata-b.webp?width=480&resize=contain&quality=75`)
  })

  it('variação sem foto cai na capa da peça', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    expect(foto(container)).toBe(`${RENDER}/capa.webp?width=480&resize=contain&quality=75`)
  })

  it('variação sem preço cai no preço da peça', () => {
    const { container } = render(<Card v={{ ...PRATA_B, price: null }} />)
    expect(precos(container)).toEqual(['R$ 50,00'])
  })

  it('a fileira de cor nasce marcando a cor da variação', () => {
    render(<Card v={PRATA_COM} />)
    expect(screen.getByRole('button', { name: 'Ver na cor Prata 925' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Ver na cor Folheado a Ouro' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('tocar noutra cor continua trocando a foto e o preço, como hoje', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver na cor Folheado a Ouro' }))
    expect(precos(container)).toEqual(['R$ 60,00'])
    expect(foto(container)).toBe(`${RENDER}/ouro.webp?width=480&resize=contain&quality=75`)
  })
})

describe('ProductCard — a variação muda com o filtro, sem remontar (VFL-16)', () => {
  it('trocar de variação troca link, preço e foto', () => {
    const { container, rerender } = render(<Card v={PRATA_COM} />)
    rerender(<Card v={PRATA_B} />)
    expect(href(container)).toBe(`/produtos/colar-coracao-com-letra?variant=${PRATA_B.id}`)
    expect(precos(container)).toEqual(['R$ 99,00'])
    expect(foto(container)).toBe(`${RENDER}/prata-b.webp?width=480&resize=contain&quality=75`)
  })

  it('tirar o último filtro (a prop vira `null`) devolve o card de hoje, inclusive depois de tocar numa cor', () => {
    const p = colar()
    const { container, rerender } = render(<Card v={PRATA_B} p={p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver na cor Folheado a Ouro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver na cor Prata 925' }))
    rerender(<Card v={null} p={p} />)
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
    expect(precos(container)).toEqual(['R$ 60,00'])
    expect(foto(container)).toBe(`${RENDER}/capa.webp?width=480&resize=contain&quality=75`)
    expect(screen.getByRole('button', { name: 'Ver na cor Folheado a Ouro' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('o card de volta é o MESMO DOM de um card que nunca recebeu variação', () => {
    const p = colar()
    const nunca = render(<Card p={p} />).container.innerHTML
    const { container, rerender } = render(<Card v={PRATA_COM} p={p} />)
    rerender(<Card v={null} p={p} />)
    expect(container.innerHTML).toBe(nunca)
  })
})

/**
 * Pós-verificação da 67 (decisão do usuário, 2026-10-18): o link acompanha a cor tocada.
 *
 * A variação do link é a MESMA que dá o preço depois do toque (`findVariant` pela seleção), e por
 * isso cada caso cobra o `href` e o preço juntos. Voltar à cor que casou devolve a casada — não a
 * primeira linha daquela cor, que aqui é outra (R$ 95, sem gravação).
 */
describe('ProductCard — o link acompanha a cor tocada', () => {
  const ver = (cor: string) => fireEvent.click(screen.getByRole('button', { name: `Ver na cor ${cor}` }))

  it('com filtro, tocar noutra cor leva o link à variação dela, pelo `nuvemshop_id`', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    ver('Folheado a Ouro')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra?variant=1259936200')
    expect(precos(container)).toEqual(['R$ 60,00'])
  })

  it('sem `nuvemshop_id`, a variação da cor tocada vai pelo UUID', () => {
    const uuid = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d'
    const p = colar()
    p.variants = p.variants.map(v => (v.id === PRATA_SEM.id ? { ...v, id: uuid, nuvemshop_id: null } : v))
    const { container } = render(<Card v={OURO} p={p} />)
    ver('Prata 925')
    expect(href(container)).toBe(`/produtos/colar-coracao-com-letra?variant=${uuid}`)
    expect(precos(container)).toEqual(['R$ 95,00'])
  })

  it('tocar e voltar à cor que casou devolve o `?variant=` original, o preço e o "de" dela', () => {
    const { container } = render(<Card v={PRATA_COM} />)
    ver('Folheado a Ouro')
    ver('Prata 925')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra?variant=1259936202')
    expect(precos(container)).toEqual(['R$ 130,00', 'R$ 160,00'])
    expect(selo(container)).toBe('-19%')
    expect(screen.getByRole('button', { name: 'Ver na cor Prata 925' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('cor tocada que não resolve variação (Ouro com a letra B não existe) ⇒ link da peça', () => {
    const { container } = render(<Card v={PRATA_B} />)
    ver('Folheado a Ouro')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
  })

  it('cor tocada cuja variação está pausada ⇒ link da peça, sem `?variant=`', () => {
    const p = colar()
    p.variants = p.variants.map(v => (v.id === OURO.id ? { ...v, is_active: false } : v))
    const { container } = render(<Card v={PRATA_COM} p={p} />)
    ver('Folheado a Ouro')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
  })

  it('cor tocada cuja variação não tem preço ⇒ link da peça', () => {
    const p = colar()
    p.variants = p.variants.map(v => (v.id === OURO.id ? { ...v, price: null } : v))
    const { container } = render(<Card v={PRATA_COM} p={p} />)
    ver('Folheado a Ouro')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
  })

  /*
    Decisão documentada: SEM filtro, tocar numa cor também leva o link à variação daquela cor — a
    regra do card já resolve uma (a mesma que dá o preço). Sem toque, o link segue o da peça
    (VFL-13, provado acima e de novo aqui).
  */
  it('sem filtro e sem toque, o link é o da peça; tocar numa cor leva à variação dela', () => {
    const { container } = render(<Card />)
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra')
    ver('Prata 925')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra?variant=1259936201')
    expect(precos(container)).toEqual(['R$ 95,00'])
    ver('Folheado a Ouro')
    expect(href(container)).toBe('/produtos/colar-coracao-com-letra?variant=1259936200')
    expect(precos(container)).toEqual(['R$ 60,00'])
  })
})
