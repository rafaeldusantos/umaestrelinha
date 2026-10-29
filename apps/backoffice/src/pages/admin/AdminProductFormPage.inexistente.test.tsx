// BUG-20261029-produto-inexistente-abre-formulario-vazio: `/admin/produtos/<id>/editar` com um id que
// não existe abria "Editar produto" com o selo Publicado, o formulário vazio e o envio de fotos
// aceito — as fotos iam para o Storage sem dono. E com a leitura FALHANDO o mesmo formulário vazio
// era salvável por cima da peça. A página é a de verdade; o dublê é o do `voltar`, com a resposta da
// leitura do produto controlável.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({
  respostas: [] as Array<{ data: unknown; error: unknown }>,
  leituras: 0,
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    let op = 'select'
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'ilike', 'order', 'limit', 'range', 'select']) b[m] = () => b
    b.insert = () => ((op = 'insert'), b)
    b.update = () => ((op = 'update'), b)
    b.upsert = () => ((op = 'upsert'), b)
    b.delete = () => ((op = 'delete'), b)
    b.maybeSingle = () => {
      if (table !== 'products' || op !== 'select') return Promise.resolve({ data: null, error: null })
      const resposta = h.respostas[Math.min(h.leituras, h.respostas.length - 1)]
      h.leituras += 1
      return Promise.resolve(resposta)
    }
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

const PRODUTO = {
  id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, cost_price: 30, is_active: true,
  product_variants: [], product_categories: [], product_faqs: [], product_filter_values: [],
  product_suppliers: null,
}
const NAO_EXISTE = { data: null, error: null }
const SEM_REDE = { data: null, error: { message: 'Failed to fetch', code: '' } }
const DA_LISTA = '/admin/produtos?visao=ativos&pagina=3'

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.respostas = [{ data: PRODUTO, error: null }]
  h.leituras = 0
})

const Lista = () => {
  const loc = useLocation()
  return <output data-testid="lista">{loc.pathname + loc.search}</output>
}

const montar = (pathname: string, state: unknown = null) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{ pathname, state }]}>
        <Routes>
          <Route path="/admin/produtos/novo" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<Lista />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** Nada do formulário: nem selo, nem campo, nem envio de arquivo. */
const semFormulario = (container: HTMLElement) => {
  expect(screen.queryByText('Publicado')).not.toBeInTheDocument()
  expect(screen.queryByText('Editar produto')).not.toBeInTheDocument()
  expect(container.querySelector('form')).toBeNull()
  expect(container.querySelector('input[type="file"]')).toBeNull()
}

describe('produto que não existe', () => {
  it('diz que não existe, sem o formulário e sem onde enviar foto', async () => {
    h.respostas = [NAO_EXISTE]
    const { container } = montar('/admin/produtos/d8bc0b3c-ba6f-4e9e-b81d-be4db3d0b03d/editar')

    expect(await screen.findByText('Produto não encontrado')).toBeInTheDocument()
    semFormulario(container)
    // Não existir não é falha de rede: tentar de novo leria o mesmo nada.
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('"Voltar para Produtos" reabre a lista no recorte de onde a Adri veio', async () => {
    h.respostas = [NAO_EXISTE]
    montar('/admin/produtos/sumiu/editar', { voltarPara: DA_LISTA })

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar para Produtos' }))

    expect(screen.getByTestId('lista').textContent).toBe(DA_LISTA)
  })

  it('id que nem é uuid (22P02 do Postgres) também é "não encontrado"', async () => {
    h.respostas = [{ data: null, error: { message: 'invalid input syntax for type uuid', code: '22P02' } }]
    const { container } = montar('/admin/produtos/abc/editar')

    expect(await screen.findByText('Produto não encontrado')).toBeInTheDocument()
    semFormulario(container)
  })
})

describe('leitura do produto que falhou', () => {
  it('avisa e não mostra o formulário vazio — salvá-lo gravaria o vazio por cima da peça', async () => {
    h.respostas = [SEM_REDE]
    const { container } = montar('/admin/produtos/p1/editar')

    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Não foi possível abrir o produto')
    semFormulario(container)
  })

  it('"Tentar de novo" lê outra vez e, respondendo, abre a peça', async () => {
    h.respostas = [SEM_REDE, { data: PRODUTO, error: null }]
    montar('/admin/produtos/p1/editar')

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
    expect(h.leituras).toBe(2)
  })
})

describe('o caminho normal não muda', () => {
  it('produto que existe abre o formulário', async () => {
    montar('/admin/produtos/p1/editar')

    await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument()
  })

  it('produto novo abre o formulário sem ler nada', async () => {
    const { container } = montar('/admin/produtos/novo')

    await waitFor(() => expect(container.querySelector('form')).not.toBeNull())
    expect(h.leituras).toBe(0)
    expect(screen.queryByText('Produto não encontrado')).not.toBeInTheDocument()
  })
})
