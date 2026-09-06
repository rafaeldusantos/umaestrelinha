import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeSection } from '@estrelinha/core/home'
import CollectionFeature from '../CollectionFeature'
import HomeRenderer from '@/widgets/home-renderer/ui/HomeRenderer'

/**
 * O destaque em coleção — `HOME-38`, `HOME-39`, `HOME-40`.
 *
 * Duas camadas, e as duas são necessárias: o widget prova os fallbacks e a forma; o `HomeRenderer`
 * prova que a coleção fora do ar **não chega até aqui**, que é uma decisão de `resolveHomeSections` e
 * não do desenho.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { categorias } = vi.hoisted(() => ({ categorias: { data: [] as any[] } }))
vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => categorias }))

const COLECAO = {
  href: '/leite-materno',
  label: 'Joias com leite materno',
  description: 'A primeira gota, guardada em resina.',
  imageUrl: 'https://cdn/banner-da-colecao.webp',
}

const renderFaixa = (content: Record<string, unknown> = {}, collection = COLECAO) =>
  render(
    <MemoryRouter>
      <CollectionFeature content={content} collection={collection} />
    </MemoryRouter>,
  )

describe('CollectionFeature — título e texto vazios caem na própria coleção (HOME-38)', () => {
  it('sem título e sem texto, usa o nome e a descrição da coleção', () => {
    renderFaixa({})

    expect(screen.getByRole('heading', { name: 'Joias com leite materno' })).toBeInTheDocument()
    expect(screen.getByText('A primeira gota, guardada em resina.')).toBeInTheDocument()
  })

  it('título e texto escritos no painel vencem os da coleção', () => {
    renderFaixa({ title: 'O leite que vira joia', text: 'Uma peça por vez, feita à mão.' })

    expect(screen.getByRole('heading', { name: 'O leite que vira joia' })).toBeInTheDocument()
    expect(screen.getByText('Uma peça por vez, feita à mão.')).toBeInTheDocument()
    expect(screen.queryByText('A primeira gota, guardada em resina.')).toBeNull()
  })

  it('título só com espaço em branco cai no nome da coleção — não deixa a faixa sem cabeça', () => {
    renderFaixa({ title: '   ' })

    expect(screen.getByRole('heading', { name: 'Joias com leite materno' })).toBeInTheDocument()
  })

  it('coleção sem descrição e sem texto no painel não desenha parágrafo vazio', () => {
    const { container } = renderFaixa({}, { ...COLECAO, description: null })

    expect(container.querySelector('p')).toBeNull()
  })
})

describe('CollectionFeature — a arte e o destino', () => {
  it('a foto do painel vence a arte da coleção', () => {
    renderFaixa({ image_url: 'https://cdn/foto-da-campanha.webp', image_alt: 'Pingente sobre linho' })

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://cdn/foto-da-campanha.webp')
    expect(img).toHaveAttribute('alt', 'Pingente sobre linho')
  })

  it('sem foto própria, a arte da coleção — e o `alt` cai no título', () => {
    renderFaixa({})

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://cdn/banner-da-colecao.webp')
    expect(img).toHaveAttribute('alt', 'Joias com leite materno')
  })

  it('sem arte nenhuma, a faixa sai só com o texto — nunca uma moldura cinza vazia', () => {
    renderFaixa({}, { ...COLECAO, imageUrl: null })

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Joias com leite materno' })).toBeInTheDocument()
  })

  it('a imagem leva à coleção', () => {
    renderFaixa({})
    expect(screen.getByRole('img').closest('a')).toHaveAttribute('href', '/leite-materno')
  })
})

describe('CollectionFeature — o CTA (HOME-40)', () => {
  it('o rótulo do painel vira o botão, apontando para a coleção', () => {
    renderFaixa({ cta_label: 'Ver a coleção' })

    const cta = screen.getByRole('link', { name: /Ver a coleção/ })
    expect(cta).toHaveAttribute('href', '/leite-materno')
  })

  it('o CTA mantém 44px de alvo no celular', () => {
    renderFaixa({ cta_label: 'Ver a coleção' })

    expect(screen.getByRole('link', { name: /Ver a coleção/ })).toHaveClass('min-h-11')
  })

  it('sem rótulo, o botão não sai — rótulo inventado seria um segundo dono do texto', () => {
    renderFaixa({})

    // A imagem continua sendo o caminho para a coleção; o que não existe é um botão com texto que
    // ninguém escreveu.
    expect(screen.queryByRole('link', { name: /Ver/ })).toBeNull()
  })
})

describe('CollectionFeature — em 390px imagem e texto empilham (HOME-40)', () => {
  it('a faixa é coluna por padrão e só vira linha do `md` para cima', () => {
    const { container } = renderFaixa({ cta_label: 'Ver a coleção' })

    const miolo = container.querySelector('section > div')!
    expect(miolo.className).toContain('flex-col')
    expect(miolo.className).toContain('md:flex-row')
  })
})

describe('CollectionFeature — coleção fora do ar não renderiza (HOME-39)', () => {
  const destaque = (over: Partial<HomeSection> = {}): HomeSection => ({
    id: 'destaque',
    type: 'collection_feature',
    position: 1,
    active: true,
    config: { title: 'O leite que vira joia', cta_label: 'Ver a coleção' },
    items: [
      {
        id: 'item-1',
        section_id: 'destaque',
        position: 1,
        category_id: 'leite',
        product_id: null,
        href: null,
        image_url: null,
        alt: null,
        label_snapshot: 'Joias com leite materno',
      },
    ],
    ...over,
  })

  const categoria = (over: Record<string, unknown> = {}) => ({
    id: 'leite',
    name: 'Joias com leite materno',
    slug: 'leite-materno',
    description: 'A primeira gota, guardada em resina.',
    parent_id: null,
    sort_order: 1,
    active: true,
    show_in_menu: false,
    banner_url: null,
    ...over,
  })

  const renderHome = (sections: HomeSection[]) =>
    render(
      <MemoryRouter>
        <HomeRenderer sections={sections} />
      </MemoryRouter>,
    )

  it('coleção no ar: a faixa desenha, com o nome dela no link', () => {
    categorias.data = [categoria()]
    renderHome([destaque()])

    expect(screen.getByRole('heading', { name: 'O leite que vira joia' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver a coleção/ })).toHaveAttribute(
      'href',
      '/leite-materno',
    )
  })

  it('coleção DESPUBLICADA ⇒ a seção não desenha nada — nem moldura, nem título', () => {
    categorias.data = [categoria({ active: false })]
    const { container } = renderHome([destaque()])

    expect(screen.queryByRole('heading', { name: 'O leite que vira joia' })).toBeNull()
    expect(container.firstElementChild!.childElementCount).toBe(0)
  })

  it('coleção APAGADA ⇒ a seção não desenha nada, e a Home segue de pé', () => {
    categorias.data = []
    const { container } = renderHome([destaque()])

    expect(screen.queryByRole('heading', { name: 'O leite que vira joia' })).toBeNull()
    expect(container.firstElementChild!.childElementCount).toBe(0)
  })

  it('sem item nenhum ⇒ a seção não desenha — CTA sem destino não vai para a vitrine', () => {
    categorias.data = [categoria()]
    const { container } = renderHome([destaque({ items: [] })])

    expect(container.firstElementChild!.childElementCount).toBe(0)
  })
})

/**
 * `PRF-02` (AC 4) — a foto da faixa editorial no tamanho da vaga.
 */
const STORAGE_ARTE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/home/colecao.webp'
const RENDER_ARTE =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/home/colecao.webp'

describe('CollectionFeature — a foto no tamanho da vaga (PRF-02 AC 4)', () => {
  it('declara `srcset` e um `sizes` com os 46% que o desenho reserva', () => {
    renderFaixa({ image_url: STORAGE_ARTE, image_alt: 'A coleção de leite materno' })
    const arte = screen.getByRole('img', { name: 'A coleção de leite materno' })

    expect(arte.getAttribute('srcset')).toContain(`${RENDER_ARTE}?width=720&resize=contain&quality=75 720w`)
    expect(arte.getAttribute('sizes')).toBe('(min-width: 768px) 46vw, 100vw')
    expect(arte).toHaveAttribute('src', `${RENDER_ARTE}?width=480&resize=contain&quality=75`)
  })

  it('foto de host externo passa inalterada e SEM `srcset`', () => {
    // A arte da coleção pode vir de fora do Storage — a fixture desta suíte é exatamente isso.
    renderFaixa({})
    const arte = screen.getByRole('img', { name: 'Joias com leite materno' })

    expect(arte).toHaveAttribute('src', 'https://cdn/banner-da-colecao.webp')
    expect(arte.hasAttribute('srcset')).toBe(false)
  })
})
