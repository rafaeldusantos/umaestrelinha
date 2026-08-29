import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Category, Product } from '@estrelinha/supabase/types'
import { PRODUCTS_PER_PAGE } from '@/shared/lib/useInfiniteWindow'

/**
 * `URL-03` e `URL-04` — a categoria passa a morar na raiz do domínio (`AD-018`).
 *
 * O que se mede aqui é o que a cliente vê: a URL final na barra, o que renderiza, a tag canônica no
 * `<head>` e se a consulta de catálogo chegou a sair. Provar que o hook foi chamado não prova nada
 * disso.
 */
const { useCategoriesMock, useProductsMock, useCategoryRedirectMock } = vi.hoisted(() => ({
  useCategoriesMock: vi.fn(),
  useProductsMock: vi.fn(),
  useCategoryRedirectMock: vi.fn(),
}))

vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: useCategoriesMock }))
vi.mock('@/entities/category/api/useCategoryRedirect', () => ({
  useCategoryRedirect: useCategoryRedirectMock,
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: useProductsMock }))

/**
 * O card vira dublê: o de verdade fala com `usePaymentSettings`, `useCategories`, os stores de
 * carrinho e favoritos, e pede um `QueryClientProvider` que esta suíte não monta. Nada disso muda o
 * que aqui se mede — quantos cards a janela abre e quando ela abre mais.
 */
vi.mock('@/entities/product/ui/ProductCard', () => ({
  default: ({ product }: { product: Product }) => (
    <article data-testid="product-card">{product.name}</article>
  ),
}))

import CategoryPage from '../CategoryPage'

const cat = (id: string, slug: string, name: string, parent_id: string | null = null): Category =>
  ({
    id,
    name,
    slug,
    description: null,
    image_url: null,
    color_accent: null,
    emoji: '',
    parent_id,
    sort_order: 0,
    active: true,
    show_in_menu: false,
    menu_promo: null,
  }) as Category

const TREE: Category[] = [
  cat('c-raiz', 'joias-afetivas', 'Joias afetivas'),
  cat('c-filha', 'joia-de-leite-materno', 'Joia de leite materno', 'c-raiz'),
  cat('c-pingentes', 'pingentes', 'Pingentes'),
]

/** O mínimo que `filterProducts`/`sortProducts`/`priceBounds` leem — o resto não é exercitado aqui. */
const produtos = (quantos: number): Product[] =>
  Array.from(
    { length: quantos },
    (_, i) =>
      ({
        id: `p-${i}`,
        name: `Joia ${i}`,
        slug: `joia-${i}`,
        price: 100,
        compare_price: null,
        tags: [],
        is_new: false,
      }) as unknown as Product,
  )

const UrlProbe = () => <span>url:{useLocation().pathname}</span>

const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <UrlProbe />
      <Routes>
        <Route path="/colecao/:slug" element={<CategoryPage legacy />} />
        <Route path="/categoria/:slug" element={<CategoryPage legacy />} />
        <Route path="/:slug" element={<CategoryPage />} />
        <Route path="/:parentSlug/:slug" element={<CategoryPage />} />
      </Routes>
    </MemoryRouter>,
  )

/**
 * O dublê do redirect **respeita o `enabled`** — consulta desligada não devolve dado, como a de
 * verdade. Sem isso, um teste de "não consulta" mediria a intenção da página e não o efeito dela.
 */
const respondeRedirect = (categoryId: string | null) => {
  useCategoryRedirectMock.mockImplementation((_slug: string, options?: { enabled?: boolean }) =>
    options?.enabled === false
      ? { data: undefined, isFetching: false }
      : { data: categoryId, isFetching: false },
  )
}

beforeEach(() => {
  useCategoriesMock.mockReset()
  useProductsMock.mockReset()
  useCategoryRedirectMock.mockReset()
  useCategoriesMock.mockReturnValue({ data: TREE, isFetching: false })
  useProductsMock.mockReturnValue({ data: [], isError: false })
  useCategoryRedirectMock.mockReturnValue({ data: undefined, isFetching: false })
})

afterEach(() => {
  for (const link of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) {
    link.remove()
  }
})

describe('CategoryPage — categoria raiz na raiz do domínio (URL-03)', () => {
  it('`/joias-afetivas` renderiza a categoria e fica na própria URL', () => {
    renderAt('/joias-afetivas')

    expect(screen.getByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
    expect(screen.getByText('url:/joias-afetivas')).toBeInTheDocument()
  })

  it('a canônica da raiz é a de UM segmento', () => {
    renderAt('/joias-afetivas')

    expect(canonical()).toBe(`${window.location.origin}/joias-afetivas`)
  })
})

describe('CategoryPage — subcategoria (URL-03, AD-018)', () => {
  it('aberta por DOIS segmentos renderiza, e a canônica é a própria URL', () => {
    renderAt('/joias-afetivas/joia-de-leite-materno')

    expect(screen.getByRole('heading', { name: 'Joia de leite materno' })).toBeInTheDocument()
    expect(screen.getByText('url:/joias-afetivas/joia-de-leite-materno')).toBeInTheDocument()
    expect(canonical()).toBe(`${window.location.origin}/joias-afetivas/joia-de-leite-materno`)
  })

  it('aberta por UM segmento RESOLVE — e aponta canonical para a de dois', () => {
    renderAt('/joia-de-leite-materno')

    expect(screen.getByRole('heading', { name: 'Joia de leite materno' })).toBeInTheDocument()
    // Resolve, não redireciona: a URL de um segmento continua sendo a que está na barra.
    expect(screen.getByText('url:/joia-de-leite-materno')).toBeInTheDocument()
    expect(canonical()).toBe(`${window.location.origin}/joias-afetivas/joia-de-leite-materno`)
  })

  it('pai ERRADO na URL redireciona para a canônica', () => {
    renderAt('/pingentes/joia-de-leite-materno')

    expect(screen.getByText('url:/joias-afetivas/joia-de-leite-materno')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joia de leite materno' })).toBeInTheDocument()
  })
})

describe('CategoryPage — 404 própria (URL-04)', () => {
  it('slug desconhecido renderiza a NotFound da loja', () => {
    renderAt('/nao-existe')

    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
  })

  it('o bloco "Coleção não encontrada" deixou de existir', () => {
    renderAt('/nao-existe')

    expect(screen.queryByText('Coleção não encontrada')).not.toBeInTheDocument()
  })

  it('sem categoria resolvida não há canônica no <head>', () => {
    renderAt('/nao-existe')

    expect(canonical()).toBeNull()
  })

  it('com a consulta CORRENDO o 404 não pisca — sai um container aria-busy', () => {
    useCategoriesMock.mockReturnValue({ data: undefined, isFetching: true })

    const { container } = renderAt('/joias-afetivas')

    expect(screen.queryByRole('heading', { name: 'Essa página não existe.' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

describe('CategoryPage — a consulta de catálogo só sai quando a rota resolve (URL-04)', () => {
  it('slug desconhecido NÃO habilita a consulta de produtos', () => {
    renderAt('/nao-existe')

    expect(useProductsMock).toHaveBeenCalled()
    for (const [, options] of useProductsMock.mock.calls) {
      expect(options).toEqual({ enabled: false })
    }
  })

  it('categoria resolvida habilita a consulta, com o slug dela', () => {
    renderAt('/joias-afetivas')

    expect(useProductsMock).toHaveBeenCalledWith('joias-afetivas', { enabled: true })
  })

  it('a subcategoria aberta por um segmento consulta pelo slug DELA', () => {
    renderAt('/joia-de-leite-materno')

    expect(useProductsMock).toHaveBeenCalledWith('joia-de-leite-materno', { enabled: true })
  })
})

describe('CategoryPage — espelho das rotas legadas (URL-02, AC 3c)', () => {
  it('`/colecao/x` navega para `/x`, o destino de LEGACY_REDIRECTS', () => {
    renderAt('/colecao/joias-afetivas')

    expect(screen.getByText('url:/joias-afetivas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
  })

  it('`/categoria/x` navega para `/x`', () => {
    renderAt('/categoria/joias-afetivas')

    expect(screen.getByText('url:/joias-afetivas')).toBeInTheDocument()
  })

  it('rota legada com slug que não é categoria também salta — o edge não conhece a árvore', () => {
    renderAt('/colecao/nao-existe')

    expect(screen.getByText('url:/nao-existe')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
  })
})

// 23 · T18 — `SEO-02` (spec AC 8): o slug antigo de uma categoria resolve pela tabela de redirect.
describe('CategoryPage — slug antigo de categoria (SEO-02)', () => {
  it('categoria VIVA não consulta `category_redirects` — a leitura extra é do caminho de exceção', () => {
    respondeRedirect('c-filha')

    renderAt('/joias-afetivas')

    expect(useCategoryRedirectMock).toHaveBeenCalled()
    for (const [, options] of useCategoryRedirectMock.mock.calls) {
      expect(options).toEqual({ enabled: false })
    }
    expect(screen.getByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
  })

  it('hit leva à CANÔNICA do destino — dois segmentos quando é filha', () => {
    respondeRedirect('c-filha')

    renderAt('/joias-de-leite')

    expect(screen.getByText('url:/joias-afetivas/joia-de-leite-materno')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Joia de leite materno' })).toBeInTheDocument()
  })

  it('hit para categoria raiz leva à forma de UM segmento', () => {
    respondeRedirect('c-pingentes')

    renderAt('/pingentes-antigos')

    expect(screen.getByText('url:/pingentes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pingentes' })).toBeInTheDocument()
  })

  it('depois de navegar o slug casa com categoria viva — não há laço', () => {
    respondeRedirect('c-filha')

    renderAt('/joias-de-leite')

    // A ÚLTIMA renderização é a do destino, e nela a consulta está desligada: o redirect não
    // pode se disparar de novo em cima do endereço para o qual acabou de levar.
    const ultima = useCategoryRedirectMock.mock.calls.at(-1)!
    expect(ultima[0]).toBe('joia-de-leite-materno')
    expect(ultima[1]).toEqual({ enabled: false })
  })

  it('destino apagado (ou escondido pela RLS) é 404, nunca salto para lugar nenhum', () => {
    respondeRedirect('c-que-foi-apagada')

    renderAt('/joias-de-leite')

    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
    expect(screen.getByText('url:/joias-de-leite')).toBeInTheDocument()
  })

  it('sem hit é 404', () => {
    respondeRedirect(null)

    renderAt('/nunca-existiu')

    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
  })

  it('com a consulta do redirect CORRENDO o 404 não pisca', () => {
    useCategoryRedirectMock.mockReturnValue({ data: undefined, isFetching: true })

    const { container } = renderAt('/joias-de-leite')

    expect(screen.queryByRole('heading', { name: 'Essa página não existe.' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})

describe('CategoryPage — a listagem continua funcionando', () => {
  it('a barra de filtros e o seletor de ordenação seguem montados', () => {
    renderAt('/joias-afetivas')

    expect(screen.getByRole('button', { name: /Filtros/ })).toBeInTheDocument()
    expect(screen.getAllByLabelText('Ordenar por').length).toBeGreaterThan(0)
  })

  it('sem produto, o vazio de filtro é o que aparece — não o 404', () => {
    renderAt('/joias-afetivas')

    expect(screen.getByText('Nenhuma joia com esses filtros.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Essa página não existe.' })).not.toBeInTheDocument()
  })

  it('falha na consulta mostra o erro da coleção, não a 404 (BUG-20260809)', () => {
    useProductsMock.mockReturnValue({ data: [], isError: true })

    renderAt('/joias-afetivas')

    expect(screen.getByText('Não conseguimos carregar as joias desta coleção.')).toBeInTheDocument()
  })
})

describe('CategoryPage — esqueleto enquanto a consulta corre', () => {
  const carregando = () =>
    useProductsMock.mockReturnValue({ data: undefined, isError: false, isLoading: true })

  it('sai uma grade de esqueleto anunciada como ocupada, com uma leva inteira de vagas', () => {
    carregando()

    const { container } = renderAt('/joias-afetivas')

    const grade = container.querySelector('[aria-busy="true"][aria-label*="Carregando"]')
    expect(grade).not.toBeNull()
    expect(grade!.children).toHaveLength(PRODUCTS_PER_PAGE)
  })

  /*
   * O defeito que o esqueleto conserta: até aqui a página dizia "Nenhuma joia com esses filtros"
   * durante a PRIMEIRA carga, mandando a cliente mexer em filtro que ela não tocou. Mesma família do
   * `BUG-20260809`, que já tinha separado vazio de falha — carregando é o terceiro estado.
   */
  it('o vazio de filtro NÃO aparece durante a carga', () => {
    carregando()

    renderAt('/joias-afetivas')

    expect(screen.queryByText('Nenhuma joia com esses filtros.')).not.toBeInTheDocument()
  })

  it('a contagem do cabeçalho não afirma "0 produtos" durante a carga', () => {
    carregando()

    renderAt('/joias-afetivas')

    expect(screen.queryByText(/0 produtos/)).not.toBeInTheDocument()
  })

  it('com os produtos na mão o esqueleto some e os cards entram', () => {
    useProductsMock.mockReturnValue({ data: produtos(3), isError: false, isLoading: false })

    const { container } = renderAt('/joias-afetivas')

    expect(container.querySelector('[aria-busy="true"][aria-label*="Carregando"]')).toBeNull()
    expect(screen.getAllByTestId('product-card')).toHaveLength(3)
  })

  /**
   * `URL-04`: com a rota irresolvida a consulta nasce desligada, e em React Query v5 uma consulta
   * desligada fica pendente para sempre. Ler `isPending` no lugar de `isLoading` faria o esqueleto
   * pulsar embaixo da 404 até a cliente sair da página.
   */
  it('a 404 não carrega esqueleto', () => {
    useProductsMock.mockReturnValue({ data: undefined, isError: false, isLoading: false })

    const { container } = renderAt('/nao-existe')

    expect(container.querySelector('[aria-busy="true"][aria-label*="Carregando"]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Essa página não existe.' })).toBeInTheDocument()
  })
})

describe('CategoryPage — rolagem infinita', () => {
  const comProdutos = (quantos: number) =>
    useProductsMock.mockReturnValue({ data: produtos(quantos), isError: false, isLoading: false })

  it('a coleção grande abre só a primeira leva', () => {
    comProdutos(60)

    renderAt('/joias-afetivas')

    expect(screen.getAllByTestId('product-card')).toHaveLength(PRODUCTS_PER_PAGE)
  })

  /*
   * A contagem do cabeçalho é da COLEÇÃO, não da janela. Ela alimenta a decisão de filtrar ("60 é
   * muito, vou apertar o preço") — dizer 24 ali faria a cliente filtrar um número que não existe.
   */
  it('o cabeçalho continua contando a coleção inteira, não a janela', () => {
    comProdutos(60)

    renderAt('/joias-afetivas')

    // Exata de propósito: o aviso `aria-live` diz "Mostrando 24 de 60 produtos" e casaria com uma
    // régua frouxa — o teste passaria medindo a frase errada.
    expect(screen.getByText(/^60 produtos encontrados$/)).toBeInTheDocument()
  })

  it('"Carregar mais joias" abre a leva seguinte', () => {
    comProdutos(60)

    renderAt('/joias-afetivas')
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais joias' }))

    expect(screen.getAllByTestId('product-card')).toHaveLength(PRODUCTS_PER_PAGE * 2)
  })

  it('no fim da lista o botão some e todos os produtos estão montados', () => {
    comProdutos(30)

    renderAt('/joias-afetivas')
    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais joias' }))

    expect(screen.getAllByTestId('product-card')).toHaveLength(30)
    expect(screen.queryByRole('button', { name: 'Carregar mais joias' })).not.toBeInTheDocument()
  })

  it('coleção que cabe numa leva não mostra o botão', () => {
    comProdutos(5)

    renderAt('/joias-afetivas')

    expect(screen.getAllByTestId('product-card')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Carregar mais joias' })).not.toBeInTheDocument()
  })

  /**
   * **Sensor de re-render infinito.**
   *
   * A janela reancora com `setState` durante o render. Enquanto a régua era a IDENTIDADE do array de
   * `visible`, um consumidor que devolvesse `data` novo a cada chamada — o que
   * `routing.test.tsx` faz com `useProducts: () => ({ data: [] })` — disparava a reancoragem em todo
   * render e derrubava a página com "Too many re-renders". Aqui o dublê reproduz esse consumidor de
   * propósito: a régua é de VALOR, então a página tem de renderizar em paz.
   */
  it('`data` com identidade nova a cada render não faz a página entrar em laço', () => {
    useProductsMock.mockImplementation(() => ({
      data: produtos(30),
      isError: false,
      isLoading: false,
    }))

    expect(() => renderAt('/joias-afetivas')).not.toThrow()
    expect(screen.getAllByTestId('product-card')).toHaveLength(PRODUCTS_PER_PAGE)
  })

  it('a leva nova é anunciada a leitor de tela — rolar não muda foco nem URL', () => {
    comProdutos(60)

    const { container } = renderAt('/joias-afetivas')
    const aviso = container.querySelector('[aria-live="polite"]')

    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toContain(`Mostrando ${PRODUCTS_PER_PAGE} de 60`)

    fireEvent.click(screen.getByRole('button', { name: 'Carregar mais joias' }))
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toContain(
      `Mostrando ${PRODUCTS_PER_PAGE * 2} de 60`,
    )
  })
})

describe('CategoryPage — a grade do desktop', () => {
  /*
   * A classe é um PROXY, e sabidamente fraco: jsdom devolve 0 para toda medida de layout, então
   * nenhum teste de componente prova quantas colunas a cliente vê. O que ele trava é a divergência
   * entre as duas superfícies que desenham a mesma grade (cards e esqueleto) e a volta silenciosa
   * para três colunas. A medida de verdade é a auditoria em 390×844 e em 1440.
   */
  const gradeDe = (container: HTMLElement) =>
    container.querySelector('.grid')!.getAttribute('class')!

  it('quatro colunas a partir de `lg`, três em `md` — a sidebar de 260px não deixa quatro caberem em 768', () => {
    useProductsMock.mockReturnValue({ data: produtos(4), isError: false, isLoading: false })

    const { container } = renderAt('/joias-afetivas')

    expect(gradeDe(container)).toContain('lg:grid-cols-4')
    expect(gradeDe(container)).toContain('md:grid-cols-3')
  })

  it('o esqueleto usa a MESMA grade dos cards — senão o layout pula quando os produtos chegam', () => {
    useProductsMock.mockReturnValue({ data: produtos(4), isError: false, isLoading: false })
    const { container: comCards } = renderAt('/joias-afetivas')

    useProductsMock.mockReturnValue({ data: undefined, isError: false, isLoading: true })
    const { container: comEsqueleto } = renderAt('/joias-afetivas')

    expect(gradeDe(comEsqueleto)).toBe(gradeDe(comCards))
  })
})
