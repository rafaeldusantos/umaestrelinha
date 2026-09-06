import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: false,
    pix_discount_percent: 0,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

import ProductCarousel from '../ProductCarousel'

/**
 * `PRF-02` (AC 4) e `PRF-03` (AC 1) — a fileira da home pede foto do tamanho da vaga, e repassa a
 * posição de cada card.
 *
 * A fileira é a primeira dobra da home quando não há hero com foto, e é ela que decide qual imagem
 * o navegador busca primeiro. **O banner ocupa a primeira vaga da linha**: passar o índice do
 * `.map()` cru faria o segundo card se achar o primeiro da tela, e a dica de LCP iria para a foto
 * errada.
 */

const STORAGE = (nome: string) =>
  `https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/${nome}.webp`
const RENDER = (nome: string) =>
  `https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images/${nome}.webp`

const product = (n: number): Product =>
  ({
    id: `p${n}`,
    name: `Pingente ${n}`,
    slug: `pingente-${n}`,
    price: 289,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'joias-afetivas',
    description: '',
    image_url: STORAGE(`p${n}`),
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
  }) as Product

const BANNER = {
  href: '/joias-afetivas',
  imageUrl: STORAGE('banner-da-fileira'),
  alt: 'Joias afetivas',
}

const renderFileira = (quantos: number, banner?: typeof BANNER) => {
  const { container } = render(
    <MemoryRouter>
      <ProductCarousel
        title="Joias afetivas"
        products={Array.from({ length: quantos }, (_, i) => product(i))}
        banner={banner}
      />
    </MemoryRouter>,
  )
  /** As fotos dos CARDS. O recorte é `33vw`, que só o `sizes` da vitrine tem — o do banner também
      carrega `25vw`, e recortar por ele traria o banner junto como se fosse card. */
  const cards = [...container.querySelectorAll('img[sizes*="33vw"]')]
  return { container, cards }
}

describe('ProductCarousel — o banner da fileira pede a vaga dele (PRF-02 AC 4)', () => {
  it('declara `srcset` e um `sizes` com os 220px da vaga no celular', () => {
    const { container } = renderFileira(3, BANNER)
    const banner = container.querySelector('img[alt="Joias afetivas"]')!

    expect(banner.getAttribute('srcset')).toContain(`${RENDER('banner-da-fileira')}?width=360`)
    expect(banner.getAttribute('srcset')).toContain('720w')
    expect(banner.getAttribute('sizes')).toBe('(min-width: 768px) 25vw, 220px')
  })

  it('banner de host externo passa inalterado e SEM `srcset`', () => {
    const externo = { ...BANNER, imageUrl: 'https://cdn.parceiro.example/campanha.jpg' }
    const { container } = renderFileira(3, externo)
    const banner = container.querySelector('img[alt="Joias afetivas"]')!

    expect(banner.getAttribute('src')).toBe('https://cdn.parceiro.example/campanha.jpg')
    expect(banner.hasAttribute('srcset')).toBe(false)
  })
})

describe('ProductCarousel — o índice de cada card conta o banner (PRF-03 AC 1)', () => {
  it('sem banner, o primeiro card é o índice 0 — `eager` com `fetchpriority="high"`', () => {
    const { cards } = renderFileira(3)

    expect(cards[0].getAttribute('loading')).toBe('eager')
    expect(cards[0].getAttribute('fetchpriority')).toBe('high')
  })

  it('COM banner, o primeiro card é o índice 1 — ansioso, mas sem a dica de prioridade', () => {
    // A dica alta é do banner-vaga-zero. Dois `high` na mesma tela diluem a dica, e o navegador
    // passa a ignorar as duas.
    const { cards } = renderFileira(3, BANNER)

    expect(cards[0].getAttribute('loading')).toBe('eager')
    expect(cards[0].hasAttribute('fetchpriority')).toBe(false)
  })

  it('o sétimo card volta a ser preguiçoso — a fronteira é a primeira dobra', () => {
    const { cards } = renderFileira(8)

    expect(cards).toHaveLength(8)
    expect(cards[5].getAttribute('loading')).toBe('eager')
    expect(cards[6].getAttribute('loading')).toBe('lazy')
  })

  it('com banner, a fronteira anda uma vaga — o sexto card já é preguiçoso', () => {
    // Prova por deslocamento: sem o `+1` do banner este card ainda seria ansioso, e o teste acima
    // continuaria passando. É a asserção que separa "conta o banner" de "conta o `.map()`".
    const { cards } = renderFileira(8, BANNER)

    expect(cards[4].getAttribute('loading')).toBe('eager')
    expect(cards[5].getAttribute('loading')).toBe('lazy')
  })

  it('a foto do card sai por rendição, não pelo original', () => {
    const { cards } = renderFileira(2)

    expect(cards[0].getAttribute('src')).toBe(`${RENDER('p0')}?width=480&resize=contain&quality=75`)
  })
})

/**
 * **A fileira reserva a altura enquanto carrega** — `PRF-17`.
 *
 * Até a feature 40 a fileira desenhava `null` em DOIS estados diferentes: a coleção que respondeu
 * sem produto e a coleção que ainda não respondeu. As quatro fileiras da home nasciam com altura
 * zero e estouravam para ~600px cada quando os produtos chegavam.
 *
 * O Lighthouse de 2026-09-06 mediu o custo: o elemento que deslocava era o `<footer>`, com score
 * **0,244228432563791** — o CLS total inteiro da página, num deslocamento só. O rodapé ficava
 * visível enquanto a página era curta, e é a distância que ele percorria que dominava o cálculo.
 *
 * **jsdom devolve 0 para toda medida de layout**, então nada aqui mede altura. O que se assere é a
 * PRESENÇA da seção e o número de vagas reservadas; a igualdade de altura entre esqueleto e card é
 * guardada por `cardSkeletonBox.test.ts`, e medida em navegador.
 */
describe('ProductCarousel — carregando é o terceiro estado (PRF-17)', () => {
  const renderEstado = (props: Partial<Parameters<typeof ProductCarousel>[0]>) =>
    render(
      <MemoryRouter>
        <ProductCarousel title="Joias afetivas" products={[]} {...props} />
      </MemoryRouter>,
    )

  const esqueletos = (c: HTMLElement) => c.querySelectorAll('[aria-hidden="true"].flex.flex-col')

  it('carregando: a seção, o título e as vagas existem', () => {
    const { container, getByText } = renderEstado({ loading: true, skeletonCount: 4 })

    expect(container.querySelector('section')).not.toBeNull()
    expect(getByText('Joias afetivas')).toBeTruthy()
    expect(esqueletos(container)).toHaveLength(4)
  })

  it('carregando: a grade se anuncia ocupada para leitor de tela', () => {
    const { container } = renderEstado({ loading: true })

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('carregando com banner: reserva TRÊS vagas, não quatro — o banner ocupa a primeira', () => {
    // Prova por deslocamento: `skeletonCount` derivado de `CARDS` em vez de `vagas` reservaria uma
    // linha maior que a que vai aparecer, e a fileira encolheria ao carregar.
    const { container } = renderEstado({ loading: true, skeletonCount: 3, banner: BANNER })

    expect(esqueletos(container)).toHaveLength(3)
  })

  it('RESOLVIDO e vazio: continua sumindo por inteiro — não é um título com buracos', () => {
    const { container } = renderEstado({ loading: false })

    expect(container.querySelector('section')).toBeNull()
    expect(container.textContent).toBe('')
  })

  it('resolvido COM produtos: nenhuma vaga de esqueleto sobra', () => {
    const { container } = render(
      <MemoryRouter>
        <ProductCarousel
          title="Joias afetivas"
          products={[product(0), product(1)]}
          loading={false}
        />
      </MemoryRouter>,
    )

    expect(esqueletos(container)).toHaveLength(0)
    expect(container.querySelector('[aria-busy="false"]')).not.toBeNull()
  })
})
