// Feature 66 — `/admin/filtros/:groupId/valores/:valueId` (`FLT-15`, `FLT-20`, T09).
//
// A página REAL monta o `BulkAssignPanel` real. Inventário de `vi.mock` (`L-030`): os três hooks de
// leitura — `@/entities/filter` (catálogo e marcações), `useProductMarkingPool` (o resto do barrel de
// produto é o ORIGINAL: a régua `buscarProdutos` roda de verdade) e `@/entities/category`. Os hooks
// têm teste próprio; aqui se prova a fiação: o painel recebe o que a página lê, e a gravação que deu
// certo relê o catálogo de filtros — é o que faz a contagem do valor e do grupo mudarem sem
// recarregar (`FLT-20`).

import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  catalogo: {
    groups: [] as unknown[],
    loading: false,
    error: null as string | null,
    fetchCatalog: vi.fn(),
  },
  marcas: {
    marked: new Set<string>(),
    loading: false,
    error: null as string | null,
    mark: vi.fn(),
    unmark: vi.fn(),
  },
  produtos: [] as unknown[],
}))

vi.mock('@/entities/filter', () => ({
  useAdminFilterCatalog: () => h.catalogo,
  useValueMarks: () => h.marcas,
}))
vi.mock('@/entities/product', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/product')>()),
  useProductMarkingPool: () => ({ produtos: h.produtos, carregando: false, erro: null, recarregar: vi.fn() }),
}))
vi.mock('@/entities/category', () => ({
  useAdminCategories: () => ({ categories: [{ id: 'aneis', name: 'Anéis' }] }),
}))

import AdminFilterValuePage from './AdminFilterValuePage'

beforeEach(() => {
  h.catalogo.groups = [
    {
      id: 'acab',
      name: 'Acabamento',
      slug: 'acabamento',
      is_active: true,
      sort_order: 0,
      created_at: '',
      values: [{ id: 'prata', group_id: 'acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0, marked_count: 1 }],
    },
  ]
  h.catalogo.fetchCatalog.mockReset()
  h.marcas.marked = new Set(['a1'])
  h.marcas.mark.mockReset().mockResolvedValue(null)
  h.marcas.unmark.mockReset().mockResolvedValue(null)
  h.produtos = [
    { id: 'a1', name: 'Anel Coração', slug: 'a1', is_active: true, base_price: 1, tags: [], category_ids: ['aneis'] },
    { id: 'a2', name: 'Anel Estrela', slug: 'a2', is_active: true, base_price: 1, tags: [], category_ids: ['aneis'] },
  ]
})

const montar = (rota = '/admin/filtros/acab/valores/prata') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/admin/filtros/:groupId/valores/:valueId" element={<AdminFilterValuePage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('a marcação em massa de um valor', () => {
  it('o título é o valor, o caminho nomeia o grupo, e o contador é o das marcações', () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Prata 925' })).toBeInTheDocument()
    expect(screen.getByText(/Filtros da loja › Acabamento/)).toBeInTheDocument()
    expect(screen.getByTestId('contador-marcadas')).toHaveTextContent('1 peça marcada')
    expect(screen.getByRole('link', { name: 'Voltar a Acabamento' })).toHaveAttribute('href', '/admin/filtros/acab')
  })

  it('o painel recebe as peças e as categorias que a página leu', () => {
    montar()
    expect(screen.getByRole('checkbox', { name: 'Anel Estrela' })).toBeInTheDocument()
    expect(screen.getAllByText('Anéis').length).toBeGreaterThan(0)
  })

  it('marcar que deu certo relê o catálogo de filtros (FLT-20)', async () => {
    montar()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Estrela' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar 1 produto' }))
    })
    expect(h.marcas.mark).toHaveBeenCalledWith(['a2'])
    expect(h.catalogo.fetchCatalog).toHaveBeenCalledWith('revalidar')
  })

  it('a falha NÃO relê o catálogo', async () => {
    h.marcas.unmark.mockResolvedValue('sem rede')
    montar()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Coração' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remover de 1 produto' }))
    })
    expect(h.marcas.unmark).toHaveBeenCalledWith(['a1'])
    expect(h.catalogo.fetchCatalog).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('sem rede')
  })

  it('valor que não existe mais diz isso', () => {
    montar('/admin/filtros/acab/valores/sumiu')
    expect(screen.getByText('Este valor não existe mais.')).toBeInTheDocument()
  })
})
