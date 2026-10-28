// O "voltar" do cadastro reabre a lista de produtos no recorte de onde a Adri veio.
//
// A lista entrega o próprio endereço por `location.state.voltarPara` (`productListHref`); antes
// todo caminho de volta navegava para `/admin/produtos` puro, e filtro, busca e página se perdiam a
// cada peça editada. A página é a de verdade; o dublê de supabase é o do arquivo do fornecedor,
// reduzido ao que a carga e o "Salvar rascunho" leem (`L-030`).

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({ produto: null as Record<string, unknown> | null }))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    let op = 'select'
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'ilike', 'order', 'limit', 'range', 'select']) b[m] = () => b
    b.insert = () => ((op = 'insert'), b)
    b.update = () => ((op = 'update'), b)
    b.upsert = () => ((op = 'upsert'), b)
    b.delete = () => ((op = 'delete'), b)
    b.maybeSingle = () =>
      Promise.resolve(table === 'products' && op === 'select' ? { data: h.produto, error: null } : { data: null, error: null })
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(ok, ko)
    return b
  }
  return { supabase: { from } }
})
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    createProduct: vi.fn(async () => ({ error: null, id: 'novo' })),
    updateProduct: vi.fn(async () => null),
  }),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({ useAdminCategories: () => ({ categories: [] }) }))
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({
  useAdminFaqs: () => ({ faqs: [], loading: false, error: null }),
}))
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: [], loading: false, error: null }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminProductFormPage from './AdminProductFormPage'

const DA_LISTA = '/admin/produtos?visao=ativos&categoria=cat-1&busca=cora%C3%A7%C3%A3o&pagina=3'

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, cost_price: 30, is_active: false,
    product_variants: [], product_categories: [], product_faqs: [], product_filter_values: [],
    product_suppliers: null,
  }
})

const Lista = () => {
  const loc = useLocation()
  return <output data-testid="lista">{loc.pathname + loc.search}</output>
}

const montar = (pathname: string, state: unknown, search = '') => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname, search, state }]}>
        <Routes>
          <Route path="/admin/produtos/novo" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<Lista />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const carregado = () => waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
/** O "Produtos" da trilha do cabeçalho — o caminho de volta que a Adri usa. */
const voltarPelaTrilha = () =>
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Trilha' })).getByRole('button', { name: 'Produtos' }))

describe('o voltar do cadastro reabre a lista no mesmo recorte', () => {
  it('com o endereço que a lista entregou, a trilha volta para ele', async () => {
    montar('/admin/produtos/p1/editar', { voltarPara: DA_LISTA })
    await carregado()

    voltarPelaTrilha()

    expect(screen.getByTestId('lista').textContent).toBe(DA_LISTA)
  })

  it('sem endereço (link colado, nova aba), volta para a lista sem recorte', async () => {
    montar('/admin/produtos/p1/editar', null)
    await carregado()

    voltarPelaTrilha()

    expect(screen.getByTestId('lista').textContent).toBe('/admin/produtos')
  })

  it.each(['/admin/pedidos?visao=tudo', 'https://exemplo.invalid/admin/produtos', '/admin/produtosx', 7])(
    'endereço que não é da lista (%s) é ignorado',
    async voltarPara => {
      montar('/admin/produtos/p1/editar', { voltarPara })
      await carregado()

      voltarPelaTrilha()

      expect(screen.getByTestId('lista').textContent).toBe('/admin/produtos')
    },
  )

  it('produto NOVO: salvar troca /novo por /editar e o endereço de volta vai junto', async () => {
    montar('/admin/produtos/novo', { voltarPara: DA_LISTA }, '?from=p1')
    await waitFor(() => expect(screen.getByDisplayValue(/Anel Coração/)).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })
    // Continua no cadastro (agora `/admin/produtos/novo/editar`), e NÃO na lista: se o salvar fosse
    // direto para a lista, o voltar abaixo nem seria exercitado e o caso passaria pelo motivo errado.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled())
    expect(screen.queryByTestId('lista')).not.toBeInTheDocument()

    voltarPelaTrilha()

    await waitFor(() => expect(screen.getByTestId('lista').textContent).toBe(DA_LISTA))
  })
})
