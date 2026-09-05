import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Category, Product } from '@estrelinha/supabase/types'

vi.mock('@/entities/product/ui/ProductCard', () => ({ default: () => <div>card</div> }))

import RelatedProducts from '../RelatedProducts'

/**
 * `URL-03` — o "Ver todos →" da página do produto.
 *
 * O componente recebia **só o slug**, e com o slug sozinho não há como montar a canônica de uma
 * subcategoria: ela tem dois segmentos, e o pai só sai da árvore (`AD-018`). Com um segmento o link
 * ainda abriria a página — apontando para a forma secundária, contra a canônica que a própria
 * página declara.
 */
const cat = (id: string, slug: string, name: string, parent_id: string | null = null): Category =>
  ({
    id,
    name,
    slug,
    description: null,
    image_url: null,
    color_accent: null,
    icon: null,
    parent_id,
    sort_order: 0,
    active: true,
    menu_desktop: false,
    menu_mobile: false,
    menu_banners: null,
  }) as Category

const RAIZ = cat('c-raiz', 'joias-afetivas', 'Joias afetivas')
const FILHA = cat('c-filha', 'joia-de-leite-materno', 'Joia de leite materno', 'c-raiz')
const TREE = [RAIZ, FILHA]

const produtos = [{ id: 'p1' }, { id: 'p2' }] as Product[]

const renderRelated = (props: Partial<Parameters<typeof RelatedProducts>[0]> = {}) =>
  render(
    <MemoryRouter>
      <RelatedProducts products={produtos} {...props} />
    </MemoryRouter>,
  )

describe('RelatedProducts — o "Ver todos" no formato canônico', () => {
  it('subcategoria sai com DOIS segmentos, com o pai vindo da árvore', () => {
    renderRelated({ category: FILHA, categories: TREE })

    expect(screen.getByRole('link', { name: 'Ver todos →' })).toHaveAttribute(
      'href',
      '/joias-afetivas/joia-de-leite-materno',
    )
  })

  it('categoria raiz sai com UM segmento', () => {
    renderRelated({ category: RAIZ, categories: TREE })

    expect(screen.getByRole('link', { name: 'Ver todos →' })).toHaveAttribute(
      'href',
      '/joias-afetivas',
    )
  })

  it('sem categoria não há link — não se cria link morto', () => {
    renderRelated()

    expect(screen.queryByRole('link', { name: 'Ver todos →' })).not.toBeInTheDocument()
  })

  it('sem produto a seção inteira some', () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedProducts products={[]} category={RAIZ} categories={TREE} />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
