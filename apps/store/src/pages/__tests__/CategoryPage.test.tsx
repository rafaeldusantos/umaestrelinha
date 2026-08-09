import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { Category } from '@estrelinha/supabase/types'

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
