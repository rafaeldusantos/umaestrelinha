// Feature 80 — o fornecedor da peça na PÁGINA real do produto (FOR-05..16).
//
// A página é a de verdade, com `SupplierCard`, `SupplierSummaryCard`, `persistSupplier` e
// `useSuppliers` reais. O dublê de supabase REGISTRA cada escrita num diário (molde de
// `AdminProductFormPage.filtros.test.tsx`), e é o diário que distingue "reaproveitou o fornecedor"
// de "criou outro" — as duas produzem a mesma tela no fim.
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário), `useAdminProducts` (a escrita de
// `products`, no mesmo diário), `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o
// editor rico e o toast.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown; filters?: unknown[] }[],
  produto: null as Record<string, unknown> | null,
  fornecedores: [] as { id: string; name: string }[],
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
      if (op === 'select' && table === 'suppliers') return { data: h.fornecedores, error: null, count: h.fornecedores.length }
      return { data: null, error: null, count: 0 }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'not', 'gte', 'ilike', 'order', 'limit', 'range']) {
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
    b.maybeSingle = () => {
      if (table === 'products' && op === 'select') return Promise.resolve({ data: h.produto, error: null })
      if (table === 'suppliers' && op === 'insert') {
        const r = fim()
        return Promise.resolve(r.error ? r : { data: { id: 'forn-novo' }, error: null })
      }
      return Promise.resolve(fim())
    }
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
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: [], loading: false, error: null }),
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))
import { toast } from '@estrelinha/ui/hooks/use-toast'

import AdminProductFormPage from './AdminProductFormPage'

const COM_FORNECEDOR = { url: 'https://www.exemplo.com/item/123', suppliers: { name: 'Ateliê Prata' } }

beforeEach(() => {
  // A recusa leva o foco ao campo (`focusField`), que rola até ele — o jsdom não tem a API.
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  h.falhar = null
  vi.mocked(toast).mockClear()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.fornecedores = [
    { id: 'atelie', name: 'Ateliê Prata' },
    { id: 'resinas', name: 'Resinas do Sul' },
  ]
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, cost_price: 30, is_active: false,
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
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`. */
const abrirPrecos = async () => {
  await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Preços & variações/ }), { button: 0 })
  await screen.findByRole('combobox', { name: 'Nome do fornecedor' })
}

const nome = () => screen.getByRole('combobox', { name: 'Nome do fornecedor' })
const link = () => screen.getByLabelText('Link da peça')

const salvarRascunho = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  })
}

const escritasDoFornecedor = () =>
  h.diario.filter(e => e.table === 'suppliers' || e.table === 'product_suppliers')

/** Os cards da aba, na ordem do DOM, pelo título. */
const titulosDosCards = () =>
  screen.getAllByRole('heading').map(el => el.textContent?.trim()).filter(Boolean) as string[]

describe('FOR-05/06 — o card na aba Preços & variações', () => {
  it('fica logo abaixo de Preço padrão, com o selo "Só no painel" e os dois campos', async () => {
    montar()
    await abrirPrecos()

    const titulos = titulosDosCards()
    const preco = titulos.indexOf('Preço padrão')
    expect(preco).toBeGreaterThanOrEqual(0)
    expect(titulos[preco + 1]).toBe('Fornecedor')
    expect(titulos[preco + 2]).toBe('Estoque')

    expect(screen.getByText('Só no painel')).toBeInTheDocument()
    expect(nome()).toHaveValue('')
    expect(link()).toHaveValue('')
  })

  it('o Custo diz que é o valor da peça no fornecedor', async () => {
    montar()
    await abrirPrecos()
    expect(screen.getByText('Quanto a peça custa no fornecedor.')).toBeInTheDocument()
  })
})

describe('FOR-07/08 — a sugestão do nome', () => {
  it('digitar sem acento sugere o cadastrado; escolher preenche o campo', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'atelie' } })

    const lista = screen.getByRole('listbox', { name: 'Fornecedores cadastrados' })
    // "atelie" só CONTÉM o nome cadastrado, então "Criar" também aparece (FOR-08) — depois dele.
    expect(within(lista).getAllByRole('option').map(o => o.textContent)).toEqual(['Ateliê Prata', 'Criar ‘atelie’'])
    fireEvent.click(within(lista).getByRole('option', { name: 'Ateliê Prata' }))

    expect(nome()).toHaveValue('Ateliê Prata')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('nome que não existe oferece "Criar"', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Prata Fina' } })
    expect(screen.getByRole('option', { name: 'Criar ‘Prata Fina’' })).toBeInTheDocument()
  })

  it('teclado: ↓/↑ movem, Enter escolhe com o evento CANCELADO (não envia o formulário), Esc fecha', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'r' } })
    // "Resinas do Sul" começa por "r" e vem primeiro; "Ateliê Prata" só contém.
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Resinas do Sul', 'Ateliê Prata', 'Criar ‘r’'])
    const selecionada = () => screen.getAllByRole('option').findIndex(o => o.getAttribute('aria-selected') === 'true')
    fireEvent.keyDown(nome(), { key: 'ArrowDown' })
    fireEvent.keyDown(nome(), { key: 'ArrowDown' })
    expect(selecionada()).toBe(2)
    fireEvent.keyDown(nome(), { key: 'ArrowUp' })
    expect(selecionada()).toBe(1)
    // Em jsdom o Enter não envia formulário de qualquer jeito: a prova é o evento ter sido cancelado
    // (`fireEvent` devolve `false` quando alguém chamou `preventDefault`).
    expect(fireEvent.keyDown(nome(), { key: 'Enter' })).toBe(false)
    expect(nome()).toHaveValue('Ateliê Prata')
    expect(h.diario).toEqual([])

    fireEvent.change(nome(), { target: { value: 'Res' } })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(nome(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('FOR-09/10 — as recusas antes de gravar', () => {
  it('link sem nome: avisa, leva ao campo e não grava NADA', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(link(), { target: { value: 'https://exemplo.com/peca' } })
    await salvarRascunho()

    expect(toast).toHaveBeenCalledWith({ title: 'Informe o nome do fornecedor da peça', variant: 'destructive' })
    expect(h.diario).toEqual([])
    await waitFor(() => expect(document.activeElement).toBe(nome()))
  })

  it('link sem http(s)://: avisa e não grava NADA', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    fireEvent.change(link(), { target: { value: 'exemplo.com/peca' } })
    await salvarRascunho()

    expect(toast).toHaveBeenCalledWith({
      title: 'O link da peça precisa começar com http:// ou https://',
      variant: 'destructive',
    })
    expect(h.diario).toEqual([])
    await waitFor(() => expect(document.activeElement).toBe(link()))
  })
})

describe('FOR-09/10 — as recusas valem também no produto ATIVO na loja', () => {
  // Um produto ativo que PASSA no checklist de publicação (categoria, imagem, peso, SEO): a recusa do
  // fornecedor tem de vir antes do bloqueio por erro, senão nunca seria alcançada.
  beforeEach(() => {
    h.produto = {
      ...h.produto,
      is_active: true,
      product_categories: [{ category_id: 'c1', position: 0 }],
      images: [{ url: 'a.webp', alt: null, source: 'upload' }],
      weight_kg: 0.1,
      seo_title: 'Anel Coração',
      seo_description: 'Anel com o coração de quem você ama.',
    }
  })

  const publicar = async () => {
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    })
  }

  it('link sem nome', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(link(), { target: { value: 'https://exemplo.com/peca' } })
    await publicar()
    expect(toast).toHaveBeenCalledWith({ title: 'Informe o nome do fornecedor da peça', variant: 'destructive' })
    expect(h.diario).toEqual([])
  })

  it('link sem http(s)://', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    fireEvent.change(link(), { target: { value: 'exemplo.com/peca' } })
    await publicar()
    expect(toast).toHaveBeenCalledWith({
      title: 'O link da peça precisa começar com http:// ou https://',
      variant: 'destructive',
    })
    expect(h.diario).toEqual([])
  })
})

describe('FOR-11..14 — a gravação', () => {
  it('nome já cadastrado (outra caixa): REAPROVEITA, e o vínculo leva o link, depois do produto', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'ATELIÊ PRATA' } })
    fireEvent.change(link(), { target: { value: 'https://exemplo.com/peca' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({
        op: 'upsert',
        table: 'product_suppliers',
        payload: [expect.objectContaining({ product_id: 'p1', supplier_id: 'atelie', url: 'https://exemplo.com/peca' })],
      }),
      expect.objectContaining({ op: 'delete', table: 'product_suppliers' }),
    ])
    const ordem = h.diario.map(e => `${e.table}:${e.op}`)
    expect(ordem.indexOf('products:update')).toBeLessThan(ordem.indexOf('product_suppliers:upsert'))
  })

  it('nome novo: cria o fornecedor e vincula com o id devolvido', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Prata Fina' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(escritasDoFornecedor().map(e => [e.table, e.op, e.payload])).toEqual([
      ['suppliers', 'insert', { name: 'Prata Fina' }],
      ['product_suppliers', 'upsert', [expect.objectContaining({ product_id: 'p1', supplier_id: 'forn-novo', url: null })]],
      ['product_suppliers', 'delete', undefined],
    ])
  })

  it('produto DUPLICADO (FOR-15): o fornecedor do original vai para o produto novo, depois de ele existir', async () => {
    h.produto = { ...h.produto, product_suppliers: COM_FORNECEDOR }
    montar('/admin/produtos/novo?from=p1')
    await waitFor(() => expect(screen.getByDisplayValue(/Anel Coração/)).toBeInTheDocument())
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    const ordem = h.diario.map(e => `${e.table}:${e.op}`)
    expect(ordem.indexOf('products:insert')).toBeGreaterThanOrEqual(0)
    expect(ordem.indexOf('products:insert')).toBeLessThan(ordem.indexOf('product_suppliers:upsert'))
    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({
        op: 'upsert',
        table: 'product_suppliers',
        payload: [expect.objectContaining({ product_id: 'novo', supplier_id: 'atelie', url: 'https://www.exemplo.com/item/123' })],
      }),
      expect.objectContaining({ op: 'delete', table: 'product_suppliers' }),
    ])
  })

  it('produto NOVO do zero: o fornecedor é gravado com o id que o insert devolveu', async () => {
    h.produto = null
    montar('/admin/produtos/novo')
    await waitFor(() => expect(screen.getByRole('tab', { name: /Preços & variações/ })).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Preços & variações/ }), { button: 0 })
    fireEvent.change(await screen.findByRole('combobox', { name: 'Nome do fornecedor' }), { target: { value: 'Resinas do Sul' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({
        op: 'upsert',
        table: 'product_suppliers',
        payload: [expect.objectContaining({ product_id: 'novo', supplier_id: 'resinas', url: null })],
      }),
      expect.objectContaining({ op: 'delete', table: 'product_suppliers' }),
    ])
  })

  it('FOR-12 — esvaziar o nome apaga o vínculo do produto', async () => {
    h.produto = { ...h.produto, product_suppliers: COM_FORNECEDOR }
    montar()
    await abrirPrecos()
    expect(nome()).toHaveValue('Ateliê Prata')
    fireEvent.change(nome(), { target: { value: '' } })
    fireEvent.change(link(), { target: { value: '' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(escritasDoFornecedor()).toEqual([
      { op: 'delete', table: 'product_suppliers', payload: undefined, filters: [['eq', 'product_id', 'p1']] },
    ])
  })

  it('FOR-13 — sem mexer no fornecedor, o save não toca nas duas tabelas', async () => {
    h.produto = { ...h.produto, product_suppliers: COM_FORNECEDOR }
    montar()
    await abrirPrecos()
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(h.diario.some(e => e.table === 'products' && e.op === 'update')).toBe(true)
    expect(escritasDoFornecedor()).toEqual([])
  })

  it('FOR-14 — a falha do fornecedor nomeia o passo e não diz que salvou', async () => {
    h.falhar = 'product_suppliers'
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    await salvarRascunho()

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'O produto foi salvo, mas o fornecedor não', variant: 'destructive' }),
      ),
    )
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' }))
    expect(nome()).toHaveValue('Ateliê Prata')
  })
})

describe('FOR-16 — o fornecedor salvo na coluna lateral', () => {
  const cardLateral = () => screen.queryByRole('link', { name: /Abrir a peça no fornecedor/ })

  it('mostra o nome e o link da peça, que abre em nova aba', async () => {
    h.produto = { ...h.produto, product_suppliers: COM_FORNECEDOR }
    montar()
    await waitFor(() => expect(cardLateral()).not.toBeNull())

    const a = cardLateral()!
    expect(a).toHaveAttribute('href', 'https://www.exemplo.com/item/123')
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
    expect(a).toHaveTextContent('exemplo.com/item/123')
    expect(within(a.closest('.rounded-2xl') as HTMLElement).getByText('Ateliê Prata')).toBeInTheDocument()
  })

  it('sem fornecedor salvo, o card não existe', async () => {
    montar()
    await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Fornecedor' })).toBeNull()
  })

  it('editar o nome e o link sem salvar NÃO muda o card; salvar muda', async () => {
    h.produto = { ...h.produto, product_suppliers: COM_FORNECEDOR }
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Resinas do Sul' } })
    fireEvent.change(link(), { target: { value: 'https://outra.com/peca' } })
    expect(cardLateral()).toHaveAttribute('href', 'https://www.exemplo.com/item/123')
    const card = cardLateral()!.closest('.rounded-2xl') as HTMLElement
    expect(within(card).getByText('Ateliê Prata')).toBeInTheDocument()
    expect(within(card).queryByText('Resinas do Sul')).toBeNull()

    // A releitura depois do save devolve o que o banco tem agora.
    h.produto = { ...h.produto, product_suppliers: [{ url: 'https://outra.com/peca', suppliers: { name: 'Ateliê Prata' } }] }
    await salvarRascunho()
    await waitFor(() => expect(cardLateral()).toHaveAttribute('href', 'https://outra.com/peca'))
  })
})

describe('vários fornecedores no mesmo produto', () => {
  const adicionar = () => fireEvent.click(screen.getByRole('button', { name: 'Adicionar fornecedor' }))
  const nome2 = () => screen.getByRole('combobox', { name: 'Nome do fornecedor 2' })
  const link2 = () => screen.getByLabelText('Link da peça 2')

  it('"Adicionar fornecedor" abre uma linha nova com nome e link; a linha some no "Remover"', async () => {
    montar()
    await abrirPrecos()
    expect(screen.queryByRole('combobox', { name: 'Nome do fornecedor 2' })).toBeNull()
    // Uma linha só não tem "Remover": esvaziá-la é o "sem fornecedor".
    expect(screen.queryByRole('button', { name: /Remover o fornecedor/ })).toBeNull()
    adicionar()
    expect(nome2()).toHaveValue('')
    expect(link2()).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Remover o fornecedor 2' }))
    expect(screen.queryByRole('combobox', { name: 'Nome do fornecedor 2' })).toBeNull()
  })

  it('salvar grava um vínculo por linha, cada um com o seu link, na ordem', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    fireEvent.change(link(), { target: { value: 'https://a.com/peca' } })
    adicionar()
    fireEvent.change(nome2(), { target: { value: 'Resinas do Sul' } })
    fireEvent.change(link2(), { target: { value: 'https://r.com/peca' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))

    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({
        op: 'upsert',
        table: 'product_suppliers',
        payload: [
          expect.objectContaining({ product_id: 'p1', supplier_id: 'atelie', url: 'https://a.com/peca', position: 0 }),
          expect.objectContaining({ product_id: 'p1', supplier_id: 'resinas', url: 'https://r.com/peca', position: 1 }),
        ],
      }),
      expect.objectContaining({
        op: 'delete',
        table: 'product_suppliers',
        filters: [['eq', 'product_id', 'p1'], ['gte', 'position', 2]],
      }),
    ])
  })

  it('dois fornecedores salvos: as duas linhas abrem preenchidas, e o card lateral lista os dois', async () => {
    h.produto = {
      ...h.produto,
      product_suppliers: [
        { url: 'https://r.com/peca', position: 1, suppliers: { name: 'Resinas do Sul' } },
        { ...COM_FORNECEDOR, position: 0 },
      ],
    }
    montar()
    await abrirPrecos()
    expect(nome()).toHaveValue('Ateliê Prata')
    expect(nome2()).toHaveValue('Resinas do Sul')
    expect(link2()).toHaveValue('https://r.com/peca')
    expect(screen.getByRole('heading', { name: 'Fornecedores' })).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /Abrir a peça no fornecedor/ })
    expect(links.map(a => a.getAttribute('href'))).toEqual(['https://www.exemplo.com/item/123', 'https://r.com/peca'])
  })

  it('remover a segunda linha salva apaga só aquele vínculo', async () => {
    h.produto = {
      ...h.produto,
      product_suppliers: [
        { ...COM_FORNECEDOR, position: 0 },
        { url: null, position: 1, suppliers: { name: 'Resinas do Sul' } },
      ],
    }
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover o fornecedor 2' }))
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))
    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({ op: 'upsert', payload: [expect.objectContaining({ supplier_id: 'atelie', position: 0 })] }),
      expect.objectContaining({ op: 'delete', filters: [['eq', 'product_id', 'p1'], ['gte', 'position', 1]] }),
    ])
  })

  it('o mesmo fornecedor em duas linhas é gravado nas duas, cada uma com o seu link', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    fireEvent.change(link(), { target: { value: 'https://a.com/anuncio-1' } })
    adicionar()
    fireEvent.change(nome2(), { target: { value: 'atelie prata' } })
    fireEvent.change(link2(), { target: { value: 'https://a.com/anuncio-2' } })
    await salvarRascunho()
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rascunho salvo' })))
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }))

    expect(escritasDoFornecedor()).toEqual([
      expect.objectContaining({
        op: 'upsert',
        table: 'product_suppliers',
        payload: [
          expect.objectContaining({ product_id: 'p1', supplier_id: 'atelie', url: 'https://a.com/anuncio-1', position: 0 }),
          expect.objectContaining({ product_id: 'p1', supplier_id: 'atelie', url: 'https://a.com/anuncio-2', position: 1 }),
        ],
      }),
      expect.objectContaining({ op: 'delete', filters: [['eq', 'product_id', 'p1'], ['gte', 'position', 2]] }),
    ])
    // O nome digitado sem acento reaproveita o cadastrado: nenhum fornecedor novo nasce.
    expect(h.diario.filter(e => e.table === 'suppliers')).toEqual([])
  })

  it('link errado na segunda linha é recusado e nada é gravado', async () => {
    montar()
    await abrirPrecos()
    fireEvent.change(nome(), { target: { value: 'Ateliê Prata' } })
    adicionar()
    fireEvent.change(nome2(), { target: { value: 'Resinas do Sul' } })
    fireEvent.change(link2(), { target: { value: 'r.com/peca' } })
    await salvarRascunho()
    expect(toast).toHaveBeenCalledWith({
      title: 'O link da peça precisa começar com http:// ou https://',
      variant: 'destructive',
    })
    expect(h.diario).toEqual([])
  })
})
