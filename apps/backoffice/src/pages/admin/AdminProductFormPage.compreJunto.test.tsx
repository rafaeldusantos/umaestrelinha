// A aba "Compre junto" na PÁGINA real do produto (o Compre Junto da joia): acrescentar, ordenar, escolher lista ou
// peça, liberar variações, marcar onde o adicional some, "saiu do ar" e o salvar.
//
// A página, a aba, a busca de produto, a leitura da peça por id, as listas, `persistAddons` e as
// recusas de `core` são os reais; só o client do Supabase é dublê, sobre um banco em memória que
// REGISTRA cada escrita (`dubleSupabase`). Fiação provada renderizando a página, e não recriando a
// composição no teste.
//
// Inventário de `vi.mock` (`L-030`): o client do supabase, `useAdminProducts` (a escrita de
// `products`, no diário), `useAdminCategories`, `useAdminFaqs`, o catálogo de filtros, o editor rico
// e o toast.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_POOL_KEY } from '@/entities/product'
import type { Registro, Resposta } from '@/test/dubleSupabase'

type Linha = Record<string, unknown>

const { banco } = vi.hoisted(() => ({
  banco: {
    produto: null as Linha | null,
    produtos: [] as Linha[],
    variacoes: [] as Linha[],
    listas: [] as Linha[],
    itens: [] as Linha[],
    usos: [] as Linha[],
    produtosPayload: [] as Linha[],
    calls: [] as unknown[],
  },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const eqDe = (r: Registro, coluna: string) => r.filters.find(f => f.method === 'eq' && f.args[0] === coluna)?.args[1]
  const duble = criarDuble((r): Resposta => {
    if (r.table === 'products') {
      if (String(r.select?.[0]).startsWith('*')) return { data: banco.produto }
      const id = eqDe(r, 'id')
      if (id) return { data: banco.produtos.find(p => p.id === id) ?? null }
      return { data: null }
    }
    if (r.table === 'product_variants') {
      const produto = eqDe(r, 'product_id')
      return { data: banco.variacoes.filter(v => v.product_id === produto) }
    }
    if (r.table === 'buy_together_lists') return { data: banco.listas }
    if (r.table === 'buy_together_list_items') {
      return {
        data: banco.itens.map(i => {
          const p = banco.produtos.find(x => x.id === i.product_id)
          return { ...i, product: p ? { ...p, product_variants: banco.variacoes.filter(v => v.product_id === p.id) } : null }
        }),
      }
    }
    if (r.table === 'buy_together_list_usage') return { data: banco.usos }
    return { data: [] }
  })
  banco.calls = duble.calls
  return { supabase: { from: duble.from } }
})
vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProducts: () => ({
    createProduct: vi.fn(async (payload: Linha) => {
      banco.produtosPayload.push(payload)
      return { error: null, id: 'novo' }
    }),
    updateProduct: vi.fn(async (_id: string, payload: Linha) => {
      banco.produtosPayload.push(payload)
      return null
    }),
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

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const PRINCIPAL = uuid(100)
const V_CORRENTE = uuid(101)
const V_CHAVEIRO = uuid(102)
const FITA = uuid(1)
const PINGENTE = uuid(2)
const ANTIGA = uuid(3)
const V_PRATA = uuid(11)
const V_OURO = uuid(12)

const peca = (id: string, name: string, over: Linha = {}) => ({
  id, name, slug: name.toLowerCase(), base_price: 50, image_url: null, capa: null, is_active: true, stock_policy: 'track',
  stock_total: 5, requires_material: false, engraving_max_chars: null,
  options: [{ name: 'Metal', values: ['Prata', 'Ouro'] }], weight_kg: null, width_cm: null, height_cm: null, length_cm: null,
  ...over,
})
const variacao = (id: string, product_id: string, metal: string, position: number) => ({
  id, product_id, price: 50, option_values: { Metal: metal }, image_url: null, is_active: true, stock: 3, position,
})
const adicional = (id: string, position: number, over: Linha = {}) => ({
  id, position, kind: 'product', target_product_id: FITA, list_id: null, target_variant_ids: [], hidden_on_variant_ids: [], ...over,
})

const pool = [
  { id: PRINCIPAL, name: 'Anel Coração', slug: 'anel-coracao', is_active: true, base_price: 100 },
  { id: FITA, name: 'Fita de Cetim', slug: 'fita', is_active: true, base_price: 50 },
  { id: PINGENTE, name: 'Pingente Estrela', slug: 'pingente', is_active: true, base_price: 50 },
  { id: ANTIGA, name: 'Pingente Antigo', slug: 'antigo', is_active: false, base_price: 50 },
]

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.sessionStorage.clear()
  window.localStorage.clear()
  banco.calls.length = 0
  banco.produtosPayload = []
  banco.listas = [
    { id: 'l1', name: 'Correntes', updated_at: '2026-11-02T10:00:00Z' },
    { id: 'l2', name: 'Vazia', updated_at: '2026-11-02T10:00:00Z' },
  ]
  banco.itens = [{ list_id: 'l1', product_id: FITA, position: 0, variant_ids: [] }]
  banco.usos = [
    { list_id: 'l1', product_id: 'x', product_name: 'Anel Sol' },
    { list_id: 'l1', product_id: 'y', product_name: 'Anel Lua' },
  ]
  banco.produtos = [peca(FITA, 'Fita de Cetim'), peca(PINGENTE, 'Pingente Estrela'), peca(ANTIGA, 'Pingente Antigo', { is_active: false })]
  banco.variacoes = [variacao(V_PRATA, PINGENTE, 'Prata', 0), variacao(V_OURO, PINGENTE, 'Ouro', 1)]
  banco.produto = {
    id: PRINCIPAL, name: 'Anel Coração', slug: 'anel-coracao', base_price: 100, is_active: false,
    options: [{ name: 'Tipo', values: ['Corrente', 'Chaveiro'] }],
    product_variants: [
      { id: V_CORRENTE, product_id: PRINCIPAL, option_values: { Tipo: 'Corrente' }, price: 100, stock: 3, is_active: true, position: 0 },
      { id: V_CHAVEIRO, product_id: PRINCIPAL, option_values: { Tipo: 'Chaveiro' }, price: 90, stock: 3, is_active: true, position: 1 },
    ],
    product_categories: [], product_faqs: [], product_filter_values: [], product_suppliers: null,
    product_buy_together: [],
  }
})

const montar = () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  client.setQueryData(PRODUCT_POOL_KEY, pool)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/produtos/${PRINCIPAL}/editar`]}>
        <Routes>
          <Route path="/admin/produtos/:id/editar" element={<AdminProductFormPage />} />
          <Route path="/admin/produtos" element={<p>lista</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

/** O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`. */
const abrirAba = async () => {
  await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
  fireEvent.mouseDown(screen.getByRole('tab', { name: /Compre junto/ }), { button: 0 })
  await screen.findByRole('button', { name: 'Acrescentar um adicional' })
}

const acrescentar = () => fireEvent.click(screen.getByRole('button', { name: 'Acrescentar um adicional' }))
const adicionalN = (n: number) => screen.getByTestId(`adicional-${n}`)
const salvar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  })
}
const escritasDeAdicionais = () =>
  (banco.calls as Registro[]).filter(c => c.table === 'product_buy_together' && (c.insert || c.upsert || c.update || c.delete))

describe('a aba', () => {
  it('é uma aba do formulário e nasce sem adicionais, explicando o que acontece', async () => {
    montar()
    await abrirAba()
    expect(screen.getByText('0 de 3 adicionais')).toBeInTheDocument()
    expect(screen.getByText('Sem Compre Junto. A página desta joia fica como hoje, sem o bloco.')).toBeInTheDocument()
    expect(screen.getByText('Quando a peça sai do ar')).toBeInTheDocument()
  })

  it('o card "Compre junto" saiu da aba Relacionados', async () => {
    montar()
    await waitFor(() => expect(screen.getByDisplayValue('Anel Coração')).toBeInTheDocument())
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Relacionados/ }), { button: 0 })
    const painel = await screen.findByRole('tabpanel')
    expect(within(painel).getByText('Produtos relacionados', { selector: 'div,h3,h2' })).toBeInTheDocument()
    expect(within(painel).queryByText('Compre junto')).toBeNull()
  })

  it('carrega os adicionais gravados, na ordem da posição', async () => {
    banco.produto!.product_buy_together = [
      adicional('ad2', 1, { target_product_id: PINGENTE }),
      adicional('ad1', 0, { target_product_id: FITA }),
    ]
    montar()
    await abrirAba()
    expect(screen.getByText('2 de 3 adicionais')).toBeInTheDocument()
    await waitFor(() => expect(within(adicionalN(0)).getByTestId('peca-escolhida-0')).toHaveTextContent('Fita de Cetim'))
    expect(within(adicionalN(1)).getByTestId('peca-escolhida-1')).toHaveTextContent('Pingente Estrela')
  })
})

describe('o teto de 3 adicionais', () => {
  it('a 4ª tentativa é recusada com o motivo escrito, e a frase some ao tirar um', async () => {
    montar()
    await abrirAba()
    acrescentar()
    acrescentar()
    acrescentar()
    expect(screen.getByText('3 de 3 adicionais')).toBeInTheDocument()
    expect(screen.queryByTestId('recusa-do-quarto')).toBeNull()

    acrescentar()
    expect(screen.getByTestId('recusa-do-quarto')).toHaveTextContent('Cada joia leva até 3 adicionais. Tire um para acrescentar outro.')
    expect(screen.getByRole('button', { name: 'Acrescentar um adicional' })).toBeEnabled()
    expect(screen.queryByTestId('adicional-3')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o adicional 1' }))
    expect(screen.queryByTestId('recusa-do-quarto')).toBeNull()
    expect(screen.getByText('2 de 3 adicionais')).toBeInTheDocument()
  })
})

describe('adicional do tipo lista', () => {
  it('o padrão é "uma peça de uma lista"; lista sem peças fica desabilitada; escolher dá o nome ao adicional', async () => {
    montar()
    await abrirAba()
    acrescentar()
    const a = adicionalN(0)
    expect(within(a).getByText('Adicional 1')).toBeInTheDocument()
    expect(within(a).getByRole('button', { name: 'Uma peça de uma lista' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(within(a).getByText(/1 peça · em uso em 2 joias/)).toBeInTheDocument())
    expect(within(a).getByText('Lista sem peças')).toBeInTheDocument()
    expect(within(a).getByRole('radio', { name: /Vazia/ })).toBeDisabled()

    fireEvent.click(within(a).getByRole('radio', { name: /Correntes/ }))
    expect(within(a).getAllByText('Correntes').length).toBeGreaterThan(0)
    expect(within(a).getByRole('link', { name: 'Editar a lista “Correntes”' })).toHaveAttribute('href', '/admin/compre-junto/listas/l1')
    expect(within(a).getByRole('link', { name: 'Criar uma lista nova' })).toBeInTheDocument()
  })

  it('a lista que contém a joia avisa que ela é pulada', async () => {
    banco.itens = [{ list_id: 'l1', product_id: PRINCIPAL, position: 0, variant_ids: [] }, ...banco.itens.map((i, n) => ({ ...i, position: n + 1 }))]
    montar()
    await abrirAba()
    acrescentar()
    await waitFor(() => expect(within(adicionalN(0)).getByRole('radio', { name: /Correntes/ })).toBeEnabled())
    fireEvent.click(within(adicionalN(0)).getByRole('radio', { name: /Correntes/ }))
    expect(screen.getByTestId('lista-com-principal')).toHaveTextContent(
      'Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma.',
    )
  })
})

describe('adicional do tipo peça', () => {
  const abrirPeca = async () => {
    montar()
    await abrirAba()
    acrescentar()
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Uma peça só' }))
    const busca = await screen.findByRole('textbox', { name: /Peça do adicional 1/ })
    fireEvent.change(busca, { target: { value: 'pingente' } })
  }

  it('buscar a própria joia mostra a linha dela desabilitada com "É esta joia", e não o vazio "Nenhuma peça com"', async () => {
    montar()
    await abrirAba()
    acrescentar()
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Uma peça só' }))
    const busca = await screen.findByRole('textbox', { name: /Peça do adicional 1/ })
    const contador = within(adicionalN(0)).getByTestId('contador-encontrados')
    expect(contador).toHaveTextContent('4 no catálogo')

    fireEvent.change(busca, { target: { value: 'anel cora' } })
    expect(screen.getByTestId(`peca-${PRINCIPAL}`)).toBeDisabled()
    expect(screen.getByTestId(`peca-${PRINCIPAL}`)).toHaveTextContent('É esta joia')
    expect(screen.queryByText(/Nenhuma peça com/)).toBeNull()
    expect(contador).toHaveTextContent('1 de 4')

    fireEvent.click(screen.getByTestId(`peca-${PRINCIPAL}`))
    expect(within(adicionalN(0)).queryByTestId('peca-escolhida-0')).toBeNull()
  })

  it('a peça fora do ar vem desabilitada com o motivo', async () => {
    montar()
    await abrirAba()
    acrescentar()
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Uma peça só' }))
    const busca = await screen.findByRole('textbox', { name: /Peça do adicional 1/ })
    fireEvent.change(busca, { target: { value: 'pingente' } })
    expect(screen.getByTestId(`peca-${PINGENTE}`)).toBeEnabled()
    expect(screen.getByTestId(`peca-${ANTIGA}`)).toBeDisabled()
    expect(screen.getByTestId(`peca-${ANTIGA}`)).toHaveTextContent('Fora do ar')
  })

  it('escolher a peça mostra as variações dela; nenhuma marcada vale todas, e marcar libera só aquela', async () => {
    await abrirPeca()
    fireEvent.click(screen.getByTestId(`peca-${PINGENTE}`))
    const a = adicionalN(0)
    await waitFor(() => expect(within(a).getByTestId('peca-escolhida-0')).toHaveTextContent('Pingente Estrela'))
    fireEvent.click(await within(a).findByRole('button', { name: 'Escolher quais' }))

    const prata = await within(a).findByRole('button', { name: /Prata/, pressed: false })
    fireEvent.click(prata)
    expect(within(a).getByRole('button', { name: /Prata/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(a).getByRole('button', { name: /Ouro/ })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(within(a).getByRole('button', { name: 'Oferecer todas' }))
    expect(within(a).getByRole('button', { name: /Prata/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('a peça já escolhida em outro adicional aparece desabilitada com o motivo', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA })]
    montar()
    await abrirAba()
    acrescentar()
    fireEvent.click(within(adicionalN(1)).getByRole('button', { name: 'Uma peça só' }))
    fireEvent.change(await screen.findByRole('textbox', { name: /Peça do adicional 2/ }), { target: { value: 'fita' } })
    expect(screen.getByTestId(`peca-${FITA}`)).toBeDisabled()
    expect(screen.getByTestId(`peca-${FITA}`)).toHaveTextContent('Já está em outro adicional')
  })

  it('"Trocar" desfaz a escolha e as variações marcadas', async () => {
    await abrirPeca()
    fireEvent.click(screen.getByTestId(`peca-${PINGENTE}`))
    const a = adicionalN(0)
    fireEvent.click(await within(a).findByRole('button', { name: 'Escolher quais' }))
    fireEvent.click(within(a).getByRole('button', { name: /Prata/ }))
    fireEvent.click(within(a).getByRole('button', { name: 'Trocar' }))
    expect(within(a).queryByTestId('peca-escolhida-0')).toBeNull()
    expect(await screen.findByRole('textbox', { name: /Peça do adicional 1/ })).toBeInTheDocument()
  })
})

describe('peça que saiu do ar', () => {
  it('a peça inativa fica marcada "saiu do ar" e avisa que a loja a pula', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: ANTIGA })]
    montar()
    await abrirAba()
    expect(await screen.findByTestId('saiu-do-ar-0')).toHaveTextContent('saiu do ar')
    expect(screen.getByText(/A loja pula este adicional até ela voltar/)).toBeInTheDocument()
  })

  it('se todas as variações liberadas deixaram de existir, avisa — e não passa a valer todas', async () => {
    banco.produto!.product_buy_together = [
      adicional('ad1', 0, { target_product_id: PINGENTE, target_variant_ids: [uuid(999)] }),
    ]
    montar()
    await abrirAba()
    expect(await screen.findByText(/Nenhuma das variações escolhidas existe mais/)).toBeInTheDocument()
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Esconder' }))
    expect(within(adicionalN(0)).queryByRole('button', { name: /Prata/ })).toBeNull()
    expect(screen.getByText(/Nenhuma das variações escolhidas existe mais/)).toBeInTheDocument()
  })
})

describe('onde o adicional some', () => {
  it('marcar uma variação do principal explica a regra; sem marcar, diz que aparece em todas', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0)]
    montar()
    await abrirAba()
    const a = adicionalN(0)
    expect(within(a).getByTestId('some-quando-0')).toHaveTextContent(
      'Nenhuma marcada: o adicional aparece em todas as variações desta joia.',
    )
    fireEvent.click(within(a).getByRole('button', { name: 'Chaveiro' }))
    expect(within(a).getByTestId('some-quando-0')).toHaveTextContent(
      'Com Chaveiro escolhido nesta joia, este adicional sai do bloco.',
    )
  })
})

describe('ordenar os adicionais', () => {
  it('subir e descer troca a posição que é gravada', async () => {
    banco.produto!.product_buy_together = [
      adicional('ad1', 0, { target_product_id: FITA }),
      adicional('ad2', 1, { target_product_id: PINGENTE }),
    ]
    montar()
    await abrirAba()
    await waitFor(() => expect(within(adicionalN(1)).getByTestId('peca-escolhida-1')).toHaveTextContent('Pingente Estrela'))
    fireEvent.click(within(adicionalN(1)).getByRole('button', { name: 'Subir o adicional 2' }))
    expect(within(adicionalN(0)).getByTestId('peca-escolhida-0')).toHaveTextContent('Pingente Estrela')
    expect(within(adicionalN(0)).getByRole('button', { name: 'Subir o adicional 1' })).toBeDisabled()

    await salvar()
    const upsert = escritasDeAdicionais().find(c => c.upsert)!
    expect((upsert.upsert!.rows as Linha[]).map(r => [r.id, r.position])).toEqual([['ad2', 0], ['ad1', 1]])
  })
})

describe('o salvar', () => {
  it('adicional sem lista ou peça: a barra diz quantos e o Salvar fica desabilitado', async () => {
    montar()
    await abrirAba()
    acrescentar()
    expect(screen.getByTestId('salvar-bloqueado')).toHaveTextContent('1 adicional está sem lista ou peça.')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    acrescentar()
    expect(screen.getByTestId('salvar-bloqueado')).toHaveTextContent('2 adicionais estão sem lista ou peça.')

    fireEvent.click(within(adicionalN(0)).getByRole('radio', { name: /Correntes/ }))
    fireEvent.click(within(adicionalN(1)).getByRole('radio', { name: /Correntes/ }))
    expect(screen.queryByTestId('salvar-bloqueado')).toBeNull()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })

  it('grava só os adicionais DESTA joia, depois do produto, e o produto não leva a coluna antiga do Compre Junto', async () => {
    montar()
    await abrirAba()
    acrescentar()
    await waitFor(() => expect(within(adicionalN(0)).getByRole('radio', { name: /Correntes/ })).toBeEnabled())
    fireEvent.click(within(adicionalN(0)).getByRole('radio', { name: /Correntes/ }))
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Chaveiro' }))
    await salvar()

    expect(banco.produtosPayload).toHaveLength(1)
    expect(Object.keys(banco.produtosPayload[0]).filter(k => k.startsWith('buy_together'))).toEqual([])

    const escritas = escritasDeAdicionais()
    expect(escritas).toHaveLength(1)
    expect(escritas[0].insert).toEqual([
      {
        product_id: PRINCIPAL,
        position: 0,
        kind: 'list',
        target_product_id: null,
        list_id: 'l1',
        target_variant_ids: [],
        hidden_on_variant_ids: [V_CHAVEIRO],
        discount_percent: null,
      },
    ])
  })

  it('sem mexer no Compre Junto, o salvar não escreve em product_buy_together', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0)]
    montar()
    await abrirAba()
    await salvar()
    expect(banco.produtosPayload).toHaveLength(1)
    expect(escritasDeAdicionais()).toEqual([])
  })

  it('tirar o último adicional apaga só o dele, recortado pela joia', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0)]
    montar()
    await abrirAba()
    fireEvent.click(screen.getByRole('button', { name: 'Tirar o adicional 1' }))
    await salvar()
    const [apagar] = escritasDeAdicionais()
    expect(apagar.delete).toBe(true)
    expect(apagar.filters).toEqual([
      { method: 'eq', args: ['product_id', PRINCIPAL] },
      { method: 'in', args: ['id', ['ad1']] },
    ])
  })
})

describe('o cartão "Na loja"', () => {
  const naLoja = () => screen.getByRole('heading', { level: 2, name: 'Na loja' }).closest('section')!
  const itensNaLoja = () => within(naLoja()).getAllByRole('listitem')

  it('sem adicionais, diz "Nenhum adicional."', async () => {
    montar()
    await abrirAba()
    expect(within(naLoja()).getByText('O bloco fica entre a escolha da variação e o botão de compra, nesta ordem:')).toBeInTheDocument()
    expect(within(naLoja()).getByText('Nenhum adicional.')).toBeInTheDocument()
    expect(within(naLoja()).queryByRole('list')).toBeNull()
  })

  it('lista os adicionais na ordem, com o tipo, o "some com" e o incompleto; subir inverte a ordem', async () => {
    banco.produto!.product_buy_together = [
      adicional('ad1', 0, { target_product_id: FITA, hidden_on_variant_ids: [V_CORRENTE, V_CHAVEIRO] }),
      adicional('ad2', 1, { kind: 'list', target_product_id: null, list_id: 'l1' }),
    ]
    montar()
    await abrirAba()
    await waitFor(() => expect(itensNaLoja()[0]).toHaveTextContent('Fita de Cetim'))
    const [primeiro, segundo] = itensNaLoja()
    expect(primeiro.querySelector('b')?.textContent).toBe('Fita de Cetim')
    expect(primeiro.textContent).toBe('Fita de Cetimuma peça só · some com Corrente, Chaveiro')
    expect(segundo.querySelector('b')?.textContent).toBe('Correntes')
    expect(segundo.textContent).toBe('Correntesa cliente escolhe uma peça')

    acrescentar()
    expect(itensNaLoja()).toHaveLength(3)
    expect(itensNaLoja()[2].textContent).toBe('falta escolher')

    fireEvent.click(within(adicionalN(1)).getByRole('button', { name: 'Subir o adicional 2' }))
    expect(itensNaLoja()[0].querySelector('b')?.textContent).toBe('Correntes')
    expect(itensNaLoja()[1].querySelector('b')?.textContent).toBe('Fita de Cetim')
  })

  it('acompanha o rascunho: marcar "some" e trocar de tipo mudam a linha na hora', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA })]
    montar()
    await abrirAba()
    await waitFor(() => expect(itensNaLoja()[0].textContent).toBe('Fita de Cetimuma peça só'))
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Chaveiro' }))
    expect(itensNaLoja()[0].textContent).toBe('Fita de Cetimuma peça só · some com Chaveiro')
    fireEvent.click(within(adicionalN(0)).getByRole('button', { name: 'Uma peça de uma lista' }))
    expect(itensNaLoja()[0].textContent).toBe('falta escolher')
  })

  it('"Quando a peça sai do ar" vem depois de "Na loja", com o texto do protótipo', async () => {
    montar()
    await abrirAba()
    const saida = screen.getByRole('heading', { level: 2, name: 'Quando a peça sai do ar' })
    expect(naLoja().compareDocumentPosition(saida) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(saida.closest('section')).toHaveTextContent(
      'A loja pula o adicional sem quebrar a página, e ele aparece marcado aqui. Se todas as variações que você escolheu deixarem de existir, ele também sai — nunca passa a oferecer todas.',
    )
  })
})

describe('os textos do protótipo na aba', () => {
  it('a frase do cartão "Compre junto"', async () => {
    montar()
    await abrirAba()
    expect(
      screen.getByText('Até três peças que a cliente pode levar junto com esta joia, na ordem em que aparecem na loja. Nada vem marcado: ela escolhe o que quer.'),
    ).toBeInTheDocument()
  })

  it('a dica de nome sob a escolha de lista e sob a peça escolhida, com "a partir de"', async () => {
    montar()
    await abrirAba()
    acrescentar()
    const a = adicionalN(0)
    expect(within(a).getByText('O nome da lista é o que a cliente lê no bloco.')).toBeInTheDocument()
    expect(within(a).queryByText('O nome do produto é o que a cliente lê no bloco.')).toBeNull()

    fireEvent.click(within(a).getByRole('button', { name: 'Uma peça só' }))
    fireEvent.change(await screen.findByRole('textbox', { name: /Peça do adicional 1/ }), { target: { value: 'pingente' } })
    expect(within(a).queryByText('O nome do produto é o que a cliente lê no bloco.')).toBeNull()
    fireEvent.click(screen.getByTestId(`peca-${PINGENTE}`))
    await waitFor(() => expect(within(a).getByTestId('peca-escolhida-0')).toHaveTextContent('Pingente Estrela'))
    expect(within(a).getByTestId('peca-escolhida-0')).toHaveTextContent(/a partir de R\$\s50,00/)
    expect(within(a).getByText('O nome do produto é o que a cliente lê no bloco.')).toBeInTheDocument()
    expect(within(a).queryByText('O nome da lista é o que a cliente lê no bloco.')).toBeNull()
  })
})

describe('as variações oferecidas', () => {
  it('nenhuma marcada: resumo "todas as ativas (N)", chips escondidos até "Escolher quais", e a frase aberta', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: PINGENTE })]
    montar()
    await abrirAba()
    const a = adicionalN(0)
    const resumo = await within(a).findByTestId('resumo-variacoes-0')
    expect(resumo).toHaveTextContent('Variações oferecidas: todas as ativas (2)')
    const abrir = within(a).getByRole('button', { name: 'Escolher quais' })
    expect(abrir).toHaveAttribute('aria-expanded', 'false')
    expect(within(a).queryByRole('button', { name: /Prata/ })).toBeNull()
    expect(within(a).queryByRole('button', { name: 'Oferecer todas' })).toBeNull()
    const frase = 'Nenhuma marcada: a loja oferece todas as variações ativas, inclusive as que você criar depois.'
    expect(within(a).queryByText(frase)).toBeNull()

    fireEvent.click(abrir)
    expect(within(a).getByRole('button', { name: 'Esconder' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(a).getByRole('button', { name: /Prata/ })).toBeInTheDocument()
    expect(within(a).getByText(frase)).toBeInTheDocument()

    fireEvent.click(within(a).getByRole('button', { name: /Prata/ }))
    expect(resumo).toHaveTextContent('Variações oferecidas: 1 de 2')
    expect(within(a).queryByText(frase)).toBeNull()
    expect(within(a).getByRole('button', { name: 'Oferecer todas' })).toBeInTheDocument()
  })

  it('já com variação marcada, abre por padrão e conta só as que ainda existem', async () => {
    banco.produto!.product_buy_together = [
      adicional('ad1', 0, { target_product_id: PINGENTE, target_variant_ids: [V_OURO, uuid(999)] }),
    ]
    montar()
    await abrirAba()
    const a = adicionalN(0)
    expect(await within(a).findByTestId('resumo-variacoes-0')).toHaveTextContent('Variações oferecidas: 1 de 2')
    expect(within(a).getByRole('button', { name: 'Esconder' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(a).getByRole('button', { name: /Ouro/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('o desconto ao levar junto', () => {
  const campo = (n: number) => within(adicionalN(n)).getByRole('spinbutton', { name: 'Desconto em percentual' })
  const digitar = (n: number, valor: string) => fireEvent.change(campo(n), { target: { value: valor } })
  /** O texto cru, sem a normalização da Testing Library: o espaço do `R$` é o não separável do Intl. */
  const previa = (n: number) => screen.getByTestId(`previa-desconto-${n}`).textContent?.replace(/\u00a0/g, ' ')

  it('vazio quer dizer sem desconto: nenhum percentual, nenhuma prévia, e a ajuda não fala em concorrer com o cupom', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA })]
    montar()
    await abrirAba()
    expect(campo(0)).toHaveValue(null)
    expect(screen.queryByTestId('previa-desconto-0')).toBeNull()
    const bloco = screen.getByTestId('desconto-0')
    expect(within(bloco).getByText('Desconto ao levar junto')).toBeInTheDocument()
    expect(bloco).toHaveTextContent(
      'Percentual sobre esta peça quando a joia principal estiver no mesmo pedido. Vale o menor preço se a peça também estiver em promoção.',
    )
    expect(bloco.textContent).not.toMatch(/cupom|economiz|!/i)
  })

  it('51 é recusado no campo com a frase de core, e o salvar não escreve nada no Compre Junto', async () => {
    const { toast } = await import('@estrelinha/ui/hooks/use-toast')
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA })]
    montar()
    await abrirAba()
    await waitFor(() => expect(screen.getByTestId('peca-escolhida-0')).toHaveTextContent('Fita de Cetim'))
    digitar(0, '51')
    const frase = 'O desconto ao levar junto é um número inteiro de 1% a 50%.'
    expect(within(adicionalN(0)).getByRole('alert')).toHaveTextContent(frase)
    expect(campo(0)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByTestId('previa-desconto-0')).toBeNull()
    await salvar()
    expect(vi.mocked(toast)).toHaveBeenCalledWith(expect.objectContaining({ title: frase }))
    expect(banco.produtosPayload).toEqual([])
    expect(escritasDeAdicionais()).toEqual([])
  })

  it('a prévia diz por quanto a peça sai com esta joia, pela conta de core', async () => {
    banco.produtos = banco.produtos.map(p => (p.id === FITA ? { ...p, base_price: 79 } : p))
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA })]
    montar()
    await abrirAba()
    await waitFor(() => expect(screen.getByTestId('peca-escolhida-0')).toHaveTextContent('Fita de Cetim'))
    digitar(0, '10')
    expect(previa(0)).toBe('Fita de Cetim sai a R$ 71,10 com esta joia.')
  })

  it('com variações liberadas de preços diferentes, a prévia fala da faixa', async () => {
    banco.variacoes = [
      variacao(V_PRATA, PINGENTE, 'Prata', 0),
      { ...variacao(V_OURO, PINGENTE, 'Ouro', 1), price: 70 },
    ]
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: PINGENTE })]
    montar()
    await abrirAba()
    await waitFor(() => expect(screen.getByTestId('peca-escolhida-0')).toHaveTextContent('Pingente Estrela'))
    digitar(0, '10')
    expect(previa(0)).toBe('Pingente Estrela sai de R$ 45,00 a R$ 63,00 com esta joia.')
  })

  it('numa lista, a faixa vai do menor ao maior preço das peças dela', async () => {
    banco.itens = [
      { list_id: 'l1', product_id: FITA, position: 0, variant_ids: [] },
      { list_id: 'l1', product_id: PINGENTE, position: 1, variant_ids: [] },
    ]
    banco.produtos = banco.produtos.map(p => (p.id === FITA ? { ...p, base_price: 25 } : p))
    banco.variacoes = [
      variacao(V_PRATA, PINGENTE, 'Prata', 0),
      { ...variacao(V_OURO, PINGENTE, 'Ouro', 1), price: 70 },
    ]
    banco.produto!.product_buy_together = [adicional('ad1', 0, { kind: 'list', target_product_id: null, list_id: 'l1' })]
    montar()
    await abrirAba()
    await waitFor(() => expect(within(adicionalN(0)).getByText('Correntes', { selector: 'p' })).toBeInTheDocument())
    digitar(0, '15')
    expect(previa(0)).toBe('As peças de Correntes saem de R$ 21,25 a R$ 59,50 com esta joia.')
  })

  it('mudar só o percentual grava, e o corpo leva discount_percent', async () => {
    banco.produto!.product_buy_together = [adicional('ad1', 0, { target_product_id: FITA, discount_percent: 10 })]
    montar()
    await abrirAba()
    await waitFor(() => expect(campo(0)).toHaveValue(10))
    digitar(0, '15')
    await salvar()
    const escritas = escritasDeAdicionais()
    expect(escritas).toHaveLength(1)
    expect(escritas[0].upsert!.rows).toEqual([
      {
        id: 'ad1',
        product_id: PRINCIPAL,
        position: 0,
        kind: 'product',
        target_product_id: FITA,
        list_id: null,
        target_variant_ids: [],
        hidden_on_variant_ids: [],
        discount_percent: 15,
      },
    ])
  })
})
