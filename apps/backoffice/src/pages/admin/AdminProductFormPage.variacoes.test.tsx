// Feature 81 — a grade que acompanha as opções e a imagem na linha, na PÁGINA real do produto
// (OPV-01, 02, 04, 08, 14..16, 25, 27).
//
// A página é a de verdade: `OptionsEditor`, `syncGrid`, `applyOrphanChecks`, `VariantsTable`,
// `VariantImagePicker` e `ImageGallery` reais. Recriar a composição no teste provaria uma árvore que a
// página pode não montar ("teste não monta a árvore que prova").
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (diário de escritas + a contagem de
// `order_items` por variação), `useAdminProducts` (a escrita de `products`, no mesmo diário),
// `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o motor de upload
// (`uploadProductImages`), o editor rico e o toast. A biblioteca de opções (`useOptionLibrary`) NÃO é
// dublada: ela lê pelo client dublado, que devolve contagem zero — o editor fica em texto livre
// (OPV-21) sem nenhum erro no render.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OPTION_LIBRARY_KEY, PRODUCT_POOL_KEY, type OptionLibraryEntry } from '@/entities/product'

type Contagem = number | 'erro' | Promise<number | 'erro'>

const h = vi.hoisted(() => ({
  diario: [] as { op: string; table: string; payload?: unknown }[],
  produto: null as Record<string, unknown> | null,
  /** A resposta de `order_items` por `variant_id` — número, falha, ou uma promessa a resolver. */
  pedidos: {} as Record<string, Contagem>,
  consultas: [] as string[],
  upload: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (table: string) => {
    const filtros: unknown[][] = []
    let op = 'select'
    let payload: unknown
    const fim = async () => {
      if (op !== 'select') h.diario.push({ op, table, payload })
      if (op === 'select' && table === 'order_items') {
        const variante = String(filtros.find(f => f[0] === 'eq' && f[1] === 'variant_id')?.[2])
        h.consultas.push(variante)
        const resposta = await (h.pedidos[variante] ?? 0)
        return resposta === 'erro'
          ? { data: null, error: { message: 'rede' }, count: null }
          : { data: null, error: null, count: resposta }
      }
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
      return fim()
    }
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => fim().then(ok, ko)
    return b
  }
  return { supabase: { from, storage: { from: () => ({ upload: vi.fn(), remove: vi.fn() }) } } }
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
vi.mock('@/features/product-form/lib/uploadProductImage', async importOriginal => ({
  ...(await importOriginal<typeof import('@/features/product-form/lib/uploadProductImage')>()),
  uploadProductImages: h.upload,
}))
vi.mock('@/shared/ui/RichTextEditor', () => ({ default: () => <div>editor</div> }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminProductFormPage from './AdminProductFormPage'

const linha = (id: string, valor: string, over: Record<string, unknown> = {}) => ({
  id,
  product_id: 'p1',
  option_values: { Tamanho: valor },
  name: null,
  sku: `SKU-${id}`,
  price: 50,
  compare_price: null,
  stock: 3,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const produtoBase = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  base_price: 89.9,
  original_price: 120,
  weight_kg: 0.05,
  is_active: false,
  options: [],
  images: [{ url: 'https://cdn/principal.webp', alt: null, source: 'upload' }],
  product_variants: [],
  product_categories: [],
  product_faqs: [],
  product_filter_values: [],
  product_suppliers: null,
  ...over,
})

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.sessionStorage.clear()
  window.localStorage.clear()
  h.diario = []
  h.pedidos = {}
  h.consultas = []
  h.upload.mockReset()
  h.produto = produtoBase()
})

/**
 * `library` semeia a biblioteca de opções no cache (molde de `AdminQuickGridPage.test.tsx`). Sem ela a
 * leitura passa pelo client dublado, que conta zero — o editor fica em texto livre (OPV-21).
 */
const montar = (library?: OptionLibraryEntry[]) => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, [])
  if (library !== undefined) client.setQueryData(OPTION_LIBRARY_KEY, library)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/produtos/p1/editar']}>
        <Routes>
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`. */
const abrirAba = async (nome: RegExp) => {
  fireEvent.mouseDown(screen.getByRole('tab', { name: nome }), { button: 0 })
}

const abrirPrecos = async () => {
  await waitFor(() => expect(screen.getByDisplayValue('Pingente Estrela')).toBeInTheDocument())
  await abrirAba(/Preços & variações/)
  await screen.findByText('Opções')
}

const linhasDaGrade = () =>
  screen.queryAllByTestId(/^variant-row-/).map(row => row.getAttribute('data-testid')!.replace('variant-row-', ''))

const sujo = () => screen.queryByText('Alterações não salvas')

/** Digita valores num campo "Valores" e confirma com Enter, como a Adri faz. */
const acrescentarValores = (campo: HTMLElement, texto: string) => {
  fireEvent.change(campo, { target: { value: texto } })
  fireEvent.keyDown(campo, { key: 'Enter' })
}

describe('OPV-08 — abrir o produto não mexe na grade', () => {
  it('grade salva que diverge do cruzamento fica como está, e o formulário não fica sujo', async () => {
    // "4,5 cm" está nas opções e não tem linha; "2,5 cm" tem linha (pausada) e não está nas opções.
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm'), linha('v-velha', '2,5 cm', { is_active: false, position: 1 })],
    })
    montar()
    await abrirPrecos()

    expect(linhasDaGrade()).toEqual(['v1', 'v-velha'])
    expect(sujo()).toBeNull()
    expect(h.consultas).toEqual([])
  })
})

describe('OPV-01/02 — o valor acrescentado cria a linha no mesmo gesto, ativa e com os padrões', () => {
  it('"Tamanho" com "3,5 cm, 4,5 cm" ⇒ duas linhas ativas com 89,90 · 120,00 · 0,05, sem clicar em gerar', async () => {
    montar()
    await abrirPrecos()
    expect(linhasDaGrade()).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: /Adicionar opção/ }))
    fireEvent.change(screen.getByLabelText('Nome da opção'), { target: { value: 'Tamanho' } })
    acrescentarValores(screen.getByLabelText('Valores'), '3,5 cm, 4,5 cm')

    await waitFor(() => expect(linhasDaGrade()).toHaveLength(2))
    for (const valor of ['3,5 cm', '4,5 cm']) {
      expect(screen.getByRole('switch', { name: `Ativa: ${valor}` })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByLabelText(`Preço de ${valor}`)).toHaveValue('89,90')
      expect(screen.getByLabelText(`Preço "de" de ${valor}`)).toHaveValue('120,00')
      // O peso se digita em gramas: 0,05 kg aparece como 50.
      expect(screen.getByLabelText(`Peso de ${valor}`)).toHaveValue('50')
      expect(screen.getByLabelText(`Estoque de ${valor}`)).toHaveValue(0)
      expect(screen.getByLabelText(`SKU de ${valor}`)).toHaveValue('')
    }
    expect(screen.queryByText(/Regerar/)).toBeNull()
    // Linha nova não existe no banco: nenhuma consulta de pedidos.
    expect(h.consultas).toEqual([])
  })

  it('o salvar leva as linhas novas ao banco, ativas e com o preço padrão', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar opção/ }))
    fireEvent.change(screen.getByLabelText('Nome da opção'), { target: { value: 'Tamanho' } })
    acrescentarValores(screen.getByLabelText('Valores'), '3,5 cm')
    await waitFor(() => expect(linhasDaGrade()).toHaveLength(1))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })

    const inseridas = h.diario.find(e => e.table === 'product_variants' && e.op === 'insert')
    expect(inseridas).toBeDefined()
    const rows = ([] as Record<string, unknown>[]).concat(inseridas!.payload as Record<string, unknown>[])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      option_values: { Tamanho: '3,5 cm' },
      is_active: true,
      price: 89.9,
      compare_price: 120,
      weight_kg: 0.05,
      stock: 0,
    })
  })
})

describe('OPV-04 — remover valor: a linha sem pedido sai, a vendida fica pausada e é nomeada', () => {
  beforeEach(() => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 0 }],
      product_variants: [
        linha('v-vendida', '3,5 cm'),
        linha('v-livre', '4,5 cm', { position: 1 }),
        linha('v-duvida', '5,5 cm', { position: 2 }),
      ],
    })
    h.pedidos = { 'v-vendida': 2, 'v-livre': 0, 'v-duvida': 'erro' }
  })

  it('sem pedido: a linha sai da grade, depois da consulta', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))

    await waitFor(() => expect(linhasDaGrade()).toEqual(['v-vendida', 'v-duvida']))
    expect(h.consultas).toEqual(['v-livre'])
    expect(screen.queryByRole('alert', { name: undefined })?.textContent ?? '').not.toMatch(/vendidas/)
  })

  it('vendida: fica na grade, PAUSADA, e o aviso a nomeia', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))

    const aviso = await screen.findByText(/Estas variações já foram vendidas e ficaram pausadas/)
    expect(aviso).toHaveAttribute('role', 'alert')
    expect(aviso.textContent).toBe('Estas variações já foram vendidas e ficaram pausadas: 3,5 cm. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade.')
    expect(linhasDaGrade()).toEqual(['v-vendida', 'v-livre', 'v-duvida'])
    expect(screen.getByRole('switch', { name: 'Ativa: 3,5 cm' })).toHaveAttribute('aria-checked', 'false')
    // As outras continuam ativas.
    expect(screen.getByRole('switch', { name: 'Ativa: 4,5 cm' })).toHaveAttribute('aria-checked', 'true')
  })

  it('consulta que falhou: na dúvida, pausa — nunca apaga', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 5,5 cm' }))

    const aviso = await screen.findByText(/ficaram pausadas/)
    expect(aviso.textContent).toBe('Estas variações já foram vendidas e ficaram pausadas: 5,5 cm. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade.')
    expect(linhasDaGrade()).toContain('v-duvida')
    expect(screen.getByRole('switch', { name: 'Ativa: 5,5 cm' })).toHaveAttribute('aria-checked', 'false')
  })

  it('a órfã já conferida não é consultada de novo na edição seguinte, e o aviso acumula sem repetir', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))
    await screen.findByText(/ficaram pausadas: 3,5 cm\./)

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 5,5 cm' }))
    await screen.findByText('Estas variações já foram vendidas e ficaram pausadas: 3,5 cm, 5,5 cm. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade.')

    expect(h.consultas).toEqual(['v-vendida', 'v-duvida'])
  })

  it('devolver o valor da vendida NÃO a religa: a linha volta ao cruzamento pausada, e o aviso diz como reativar', async () => {
    // BUG-20261026-valor-devolvido-volta-pausado — decidido em 2026-10-26 pela recomendação do QA:
    // só OPV-02 e OPV-04 mudam `is_active` sozinhos; quem religa é a Adri, pela grade.
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))
    await screen.findByText(/ficaram pausadas: 3,5 cm\./)

    acrescentarValores(screen.getByLabelText('Valores'), '3,5 cm')

    expect(screen.getByRole('button', { name: 'Remover valor 3,5 cm' })).toBeInTheDocument()
    expect(linhasDaGrade()).toEqual(['v-vendida', 'v-livre', 'v-duvida'])
    expect(screen.getByRole('switch', { name: 'Ativa: 3,5 cm' })).toHaveAttribute('aria-checked', 'false')
    const aviso = screen.getByText(/ficaram pausadas/)
    expect(aviso.textContent).toBe(
      'Estas variações já foram vendidas e ficaram pausadas: 3,5 cm. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade.',
    )
  })

  it('ligar "Ativa" na linha vendida, como o aviso manda, tira a linha do aviso (BUG-20261026-aviso-de-pausa-continua-depois-de-reativar)', async () => {
    // Reteste de QA da 81: o aviso dizia "ficaram pausadas: 3,5 cm" com a linha já ligada, e só
    // saía da tela recarregando. A régua é o aviso nomear as que AINDA estão pausadas.
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))
    await screen.findByText(/ficaram pausadas: 3,5 cm\./)
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 5,5 cm' }))
    await screen.findByText(/ficaram pausadas: 3,5 cm, 5,5 cm\./)

    fireEvent.click(screen.getByRole('switch', { name: 'Ativa: 3,5 cm' }))
    expect(screen.getByRole('switch', { name: 'Ativa: 3,5 cm' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(/ficaram pausadas/).textContent).toBe(
      'Estas variações já foram vendidas e ficaram pausadas: 5,5 cm. Continuam pausadas mesmo que o valor volte às opções; para vender de novo, ligue “Ativa” na linha da grade.',
    )

    fireEvent.click(screen.getByRole('switch', { name: 'Ativa: 5,5 cm' }))
    expect(screen.queryByText(/ficaram pausadas/)).not.toBeInTheDocument()

    // O par: desligar de novo à mão não é uma pausa da reconciliação, mas a linha continua sendo a
    // vendida que saiu das opções — o aviso volta a nomeá-la.
    fireEvent.click(screen.getByRole('switch', { name: 'Ativa: 5,5 cm' }))
    expect(screen.getByText(/ficaram pausadas/).textContent).toContain('ficaram pausadas: 5,5 cm.')
  })

  it('a linha vendida e pausada vai ao banco pausada — nunca num delete', async () => {
    montar()
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))
    await screen.findByText(/ficaram pausadas/)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })

    const apagou = h.diario.filter(e => e.table === 'product_variants' && e.op === 'delete')
    expect(apagou).toEqual([])
    const gravada = h.diario
      .filter(e => e.table === 'product_variants' && (e.op === 'update' || e.op === 'upsert'))
      .flatMap(e => ([] as Record<string, unknown>[]).concat(e.payload as Record<string, unknown>[]))
    expect(gravada.some(p => p.is_active === false)).toBe(true)
  })
})

describe('OPV-25 — a resposta da consulta é aplicada sobre a grade de AGORA', () => {
  it('o valor removido e devolvido antes da resposta: a linha fica, ativa, com o mesmo SKU', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm'), linha('v2', '4,5 cm', { position: 1 })],
    })
    let responder: (n: number) => void = () => {}
    h.pedidos = { v2: new Promise<number>(r => (responder = r)) }
    montar()
    await abrirPrecos()

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))
    await waitFor(() => expect(h.consultas).toEqual(['v2']))
    acrescentarValores(screen.getByLabelText('Valores'), '4,5 cm')

    await act(async () => responder(0))

    expect(linhasDaGrade()).toEqual(['v1', 'v2'])
    expect(screen.getByLabelText('SKU de 4,5 cm')).toHaveValue('SKU-v2')
    expect(screen.getByRole('switch', { name: 'Ativa: 4,5 cm' })).toHaveAttribute('aria-checked', 'true')
  })

  it('outra edição feita enquanto a consulta estava no ar sobrevive à resposta', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm'), linha('v2', '4,5 cm', { position: 1 })],
    })
    let responder: (n: number) => void = () => {}
    h.pedidos = { v2: new Promise<number>(r => (responder = r)) }
    montar()
    await abrirPrecos()

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))
    await waitFor(() => expect(h.consultas).toEqual(['v2']))
    fireEvent.change(screen.getByLabelText('SKU de 3,5 cm'), { target: { value: 'NOVO-1' } })

    await act(async () => responder(0))

    expect(linhasDaGrade()).toEqual(['v1'])
    expect(screen.getByLabelText('SKU de 3,5 cm')).toHaveValue('NOVO-1')
  })
})

describe('OPV-11..16 — a imagem na linha, com envio pelo modal', () => {
  beforeEach(() => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm')],
    })
  })

  it('o card "Imagem por variação" não existe mais (OPV-16)', async () => {
    montar()
    await abrirPrecos()
    expect(screen.queryByText('Imagem por variação')).toBeNull()
    expect(screen.getByRole('button', { name: 'Imagem de 3,5 cm' })).toBeInTheDocument()
  })

  it('enviar pelo modal desabilita o salvar durante o envio, a foto entra na galeria e fica escolhida', async () => {
    let terminar: (v: { uploaded: string[]; failed: never[] }) => void = () => {}
    h.upload.mockReturnValue(new Promise(r => (terminar = r)))
    montar()
    await abrirPrecos()

    fireEvent.click(screen.getByRole('button', { name: 'Imagem de 3,5 cm' }))
    const input = screen.getByTestId('variant-image-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } })
    })

    // OPV-15: o mesmo sinal da galeria trava o salvar enquanto o envio está no ar. `hidden`: com o
    // modal aberto o Radix esconde o resto da página da árvore acessível.
    expect(screen.getByRole('button', { name: 'Salvar rascunho', hidden: true })).toBeDisabled()

    await act(async () => terminar({ uploaded: ['https://cdn/nova.webp'], failed: [] }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).not.toBeDisabled()
    // A miniatura da linha passa a ser a foto enviada.
    const botao = screen.getByRole('button', { name: 'Imagem de 3,5 cm' })
    expect(botao.querySelector('img')).toHaveAttribute('src', 'https://cdn/nova.webp')

    // OPV-14: a foto está na galeria do produto (aba Mídia).
    await abrirAba(/Mídia/)
    await waitFor(() =>
      expect(screen.getAllByRole('img').some(img => img.getAttribute('src') === 'https://cdn/nova.webp')).toBe(true),
    )

    // E vai ao banco: na coluna `images` do produto e no `image_url` da linha.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })
    const produto = h.diario.find(e => e.table === 'products' && e.op === 'update')!.payload as {
      images: { url: string; source: string }[]
    }
    expect(produto.images.map(i => i.url)).toEqual(['https://cdn/principal.webp', 'https://cdn/nova.webp'])
    expect(produto.images[1].source).toBe('upload')
    const linhaGravada = h.diario
      .filter(e => e.table === 'product_variants' && (e.op === 'update' || e.op === 'upsert'))
      .flatMap(e => ([] as Record<string, unknown>[]).concat(e.payload as Record<string, unknown>[]))
    expect(linhaGravada.some(p => p.image_url === 'https://cdn/nova.webp')).toBe(true)
  })

  it('OPV-27: a foto escolhida pela linha, removida da galeria, faz a linha voltar à principal', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
      images: [
        { url: 'https://cdn/principal.webp', alt: null, source: 'upload' },
        { url: 'https://cdn/fosco.webp', alt: null, source: 'upload' },
      ],
      product_variants: [linha('v1', '3,5 cm', { image_url: 'https://cdn/fosco.webp' })],
    })
    montar()
    await abrirPrecos()
    const antes = screen.getByRole('button', { name: 'Imagem de 3,5 cm' })
    expect(antes.querySelector('img')).toHaveAttribute('src', 'https://cdn/fosco.webp')

    await abrirAba(/Mídia/)
    const remover = await screen.findAllByRole('button', { name: /Remover/ })
    fireEvent.click(remover[1])
    await abrirAba(/Preços & variações/)

    const depois = await screen.findByRole('button', { name: 'Imagem de 3,5 cm' })
    expect(depois.querySelector('img')).toBeNull()

    // G10 (rodada 3): a tela sozinha não prova OPV-27 — o `VariantImagePicker` também esconde URL fora
    // da galeria, e as duas camadas se mascaram. O que importa é o que vai ao banco: a loja lê
    // `product_variants.image_url`, e a URL morta lá vira imagem quebrada na página do produto.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })
    const produto = h.diario.find(e => e.table === 'products' && e.op === 'update')!.payload as {
      images: { url: string }[]
    }
    expect(produto.images.map(i => i.url)).toEqual(['https://cdn/principal.webp'])
    const gravadas = h.diario
      .filter(e => e.table === 'product_variants' && (e.op === 'update' || e.op === 'upsert'))
      .flatMap(e => ([] as Record<string, unknown>[]).concat(e.payload as Record<string, unknown>[]))
    expect(gravadas).toHaveLength(1)
    expect(gravadas[0].image_url).toBeNull()
  })
})

// Rodada 1 do Verificador (G1..G4): os três casos de fiação que o sensor achou sem prova, e o texto
// de OPV-17 no card que embrulha o editor. Cada um foi reinjetado com o mutante correspondente
// (M29, M07, M32) e reprovou por asserção — ver `validation.md`, "Conserto da rodada 1".

describe('OPV-05 na página — renomear a opção de um produto CARREGADO não custa linha nenhuma (G1)', () => {
  it('"Tamanho" → "Medida": as mesmas linhas, os mesmos SKUs e preços, zero consultas, e o banco recebe o nome novo', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm', { price: 61 }), linha('v2', '4,5 cm', { position: 1, price: 72 })],
    })
    montar()
    await abrirPrecos()

    fireEvent.change(screen.getByLabelText('Nome da opção'), { target: { value: 'Medida' } })

    // Sem o reinício do refletido na carga, "Medida" seria tratada como opção NOVA: as duas linhas
    // virariam órfãs (consultadas e removidas) e duas linhas novas nasceriam com o preço padrão.
    await waitFor(() => expect(screen.getByLabelText('Nome da opção')).toHaveValue('Medida'))
    expect(linhasDaGrade()).toEqual(['v1', 'v2'])
    expect(screen.getByLabelText('SKU de 3,5 cm')).toHaveValue('SKU-v1')
    expect(screen.getByLabelText('SKU de 4,5 cm')).toHaveValue('SKU-v2')
    expect(screen.getByLabelText('Preço de 3,5 cm')).toHaveValue('61,00')
    expect(screen.getByLabelText('Preço de 4,5 cm')).toHaveValue('72,00')
    expect(h.consultas).toEqual([])

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }))
    })
    expect(h.diario.filter(e => e.table === 'product_variants' && e.op === 'insert')).toEqual([])
    expect(h.diario.filter(e => e.table === 'product_variants' && e.op === 'delete')).toEqual([])
    const gravadas = h.diario
      .filter(e => e.table === 'product_variants' && (e.op === 'update' || e.op === 'upsert'))
      .flatMap(e => ([] as Record<string, unknown>[]).concat(e.payload as Record<string, unknown>[]))
    expect(gravadas.map(p => p.option_values)).toEqual(
      expect.arrayContaining([{ Medida: '3,5 cm' }, { Medida: '4,5 cm' }]),
    )
    expect(gravadas.every(p => !('Tamanho' in ((p.option_values as Record<string, string>) ?? {})))).toBe(true)
  })
})

describe('OPV-25 na página — a resposta casa pelo id mesmo quando a grade ENCOLHEU antes da órfã (G2)', () => {
  it('v1, v2, v3: remove 4,5 (consulta de v2 no ar), remove 3,5 (v1 sai), v2 responde 0 ⇒ sobra v3', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 0 }],
      product_variants: [
        linha('v1', '3,5 cm'),
        linha('v2', '4,5 cm', { position: 1 }),
        linha('v3', '5,5 cm', { position: 2 }),
      ],
    })
    let responder: (n: number) => void = () => {}
    h.pedidos = { v1: 0, v2: new Promise<number>(r => (responder = r)) }
    montar()
    await abrirPrecos()

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))
    await waitFor(() => expect(h.consultas).toEqual(['v2']))
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 3,5 cm' }))
    // A linha ANTERIOR à órfã sai: a posição que v2 tinha quando a pergunta saiu passa a ser de v3.
    await waitFor(() => expect(linhasDaGrade()).toEqual(['v2', 'v3']))

    await act(async () => responder(0))

    await waitFor(() => expect(linhasDaGrade()).toEqual(['v3']))
    expect(screen.getByLabelText('SKU de 5,5 cm')).toHaveValue('SKU-v3')
    expect(screen.getByRole('switch', { name: 'Ativa: 5,5 cm' })).toHaveAttribute('aria-checked', 'true')
  })
})

describe('OPV-04/25 na página — a órfã que voltou ao cruzamento volta a ser conferida se sair de novo (G3)', () => {
  it('remover → devolver (consulta no ar) → remover de novo ⇒ segunda consulta, e a linha sai', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm'), linha('v2', '4,5 cm', { position: 1 })],
    })
    let responder: (n: number) => void = () => {}
    h.pedidos = { v2: new Promise<number>(r => (responder = r)) }
    montar()
    await abrirPrecos()

    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))
    await waitFor(() => expect(h.consultas).toEqual(['v2']))
    acrescentarValores(screen.getByLabelText('Valores'), '4,5 cm')
    await act(async () => responder(0))
    expect(linhasDaGrade()).toEqual(['v1', 'v2'])

    // A terceira volta: a próxima resposta de v2 é imediata.
    h.pedidos = { v2: 0 }
    fireEvent.click(screen.getByRole('button', { name: 'Remover valor 4,5 cm' }))

    await waitFor(() => expect(linhasDaGrade()).toEqual(['v1']))
    expect(h.consultas).toEqual(['v2', 'v2'])
  })
})

describe('OPV-17 na página — nenhum texto da aba de opções usa "eixo" (G4)', () => {
  it('o card "Opções" do formulário do produto não fala em eixo', async () => {
    h.produto = produtoBase({
      options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
      product_variants: [linha('v1', '3,5 cm')],
    })
    montar()
    await abrirPrecos()

    expect(screen.getByText('Opções')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da opção')).toBeInTheDocument()
    expect(screen.queryByText(/eixo/i)).toBeNull()
    expect(document.body.textContent ?? '').not.toMatch(/eixo/i)
  })
})

// QA da 81 (BUG-20261026-aba-de-precos-rola-com-fonte-grande): com a fonte do sistema a 200 % em
// 390, a aba "Preços & variações 1" (com `whitespace-nowrap` do primitivo) media 373px numa lista de
// 294, e o body rolava na horizontal. Token exato; a medida é do navegador (`prova-navegador.md`).
// Verifier r2, G6 (N34): a suíte acima roda com a biblioteca VAZIA de propósito, e o editor recebe a
// biblioteca do próprio teste — entregar `library={[]}` na página apagava a P2 inteira da aba com tudo
// verde. Aqui a biblioteca chega pela página real, e o Success Criterion 1 é medido na grade.
describe('OPV-18/19 na página — a biblioteca do catálogo chega ao editor de opções (G6)', () => {
  const LIBRARY: OptionLibraryEntry[] = [
    {
      name: 'Tamanho',
      count: 3,
      values: ['3,5 cm', '4,5 cm', '5,5 cm'],
      sets: [
        { values: ['3,5 cm', '4,5 cm'], count: 2 },
        { values: ['5,5 cm'], count: 1 },
      ],
    },
    { name: 'Acabamento', count: 1, values: ['Fosco'], sets: [{ values: ['Fosco'], count: 1 }] },
  ]

  it('o campo de nome sugere os nomes do catálogo, e o nome escolhido mostra os conjuntos e os chips', async () => {
    montar(LIBRARY)
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar opção/ }))

    const nome = screen.getByLabelText('Nome da opção')
    fireEvent.focus(nome)
    const lista = screen.getByRole('listbox', { name: 'Nomes usados no catálogo' })
    expect(within(lista).getAllByRole('option').map(o => o.textContent)).toEqual(['Tamanho', 'Acabamento'])

    fireEvent.click(within(lista).getByRole('option', { name: 'Tamanho' }))

    const conjuntos = screen.getByRole('group', { name: 'Conjuntos mais usados' })
    expect(within(conjuntos).getAllByRole('button').map(b => b.getAttribute('aria-label'))).toEqual([
      'Usar 3,5 cm, 4,5 cm (2 produtos)',
      'Usar 5,5 cm (1 produto)',
    ])
    const chips = screen.getByRole('group', { name: 'Valores usados em outros produtos' })
    expect(within(chips).getAllByRole('button').map(b => b.textContent)).toEqual(['3,5 cm', '4,5 cm', '5,5 cm'])
    // Nada entra sem toque (A1).
    expect(linhasDaGrade()).toEqual([])
  })

  it('Success Criterion 1: tocar no conjunto cria as linhas ativas com os padrões, sem clicar em gerar', async () => {
    montar(LIBRARY)
    await abrirPrecos()
    fireEvent.click(screen.getByRole('button', { name: /Adicionar opção/ }))
    fireEvent.change(screen.getByLabelText('Nome da opção'), { target: { value: 'Tamanho' } })

    fireEvent.click(screen.getByRole('button', { name: 'Usar 3,5 cm, 4,5 cm (2 produtos)' }))

    await waitFor(() => expect(linhasDaGrade()).toHaveLength(2))
    for (const valor of ['3,5 cm', '4,5 cm']) {
      expect(screen.getByRole('switch', { name: `Ativa: ${valor}` })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByLabelText(`Preço de ${valor}`)).toHaveValue('89,90')
      expect(screen.getByLabelText(`Preço "de" de ${valor}`)).toHaveValue('120,00')
      expect(screen.getByLabelText(`Peso de ${valor}`)).toHaveValue('50')
    }
    expect(screen.queryByRole('switch', { name: 'Ativa: 5,5 cm' })).toBeNull()
  })
})

describe('as abas do formulário — fonte grande não estoura a largura', () => {
  it('cada aba pode quebrar linha e nunca passa da largura da lista', async () => {
    h.produto = produtoBase({ options: [], product_variants: [] })
    montar()
    await waitFor(() => expect(screen.getByDisplayValue('Pingente Estrela')).toBeInTheDocument())

    const abas = screen.getAllByRole('tab')
    expect(abas.length).toBeGreaterThan(0)
    for (const aba of abas) {
      const classes = aba.className.split(/\s+/)
      expect(classes).toContain('whitespace-normal')
      expect(classes).not.toContain('whitespace-nowrap')
      expect(classes).toContain('max-w-full')
    }
  })
})
