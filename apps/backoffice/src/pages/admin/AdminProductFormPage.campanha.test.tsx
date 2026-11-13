// O desconto de campanha na PÁGINA real do produto: o cartão de cada campanha agendada ou em
// vigência na aba de preço, a prévia do preço por variação e a gravação pelo Salvar.
//
// A página é a de verdade, com a leitura das campanhas, o cartão, o selo e a porta de escrita de
// `entities/campaign` reais. O dublê do supabase REGISTRA cada escrita num diário (molde de
// `AdminProductFormPage.fornecedor.test.tsx`), e é o diário que prova o que a porta mandou ao banco.
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário), `useAdminProducts` (a escrita de
// `products`, no mesmo diário), `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o
// editor rico e o toast. O relógio é fixo (só `Date`), para o estado de cada campanha não depender
// do dia em que a suíte roda.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown; filters?: unknown[] }[],
  produto: null as Record<string, unknown> | null,
  campanhas: [] as Record<string, unknown>[],
  uso: [] as { campaign_id: string; percent: number; products: number }[],
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
      if (op === 'select' && table === 'campaigns') return { data: h.campanhas, error: null }
      if (op === 'select' && table === 'campaign_percent_usage') return { data: h.uso, error: null }
      if (table === 'product_campaigns' && op === 'upsert') return { data: payload, error: null }
      if (table === 'product_campaigns' && op === 'delete') return { data: [{ product_id: 'p1' }], error: null }
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

/** 20/11/2026, meio-dia em Brasília. */
const AGORA = new Date('2026-11-20T15:00:00Z')

const campanha = (over: Record<string, unknown>) => ({
  badge_text: 'BLACK FRIDAY',
  band_color: '#161514',
  accent_color: '#C2A063',
  active: true,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  ...over,
})

// O fim é EXCLUSIVO no banco: 01/12 00:00 de Brasília ⇒ o último minuto que vale é 30/11 23:59.
const BLACK_FRIDAY = campanha({
  id: 'bf',
  name: 'Black Friday',
  starts_at: '2026-11-13T03:00:00Z',
  ends_at: '2026-12-01T03:00:00Z',
})
const NATAL = campanha({
  id: 'natal',
  name: 'Natal',
  badge_text: 'NATAL',
  band_color: '#6E2433',
  accent_color: '#F6DCD8',
  starts_at: '2026-12-01T03:00:00Z',
  ends_at: '2026-12-26T03:00:00Z',
})
const ENCERRADA = campanha({
  id: 'velha',
  name: 'Dia das Mães',
  starts_at: '2026-05-01T03:00:00Z',
  ends_at: '2026-05-15T03:00:00Z',
})
const DESLIGADA = campanha({
  id: 'off',
  name: 'Ano Novo',
  active: false,
  starts_at: '2026-12-27T03:00:00Z',
  ends_at: '2027-01-02T03:00:00Z',
})

const usoDe = (id: string, percents: number[]) => percents.map(percent => ({ campaign_id: id, percent, products: 0 }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AGORA)
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  h.falhar = null
  vi.mocked(toast).mockClear()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.campanhas = []
  h.uso = []
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 209.9, cost_price: 30, is_active: false,
    product_variants: [], product_categories: [], product_faqs: [], product_filter_values: [],
    product_suppliers: null, product_campaigns: [],
  }
})

afterEach(() => {
  vi.useRealTimers()
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
  await screen.findByRole('heading', { name: 'Preço padrão' })
}

const cartoes = () => screen.queryAllByTestId('cartao-da-campanha')

/** A leitura das campanhas é assíncrona: espera o grupo aparecer antes de escolher. */
const escolher = async (campanhaNome: string, rotulo: string) =>
  fireEvent.click(within(await screen.findByRole('radiogroup', { name: `Desconto na ${campanhaNome}` })).getByRole('radio', { name: rotulo }))

const salvar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  })
}

const escritasDaCampanha = () => h.diario.filter(e => e.table === 'product_campaigns')

describe('o cartão da campanha na aba de preço', () => {
  it('sem campanha agendada ou em vigência, nenhum cartão — nem a encerrada nem a desligada', async () => {
    h.campanhas = [ENCERRADA, DESLIGADA]
    h.uso = [...usoDe('velha', [10]), ...usoDe('off', [10])]
    montar()
    await abrirPrecos()
    // A leitura das campanhas é assíncrona: deixa ela responder antes de afirmar a ausência.
    await act(async () => {
      await new Promise(r => setTimeout(r, 20))
    })
    expect(cartoes()).toHaveLength(0)
    expect(screen.queryByRole('radiogroup', { name: /Desconto na/ })).toBeNull()
  })

  it('uma em vigência e uma agendada: dois cartões na ordem do início, cada um com a sua vigência e a sua nota', async () => {
    // O banco devolve na ordem do início DECRESCENTE (a da lista de campanhas): o cartão reordena.
    h.campanhas = [DESLIGADA, NATAL, BLACK_FRIDAY, ENCERRADA]
    h.uso = [...usoDe('bf', [10, 15, 20]), ...usoDe('natal', [15]), ...usoDe('velha', [10]), ...usoDe('off', [10])]
    h.produto = { ...h.produto, product_campaigns: [{ campaign_id: 'bf', percent: 15 }, { campaign_id: 'natal', percent: 15 }] }
    montar()
    await abrirPrecos()

    await waitFor(() => expect(cartoes()).toHaveLength(2))
    const [primeiro, segundo] = cartoes()
    expect(within(primeiro).getByRole('heading', { name: 'Black Friday' })).toBeInTheDocument()
    expect(within(primeiro).getByText('Em vigência')).toBeInTheDocument()
    expect(within(primeiro).getByText('13/11 a 30/11/2026')).toBeInTheDocument()
    expect(
      within(primeiro).getByText(
        'A loja mostra este preço até 30/11 às 23:59. O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha.',
      ),
    ).toBeInTheDocument()

    expect(within(segundo).getByRole('heading', { name: 'Natal' })).toBeInTheDocument()
    expect(within(segundo).getByText('Agendada')).toBeInTheDocument()
    expect(within(segundo).getByText('01/12 a 25/12/2026')).toBeInTheDocument()
    expect(
      within(segundo).getByText(
        'A loja mostra este preço a partir de 01/12. O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha.',
      ),
    ).toBeInTheDocument()
  })

  it('o campo oferece "Nenhum · 10% · 15% · 20%", com o percentual gravado escolhido', async () => {
    h.campanhas = [BLACK_FRIDAY]
    h.uso = usoDe('bf', [20, 10, 15])
    h.produto = { ...h.produto, product_campaigns: [{ campaign_id: 'bf', percent: 15 }] }
    montar()
    await abrirPrecos()

    const grupo = await screen.findByRole('radiogroup', { name: 'Desconto na Black Friday' })
    const opcoes = within(grupo).getAllByRole('radio')
    expect(opcoes.map(o => o.textContent)).toEqual(['Nenhum', '10%', '15%', '20%'])
    expect(opcoes.map(o => o.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true', 'false'])
  })

  it('sem marcação, "Nenhum" vem escolhido e a nota diz que a peça fica fora da vitrine', async () => {
    h.campanhas = [BLACK_FRIDAY]
    h.uso = usoDe('bf', [10, 15, 20])
    montar()
    await abrirPrecos()

    const grupo = await screen.findByRole('radiogroup', { name: 'Desconto na Black Friday' })
    expect(within(grupo).getByRole('radio', { name: 'Nenhum' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Sem desconto: a peça fica fora da vitrine /ofertas e sem selo.')).toBeInTheDocument()
    expect(screen.queryByTestId('previa-da-campanha')).toBeNull()
  })
})

const variacao = (id: string, acabamento: string, price: number, over: Record<string, unknown> = {}) => ({
  id,
  product_id: 'p1',
  option_values: { Acabamento: acabamento },
  name: null,
  sku: `SKU-${id}`,
  price,
  compare_price: null,
  stock: 3,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

/** As linhas da tabela por variação: [variação, preço, na campanha]. */
const linhasDaTabela = (campanhaNome: string) =>
  within(screen.getByRole('table', { name: `Preço de cada variação na ${campanhaNome}` }))
    .getAllByRole('row')
    .slice(1)
    .map(tr => within(tr).getAllByRole('cell').map(td => td.textContent?.replace(/\s/g, ' ')))

describe('a prévia do preço com a campanha', () => {
  beforeEach(() => {
    h.campanhas = [BLACK_FRIDAY]
    h.uso = usoDe('bf', [10, 15, 20])
  })

  it('20% numa peça de R$ 209,90 mostra R$ 209,90 riscado → R$ 167,92, com o selo da campanha', async () => {
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '20%')

    const previa = screen.getByTestId('previa-da-campanha')
    expect(within(previa).getByText('R$ 209,90').tagName).toBe('S')
    expect(within(previa).getByText('R$ 167,92')).toBeInTheDocument()
    const selo = within(previa).getByRole('img', { name: 'BLACK FRIDAY, 20% de desconto' })
    // As cores são as da campanha, por `style` inline.
    const [faixa, percentual] = Array.from(selo.children) as HTMLElement[]
    expect(faixa.style.backgroundColor).toBe('rgb(22, 21, 20)')
    expect(percentual.style.backgroundColor).toBe('rgb(194, 160, 99)')
    expect(screen.getByText(/A loja mostra este preço até 30\/11 às 23:59\./)).toBeInTheDocument()
    expect(screen.queryByText('Sem desconto: a peça fica fora da vitrine /ofertas e sem selo.')).toBeNull()
  })

  it('com variações de preços diferentes, a tabela mostra cada uma com o percentual sobre o próprio preço', async () => {
    h.produto = {
      ...h.produto,
      options: [{ name: 'Acabamento', values: ['Prata', 'Ouro', 'Bronze'], position: 0 }],
      product_variants: [
        variacao('v1', 'Prata', 209.9),
        variacao('v2', 'Ouro', 249.9, { position: 1 }),
        // Pausada: a loja não a vende, e a tabela não a mostra.
        variacao('v3', 'Bronze', 99.9, { position: 2, is_active: false }),
      ],
    }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '20%')

    const tabela = screen.getByRole('table', { name: 'Preço de cada variação na Black Friday' })
    expect(within(tabela).getAllByRole('columnheader').map(th => th.textContent)).toEqual(['Variação', 'Preço', 'Na campanha'])
    expect(linhasDaTabela('Black Friday')).toEqual([
      ['Prata', 'R$ 209,90', 'R$ 167,92'],
      ['Ouro', 'R$ 249,90', 'R$ 199,92'],
    ])
    // A coluna do preço some abaixo de 1024 px (`lg`).
    expect(within(tabela).getByRole('columnheader', { name: 'Preço' }).className.split(/\s+/)).toEqual(
      expect.arrayContaining(['hidden', 'lg:table-cell']),
    )
  })

  it('com "de" R$ 259,90 e preço R$ 239,90, 10% cobra R$ 233,91 (o menor), nunca R$ 215,91', async () => {
    h.produto = { ...h.produto, base_price: 239.9, original_price: 259.9 }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '10%')

    const previa = screen.getByTestId('previa-da-campanha')
    expect(within(previa).getByText('R$ 259,90').tagName).toBe('S')
    expect(within(previa).getByText('R$ 233,91')).toBeInTheDocument()
    expect(within(previa).queryByText('R$ 215,91')).toBeNull()
  })

  it('a variação com "de" também cobra o menor', async () => {
    h.produto = {
      ...h.produto,
      options: [{ name: 'Acabamento', values: ['Prata'], position: 0 }],
      product_variants: [variacao('v1', 'Prata', 239.9, { compare_price: 259.9 })],
    }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '10%')
    expect(linhasDaTabela('Black Friday')).toEqual([['Prata', 'R$ 259,90', 'R$ 233,91']])
  })

  it('peça sem grade com "de" R$ 374,00 na variação: o topo e a tabela dão R$ 336,60, nunca R$ 314,91', async () => {
    // A forma do catálogo importado: o "de" mora na variação única, e `original_price` é nulo.
    h.produto = {
      ...h.produto,
      base_price: 349.9,
      original_price: null,
      options: [],
      product_variants: [{ ...variacao('v1', 'Prata', 349.9, { compare_price: 374 }), option_values: {} }],
    }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '10%')

    const previa = screen.getByTestId('previa-da-campanha')
    expect(within(previa).getByText('R$ 374,00').tagName).toBe('S')
    expect(within(previa).getByText('R$ 336,60')).toBeInTheDocument()
    expect(within(previa).queryByText('R$ 314,91')).toBeNull()
    expect(linhasDaTabela('Black Friday')).toEqual([['Variação 1', 'R$ 374,00', 'R$ 336,60']])
  })

  it('cada opção de percentual tem alvo de 44 px e pelo menos 64 px de largura, com o número em negrito', async () => {
    montar()
    await abrirPrecos()
    const opcoes = within(await screen.findByRole('radiogroup', { name: 'Desconto na Black Friday' })).getAllByRole('radio')
    for (const opcao of opcoes) {
      expect(opcao.className.split(/\s+/)).toEqual(expect.arrayContaining(['h-11', 'min-w-16']))
    }
    expect(opcoes.slice(1).every(o => o.className.split(/\s+/).includes('font-bold'))).toBe(true)
  })
})

describe('a marcação grava com o Salvar, pela porta das campanhas', () => {
  beforeEach(() => {
    h.campanhas = [NATAL, BLACK_FRIDAY]
    h.uso = [...usoDe('bf', [10, 15, 20]), ...usoDe('natal', [15])]
  })

  it('escolher 20% suja o formulário e o Salvar grava a peça na campanha com o percentual', async () => {
    montar()
    await abrirPrecos()
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
    await escolher('Black Friday', '20%')
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    // Nada vai ao banco antes do Salvar.
    expect(escritasDaCampanha()).toEqual([])

    await salvar()

    await waitFor(() => expect(escritasDaCampanha()).toHaveLength(1))
    expect(escritasDaCampanha()[0]).toMatchObject({
      op: 'upsert',
      payload: [{ product_id: 'p1', campaign_id: 'bf', percent: 20 }],
    })
    // O preço cadastrado não muda com a campanha.
    const produto = h.diario.find(e => e.table === 'products')
    expect(produto?.payload).toMatchObject({ base_price: 209.9, original_price: null })
  })

  it('"Nenhum" tira a peça da campanha — e só daquela', async () => {
    h.produto = { ...h.produto, product_campaigns: [{ campaign_id: 'bf', percent: 15 }, { campaign_id: 'natal', percent: 15 }] }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', 'Nenhum')
    await salvar()

    await waitFor(() => expect(escritasDaCampanha()).toHaveLength(1))
    expect(escritasDaCampanha()[0].op).toBe('delete')
    expect(escritasDaCampanha()[0].filters).toEqual(
      expect.arrayContaining([
        ['eq', 'campaign_id', 'bf'],
        ['in', 'product_id', ['p1']],
      ]),
    )
  })

  it('voltar ao percentual gravado e salvar não escreve marcação nenhuma', async () => {
    h.produto = { ...h.produto, product_campaigns: [{ campaign_id: 'bf', percent: 15 }] }
    montar()
    await abrirPrecos()
    await escolher('Black Friday', '20%')
    await escolher('Black Friday', '15%')
    await salvar()

    await waitFor(() => expect(h.diario.some(e => e.table === 'products')).toBe(true))
    expect(escritasDaCampanha()).toEqual([])
  })

  it('a gravação recusada avisa que o produto foi salvo e o desconto não', async () => {
    h.falhar = 'product_campaigns'
    montar()
    await abrirPrecos()
    await escolher('Natal', '15%')
    await salvar()

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'O produto foi salvo, mas o desconto de campanha não', variant: 'destructive' }),
      ),
    )
  })
})
