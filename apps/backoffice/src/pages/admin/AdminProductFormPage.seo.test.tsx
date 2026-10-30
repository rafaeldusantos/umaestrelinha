// Feature 84 — publicar sem SEO e a prévia derivada, na PÁGINA real do produto (SIA-01, SIA-02,
// SIA-04, SIA-05 pela fiação).
//
// A página é a de verdade, com o checklist, o `SeoPreview` e o `handleSubmit` reais. Inventário de
// `vi.mock` (`L-030`), copiado de `AdminProductFormPage.fornecedor.test.tsx`: o client do supabase
// (diário de escritas), `useAdminProducts` (a escrita de `products`, no mesmo diário),
// `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o editor rico e o toast. É o diário
// que prova o que foi GRAVADO — a tela no fim é a mesma com ou sem o `null`.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import { STORE_DESCRIPTION_FLOOR } from '@estrelinha/core/seo'

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown; filters?: unknown[] }[],
  produto: null as Record<string, unknown> | null,
  fornecedores: [] as { id: string; name: string }[],
  falhar: null as string | null,
  // Feature 84, T12: o `functions.invoke` da sugestão. Cada chamada fica registrada e SEGURA até o
  // teste resolvê-la — a ordem (resposta antes/depois de uma edição, de uma troca de aba) é o teste
  // quem decide, nunca um relógio.
  invocacoes: [] as { nome: string; body: Record<string, unknown>; resolver: (r: unknown) => void }[],
  // Conserto r1 (SIA-07): as linhas de `store_settings` que `useSeoSettings` lê. `null` = a leitura
  // não devolve linha nenhuma (vale o default do TypeScript).
  settings: null as { key: string; value: unknown }[] | null,
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
      if (op === 'select' && table === 'store_settings') return { data: h.settings, error: null, count: 0 }
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
  const invoke = (nome: string, opcoes: { body: Record<string, unknown> }) =>
    new Promise(resolver => {
      h.invocacoes.push({ nome, body: opcoes.body, resolver })
    })
  return { supabase: { from, functions: { invoke } } }
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


beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  h.falhar = null
  vi.mocked(toast).mockClear()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.fornecedores = []
  h.invocacoes = []
  h.settings = null
  // Um produto ATIVO que passa nos CINCO itens bloqueantes (nome, categoria, imagem, peso, grade) e
  // não tem SEO nenhum. Antes da `84` o salvar de produto na loja nascia bloqueado com ele.
  h.produto = {
    id: 'p1', name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, cost_price: 30, is_active: true,
    description: '<p>Anel feito à mão em resina com o coração de quem você ama.</p>',
    product_variants: [], product_categories: [{ category_id: 'c1', position: 0 }], product_faqs: [],
    product_filter_values: [], product_suppliers: null,
    images: [{ url: 'a.webp', alt: null, source: 'upload' }],
    weight_kg: 0.1,
    seo_title: null,
    seo_description: null,
  }
})

const montar = (rota = '/admin/produtos/p1/editar') => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const carregado = () => waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())

/** O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`. */
const abrirAba = (nome: RegExp) => fireEvent.mouseDown(screen.getByRole('tab', { name: nome }), { button: 0 })

const clicar = async (nome: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: nome }))
  })
}

const gravacaoDoProduto = () => {
  const escrita = h.diario.find(e => e.table === 'products' && e.op === 'update')
  expect(escrita, 'o produto não foi gravado').toBeTruthy()
  return escrita!.payload as Record<string, unknown>
}

const toastsDestrutivos = () =>
  vi.mocked(toast).mock.calls.filter(([arg]) => (arg as { variant?: string }).variant === 'destructive')

describe('SIA-01 — salvar produto ativo sem SEO', () => {
  it('o botão está habilitado e grava is_active: true com os dois campos de SEO nulos, sem toast de erro', async () => {
    montar()
    await carregado()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()

    await clicar('Salvar')

    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    expect(gravacaoDoProduto().seo_title).toBeNull()
    expect(gravacaoDoProduto().seo_description).toBeNull()
    expect(toastsDestrutivos()).toEqual([])
  })

  it('não leva à aba SEO: a aba aberta continua sendo a Geral', async () => {
    montar()
    await carregado()
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    expect(screen.getByRole('tab', { name: /^Geral/ })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: /^SEO/ })).toHaveAttribute('data-state', 'inactive')
  })

  it('campos só com espaços contam como vazios: gravam null', async () => {
    h.produto = { ...h.produto, seo_title: '   ', seo_description: '  ' }
    montar()
    await carregado()
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    expect(gravacaoDoProduto().seo_title).toBeNull()
    expect(gravacaoDoProduto().seo_description).toBeNull()
    expect(toastsDestrutivos()).toEqual([])
  })
})

describe('SIA-02 — salvar rascunho sem SEO', () => {
  it('rascunho continua rascunho: grava is_active: false com os dois campos de SEO nulos, sem toast de erro', async () => {
    h.produto = { ...h.produto, is_active: false }
    montar()
    await carregado()
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: false }))
    expect(gravacaoDoProduto().seo_title).toBeNull()
    expect(gravacaoDoProduto().seo_description).toBeNull()
    expect(toastsDestrutivos()).toEqual([])
  })
})

describe('SIA-04 — só um campo preenchido', () => {
  it('grava o título e null na descrição', async () => {
    h.produto = { ...h.produto, seo_title: 'Anel de resina com coração' }
    montar()
    await carregado()
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    expect(gravacaoDoProduto().seo_title).toBe('Anel de resina com coração')
    expect(gravacaoDoProduto().seo_description).toBeNull()
  })
})

describe('SIA-05 — a prévia acompanha o formulário, sem salvar', () => {
  it('editar o nome e abrir a aba SEO: a prévia mostra o nome novo com a marca', async () => {
    montar()
    await carregado()
    fireEvent.change(screen.getByDisplayValue('Anel Coração'), { target: { value: 'Anel Estrela' } })

    abrirAba(/^SEO/)
    const titulo = await screen.findByTestId('seo-preview-title')
    expect(within(titulo).getByText('Anel Estrela | Uma Estrelinha')).toBeInTheDocument()
    expect(within(titulo).getByText('automático')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('seo-preview-description')).getByText(
        'Anel feito à mão em resina com o coração de quem você ama.',
      ),
    ).toBeInTheDocument()
    expect(h.diario).toEqual([])
  })
})

// Conserto r1 do Verifier (SIA-07): o piso da prévia é a descrição da LOJA, lida de `store_settings`
// como a página do produto da loja lê (`useSeoSettings().description`). Sem a fiação, o painel mostraria
// `STORE_DESCRIPTION_FLOOR` enquanto a loja serve outro texto.
describe('SIA-07 — produto sem descrição: a prévia mostra o piso que a loja serve', () => {
  const DESCRICAO_DA_LOJA = 'Joias afetivas feitas à mão em Porto Alegre, com o material que você envia.'

  it('com `seo.description` configurada ⇒ a prévia mostra a descrição da loja', async () => {
    h.produto = { ...h.produto, description: '' }
    h.settings = [{ key: 'seo', value: { description: DESCRICAO_DA_LOJA } }]
    montar()
    await carregado()
    abrirAba(/^SEO/)
    const descricao = await screen.findByTestId('seo-preview-description')
    await waitFor(() => expect(within(descricao).getByText(DESCRICAO_DA_LOJA)).toBeInTheDocument())
    expect(within(descricao).queryByText(STORE_DESCRIPTION_FLOOR)).not.toBeInTheDocument()
  })

  it('com a descrição da loja vazia ⇒ `STORE_DESCRIPTION_FLOOR`', async () => {
    h.produto = { ...h.produto, description: '' }
    h.settings = [{ key: 'seo', value: { description: '' } }]
    montar()
    await carregado()
    abrirAba(/^SEO/)
    const descricao = await screen.findByTestId('seo-preview-description')
    await waitFor(() => expect(within(descricao).getByText(STORE_DESCRIPTION_FLOOR)).toBeInTheDocument())
  })
})

// ─── Feature 84, T12 — "Sugerir com IA" pela PÁGINA real (SIA-10..12, SIA-16, SIA-20, SIA-24, SIA-25)

const SUGERIDO = {
  title: 'Anel de resina com coração',
  description: 'Anel feito à mão em resina, com o coração de quem você ama guardado para sempre.',
  examples: 2,
}

const campoTitulo = () => screen.getByLabelText('Título SEO') as HTMLInputElement
const campoDescricao = () => screen.getByLabelText('Descrição SEO') as HTMLTextAreaElement

/** Entrega a resposta da chamada `i` (200 com `data`, ou erro HTTP com status e corpo). */
const responder = async (i: number, resposta: { data?: unknown; status?: number; corpo?: unknown }) => {
  await act(async () => {
    if (resposta.status) {
      h.invocacoes[i].resolver({
        data: null,
        error: { name: 'FunctionsHttpError', context: { status: resposta.status, json: async () => resposta.corpo } },
      })
    } else {
      h.invocacoes[i].resolver({ data: resposta.data, error: null })
    }
  })
}

const abrirSeo = async () => {
  abrirAba(/^SEO/)
  await screen.findByRole('button', { name: 'Sugerir com IA' })
}

describe('SIA-10 / SIA-16 — sugerir pela página', () => {
  it('manda o estado ATUAL do formulário, mostra "Sugerindo…", preenche os dois campos e a prévia — e não grava nada', async () => {
    // Conserto r1 (V30): relacionados e categorias NÃO vazios — com `[]` na fixtura, trocar
    // `relatedIds: form.related_product_ids` por `[]` na página passava.
    h.produto = {
      ...h.produto,
      requires_material: true,
      related_product_ids: ['r1', 'r2'],
      product_categories: [
        { category_id: 'c1', position: 0 },
        { category_id: 'c2', position: 1 },
      ],
    }
    montar()
    await carregado()
    // Nome editado sem salvar: é ele que tem de ir no pedido.
    fireEvent.change(screen.getByDisplayValue('Anel Coração'), { target: { value: 'Anel Estrela' } })
    await abrirSeo()

    await clicar('Sugerir com IA')
    expect(h.invocacoes).toHaveLength(1)
    expect(h.invocacoes[0].nome).toBe('seo-suggest')
    const corpoEnviado = h.invocacoes[0].body
    expect(corpoEnviado.productId).toBe('p1')
    expect(corpoEnviado.name).toBe('Anel Estrela')
    expect(corpoEnviado.description).toBe('<p>Anel feito à mão em resina com o coração de quem você ama.</p>')
    expect(corpoEnviado.categoryIds).toEqual(['c1', 'c2'])
    expect(corpoEnviado.relatedIds).toEqual(['r1', 'r2'])
    expect(corpoEnviado.requiresMaterial).toBe(true)
    expect(corpoEnviado).toEqual({
      productId: 'p1',
      name: 'Anel Estrela',
      description: '<p>Anel feito à mão em resina com o coração de quem você ama.</p>',
      categoryIds: ['c1', 'c2'],
      relatedIds: ['r1', 'r2'],
      requiresMaterial: true,
    })
    // Conserto do QA (foco): desabilitado por `aria-disabled`, sem o nativo, que soltaria o foco.
    expect(screen.getByRole('button', { name: 'Sugerindo…' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Sugerindo…' })).not.toHaveAttribute('disabled')

    await responder(0, { data: SUGERIDO })

    expect(campoTitulo().value).toBe(SUGERIDO.title)
    expect(campoDescricao().value).toBe(SUGERIDO.description)
    // SIA-16: a prévia acompanha na hora, e o que veio da sugestão não é mais "automático".
    const titulo = screen.getByTestId('seo-preview-title')
    expect(within(titulo).getByText('Anel de resina com coração | Uma Estrelinha')).toBeInTheDocument()
    expect(within(titulo).queryByText('automático')).not.toBeInTheDocument()
    expect(within(screen.getByTestId('seo-preview-description')).getByText(SUGERIDO.description)).toBeInTheDocument()
    // Nada gravado: a sugestão é rascunho.
    expect(h.diario).toEqual([])
  })

  // Conserto r2 (N28): a única fixtura tinha `requires_material: true`, e fixar `true` na página
  // passava — toda peça diria ao modelo que leva material da cliente.
  it('SIA-10: peça SEM material da cliente ⇒ `requiresMaterial: false` no corpo', async () => {
    h.produto = { ...h.produto, requires_material: false }
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    expect(h.invocacoes).toHaveLength(1)
    expect(h.invocacoes[0].body.requiresMaterial).toBe(false)
  })

  it('SIA-11: nome vazio ⇒ o botão nasce desabilitado com a dica, e nenhum pedido sai', async () => {
    montar()
    await carregado()
    fireEvent.change(screen.getByDisplayValue('Anel Coração'), { target: { value: '' } })
    await abrirSeo()
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    expect(botao).toBeDisabled()
    expect(screen.getByText('Preencha o nome do produto primeiro.')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(botao)
    })
    expect(h.invocacoes).toEqual([])
  })

  it('salvar depois da sugestão grava os textos sugeridos', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    expect(h.diario).toEqual([])

    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    expect(gravacaoDoProduto().seo_title).toBe(SUGERIDO.title)
    expect(gravacaoDoProduto().seo_description).toBe(SUGERIDO.description)
  })
})

describe('SIA-12 — desfazer pela página', () => {
  beforeEach(() => {
    h.produto = { ...h.produto, seo_title: 'Título curado antes', seo_description: 'Descrição curada antes, escrita à mão.' }
  })

  it('"Desfazer" devolve os dois textos anteriores', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    expect(campoTitulo().value).toBe(SUGERIDO.title)

    await clicar('Desfazer')
    expect(campoTitulo().value).toBe('Título curado antes')
    expect(campoDescricao().value).toBe('Descrição curada antes, escrita à mão.')
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
  })

  it.each([
    ['título', () => campoTitulo()],
    ['descrição', () => campoDescricao()],
  ])('digitar na %s some com o "Desfazer"', async (_nome, campo) => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()

    fireEvent.change(campo(), { target: { value: 'Ajustei à mão' } })
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
  })

  it('o save some com o "Desfazer"', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()

    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument())
  })
})

describe('SIA-24 / SIA-25 — a resposta que chega tarde', () => {
  it('SIA-25: editar o título com a sugestão no ar mantém o texto digitado e diz a frase', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    fireEvent.change(campoTitulo(), { target: { value: 'Escrevi enquanto esperava' } })

    await responder(0, { data: SUGERIDO })
    expect(campoTitulo().value).toBe('Escrevi enquanto esperava')
    expect(campoDescricao().value).toBe('')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Você editou o SEO enquanto a sugestão chegava; mantive o seu texto.',
    )
  })

  it('SIA-24: trocar de aba com a sugestão no ar descarta a resposta, sem frase', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    abrirAba(/^Geral/)
    await responder(0, { data: SUGERIDO })

    await abrirSeo()
    expect(campoTitulo().value).toBe('')
    expect(campoDescricao().value).toBe('')
    expect(screen.getByRole('status')).toHaveTextContent('')
    // E o botão voltou: um toque novo chama de novo.
    await clicar('Sugerir com IA')
    expect(h.invocacoes).toHaveLength(2)
  })
})

describe('SIA-20 / SIA-22 — falhas pela página', () => {
  it('503 not_configured ⇒ botão desabilitado (visível) com a frase; campos e salvar intocados', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { status: 503, corpo: { reason: 'not_configured' } })

    // Conserto do QA (foco): `aria-disabled` e o toque ignorado — o botão estava focado ao chegar o 503.
    const desligado = screen.getByRole('button', { name: 'Sugerir com IA' })
    expect(desligado).toHaveAttribute('aria-disabled', 'true')
    await act(async () => {
      fireEvent.click(desligado)
    })
    expect(h.invocacoes).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Sugestão por IA não está configurada.')
    expect(campoTitulo().value).toBe('')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })

  it('502 upstream ⇒ a frase, campos intocados e o botão de volta', async () => {
    h.produto = { ...h.produto, seo_title: 'Título curado antes' }
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { status: 502, corpo: { reason: 'upstream' } })

    expect(screen.getByRole('status')).toHaveTextContent(
      'A sugestão não veio desta vez. Os campos continuam editáveis.',
    )
    expect(campoTitulo().value).toBe('Título curado antes')
    expect(screen.getByRole('button', { name: 'Sugerir com IA' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })
})

// ─── Conserto dos bugs do QA da 84, pela PÁGINA real ─────────────────────────────────────────────

const APLICADA = 'Sugestão aplicada ao título e à descrição. Revise antes de salvar.'
const SUGERIDO_B = {
  title: 'Anel de resina, segunda opção',
  description: 'Segunda sugestão para o anel de resina feito à mão, com o coração guardado.',
  examples: 2,
}

describe('SIA-12 (letra nova) — manual → sugerir → sugerir → desfazer devolve o texto manual', () => {
  it('BUG-…-segunda-sugestao-perde-o-texto-da-adri', async () => {
    montar()
    await carregado()
    await abrirSeo()
    fireEvent.change(campoTitulo(), { target: { value: 'Meu título escrito' } })
    fireEvent.change(campoDescricao(), { target: { value: 'Minha descrição escrita à mão.' } })

    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    await clicar('Sugerir com IA')
    await responder(1, { data: SUGERIDO_B })
    expect(campoTitulo().value).toBe(SUGERIDO_B.title)

    await clicar('Desfazer')
    expect(campoTitulo().value).toBe('Meu título escrito')
    expect(campoDescricao().value).toBe('Minha descrição escrita à mão.')
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
    expect(h.diario).toEqual([])
  })
})

describe('o foco não cai no body (BUG-…-sugerir-e-desfazer-soltam-o-foco)', () => {
  it('em voo, depois da resposta e depois do "Desfazer"; um segundo toque em voo não chama de novo', async () => {
    h.produto = { ...h.produto, seo_title: 'Título curado antes', seo_description: 'Descrição curada antes.' }
    montar()
    await carregado()
    await abrirSeo()
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    botao.focus()
    await act(async () => {
      fireEvent.click(botao)
    })
    const emVoo = screen.getByRole('button', { name: 'Sugerindo…' })
    // jsdom NÃO aplica a "focus fixup" do navegador (um `disabled` nativo não tira o foco aqui — medido:
    // esta linha passava antes do conserto). Quem discrimina em jsdom é a ausência do `disabled` nativo;
    // o `activeElement` fica como a régua do navegador, e a medida real é o reteste.
    expect(emVoo).not.toHaveAttribute('disabled')
    expect(document.activeElement).toBe(emVoo)
    // O mesmo nó: o rótulo troca, o botão não remonta (senão o foco iria junto).
    expect(emVoo).toBe(botao)
    await act(async () => {
      fireEvent.click(emVoo)
    })
    expect(h.invocacoes).toHaveLength(1)

    await responder(0, { data: SUGERIDO })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sugerir com IA' }))

    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    desfazer.focus()
    await act(async () => {
      fireEvent.click(desfazer)
    })
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sugerir com IA' }))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('503 not_configured com o botão focado: o foco fica nele', async () => {
    montar()
    await carregado()
    await abrirSeo()
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    botao.focus()
    await act(async () => {
      fireEvent.click(botao)
    })
    await responder(0, { status: 503, corpo: { reason: 'not_configured' } })
    // Ver o comentário acima: em jsdom o `disabled` nativo não solta o foco, então a régua que
    // discrimina é a ausência dele.
    expect(screen.getByRole('button', { name: 'Sugerir com IA' })).not.toHaveAttribute('disabled')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sugerir com IA' }))
  })
})

describe('o leitor de tela ouve o sucesso (BUG-…-sugestao-preenchida-sem-aviso-ao-leitor)', () => {
  it('200 ⇒ a frase na região viva; some na edição manual', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    const regiao = within(screen.getByTestId('seo-suggestion')).getByRole('status')
    expect(regiao).toHaveTextContent(APLICADA)
    fireEvent.change(campoTitulo(), { target: { value: 'Ajustei à mão' } })
    expect(regiao).toHaveTextContent('')
  })

  it('a frase some no save', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { data: SUGERIDO })
    expect(screen.getByRole('status')).toHaveTextContent(APLICADA)
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(''))
  })
})

describe('a frase de falha não sobrevive à edição nem ao save (BUG-…-aviso-de-falha-da-sugestao-fica-depois-de-salvar)', () => {
  const FALHA = 'A sugestão não veio desta vez. Os campos continuam editáveis.'

  it('502 ⇒ a frase; editar o Título SEO à mão a apaga', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { status: 502, corpo: { reason: 'upstream' } })
    expect(screen.getByRole('status')).toHaveTextContent(FALHA)
    fireEvent.change(campoTitulo(), { target: { value: 'Escrevi à mão' } })
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('429 ⇒ a frase; salvar a apaga (sem editar o SEO)', async () => {
    montar()
    await carregado()
    await abrirSeo()
    await clicar('Sugerir com IA')
    await responder(0, { status: 429, corpo: { reason: 'limited' } })
    expect(screen.getByRole('status')).toHaveTextContent('Muitas sugestões seguidas. Tente de novo em alguns minutos.')
    await clicar('Salvar')
    await waitFor(() => expect(gravacaoDoProduto()).toMatchObject({ is_active: true }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(''))
  })
})
