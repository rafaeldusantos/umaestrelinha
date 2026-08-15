import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_HOME_COMPOSITION, type HomeSection } from '@estrelinha/core/home'
import HomeRenderer from '../HomeRenderer'
import { HOME_SECTION_RENDERERS } from '../sectionRenderers'

/**
 * O renderizador dirigido por tipo — `HOME-02`, `HOME-03`.
 *
 * Três coisas se provam aqui, e cada uma falha de um jeito que nada mais acusaria: seção desligada
 * produzindo **espaço** em vez de nada; um tipo sem desenho derrubando a página inteira; e a faixa
 * institucional sumindo quando a Home é reordenada.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { categorias, produtos } = vi.hoisted(() => ({
  categorias: { data: [] as any[] },
  produtos: { data: [] as any[] },
}))

vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, max_installments: 6 }),
  useShippingSettings: () => ({ free_shipping_threshold: 150 }),
}))

const categoria = (slug: string, name: string, sort_order: number, extra: any = {}) => ({
  id: slug,
  name,
  slug,
  description: null,
  parent_id: null,
  sort_order,
  active: true,
  show_in_menu: false,
  banner_url: null,
  ...extra,
})

categorias.data = [1, 2, 3].map(n => categoria(`colecao-${n}`, `Coleção ${n}`, n))
produtos.data = [{ id: 'p1', name: 'Peça 1' }]

const secao = (type: string, over: Partial<HomeSection> = {}): HomeSection => {
  const semeada = DEFAULT_HOME_COMPOSITION.find(s => s.type === type)!
  return { ...semeada, ...over } as HomeSection
}

const renderHome = (sections: HomeSection[]) =>
  render(
    <MemoryRouter>
      <HomeRenderer sections={sections} />
    </MemoryRouter>,
  )

describe('HomeRenderer — o registro tipo → componente', () => {
  it('desenha cada seção ativa pelo componente do tipo dela', () => {
    renderHome([secao('hero'), secao('newsletter')])

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('O que você ama,')
    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
  })

  it('a ordem desenhada é a `position`, não a do array', () => {
    renderHome([
      secao('newsletter', { position: 1 }),
      secao('hero', { position: 2 }),
    ])

    const hero = screen.getByRole('heading', { level: 1 })
    const news = screen.getByRole('heading', { name: 'Quer saber das novidades?' })
    expect(news.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('os dois tipos de P3 e o destaque em coleção ainda não têm desenho', () => {
    // A ausência é declarada, não acidental: eles entram no catálogo (a bandeja os mostra como "em
    // breve") e ganham renderer quando ganharem tela.
    expect(HOME_SECTION_RENDERERS.product_carousel).toBeNull()
    expect(HOME_SECTION_RENDERERS.category_grid).toBeNull()
    expect(HOME_SECTION_RENDERERS.collection_feature).toBeNull()
  })

  it('tipo sem renderer é pulado e NÃO quebra a página', () => {
    renderHome([
      secao('hero', { position: 1 }),
      { id: 'p3', type: 'product_carousel', position: 2, active: true, config: {} },
      secao('newsletter', { position: 3 }),
    ])

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
  })

  it('tipo desconhecido (gravado por versão mais nova) também é pulado', () => {
    renderHome([
      secao('hero', { position: 1 }),
      { id: 'x', type: 'bloco_do_futuro' as never, position: 2, active: true, config: {} },
    ])

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})

describe('HomeRenderer — seção inativa não produz NADA (HOME-03)', () => {
  it('a seção desligada não desenha nem moldura, nem espaçamento, nem título', () => {
    const { container } = renderHome([secao('newsletter', { active: false })])

    expect(screen.queryByRole('heading', { name: 'Quer saber das novidades?' })).toBeNull()
    // Um invólucro vazio por seção desligada seria espaçamento fantasma no meio da página.
    const raiz = container.firstElementChild!
    expect(raiz.childElementCount).toBe(0)
  })

  it('desligar uma seção não desloca as vizinhas', () => {
    renderHome([
      secao('hero', { position: 1 }),
      secao('trending_tags', { position: 2, active: false }),
      secao('newsletter', { position: 3 }),
    ])

    expect(screen.queryByRole('heading', { name: 'Explore por tema' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quer saber das novidades?' })).toBeInTheDocument()
  })
})

describe('HomeRenderer — o aninhamento da faixa institucional', () => {
  const tituloDaFaixa = 'Cada joia é uma memória eternizada à mão'

  const posicaoDaFaixa = () => {
    const faixa = screen.getByRole('heading', { name: tituloDaFaixa })
    return screen
      .getAllByRole('heading', { name: /^Coleção \d$/ })
      .filter(h => h.compareDocumentPosition(faixa) & Node.DOCUMENT_POSITION_FOLLOWING).length
  }

  it('com fileiras antes dela, a faixa entra DENTRO, depois da fileira que ela declara', () => {
    renderHome([secao('collection_rows', { position: 1 }), secao('brand_statement', { position: 2 })])

    expect(posicaoDaFaixa()).toBe(1)
  })

  it('a faixa não é desenhada duas vezes', () => {
    renderHome([secao('collection_rows', { position: 1 }), secao('brand_statement', { position: 2 })])

    expect(screen.getAllByRole('heading', { name: tituloDaFaixa })).toHaveLength(1)
  })

  it('sem fileiras antes dela, a faixa renderiza SOZINHA, no próprio lugar', () => {
    // Uma Home reordenada não pode engolir conteúdo em silêncio: a faixa é texto de marca.
    renderHome([secao('hero', { position: 1 }), secao('brand_statement', { position: 2 })])

    const faixa = screen.getByRole('heading', { name: tituloDaFaixa })
    const hero = screen.getByRole('heading', { level: 1 })
    expect(hero.compareDocumentPosition(faixa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('com o catálogo vazio as fileiras não renderizam, e a faixa aparece sozinha', () => {
    // Estado real da loja depois de um `db reset`, antes do importador.
    const antes = categorias.data
    categorias.data = []

    renderHome([secao('collection_rows', { position: 1 }), secao('brand_statement', { position: 2 })])

    expect(screen.getByRole('heading', { name: tituloDaFaixa })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { name: /^Coleção \d$/ })).toHaveLength(0)

    categorias.data = antes
  })
})

describe('HomeRenderer — a derivação de hoje continua valendo (HOME-25, HOME-31)', () => {
  it('quem virou fileira sai da grade de banners: a mesma arte não aparece duas vezes', () => {
    const antes = categorias.data
    categorias.data = [
      categoria('colecao-1', 'Coleção 1', 1, { banner_url: 'https://cdn.test/c1.webp' }),
      categoria('campanha', 'Campanha', 9, { banner_url: 'https://cdn.test/campanha.webp' }),
    ]

    // Uma fileira só: com as duas raízes virando fileira, as duas sairiam da grade e o teste não
    // distinguiria "excluída" de "grade vazia".
    const { container } = renderHome([
      secao('banner_grid', { position: 1 }),
      secao('collection_rows', { position: 2, config: { limit: 1 } }),
    ])

    // A grade é a primeira seção da página. A busca é dentro dela, e não na página inteira: a
    // fileira de `Coleção 1` abre com o MESMO banner, e é justamente essa repetição que o
    // `exclude` existe para evitar — medi-la em `screen` acharia as duas e provaria nada.
    const grade = container.querySelectorAll('section')[0]
    expect([...grade.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(['/campanha'])

    categorias.data = antes
  })
})
