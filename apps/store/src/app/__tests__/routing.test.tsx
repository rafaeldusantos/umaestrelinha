import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Outlet } from 'react-router-dom'
import type { Category } from '@estrelinha/supabase/types'

/**
 * `URL-01`..`URL-04` — a tabela de rotas de `AD-018`, medida no roteador de verdade.
 *
 * O teste monta o `App` inteiro e navega pela URL, em vez de montar cada página isolada: o que se
 * quer provar aqui é o **ranqueamento** do React Router — que `/conta` vence `/:slug` e que
 * `/produtos/:slug` vence `/:parentSlug/:slug`. Isso não aparece em teste de página nenhuma.
 *
 * As páginas pesadas viram marcadores; `CategoryPage` e `ProductPage` são as REAIS, porque são elas
 * que fazem o salto das rotas legadas.
 */
const { useCategoriesMock, useProductMock } = vi.hoisted(() => ({
  useCategoriesMock: vi.fn(),
  useProductMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: useCategoriesMock }))
// Dublê de harness, como os outros dois hooks de dado: o que se mede aqui é o ranqueamento de rota.
// A resolução do slug antigo (`SEO-02`) tem prova própria em `CategoryPage.test.tsx` e em
// `useCategoryRedirect.test.tsx` — deixá-la real aqui mediria uma consulta, não o roteador.
vi.mock('@/entities/category/api/useCategoryRedirect', () => ({
  useCategoryRedirect: () => ({ data: undefined, isFetching: false }),
}))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))

vi.mock('@/app/RuntimeSettingsLoader', () => ({ default: () => null }))
vi.mock('@/features/abandoned-cart/ui/AbandonedCartTracker', () => ({ default: () => null }))
vi.mock('@/widgets/store-layout/ui/StoreLayout', () => ({
  default: () => (
    <div data-testid="store-layout">
      <Outlet />
    </div>
  ),
}))

vi.mock('@/pages/HomePage', () => ({ default: () => <div>pagina:home</div> }))
vi.mock('@/pages/AccountPage', () => ({ default: () => <div>pagina:conta</div> }))
vi.mock('@/pages/OrderConfirmationPage', () => ({ default: () => <div>pagina:pedido</div> }))
vi.mock('@/pages/CheckoutPage', () => ({ default: () => <div>pagina:checkout</div> }))
vi.mock('@/pages/CartPage', () => ({ default: () => <div>pagina:carrinho</div> }))
vi.mock('@/pages/SearchPage', () => ({ default: () => <div>pagina:busca</div> }))
vi.mock('@/pages/AboutPage', () => ({ default: () => <div>pagina:sobre</div> }))
vi.mock('@/pages/PoliciesPage', () => ({ default: () => <div>pagina:politicas</div> }))
vi.mock('@/pages/WishlistPage', () => ({ default: () => <div>pagina:favoritos</div> }))
vi.mock('@/pages/AuthPage', () => ({ default: () => <div>pagina:entrar</div> }))

vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>produto:galeria</div> }))
vi.mock('@/entities/product/ui/ProductInfo', () => ({ default: () => null }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))

import App from '../App'

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
]

const produto = {
  id: 'p1',
  name: 'Joia',
  slug: 'joia-lua',
  images: [],
  options: [],
  variants: [],
  category_links: [],
  tags: [],
}

const renderAt = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

/*
 * As rotas passaram a ser `React.lazy` (`PRF-10`), e montar uma virou import dinâmico. A PRIMEIRA
 * vez que o vitest resolve `CategoryPage` e `ProductPage` ele transforma os módulos de verdade —
 * mais de um segundo, que é o teto padrão do `findBy`. Aquecer o cache aqui é plumbing de dublê, e
 * não afrouxamento: as asserções continuam exigindo exatamente o mesmo DOM.
 */
beforeAll(async () => {
  await Promise.all([import('@/pages/CategoryPage'), import('@/pages/ProductPage')])
  // O teto é do HOOK, não das asserções: transformar as duas páginas e a árvore delas passa dos 10s
  // padrão do vitest. Antes do `lazy` esse mesmo trabalho acontecia na coleta do arquivo; ele só
  // mudou de fase.
}, 120_000)

beforeEach(() => {
  useCategoriesMock.mockReset()
  useProductMock.mockReset()
  useCategoriesMock.mockReturnValue({ data: TREE, isFetching: false })
  useProductMock.mockReturnValue({ data: produto, isFetching: false })
})

describe('rotas — produto (URL-01, URL-02)', () => {
  it('`/produtos/:slug` monta a ProductPage', async () => {
    renderAt('/produtos/joia-lua')

    expect(await screen.findByText('produto:galeria')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/produtos/joia-lua')
  })

  it('`/produto/x` navega para `/produtos/x`', async () => {
    renderAt('/produto/joia-lua')

    await waitFor(() => expect(window.location.pathname).toBe('/produtos/joia-lua'))
    expect(await screen.findByText('produto:galeria')).toBeInTheDocument()
  })
})

describe('rotas — categoria (URL-02 AC 3c, URL-03)', () => {
  it('`/colecao/x` navega para `/x`', async () => {
    renderAt('/colecao/joias-afetivas')

    await waitFor(() => expect(window.location.pathname).toBe('/joias-afetivas'))
    expect(await screen.findByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
  })

  it('`/categoria/x` navega para `/x`', async () => {
    renderAt('/categoria/joias-afetivas')

    await waitFor(() => expect(window.location.pathname).toBe('/joias-afetivas'))
    expect(await screen.findByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
  })

  it('`/:slug` monta a CategoryPage', async () => {
    renderAt('/joias-afetivas')

    expect(await screen.findByRole('heading', { name: 'Joias afetivas' })).toBeInTheDocument()
  })

  it('`/:parentSlug/:slug` monta a CategoryPage da subcategoria', async () => {
    renderAt('/joias-afetivas/joia-de-leite-materno')

    expect(
      await screen.findByRole('heading', { name: 'Joia de leite materno' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe('/joias-afetivas/joia-de-leite-materno')
  })
})

describe('rotas — segmento estático vence o dinâmico (a armadilha de AD-018)', () => {
  it('`/conta` monta a AccountPage e NÃO a CategoryPage', async () => {
    renderAt('/conta')

    expect(await screen.findByText('pagina:conta')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Joias afetivas' })).not.toBeInTheDocument()
  })

  it('`/pedido/abc` monta a confirmação e NÃO a CategoryPage de duas partes', async () => {
    renderAt('/pedido/abc')

    expect(await screen.findByText('pagina:pedido')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Essa página não existe.' })).not.toBeInTheDocument()
  })

  it('`/busca` continua sendo a busca, não uma categoria chamada busca', async () => {
    renderAt('/busca')

    expect(await screen.findByText('pagina:busca')).toBeInTheDocument()
  })
})

describe('rotas — o que não existe (URL-04)', () => {
  it('três segmentos caem na 404 própria', async () => {
    renderAt('/a/b/c')

    expect(
      await screen.findByRole('heading', { name: 'Essa página não existe.' }),
    ).toBeInTheDocument()
  })

  it('um segmento que não é categoria cai na 404 própria', async () => {
    renderAt('/nao-existe')

    expect(
      await screen.findByRole('heading', { name: 'Essa página não existe.' }),
    ).toBeInTheDocument()
  })
})

describe('rotas — o checkout segue fora do StoreLayout (CHK-10)', () => {
  it('`/checkout` monta a página sem a moldura da loja', async () => {
    renderAt('/checkout')

    expect(await screen.findByText('pagina:checkout')).toBeInTheDocument()
    expect(screen.queryByTestId('store-layout')).not.toBeInTheDocument()
  })

  it('e a home, por contraste, monta DENTRO da moldura', async () => {
    renderAt('/')

    expect(await screen.findByText('pagina:home')).toBeInTheDocument()
    expect(screen.getByTestId('store-layout')).toBeInTheDocument()
  })
})
