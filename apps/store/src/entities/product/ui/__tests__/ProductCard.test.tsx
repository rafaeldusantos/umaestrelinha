import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

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
 * `PRF-02` (AC 4) e `PRF-03` (AC 1-3) — a foto do card no tamanho da vaga, e a primeira leva sem
 * nada que a esconda do medidor de LCP.
 *
 * O que se afirma aqui é o **DOM renderizado**, atributo a atributo. jsdom devolve 0 para toda
 * medida de layout, então largura, rolagem e sobreposição não têm como ser medidas aqui — quem
 * mede byte entregue é o navegador, no fecho da feature.
 *
 * Medido em 2026-09-05 contra o deploy provisório: a categoria entregava **LCP de 15,6 s** com
 * fotos de 1024px em vagas de 171px, e os primeiros cards nasciam `loading="lazy"` **e** em
 * opacidade zero — o navegador não conta como LCP o que está invisível.
 */

/** A forma real de um objeto público do Storage deste projeto. É essa, e só essa, que vira rendição. */
const STORAGE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'
const RENDER =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images/pingente.webp'

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pingente com cinzas',
  slug: 'pingente-com-cinzas',
  price: 289,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'joias-afetivas',
  description: '',
  image_url: STORAGE,
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

const renderCard = (index?: number, p: Product = product()) => {
  const { container } = render(
    <MemoryRouter>
      <ProductCard product={p} index={index} />
    </MemoryRouter>,
  )
  const foto = container.querySelector('img')!
  return { container, foto }
}

describe('ProductCard — a foto chega no tamanho da vaga (PRF-02 AC 4)', () => {
  it('declara `srcset` com as três larguras da rendição', () => {
    const { foto } = renderCard(0)

    expect(foto.getAttribute('srcset')).toBe(
      `${RENDER}?width=360&resize=contain&quality=75 360w, ` +
        `${RENDER}?width=480&resize=contain&quality=75 480w, ` +
        `${RENDER}?width=720&resize=contain&quality=75 720w`,
    )
  })

  it('descreve a vaga real da vitrine em `sizes`', () => {
    // Duas colunas em 390px, três a partir de `md`, quatro a partir de `lg` — é o grid da
    // categoria e o da home. `sizes` errado faz o navegador escolher a largura errada do `srcset`,
    // e o `srcset` inteiro vira decoração.
    const { foto } = renderCard(0)

    expect(foto.getAttribute('sizes')).toBe(
      '(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw',
    )
  })

  it('o `src` aponta para a rendição de 480, NUNCA para o original', () => {
    // O `src` é o que navegador sem `srcset` usa. Apontá-lo ao original faria o caso legado pagar
    // o pior preço de todos — 113 KB onde 12,7 KB bastam.
    const { foto } = renderCard(0)

    expect(foto.getAttribute('src')).toBe(`${RENDER}?width=480&resize=contain&quality=75`)
    expect(foto.getAttribute('src')).not.toBe(STORAGE)
  })

  it('imagem de host externo passa inalterada e SEM `srcset`', () => {
    // Banner de campanha em CDN de terceiro: reescrever a URL dele seria inventar um endpoint que
    // não existe. Sem `srcset`, o navegador usa o `src` e a imagem carrega como hoje.
    const externa = 'https://cdn.parceiro.example/campanha.jpg'
    const { foto } = renderCard(0, product({ image_url: externa }))

    expect(foto.getAttribute('src')).toBe(externa)
    expect(foto.hasAttribute('srcset')).toBe(false)
  })

  it('produto sem foto não ganha `srcset` nem URL inventada', () => {
    const { foto } = renderCard(0, product({ image_url: '' }))

    expect(foto.getAttribute('src')).toBe('')
    expect(foto.hasAttribute('srcset')).toBe(false)
  })

  it('a cor escolhida (`COR-11`) também vem por rendição, não pelo original', () => {
    // A foto em destaque pode ser a da variação escolhida. Se só a capa passasse pela rendição, a
    // cliente que escolhe uma cor baixaria 1024px de novo — e nada acusaria.
    const outra =
      'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/rosa.webp'
    const { foto } = renderCard(0, product({ image_url: outra }))

    expect(foto.getAttribute('src')).toContain('/render/image/public/product-images/rosa.webp')
    expect(foto.getAttribute('src')).toContain('width=480')
  })
})

describe('ProductCard — a primeira leva não se esconde do medidor (PRF-03)', () => {
  it('índice 0: `eager`, `fetchpriority="high"` e sem opacidade zero', () => {
    const { container, foto } = renderCard(0)

    expect(foto.getAttribute('loading')).toBe('eager')
    expect(foto.getAttribute('fetchpriority')).toBe('high')
    expect(foto.className).toContain('opacity-100')
    expect(foto.className).not.toContain('opacity-0')
    // O terceiro mecanismo: o `initial` do Framer. Com o observer parado (jsdom), um card animado
    // fica em `opacity: 0` para sempre — que é exatamente o que o Lighthouse via.
    expect((container.firstElementChild as HTMLElement).style.opacity).not.toBe('0')
  })

  it('índices 1 a 5: `eager`, SEM `fetchpriority`, e sem opacidade zero', () => {
    // Mais de um `high` dilui a dica e o navegador passa a ignorar todas.
    for (const i of [1, 2, 3, 4, 5]) {
      const { container, foto } = renderCard(i)

      expect(foto.getAttribute('loading')).toBe('eager')
      expect(foto.hasAttribute('fetchpriority')).toBe(false)
      expect(foto.className).not.toContain('opacity-0')
      expect((container.firstElementChild as HTMLElement).style.opacity).not.toBe('0')
    }
  })

  it('índice 6 em diante: `lazy`, e a animação de entrada de hoje intacta', () => {
    // Abaixo da dobra a animação não custa métrica, e tirá-la de lá seria mudar a loja sem ganho.
    for (const i of [6, 7, 23]) {
      const { container, foto } = renderCard(i)

      expect(foto.getAttribute('loading')).toBe('lazy')
      expect(foto.hasAttribute('fetchpriority')).toBe(false)
      expect(foto.className).toContain('opacity-0')
      expect((container.firstElementChild as HTMLElement).style.opacity).toBe('0')
    }
  })

  it('a fronteira é entre 5 e 6 — três linhas de duas colunas em 390px', () => {
    expect(renderCard(5).foto.getAttribute('loading')).toBe('eager')
    expect(renderCard(6).foto.getAttribute('loading')).toBe('lazy')
  })

  it('card SEM índice se comporta como o de índice ≥6 — o padrão seguro', () => {
    // Relacionados, favoritos e resultado de busca não são a primeira dobra de nada. Um default
    // "ansioso" ali faria a página do produto disputar banda com a foto que importa.
    const { container, foto } = renderCard(undefined)

    expect(foto.getAttribute('loading')).toBe('lazy')
    expect(foto.hasAttribute('fetchpriority')).toBe(false)
    expect(foto.className).toContain('opacity-0')
    expect((container.firstElementChild as HTMLElement).style.opacity).toBe('0')
  })

  it('a foto ansiosa não espera o `onLoad` para aparecer', () => {
    // O `opacity-0` até o `onLoad` era o segundo dos três mecanismos: a imagem baixava e continuava
    // invisível até o React re-renderizar. Enquanto isso, o relógio do LCP corria.
    const { foto } = renderCard(0)

    expect(foto.className).toContain('opacity-100')
  })
})
