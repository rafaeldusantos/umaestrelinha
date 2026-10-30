// Ativar/Desativar na coluna lateral do produto, pela PÁGINA real.
//
// É uma ação que grava na hora e só `is_active` (`setProductActive`), não um campo do save — o switch
// "Ativo" saiu na T25 por ser um segundo dono do dado dentro do mesmo save. O dublê de supabase
// registra cada escrita num diário (molde de `AdminProductFormPage.fornecedor.test.tsx`).
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário), `useAdminProducts`,
// `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o editor rico e o toast.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown; filters: unknown[]; select: boolean }[],
  produto: null as Record<string, unknown> | null,
  /** Linhas que o `update … select('id')` devolve. `[]` é o que a RLS produz quando filtra. */
  linhasAlteradas: [{ id: 'p1' }] as { id: string }[],
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    const filtros: unknown[] = []
    let op = 'select'
    let payload: unknown
    let comSelect = false
    const fim = () => {
      if (op !== 'select') h.diario.push({ op, table, payload, filters: filtros, select: comSelect })
      if (op === 'update' && table === 'products') return { data: h.linhasAlteradas, error: null }
      return { data: null, error: null, count: 0 }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'ilike', 'order', 'limit', 'range']) {
      b[m] = (...args: unknown[]) => {
        filtros.push([m, ...args])
        return b
      }
    }
    b.select = () => {
      if (op !== 'select') comSelect = true
      return b
    }
    b.insert = (p: unknown) => ((op = 'insert'), (payload = p), b)
    b.update = (p: unknown) => ((op = 'update'), (payload = p), b)
    b.upsert = (p: unknown) => ((op = 'upsert'), (payload = p), b)
    b.delete = () => ((op = 'delete'), b)
    b.maybeSingle = () => {
      if (table === 'products' && op === 'select') return Promise.resolve({ data: h.produto, error: null })
      return Promise.resolve(fim())
    }
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(fim()).then(ok, ko)
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
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [] }),
}))
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({
  useAdminFaqs: () => ({ faqs: [], loading: false, error: null }),
}))
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: [], loading: false, error: null }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))
import { toast } from '@estrelinha/ui/hooks/use-toast'

import AdminProductFormPage from './AdminProductFormPage'

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  vi.mocked(toast).mockClear()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.linhasAlteradas = [{ id: 'p1' }]
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, is_active: true,
    product_variants: [], product_categories: [], product_faqs: [], product_filter_values: [],
    product_suppliers: null,
  }
})

const montar = (rota = '/admin/produtos/p1/editar') => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/produtos/novo" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const carregado = () => waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())

describe('Ativar/Desativar na coluna lateral do produto', () => {
  it('produto ativo: "Desativar" grava SÓ is_active, confere o efeito e não suja o formulário', async () => {
    montar()
    await carregado()
    expect(screen.getByText('Ativo na loja')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))
    })

    const escritas = h.diario.filter(e => e.table === 'products')
    expect(escritas).toEqual([
      { op: 'update', table: 'products', payload: { is_active: false }, filters: [['eq', 'id', 'p1']], select: true },
    ])
    expect(await screen.findByText('Desativado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeInTheDocument()
    // O valor adotado já é o do banco: o selo de pendência mentiria.
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
  })

  it('zero linhas alteradas (RLS) não passa por sucesso: avisa e o estado fica', async () => {
    h.linhasAlteradas = []
    montar()
    await carregado()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Desativar' }))
    })

    expect(vi.mocked(toast)).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Não foi possível desativar', variant: 'destructive' }),
    )
    expect(screen.getByText('Ativo na loja')).toBeInTheDocument()
  })

  it('produto desativado que não passa no checklist: "Ativar" fica indisponível, e diz por quê', async () => {
    h.produto = { ...h.produto!, is_active: false }
    montar()
    await carregado()

    expect(screen.getByText('Desativado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ativar' })).toBeDisabled()
    expect(screen.getByText(/Para ativar, resolva o que falta em/)).toBeInTheDocument()
    expect(h.diario.filter(e => e.table === 'products')).toEqual([])
  })

  it('produto novo não tem o botão: ele ainda não existe no banco', async () => {
    montar('/admin/produtos/novo')
    await waitFor(() => expect(screen.getByText(/O produto é criado como rascunho/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Ativar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desativar' })).toBeNull()
  })
})
