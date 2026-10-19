// Feature 66 — o bloco "Filtros da loja" na PÁGINA real do produto (`FLT-11`..`FLT-14`, T10).
//
// A página é a de verdade, com `FilterValuesCard` e `persistProductRelations` reais. O dublê de
// supabase REGISTRA cada escrita num diário único, junto com as do `useAdminProducts` dublado — é o
// diário que prova a ORDEM: o produto novo existe ANTES de a primeira marcação sair (`FLT-13`).
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário), `useAdminProducts` (a escrita de
// `products`, que entra no mesmo diário), `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros
// (`@/entities/filter`, provado por conta própria), o editor rico e o toast.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown; filters?: unknown[] }[],
  produto: null as Record<string, unknown> | null,
  grupos: [] as unknown[],
  /** Feature 67: a tabela cuja escrita responde erro. */
  falhar: null as string | null,
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    const filtros: unknown[] = []
    let op = 'select'
    let payload: unknown
    const fim = () => {
      if (op !== 'select') h.diario.push({ op, table, payload, filters: filtros })
      if (op !== 'select' && h.falhar === table) return { data: null, error: { message: 'boom' }, count: 0 }
      return { data: null, error: null, count: 0 }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'ilike', 'order', 'limit', 'range']) {
      b[m] = (...args: unknown[]) => {
        filtros.push([m, ...args])
        return b
      }
    }
    b.select = () => b
    b.insert = (p: unknown) => ((op = 'insert'), (payload = p), b)
    b.update = (p: unknown) => ((op = 'update'), (payload = p), b)
    b.upsert = (p: unknown) => ((op = 'upsert'), (payload = p), b)
    b.delete = () => ((op = 'delete'), b)
    b.maybeSingle = () =>
      Promise.resolve(table === 'products' && op === 'select' ? { data: h.produto, error: null } : fim())
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(fim()).then(ok, ko)
    return b
  }
  return { supabase: { from } }
})
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    createProduct: vi.fn(async (payload: unknown) => {
      h.diario.push({ op: 'insert', table: 'products', payload })
      return { error: null, id: 'novo' }
    }),
    updateProduct: vi.fn(async (_id: string, payload: unknown) => {
      h.diario.push({ op: 'update', table: 'products', payload })
      return null
    }),
  }),
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [] }),
}))
vi.mock('@/features/faq-library/api/useAdminFaqs', () => ({
  useAdminFaqs: () => ({ faqs: [], loading: false, error: null }),
}))
// Desde a 67 o resto do barrel é o ORIGINAL (`L-030`): o bloco lê as recusas da peça pelo client
// dublado acima, que responde contagem zero.
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: h.grupos, loading: false, error: null }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))
import { toast } from '@estrelinha/ui/hooks/use-toast'

import AdminProductFormPage from './AdminProductFormPage'

const valor = (id: string, group_id: string, name: string, sort_order: number) => ({
  id, group_id, name, slug: id, sort_order, marked_count: 0,
})

beforeEach(() => {
  h.falhar = null
  vi.mocked(toast).mockClear()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.grupos = [
    {
      id: 'acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0, created_at: '',
      values: [valor('prata', 'acab', 'Prata 925', 0), valor('ouro', 'acab', 'Folheado a ouro', 1)],
    },
    {
      id: 'ocasiao', name: 'Ocasião', slug: 'ocasiao', is_active: false, sort_order: 1, created_at: '',
      values: [valor('maes', 'ocasiao', 'Dia das Mães', 0)],
    },
  ]
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, is_active: false,
    product_variants: [], product_categories: [], product_faqs: [],
    product_filter_values: [{ value_id: 'prata' }],
  }
})

const montar = (rota: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/produtos/novo" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const bloco = () => screen.getByText('Filtros da loja').closest('.rounded-2xl') as HTMLElement
const chip = (nome: string) => within(bloco()).getByRole('button', { name: nome })

const salvarRascunho = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
  })
  await waitFor(() => expect(screen.getByText('lista')).toBeInTheDocument())
}

describe('FLT-11 — o bloco na aba Geral', () => {
  it('um grupo por linha, valores como chips na ordem do painel, e o que a peça já tem vem marcado', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(chip('Prata 925')).toHaveAttribute('aria-pressed', 'true'))
    const grupos = within(bloco()).getAllByRole('group')
    expect(grupos.map(g => g.getAttribute('aria-label'))).toEqual(['Acabamento', 'Ocasião'])
    expect(within(grupos[0]).getAllByRole('button').map(b => b.textContent)).toEqual(['Prata 925', 'Folheado a ouro'])
    expect(chip('Folheado a ouro')).toHaveAttribute('aria-pressed', 'false')
    expect(within(bloco()).getByRole('link', { name: 'Gerenciar filtros ›' })).toHaveAttribute('href', '/admin/filtros')
  })
})

describe('FLT-12 — sem grupo nenhum', () => {
  it('diz isso e linka para /admin/filtros', async () => {
    h.grupos = []
    montar('/admin/produtos/novo')
    await waitFor(() => expect(screen.getByText(/Nenhum filtro criado ainda\./)).toBeInTheDocument())
    expect(screen.getByRole('link', { name: 'Criar os filtros da loja' })).toHaveAttribute('href', '/admin/filtros')
  })
})

describe('FLT-14 — grupo desligado aparece com selo e continua editável', () => {
  it('o selo "Desligado na loja", e o chip alterna', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(chip('Dia das Mães')).toBeInTheDocument())
    const ocasiao = within(bloco()).getByRole('group', { name: 'Ocasião' })
    expect(within(ocasiao).getByText('Desligado na loja')).toBeInTheDocument()
    expect(within(within(bloco()).getByRole('group', { name: 'Acabamento' })).queryByText('Desligado na loja')).toBeNull()
    fireEvent.click(chip('Dia das Mães'))
    expect(chip('Dia das Mães')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('FLT-13 — o save grava as marcações pelo diff', () => {
  it('produto existente: apaga só a que saiu e grava só a que entrou', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(chip('Prata 925')).toHaveAttribute('aria-pressed', 'true'))
    fireEvent.click(chip('Prata 925'))
    fireEvent.click(chip('Folheado a ouro'))
    await salvarRascunho()

    const filtros = h.diario.filter(e => e.table === 'product_filter_values')
    expect(filtros).toEqual([
      { op: 'delete', table: 'product_filter_values', payload: undefined, filters: [['eq', 'product_id', 'p1'], ['in', 'value_id', ['prata']]] },
      { op: 'upsert', table: 'product_filter_values', payload: [{ product_id: 'p1', value_id: 'ouro' }], filters: [] },
    ])
  })

  it('sem mexer nos chips, o save não toca nas marcações', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(chip('Prata 925')).toHaveAttribute('aria-pressed', 'true'))
    await salvarRascunho()
    expect(h.diario.filter(e => e.table === 'product_filter_values')).toEqual([])
  })

  it('produto NOVO recebe as marcações DEPOIS de existir, com o id que o banco devolveu', async () => {
    montar('/admin/produtos/novo')
    await waitFor(() => expect(chip('Folheado a ouro')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Nome do produto'), { target: { value: 'Colar Estrela' } })
    fireEvent.click(chip('Folheado a ouro'))
    await salvarRascunho()

    const ordem = h.diario.map(e => `${e.op} ${e.table}`)
    const criou = ordem.indexOf('insert products')
    const marcou = ordem.indexOf('upsert product_filter_values')
    expect(criou).toBeGreaterThanOrEqual(0)
    expect(marcou).toBeGreaterThan(criou)
    expect(h.diario[marcou].payload).toEqual([{ product_id: 'novo', value_id: 'ouro' }])
  })
})

// Feature 67 (T06/T07) — a seção "Pelas variações" na PÁGINA real, e o save gravando por opção.
describe('VFL-01/03/08 — as marcações por opção pela página do produto', () => {
  beforeEach(() => {
    h.produto = {
      ...h.produto,
      options: [{ name: 'Cor', values: ['Prata 925', 'Folheado a Ouro'], position: 0 }],
      product_variants: [
        { id: 'v1', product_id: 'p1', option_values: { Cor: 'Prata 925' }, is_active: true, position: 0, price: 100, stock: 1 },
        { id: 'v2', product_id: 'p1', option_values: { Cor: 'Folheado a Ouro' }, is_active: true, position: 1, price: 100, stock: 1 },
      ],
      product_filter_values: [],
      product_option_filter_values: [{ option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' }],
    }
  })

  const linha = (rotulo: string) => screen.getByRole('group', { name: rotulo })

  it('a página monta a seção com a marcação que veio do banco', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    expect(within(linha('Cor = Prata 925')).getByRole('button', { name: 'Acabamento › Prata 925' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('salvar grava o DIFF por opção: apaga pelos quatro campos e insere a nova, depois do produto', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    fireEvent.click(within(linha('Cor = Prata 925')).getByRole('button', { name: 'Acabamento › Prata 925' }))
    fireEvent.click(await within(linha('Cor = Folheado a Ouro')).findByRole('button', { name: 'Aceitar' }))
    await salvarRascunho()

    const porOpcao = h.diario.filter(e => e.table === 'product_option_filter_values')
    expect(porOpcao).toEqual([
      {
        op: 'delete',
        table: 'product_option_filter_values',
        payload: undefined,
        filters: [
          ['eq', 'product_id', 'p1'],
          ['eq', 'option_name', 'Cor'],
          ['eq', 'option_value', 'Prata 925'],
          ['in', 'value_id', ['prata']],
        ],
      },
      {
        op: 'upsert',
        table: 'product_option_filter_values',
        payload: [{ product_id: 'p1', option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'ouro' }],
        filters: [],
      },
    ])
    const ordem = h.diario.map(e => `${e.op} ${e.table}`)
    expect(ordem.indexOf('update products')).toBeLessThan(ordem.indexOf('delete product_option_filter_values'))
    // "Aceitar" não gravou nada sozinho: a única escrita de recusa seria em outra tabela.
    expect(h.diario.some(e => e.table === 'filter_suggestion_dismissals')).toBe(false)
  })

  it('sem mexer, o save não toca nas marcações por opção', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    await salvarRascunho()
    expect(h.diario.filter(e => e.table === 'product_option_filter_values')).toEqual([])
  })

  it('produto NOVO (duplicado): as marcações por opção saem DEPOIS de o produto existir, com o id novo', async () => {
    montar('/admin/produtos/novo?from=p1')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    await salvarRascunho()
    const ordem = h.diario.map(e => `${e.op} ${e.table}`)
    const criou = ordem.indexOf('insert products')
    const marcou = ordem.indexOf('upsert product_option_filter_values')
    expect(criou).toBeGreaterThanOrEqual(0)
    expect(marcou).toBeGreaterThan(criou)
    expect(h.diario[marcou].payload).toEqual([
      { product_id: 'novo', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' },
    ])
  })

  // Rodada 2 da verificação (B25): as duas pontas — `marcacoesVigentes` e `persistProduct` — já
  // tinham teste; o FIO entre elas, na página, não. Trocar a projeção pela lista crua deixava a
  // página verde. Estes dois casos editam os eixos pela UI REAL (`OptionsEditor`, aba Preços) e
  // leem o diário do client: sem a projeção, o save não escreve nada e os dois reprovam.
  const abrirPrecos = () => fireEvent.mouseDown(screen.getByRole('tab', { name: 'Preços & variações' }))

  it('VFL-05 — renomear o eixo pela tela e salvar: a marcação vai com o nome NOVO, e a do antigo sai', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    abrirPrecos()
    fireEvent.change(await screen.findByLabelText('Eixo 1'), { target: { value: 'Metal' } })
    await salvarRascunho()

    const porOpcao = h.diario.filter(e => e.table === 'product_option_filter_values')
    const upserts = porOpcao.filter(e => e.op === 'upsert')
    const deletes = porOpcao.filter(e => e.op === 'delete')
    expect(upserts).toHaveLength(1)
    expect(upserts[0].payload).toEqual([
      { product_id: 'p1', option_name: 'Metal', option_value: 'Prata 925', value_id: 'prata' },
    ])
    // Nenhuma linha gravada com o nome antigo.
    expect(JSON.stringify(upserts)).not.toContain('"Cor"')
    expect(deletes).toEqual([
      {
        op: 'delete',
        table: 'product_option_filter_values',
        payload: undefined,
        filters: [
          ['eq', 'product_id', 'p1'],
          ['eq', 'option_name', 'Cor'],
          ['eq', 'option_value', 'Prata 925'],
          ['in', 'value_id', ['prata']],
        ],
      },
    ])
  })

  it('VFL-06 — remover o texto da opção pela tela e salvar: a marcação daquele texto é apagada', async () => {
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    abrirPrecos()
    fireEvent.click(await screen.findByRole('button', { name: 'Remover valor Prata 925' }))
    await salvarRascunho()

    const porOpcao = h.diario.filter(e => e.table === 'product_option_filter_values')
    expect(porOpcao).toEqual([
      {
        op: 'delete',
        table: 'product_option_filter_values',
        payload: undefined,
        filters: [
          ['eq', 'product_id', 'p1'],
          ['eq', 'option_name', 'Cor'],
          ['eq', 'option_value', 'Prata 925'],
          ['in', 'value_id', ['prata']],
        ],
      },
    ])
  })

  it('VFL-08 — a falha nomeia o passo, NÃO diz salvo e mantém a seleção na tela', async () => {
    h.falhar = 'product_option_filter_values'
    montar('/admin/produtos/p1/editar')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Pelas variações' })).toBeInTheDocument())
    fireEvent.click(await within(linha('Cor = Folheado a Ouro')).findByRole('button', { name: 'Aceitar' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'O produto foi salvo, mas as marcações por variação não', variant: 'destructive' }),
      ),
    )
    expect(screen.queryByText('lista')).toBeNull()
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Produto atualizado!' }))
    expect(
      within(linha('Cor = Folheado a Ouro')).getByRole('button', { name: 'Acabamento › Folheado a ouro' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
