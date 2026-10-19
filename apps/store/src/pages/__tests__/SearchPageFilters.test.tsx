import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Category, Product } from '@estrelinha/supabase/types'

/**
 * Feature 66 — os filtros curados NA PÁGINA REAL da busca (FLT-39..41).
 *
 * A base é o resultado da busca, não o catálogo: valor que só existe em peça que o termo não
 * encontra não aparece. O catálogo passa pelo `useFilterCatalog` real, sobre um dublê que só
 * responde à tabela e ao `select` certos.
 */
const { produtosMock, categoriasMock, catalogoResposta } = vi.hoisted(() => ({
  produtosMock: vi.fn(),
  categoriasMock: vi.fn(),
  catalogoResposta: { atual: null as null | { data: unknown; error: unknown } },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: (colunas: string) =>
        Promise.resolve(
          tabela === 'filter_groups' &&
            colunas === 'id, name, slug, is_active, sort_order, filter_values(id, group_id, name, slug, sort_order)'
            ? catalogoResposta.atual
            : { data: null, error: { message: `dublê não conhece ${tabela}` } },
        ),
    }),
  },
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useAllProducts: produtosMock }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: categoriasMock }))
vi.mock('@/entities/product/ui/ProductCard', () => ({
  // Feature 67: o dublê expõe a `matchedVariant` que a PÁGINA passou — é a fiação de VFL-17.
  default: ({ product, matchedVariant }: { product: Product; matchedVariant?: { id: string } | null }) => (
    <article data-testid="product-card" data-variant={matchedVariant?.id ?? ''}>
      {product.name}
    </article>
  ),
}))

import SearchPage from '../SearchPage'

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
    category_links: [{ category_id: 'c-ping', position: 0 }],
    stock_total: 3,
    low_stock_threshold: 1,
    is_new: false,
    is_featured: false,
    tags: [],
    filter_value_ids,
  }) as Product

const CATALOGO = [
  {
    id: 'g-acab',
    name: 'Acabamento',
    slug: 'acabamento',
    is_active: true,
    sort_order: 0,
    filter_values: [
      { id: 'v-prata', group_id: 'g-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
      { id: 'v-ouro', group_id: 'g-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 1 },
    ],
  },
  {
    id: 'g-tipo',
    name: 'Tipo de joia',
    slug: 'tipo',
    is_active: true,
    sort_order: 1,
    filter_values: [
      { id: 'v-pingente', group_id: 'g-tipo', name: 'Pingente', slug: 'pingente', sort_order: 0 },
      { id: 'v-anel', group_id: 'g-tipo', name: 'Anel', slug: 'anel', sort_order: 1 },
    ],
  },
]

// "Anel" só existe numa peça que o termo "pingente" não encontra.
const PRODUTOS = [
  produto('p1', 'Pingente estrela', 100, ['v-prata', 'v-pingente']),
  produto('p2', 'Pingente coração', 150, ['v-ouro', 'v-pingente']),
  // Fora da categoria "Pingentes" — senão a busca o acharia pelo nome da categoria.
  { ...produto('p3', 'Anel de prata', 120, ['v-prata', 'v-anel']), category_id: 'c-aneis', category_slug: 'aneis', category_links: [] },
]


/**
 * Feature 67 — a página REAL passa ao card a variação pela qual a peça passou (VFL-12, VFL-16,
 * VFL-17). A peça nova vende prata e ouro, e só as OPÇÕES estão marcadas — a peça toda não carrega
 * acabamento nenhum. O dublê do card expõe a `matchedVariant` que recebeu.
 */
const linha = (id: string, cor: string, price: number, position: number) => ({
  id, product_id: 'p5', option_values: { Cor: cor }, name: null, sku: null, price, compare_price: null,
  stock: 3, weight_kg: null, image_url: null, is_active: true, position, nuvemshop_id: null,
})
const DUAS_CORES = {
  ...produto('p5', 'Pingente duas cores', 100, []),
  options: [{ name: 'Cor', values: ['Folheado a Ouro', 'Prata 925'], position: 0 }],
  variants: [linha('p5-ouro', 'Folheado a Ouro', 120, 0), linha('p5-prata', 'Prata 925', 140, 1)],
  option_marks: [
    { option_name: 'Cor', option_value: 'Prata 925', value_id: 'v-prata' },
    { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'v-ouro' },
  ],
} as Product
const variantes = () =>
  Object.fromEntries(screen.queryAllByTestId('product-card').map(c => [c.textContent, c.getAttribute('data-variant')]))

// A categoria das peças ESCONDE o Acabamento — e a busca não se importa (FLT-41).
const CATEGORIAS = [
  {
    id: 'c-ping',
    name: 'Pingentes',
    slug: 'pingentes',
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
    hidden_filter_group_ids: ['g-acab'],
  } as Category,
]

const UrlProbe = () => {
  const loc = useLocation()
  return <span data-testid="url">{`${loc.pathname}${loc.search}`}</span>
}
const busca = () => new URLSearchParams((screen.getByTestId('url').textContent ?? '').split('?')[1] ?? '')

const montar = (entrada: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[entrada]}>
        <UrlProbe />
        <Routes>
          <Route path="/busca" element={<SearchPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const sidebar = () => screen.getByRole('complementary', { name: 'Filtros da busca' })
const cards = () => screen.queryAllByTestId('product-card').map(c => c.textContent)
const legendas = (raiz: HTMLElement) => Array.from(raiz.querySelectorAll('h4')).map(h => h.textContent)
const comCatalogo = async () => {
  await waitFor(() => expect(within(sidebar()).getByRole('heading', { name: 'Acabamento' })).toBeInTheDocument())
}

beforeEach(() => {
  catalogoResposta.atual = { data: CATALOGO, error: null }
  produtosMock.mockReturnValue({ data: PRODUTOS })
  categoriasMock.mockReturnValue({ data: CATEGORIAS })
})

describe('os blocos na busca (FLT-39)', () => {
  it('sidebar: os mesmos blocos da categoria, entre preço e disponibilidade', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    expect(legendas(sidebar())).toEqual(['Faixa de preço', 'Acabamento', 'Tipo de joia', 'Disponibilidade'])
  })

  it('sheet do celular: os mesmos blocos', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))
    expect(legendas(screen.getByRole('dialog'))).toEqual([
      'Faixa de preço',
      'Acabamento',
      'Tipo de joia',
      'Disponibilidade',
    ])
  })

  it('a base é o RESULTADO da busca: "Anel" não aparece, e as contagens contam só o resultado', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    const tipo = within(sidebar()).getByRole('region', { name: 'Tipo de joia' })
    expect(within(tipo).getAllByRole('button').map(b => b.textContent)).toEqual(['Pingente (2)'])
    const acab = within(sidebar()).getByRole('region', { name: 'Acabamento' })
    expect(within(acab).getAllByRole('button').map(b => b.textContent)).toEqual([
      'Prata 925 (1)',
      'Folheado a ouro (1)',
    ])
  })

  it('marcar um valor filtra os resultados e o contador acompanha', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Folheado a ouro (1)' }))
    expect(cards()).toEqual(['Pingente coração'])
    expect(screen.getByText('1 resultado para "pingente"')).toBeInTheDocument()
  })

  it('o vazio de filtro tem "Limpar filtros", e ele devolve o resultado inteiro', async () => {
    montar('/busca?q=pingente&preco=100-110&acabamento=ouro')
    await comCatalogo()
    expect(screen.getByText('Nenhuma joia com esses filtros.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(cards()).toHaveLength(2)
    expect(busca().toString()).toBe('q=pingente')
  })

  it('sem termo, não há painel de filtros', async () => {
    montar('/busca')
    expect(screen.queryByRole('complementary', { name: 'Filtros da busca' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Filtros/ })).not.toBeInTheDocument()
  })
})

describe('a URL da busca (FLT-40)', () => {
  it('filtrar MANTÉM o `q` e acrescenta o filtro', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Prata 925 (1)' }))
    expect(busca().get('q')).toBe('pingente')
    expect(busca().get('acabamento')).toBe('prata-925')
    expect(cards()).toEqual(['Pingente estrela'])
  })

  it('a busca nasce da URL com o filtro aplicado', async () => {
    montar('/busca?q=pingente&acabamento=prata-925')
    await comCatalogo()
    expect(cards()).toEqual(['Pingente estrela'])
    expect(screen.getByRole('button', { name: /Prata 925.*Remover filtro/ })).toBeInTheDocument()
  })

  it('termo novo zera os filtros (base nova), mantendo a ordem e o que não é filtro', async () => {
    montar('/busca?q=pingente&acabamento=prata-925&ordem=menor-preco&utm_source=instagram')
    await comCatalogo()
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar joias' }), { target: { value: 'anel' } })
    const p = busca()
    expect(p.get('q')).toBe('anel')
    expect(p.get('acabamento')).toBeNull()
    expect(p.get('ordem')).toBe('menor-preco')
    expect(p.get('utm_source')).toBe('instagram')
  })
})

describe('sem esconder por categoria (FLT-41)', () => {
  it('o grupo escondido na categoria das peças aparece na busca e filtra', async () => {
    montar('/busca?q=pingente&acabamento=ouro')
    await comCatalogo()
    expect(within(sidebar()).getByRole('heading', { name: 'Acabamento' })).toBeInTheDocument()
    expect(cards()).toEqual(['Pingente coração'])
  })
})

describe('feature 67 — a busca abre o card na variação que casou, pela mesma regra (VFL-17)', () => {
  beforeEach(() => {
    produtosMock.mockReturnValue({ data: [...PRODUTOS, DUAS_CORES] })
  })

  it('sem filtro, nenhum card recebe variação', async () => {
    montar('/busca?q=pingente')
    await comCatalogo()
    expect(variantes()).toEqual({ 'Pingente estrela': '', 'Pingente coração': '', 'Pingente duas cores': '' })
  })

  it('com Folheado a ouro, a peça da opção recebe a linha do ouro', async () => {
    montar('/busca?q=pingente&acabamento=ouro')
    await comCatalogo()
    expect(variantes()).toEqual({ 'Pingente coração': '', 'Pingente duas cores': 'p5-ouro' })
  })

  it('tirar o filtro pelo chip devolve o card de hoje', async () => {
    montar('/busca?q=pingente&acabamento=ouro')
    await comCatalogo()
    fireEvent.click(screen.getByRole('button', { name: /Folheado a ouro.*Remover filtro/ }))
    expect(variantes()['Pingente duas cores']).toBe('')
  })
})
