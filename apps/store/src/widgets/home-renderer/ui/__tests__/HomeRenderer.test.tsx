import { describe, it, expect, vi, beforeEach } from 'vitest'
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
const { categorias, produtos, escolhidos } = vi.hoisted(() => ({
  categorias: { data: [] as any[] },
  produtos: { data: [] as any[] },
  escolhidos: { porId: {} as Record<string, any> },
}))

vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => categorias }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => produtos }))
vi.mock('@/entities/product/api/useProductsByIds', () => ({
  useProductsByIds: (ids: readonly string[]) => ({
    data: ids.map(id => escolhidos.porId[id]).filter(Boolean),
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: any) => <div data-testid="produto">{product.name}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, max_installments: 6 }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
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

  it('a Lista de categorias GANHOU desenho na feature 64 — e nenhum tipo do catálogo ficou sem', () => {
    // **Esta asserção foi VIRADA duas vezes, nunca apagada.** Ela dizia que `product_carousel` e
    // `category_grid` não tinham desenho; a feature 50 virou o primeiro e a 64 o segundo. O que ela
    // mede agora é a ausência de qualquer `null` no registro — um tipo novo que entre no catálogo
    // sem tela reprova aqui, e quem o acrescentar decide de propósito.
    expect(HOME_SECTION_RENDERERS.category_grid).not.toBeNull()
    expect(
      Object.entries(HOME_SECTION_RENDERERS)
        .filter(([, renderer]) => renderer === null)
        .map(([tipo]) => tipo),
    ).toEqual([])
  })

  it('Produtos em destaque GANHOU desenho na feature 50 (DST-04)', () => {
    expect(HOME_SECTION_RENDERERS.product_carousel).not.toBeNull()
  })

  it('o destaque em coleção ganhou desenho na T32 — e é o único dos três que ganhou', () => {
    expect(HOME_SECTION_RENDERERS.collection_feature).not.toBeNull()
  })

  it('tipo sem renderer é pulado e NÃO quebra a página', () => {
    // A fixture era `category_grid`, e a feature 64 deu desenho a ele: com a fixture antiga este caso
    // ficaria verdadeiro nos dois mundos (a seção sem itens não desenha de qualquer jeito). Passou a
    // ser um tipo que o registro NÃO conhece — a linha gravada por uma versão mais nova —, com a
    // asserção de que ele de fato não tem entrada.
    const tipo = 'bloco_de_versao_nova' as never
    expect(HOME_SECTION_RENDERERS[tipo]).toBeUndefined()

    renderHome([
      secao('hero', { position: 1 }),
      { id: 'p3', type: tipo, position: 2, active: true, config: {} },
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

describe('HomeRenderer — banner com destino de PRODUTO (emenda E5)', () => {
  /** Um banner curado apontando para um produto. O slug vem embutido na leitura. */
  const comProduto = (product_slug: string | null): HomeSection =>
    secao('banner_grid', {
      position: 1,
      config: { layout: 'single' },
      items: [
        {
          id: 'i1',
          section_id: 'banner_grid',
          position: 1,
          category_id: null,
          product_id: 'prod-1',
          product_slug,
          href: null,
          image_url: 'https://cdn.test/campanha.webp',
          alt: 'Pingente com leite materno',
          label_snapshot: 'Pingente Gota',
        },
      ],
    })

  it('renderiza o banner no caminho canônico do produto — não some da loja', () => {
    // Sem isto, a dona gravaria no painel um banner que NUNCA apareceria, e nada acusaria: era o
    // `SPEC_DEVIATION` da Fase 3, e a emenda `E5` deu dono a ele nesta task.
    const { container } = renderHome([comProduto('pingente-gota')])

    const grade = container.querySelectorAll('section')[0]
    expect(grade.querySelector('a')).toHaveAttribute('href', '/produtos/pingente-gota')
    expect(grade.querySelector('img')).toHaveAttribute('alt', 'Pingente com leite materno')
    expect(grade.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/campanha.webp')
  })

  it('produto despublicado não vem com slug, e o banner SAI DE CENA — nunca link para 404', () => {
    // A relação embutida devolve `product: null` quando a RLS não alcança o produto. Todos os
    // escolhidos fora do ar ⇒ a seção inteira não renderiza (`HOME-24`, `HOME-36`).
    const { container } = renderHome([comProduto(null)])

    expect(container.querySelectorAll('section')).toHaveLength(0)
  })
})

/**
 * O bloco **Produtos em destaque** chega à Home — `DST-04`.
 *
 * **Quem monta a árvore é a página, nunca o teste.** Provar que `FeaturedProducts` desenha uma lista
 * é provar o widget; provar que a Home o desenha exige renderizar o `HomeRenderer` de verdade com
 * uma seção `product_carousel` — senão apagar a linha do registro deixa a suíte verde e o bloco some
 * da loja inteira. É a lição que a feature 44 pagou com uma entrega reprovada.
 */
describe('HomeRenderer — Produtos em destaque (DST-04)', () => {
  const comPecas = (ids: string[], over: any = {}): HomeSection =>
    ({
      id: 'destaque',
      type: 'product_carousel',
      position: 1,
      active: true,
      config: { title: 'Peças escolhidas' },
      items: ids.map((id, i) => ({
        id: `item-${id}`,
        section_id: 'destaque',
        position: i,
        category_id: null,
        product_id: id,
        product_slug: `peca-${id}`,
        href: null,
        image_url: null,
        image_mobile_url: null,
        alt: null,
        label_snapshot: null,
      })),
      ...over,
    }) as HomeSection

  beforeEach(() => {
    escolhidos.porId = {
      p1: { id: 'p1', name: 'Pingente de cinzas', images: [] },
      p2: { id: 'p2', name: 'Colar de leite materno', images: [] },
    }
  })

  it('a seção ativa com peças DESENHA o bloco, pela página de verdade', () => {
    renderHome([comPecas(['p1', 'p2'])])

    expect(screen.getByRole('heading', { name: 'Peças escolhidas' })).toBeInTheDocument()
    expect(screen.getAllByTestId('produto').map(n => n.textContent)).toEqual([
      'Pingente de cinzas',
      'Colar de leite materno',
    ])
  })

  it('a ordem desenhada é a da DONA, não a da resposta', () => {
    renderHome([comPecas(['p2', 'p1'])])

    expect(screen.getAllByTestId('produto').map(n => n.textContent)).toEqual([
      'Colar de leite materno',
      'Pingente de cinzas',
    ])
  })

  it('seção sem item não desenha moldura nem espaçamento', () => {
    // `HOME-03`: seção que não renderiza não produz NADA. Um `<section>` vazio seria uma faixa de
    // `py-12` no meio da Home, e ninguém saberia de onde veio.
    const { container } = renderHome([comPecas([])])
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('seção desligada não desenha, mesmo com peças escolhidas', () => {
    const { container } = renderHome([comPecas(['p1'], { active: false })])
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('dois blocos na mesma Home desenham os dois, cada um com a sua curadoria', () => {
    renderHome([
      { ...comPecas(['p1']), id: 'd1', config: { title: 'Primeiro bloco' } } as HomeSection,
      { ...comPecas(['p2']), id: 'd2', position: 2, config: { title: 'Segundo bloco' } } as HomeSection,
    ])

    expect(screen.getByRole('heading', { name: 'Primeiro bloco' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Segundo bloco' })).toBeInTheDocument()
    expect(screen.getAllByTestId('produto')).toHaveLength(2)
  })
})

/**
 * A **Lista de categorias** chega à Home — `LCT-01`, `LCT-11`, `LCT-12`.
 *
 * Pela página de verdade: o `HomeRenderer` resolve a seção (com `categoryListItem` em `core`) e o
 * registro desenha. Apagar a entrada do registro, ou o pós-processamento da resolução, reprova aqui.
 */
describe('HomeRenderer — Lista de categorias (LCT-01)', () => {
  const STORAGE = 'https://proj.supabase.co/storage/v1/object/public/home-images/'

  const lista = (itens: Array<{ category_id: string | null; title?: string | null }>, over: any = {}) =>
    ({
      id: 'lista',
      type: 'category_grid',
      position: 2,
      active: true,
      config: { title: 'Escolha pelo material' },
      items: itens.map((it, i) => ({
        id: `circulo-${i}`,
        section_id: 'lista',
        position: i,
        category_id: it.category_id,
        product_id: null,
        product_slug: null,
        href: null,
        image_url: `${STORAGE}c${i}.png`,
        image_mobile_url: null,
        alt: null,
        title: it.title ?? null,
        label_snapshot: it.category_id ? null : 'Coleção apagada',
      })),
      ...over,
    }) as HomeSection

  it('a seção ativa DESENHA os círculos, na posição dela e na ordem da dona', () => {
    renderHome([
      secao('hero', { position: 1 }),
      lista([{ category_id: 'colecao-2', title: 'Leite materno' }, { category_id: 'colecao-1' }]),
      secao('newsletter', { position: 3 }),
    ])

    const nav = screen.getByRole('navigation', { name: 'Categorias' })
    const links = Array.from(nav.querySelectorAll('a'))
    // O título vence; sem título, o nome ATUAL da coleção.
    expect(links.map(a => a.textContent)).toEqual(['Leite materno', 'Coleção 1'])
    expect(links.map(a => a.getAttribute('href'))).toEqual(['/colecao-2', '/colecao-1'])

    // Na posição da seção: depois do hero, antes da newsletter.
    const hero = screen.getByRole('heading', { level: 1 })
    const news = screen.getByRole('heading', { name: 'Quer saber das novidades?' })
    expect(hero.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(nav.compareDocumentPosition(news) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a coleção órfã é pulada e só ela (LCT-12)', () => {
    renderHome([lista([{ category_id: null }, { category_id: 'colecao-3' }])])

    const links = Array.from(
      screen.getByRole('navigation', { name: 'Categorias' }).querySelectorAll('a'),
    )
    expect(links.map(a => a.textContent)).toEqual(['Coleção 3'])
  })

  it('a coleção DESATIVADA também é pulada na loja, e só ela (LCT-12)', () => {
    const antes = categorias.data
    categorias.data = antes.map(c => (c.id === 'colecao-1' ? { ...c, active: false } : c))
    try {
      renderHome([lista([{ category_id: 'colecao-1' }, { category_id: 'colecao-2' }])])
      const links = Array.from(
        screen.getByRole('navigation', { name: 'Categorias' }).querySelectorAll('a'),
      )
      expect(links.map(a => a.textContent)).toEqual(['Coleção 2'])
    } finally {
      categorias.data = antes
    }
  })

  it('sem item resolvido a seção não desenha NADA — nem o título (LCT-11)', () => {
    const { container } = renderHome([lista([{ category_id: null }])])
    expect(container.querySelectorAll('section')).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Escolha pelo material' })).toBeNull()

    const vazia = renderHome([lista([])])
    expect(vazia.container.querySelectorAll('section')).toHaveLength(0)
  })

  it('a arte é a ENVIADA, nunca o `banner_url` da coleção', () => {
    const antes = categorias.data
    categorias.data = antes.map(c => ({ ...c, banner_url: 'https://cdn.test/banner-largo.webp' }))
    try {
      const { container } = renderHome([lista([{ category_id: 'colecao-1' }])])
      const img = container.querySelector('nav[aria-label="Categorias"] img')!
      expect(img.getAttribute('src')).toContain('/home-images/c0.png')
      expect(img.getAttribute('src')).not.toContain('banner-largo')
    } finally {
      categorias.data = antes
    }
  })
})
