// Feature 66 — `/admin/filtros/:groupId/valores/:valueId` (`FLT-15`, `FLT-20`, T09).
//
// A página REAL monta o `BulkAssignPanel` real. Inventário de `vi.mock` (`L-030`): os três hooks de
// leitura — `@/entities/filter` (catálogo e marcações), `useProductMarkingPool` (o resto do barrel de
// produto é o ORIGINAL: a régua `buscarProdutos` roda de verdade) e `@/entities/category`. Os hooks
// têm teste próprio; aqui se prova a fiação: o painel recebe o que a página lê, e a gravação que deu
// certo relê o catálogo de filtros — é o que faz a contagem do valor e do grupo mudarem sem
// recarregar (`FLT-20`).

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PRODUCT_MARKING_KEY } from '@/entities/product'
import { SUGGESTION_DISMISSALS_KEY } from '@/entities/filter'
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
  porOpcao: {
    porPeca: new Map<string, unknown[]>(),
    loading: false,
    error: null as string | null,
    unmark: vi.fn(),
  },
}))

// Feature 67: mais as marcações por opção do valor e as recusas (a fila conta as sugestões dele).
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => h.catalogo,
  useValueMarks: () => h.marcas,
  useOptionMarks: () => h.porOpcao,
  useSuggestionDismissals: () => ({ recusas: [], carregando: false, erro: null }),
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
  h.porOpcao.porPeca = new Map()
  h.porOpcao.unmark.mockReset().mockResolvedValue(null)
  h.produtos = [
    { id: 'a1', name: 'Anel Coração', slug: 'a1', is_active: true, base_price: 1, tags: [], category_ids: ['aneis'] },
    { id: 'a2', name: 'Anel Estrela', slug: 'a2', is_active: true, base_price: 1, tags: [], category_ids: ['aneis'] },
  ]
})

let qc: QueryClient
const montar = (rota = '/admin/filtros/acab/valores/prata') => {
  qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/filtros/:groupId/valores/:valueId" element={<AdminFilterValuePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('a marcação em massa de um valor', () => {
  it('o título é o valor, o caminho nomeia o grupo, e o contador é o das marcações', () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Prata 925' })).toBeInTheDocument()
    expect(screen.getByText(/Filtros da loja › Acabamento/)).toBeInTheDocument()
    expect(screen.getByTestId('contador-marcadas')).toHaveTextContent('1 peça marcada')
    expect(screen.getByRole('link', { name: 'Voltar a Acabamento' })).toHaveAttribute('href', '/admin/filtros/acab')
  })

  // D2 da prova em navegador (67): o contador dizia "183 peças marcadas" ao lado de 171 linhas
  // "Por opção". Aqui as duas formas chegam por peça, então o total é o de peças DISTINTAS.
  it('o contador conta as peças das duas formas — a peça com as duas conta uma vez', () => {
    h.marcas.marked = new Set(['a1', 'b1'])
    h.porOpcao.porPeca = new Map([
      ['a1', [{ option_name: 'Cor', option_value: 'Prata 925' }]],
      ['c1', [{ option_name: 'Cor', option_value: 'Prata 925' }, { option_name: 'Elo', option_value: 'Prata 925' }]],
    ])
    montar()
    expect(screen.getByTestId('contador-marcadas')).toHaveTextContent('3 peças marcadas · 2 na peça toda · 2 por opção')
  })

  it('só por opção: o contador não diz "0 peças marcadas"', () => {
    h.marcas.marked = new Set()
    h.porOpcao.porPeca = new Map([['a2', [{ option_name: 'Cor', option_value: 'Prata 925' }]]])
    montar()
    expect(screen.getByTestId('contador-marcadas')).toHaveTextContent('1 peça marcada por opção')
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

// Feature 67 (T10) — o atalho para a fila e o "Remover" das duas formas (`VFL-33`, `VFL-34`).
describe('VFL-33 — "Ver N sugestões deste valor"', () => {
  it('conta as sugestões DESTE valor, pela regra da fila, e abre a fila recortada por ele', () => {
    h.produtos = [
      ...h.produtos,
      { id: 'x', name: 'Anel Prata 925', slug: 'x', is_active: true, base_price: 1, tags: ['Prata925'], category_ids: [],
        thumb: null, options: [], variants: [], filter_value_ids: [], option_marks: [] },
    ]
    montar()
    expect(screen.getByRole('link', { name: 'Ver 2 sugestões deste valor' })).toHaveAttribute(
      'href',
      '/admin/filtros/sugestoes?valor=prata',
    )
  })

  it('sem sugestão, sem atalho', () => {
    montar()
    expect(screen.queryByRole('link', { name: /sugest/ })).toBeNull()
  })
})

describe('VFL-34 — "Remover de N" tira as duas formas, e a fila é relida', () => {
  it('a da peça toda vai para um unmark, a por opção para o outro; depois relê catálogo e fila', async () => {
    h.porOpcao.porPeca = new Map([['a2', [{ product_id: 'a2', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' }]]])
    montar()
    const espiao = vi.spyOn(qc, 'invalidateQueries')
    expect(screen.getByTestId('situacao-a2').textContent).toBe('Por opção: Cor = Prata 925')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Coração' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Estrela' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover de 2 produtos' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
    })
    expect(h.marcas.unmark).toHaveBeenCalledWith(['a1'])
    expect(h.porOpcao.unmark).toHaveBeenCalledWith(['a2'])
    expect(h.catalogo.fetchCatalog).toHaveBeenCalledWith('revalidar')
    expect(espiao).toHaveBeenCalledWith({ queryKey: PRODUCT_MARKING_KEY })
    expect(espiao).toHaveBeenCalledWith({ queryKey: SUGGESTION_DISMISSALS_KEY })
  })

  it('a falha da peça toda NÃO segue para a por opção', async () => {
    h.marcas.unmark.mockResolvedValue('sem rede')
    h.porOpcao.porPeca = new Map([['a2', []]])
    montar()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Coração' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Estrela' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover de 2 produtos' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
    })
    expect(h.porOpcao.unmark).not.toHaveBeenCalled()
    expect(h.catalogo.fetchCatalog).not.toHaveBeenCalled()
  })
})
