import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Category, Product } from '@estrelinha/supabase/types'

/**
 * Feature 66 — os filtros curados NA PÁGINA REAL da categoria (FLT-21..34).
 *
 * Quem monta a árvore é a `CategoryPage` de verdade: um teste que montasse o painel ao lado de uma
 * lista provaria o painel e não a fiação. O catálogo passa pelo `useFilterCatalog` REAL, sobre um
 * dublê do Supabase que só responde à tabela e ao `select` certos — se a página lesse outra coisa,
 * os blocos não apareceriam.
 */
const { useCategoriesMock, useProductsMock, catalogoResposta } = vi.hoisted(() => ({
  useCategoriesMock: vi.fn(),
  useProductsMock: vi.fn(),
  catalogoResposta: { atual: null as null | { data: unknown; error: unknown } },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: (colunas: string) => {
        if (
          tabela === 'filter_groups' &&
          colunas === 'id, name, slug, is_active, sort_order, filter_values(id, group_id, name, slug, sort_order)'
        ) {
          return Promise.resolve(catalogoResposta.atual)
        }
        return Promise.resolve({ data: null, error: { message: `dublê não conhece ${tabela}` } })
      },
    }),
  },
}))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: useCategoriesMock }))
vi.mock('@/entities/category/api/useCategoryRedirect', () => ({
  useCategoryRedirect: () => ({ data: undefined, isFetching: false }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: useProductsMock }))
/** O card vira dublê — o de verdade pede settings, carrinho e favoritos que nada têm a ver aqui. */
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: { product: Product }) => <article data-testid="product-card">{product.name}</article>,
}))

import CategoryPage from '../CategoryPage'

const cat = (over: Partial<Category>): Category =>
  ({
    id: 'c',
    name: 'C',
    slug: 'c',
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    icon: null,
    parent_id: null,
    sort_order: 0,
    active: true,
    menu_desktop: false,
    menu_mobile: false,
    menu_banners: null,
    hidden_filter_group_ids: [],
    ...over,
  }) as Category

const produto = (id: string, name: string, price: number, filter_value_ids: string[]): Product =>
  ({
    id,
    name,
    slug: id,
    price,
    compare_price: null,
    category_id: 'c-ping',
    category_slug: 'pingentes',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [],
    stock_total: 3,
    low_stock_threshold: 1,
    is_new: false,
    is_featured: false,
    tags: [],
    filter_value_ids,
  }) as Product

/** Dois grupos com valores que DIVERGEM entre os produtos (`L-013`), mais um grupo com 10 valores. */
const LINHAS_DO_CATALOGO = [
  {
    id: 'g-acab',
    name: 'Acabamento',
    slug: 'acabamento',
    is_active: true,
    sort_order: 1,
    filter_values: [
      { id: 'v-prata', group_id: 'g-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
      { id: 'v-ouro', group_id: 'g-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 1 },
      { id: 'v-rose', group_id: 'g-acab', name: 'Rosé', slug: 'rose', sort_order: 2 },
    ],
  },
  {
    id: 'g-quem',
    name: 'Para quem',
    slug: 'para-quem',
    is_active: true,
    sort_order: 0,
    filter_values: [
      { id: 'v-mae', group_id: 'g-quem', name: 'Mãe', slug: 'mae', sort_order: 0 },
      { id: 'v-pet', group_id: 'g-quem', name: 'Pet', slug: 'pet', sort_order: 1 },
    ],
  },
  {
    id: 'g-letra',
    name: 'Letra',
    slug: 'letra',
    is_active: true,
    sort_order: 2,
    filter_values: 'ABCDEFGHIJ'.split('').map((l, i) => ({
      id: `v-${l}`,
      group_id: 'g-letra',
      name: `Letra ${l}`,
      slug: l.toLowerCase(),
      sort_order: i,
    })),
  },
]

const LETRAS = 'ABCDEFGHIJ'.split('').map(l => `v-${l}`)
const PRODUTOS = [
  produto('p1', 'Pingente prata mãe', 100, ['v-prata', 'v-mae', ...LETRAS]),
  produto('p2', 'Pingente ouro mãe', 200, ['v-ouro', 'v-mae']),
  produto('p3', 'Pingente prata pet', 150, ['v-prata', 'v-pet']),
  produto('p4', 'Pingente ouro pet', 180, ['v-ouro', 'v-pet']),
]

const TREE = [
  cat({ id: 'c-ping', slug: 'pingentes', name: 'Pingentes' }),
  cat({ id: 'c-chav', slug: 'chaveiros', name: 'Chaveiros', hidden_filter_group_ids: ['g-acab'] }),
  cat({ id: 'c-filha', slug: 'chaveiro-pet', name: 'Chaveiro pet', parent_id: 'c-chav' }),
]

let navegar: ReturnType<typeof useNavigate>
const UrlProbe = () => {
  const loc = useLocation()
  navegar = useNavigate()
  return <span data-testid="url">{`${loc.pathname}${loc.search}`}</span>
}
const url = () => screen.getByTestId('url').textContent ?? ''
const busca = () => new URLSearchParams(url().split('?')[1] ?? '')

const renderAt = (entries: string[]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
        <UrlProbe />
        <Routes>
          <Route path="/" element={<p>pagina:home</p>} />
          <Route path="/:slug" element={<CategoryPage />} />
          <Route path="/:parentSlug/:slug" element={<CategoryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const sidebar = () => document.querySelector('aside') as HTMLElement
const cards = () => screen.queryAllByTestId('product-card').map(c => c.textContent)
const legendas = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll('h4')).map(h => h.textContent)
/** Espera o catálogo chegar: o bloco "Para quem" aparece na sidebar. */
const comCatalogo = async () => {
  await waitFor(() => expect(within(sidebar()).getByRole('heading', { name: 'Para quem' })).toBeInTheDocument())
}
const abrirSheet = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
  return screen.getByRole('dialog')
}

beforeEach(() => {
  catalogoResposta.atual = { data: LINHAS_DO_CATALOGO, error: null }
  useCategoriesMock.mockReset()
  useProductsMock.mockReset()
  useCategoriesMock.mockReturnValue({ data: TREE, isFetching: false })
  useProductsMock.mockReturnValue({ data: PRODUTOS, isError: false, isLoading: false })
})

afterEach(() => {
  for (const link of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) link.remove()
})

describe('os blocos na sidebar e no sheet (FLT-21, FLT-22)', () => {
  it('sidebar: um bloco por grupo, entre "Faixa de preço" e "Disponibilidade", na ordem do painel', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    expect(legendas(sidebar())).toEqual([
      'Faixa de preço',
      'Para quem',
      'Acabamento',
      'Letra',
      'Disponibilidade',
    ])
  })

  it('sheet: os mesmos blocos, na mesma posição', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    expect(legendas(abrirSheet())).toEqual([
      'Faixa de preço',
      'Para quem',
      'Acabamento',
      'Letra',
      'Disponibilidade',
    ])
  })

  it('sidebar: cada valor com a contagem entre parênteses — e o valor sem produto (Rosé) não aparece', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const bloco = within(sidebar()).getByRole('region', { name: 'Acabamento' })
    expect(within(bloco).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Prata 925 (2)',
      'Folheado a ouro (2)',
    ])
  })

  it('sheet: a mesma contagem', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const bloco = within(abrirSheet()).getByRole('region', { name: 'Para quem' })
    expect(within(bloco).getAllByRole('button').map(b => b.textContent)).toEqual(['Mãe (2)', 'Pet (2)'])
  })
})

describe('quem passa (FLT-23)', () => {
  it('marcar um valor filtra a grade e marca o chip', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Prata 925 (2)' }))
    expect(cards()).toEqual(['Pingente prata mãe', 'Pingente prata pet'])
    expect(within(sidebar()).getByRole('button', { name: /^Prata 925 \(2\)/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('dois valores do mesmo grupo são OU; de grupos diferentes, E', async () => {
    renderAt(['/pingentes?acabamento=prata-925,ouro'])
    await comCatalogo()
    expect(cards()).toHaveLength(4)
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Pet (2)' }))
    expect(cards()).toEqual(['Pingente prata pet', 'Pingente ouro pet'])
  })

  it('o sheet escreve no mesmo estado: marcar lá filtra a grade atrás do véu', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    fireEvent.click(within(abrirSheet()).getByRole('button', { name: 'Folheado a ouro (2)' }))
    expect(cards()).toEqual(['Pingente ouro mãe', 'Pingente ouro pet'])
    expect(screen.getByRole('button', { name: 'Ver 2 produtos' })).toBeInTheDocument()
  })
})

describe('valor zerado pela seleção (FLT-24)', () => {
  it('sidebar: aparece desabilitado com (0)', async () => {
    renderAt(['/pingentes?acabamento=prata-925&para-quem=pet'])
    await comCatalogo()
    // Letra A só está no p1 (prata, mãe): com "Pet" marcado, zera.
    const letra = within(sidebar()).getByRole('button', { name: 'Letra A (0)' })
    expect(letra).toBeDisabled()
  })

  it('sheet: desabilitado com (0) — e o marcado nunca é desabilitado', async () => {
    renderAt(['/pingentes?para-quem=mae&acabamento=ouro&letra=a'])
    await comCatalogo()
    const sheet = abrirSheet()
    // "Letra A" está marcada e zerou (o p1 não é de ouro): fica tocável.
    expect(within(sheet).getByRole('button', { name: /^Letra A \(0\)/ })).not.toBeDisabled()
    expect(within(sheet).getByRole('button', { name: /^Letra A \(0\)/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('chips acima da grade e "Limpar" (FLT-25)', () => {
  it('cada valor marcado vira um chip removível com o nome do valor', async () => {
    renderAt(['/pingentes?acabamento=prata-925&para-quem=mae'])
    await comCatalogo()
    const remover = screen.getAllByRole('button', { name: /Remover filtro/ })
    expect(remover.map(b => b.textContent?.replace('✕', '').replace('Remover filtro', '').trim())).toEqual([
      'Mãe',
      'Prata 925',
    ])
    fireEvent.click(remover[1])
    expect(busca().get('acabamento')).toBeNull()
    expect(busca().get('para-quem')).toBe('mae')
    expect(cards()).toEqual(['Pingente prata mãe', 'Pingente ouro mãe'])
  })

  it('o contador do botão "Filtros" do celular conta os valores marcados', async () => {
    renderAt(['/pingentes?acabamento=prata-925&para-quem=mae'])
    await comCatalogo()
    expect(screen.getByRole('button', { name: /^Filtros/ })).toHaveTextContent('Filtros2')
  })

  it('"Limpar" da sidebar desmarca tudo e a URL volta sem parâmetro de filtro', async () => {
    renderAt(['/pingentes?acabamento=prata-925&estoque=1&ordem=menor-preco'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Limpar' }))
    expect(cards()).toHaveLength(4)
    // A ordem não é filtro: fica.
    expect(url()).toBe('/pingentes?ordem=menor-preco')
  })

  it('"Limpar tudo" do sheet desmarca os valores', async () => {
    renderAt(['/pingentes?para-quem=pet'])
    await comCatalogo()
    fireEvent.click(within(abrirSheet()).getByRole('button', { name: 'Limpar tudo' }))
    expect(url()).toBe('/pingentes')
    expect(cards()).toHaveLength(4)
  })

  it('o vazio de filtro tem "Limpar filtros", e ele desmarca os valores', async () => {
    renderAt(['/pingentes?para-quem=pet&letra=a'])
    await comCatalogo()
    expect(screen.getByText('Nenhuma joia com esses filtros.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(url()).toBe('/pingentes')
    expect(cards()).toHaveLength(4)
  })
})

describe('o catálogo que não carrega (FLT-26)', () => {
  it('a categoria abre com os filtros de sistema, sem bloco curado e sem erro na tela', async () => {
    catalogoResposta.atual = { data: null, error: { message: 'rede' } }
    renderAt(['/pingentes?acabamento=prata-925'])
    await waitFor(() => expect(cards()).toHaveLength(4))
    expect(legendas(sidebar())).toEqual(['Faixa de preço', 'Disponibilidade'])
    expect(screen.queryByText(/não foi possível/i)).not.toBeInTheDocument()
    // O link continua íntegro: a chave desconhecida para o catálogo vazio é preservada.
    expect(busca().get('acabamento')).toBe('prata-925')
  })
})

describe('"Ver todos (N)" no celular (FLT-27)', () => {
  it('sheet: grupo com mais de 8 valores mostra os 8 primeiros e "Ver todos (10)", que abre o resto', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const bloco = within(abrirSheet()).getByRole('region', { name: 'Letra' })
    const chips = () => within(bloco).getAllByRole('button', { name: /^Letra / })
    expect(chips().map(b => b.textContent)).toEqual([
      'Letra A (1)',
      'Letra B (1)',
      'Letra C (1)',
      'Letra D (1)',
      'Letra E (1)',
      'Letra F (1)',
      'Letra G (1)',
      'Letra H (1)',
    ])
    fireEvent.click(within(bloco).getByRole('button', { name: 'Ver todos (10)' }))
    expect(chips()).toHaveLength(10)
    expect(within(bloco).queryByRole('button', { name: /Ver todos/ })).not.toBeInTheDocument()
  })

  it('sidebar: os 10 valores, sem "Ver todos"', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const bloco = within(sidebar()).getByRole('region', { name: 'Letra' })
    expect(within(bloco).getAllByRole('button')).toHaveLength(10)
  })

  it('sheet: um valor marcado além do 8º abre o bloco — o controle que desfaz o filtro não se esconde', async () => {
    renderAt(['/pingentes?letra=j'])
    await comCatalogo()
    const bloco = within(abrirSheet()).getByRole('region', { name: 'Letra' })
    expect(within(bloco).getByRole('button', { name: /^Letra J/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(bloco).queryByRole('button', { name: /Ver todos/ })).not.toBeInTheDocument()
  })
})

describe('o chip não quebra linha e tem alvo de 44px no sheet (FLT-28)', () => {
  const tokens = (el: HTMLElement) => el.className.split(/\s+/)

  it('sheet: altura própria de 44px (`h-11`) e `whitespace-nowrap`', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const chip = within(abrirSheet()).getByRole('button', { name: 'Prata 925 (2)' })
    expect(tokens(chip)).toContain('h-11')
    expect(tokens(chip)).toContain('whitespace-nowrap')
  })

  it('sidebar: `whitespace-nowrap` também, na densidade do desktop', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const chip = within(sidebar()).getByRole('button', { name: 'Prata 925 (2)' })
    expect(tokens(chip)).toContain('whitespace-nowrap')
    expect(tokens(chip)).not.toContain('h-11')
  })

  it('sheet: "Ver todos" leva o alvo de linha de 44px', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const ver = within(abrirSheet()).getByRole('button', { name: 'Ver todos (10)' })
    expect(tokens(ver)).toContain('before:h-11')
  })
})

describe('o grupo escondido na categoria (FLT-36, FLT-37)', () => {
  it('não aparece na categoria que o escondeu', async () => {
    useProductsMock.mockReturnValue({ data: PRODUTOS, isError: false, isLoading: false })
    renderAt(['/chaveiros'])
    await comCatalogo()
    expect(legendas(sidebar())).toEqual(['Faixa de preço', 'Para quem', 'Letra', 'Disponibilidade'])
  })

  it('pela URL é ignorado: não filtra e não vira chip', async () => {
    renderAt(['/chaveiros?acabamento=prata-925'])
    await comCatalogo()
    expect(cards()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /Remover filtro/ })).not.toBeInTheDocument()
  })

  it('não herda: a subcategoria da que escondeu mostra o grupo', async () => {
    renderAt(['/chaveiros/chaveiro-pet'])
    await comCatalogo()
    expect(within(sidebar()).getByRole('heading', { name: 'Acabamento' })).toBeInTheDocument()
  })
})

describe('o estado na URL (FLT-29..34)', () => {
  it('mudar um filtro escreve a URL (FLT-29)', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Prata 925 (2)' }))
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Folheado a ouro (2)' }))
    fireEvent.click(within(sidebar()).getByRole('switch', { name: 'Em estoque' }))
    expect(url()).toBe('/pingentes?acabamento=prata-925%2Couro&estoque=1')
  })

  it('com `replace`: depois de três toques, um "voltar" sai da categoria (FLT-29)', async () => {
    renderAt(['/', '/pingentes'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Prata 925 (2)' }))
    fireEvent.click(within(sidebar()).getByRole('button', { name: /^Pet/ }))
    fireEvent.click(within(sidebar()).getByRole('button', { name: /^Pet/ }))
    expect(url()).toBe('/pingentes?acabamento=prata-925')
    navegar(-1)
    await waitFor(() => expect(url()).toBe('/'))
  })

  it('a página nasce da URL: valores, preço, estoque e ordem (FLT-30)', async () => {
    renderAt(['/pingentes?acabamento=prata-925&preco=120-190&estoque=1&ordem=maior-preco'])
    await comCatalogo()
    expect(cards()).toEqual(['Pingente prata pet'])
    expect(within(sidebar()).getByRole('switch', { name: 'Em estoque' })).toHaveAttribute('aria-checked', 'true')
    expect(within(sidebar()).getByRole('textbox', { name: /Preço mínimo/ })).toHaveValue('120')
    expect(within(sidebar()).getByRole('textbox', { name: /Preço máximo/ })).toHaveValue('190')
    expect(screen.getAllByRole('combobox', { name: 'Ordenar por' })[0]).toHaveTextContent('Maior preço')
  })

  it('parâmetro desconhecido, valor inexistente e preço fora da faixa são ignorados, sem 404 (FLT-31)', async () => {
    renderAt(['/pingentes?fantasma=1&acabamento=nao-existe&preco=900-1000'])
    await comCatalogo()
    expect(screen.getByRole('heading', { level: 1, name: 'Pingentes' })).toBeInTheDocument()
    expect(cards()).toHaveLength(4)
    expect(screen.queryByRole('button', { name: /Remover filtro/ })).not.toBeInTheDocument()
  })

  it('preço que passa da faixa é recortado a ela (FLT-31)', async () => {
    renderAt(['/pingentes?preco=10-160'])
    await comCatalogo()
    expect(within(sidebar()).getByRole('textbox', { name: /Preço mínimo/ })).toHaveValue('100')
    expect(within(sidebar()).getByRole('textbox', { name: /Preço máximo/ })).toHaveValue('160')
    expect(cards()).toEqual(['Pingente prata mãe', 'Pingente prata pet'])
  })

  // Verificação independente (2026-10-18): o mutante que tratava "um lado intocado" como "faixa
  // intocada" sobrevivia, porque todo caso mexia nas duas pontas. Mexer SÓ no máximo é o caso comum
  // ("até R$ 160"), e tem de chegar à URL — é dela que a página lê o estado.
  it('mexer só no preço máximo filtra e vai para a URL (FLT-29)', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    const maximo = within(sidebar()).getByRole('textbox', { name: /Preço máximo/ })
    fireEvent.change(maximo, { target: { value: '160' } })
    fireEvent.blur(maximo)
    expect(url()).toBe('/pingentes?preco=100-160')
    expect(cards()).toEqual(['Pingente prata mãe', 'Pingente prata pet'])
  })

  it('o estado de volta ao padrão deixa a URL sem parâmetro nenhum (FLT-32)', async () => {
    renderAt(['/pingentes'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Mãe (2)' }))
    expect(url()).toBe('/pingentes?para-quem=mae')
    fireEvent.click(within(sidebar()).getByRole('button', { name: /^Mãe/ }))
    expect(url()).toBe('/pingentes')
  })

  it('a canônica continua sendo a da categoria, sem query (FLT-33)', async () => {
    renderAt(['/pingentes?acabamento=prata-925&utm_source=instagram'])
    await comCatalogo()
    const href = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? ''
    expect(new URL(href).pathname).toBe('/pingentes')
    expect(href).not.toContain('?')
  })

  it('`utm_*`, `gclid` e `fbclid` são preservados ao filtrar (FLT-34)', async () => {
    renderAt(['/pingentes?utm_source=instagram&utm_campaign=maes&gclid=abc&fbclid=xyz'])
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Pet (2)' }))
    const p = busca()
    expect(p.get('utm_source')).toBe('instagram')
    expect(p.get('utm_campaign')).toBe('maes')
    expect(p.get('gclid')).toBe('abc')
    expect(p.get('fbclid')).toBe('xyz')
    expect(p.get('para-quem')).toBe('pet')
  })
})
