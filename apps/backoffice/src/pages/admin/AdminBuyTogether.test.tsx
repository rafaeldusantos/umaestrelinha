// As listas do Compre Junto pela PÁGINA REAL: o índice e o editor, sobre um banco em memória que
// responde pelo dublê que enxerga tabela, filtro e escrita.
//
// Dublado só o client do Supabase. A página, o editor, a busca de produto, a leitura da peça por id,
// o rascunho e as recusas de `core` são os reais — fiação provada renderizando a página, e não
// recriando a composição no teste.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

type Linha = Record<string, unknown>

const { banco } = vi.hoisted(() => ({
  banco: {
    listas: [] as Linha[],
    itens: [] as Linha[],
    usos: [] as Linha[],
    produtos: [] as Linha[],
    variacoes: [] as Linha[],
    calls: [] as unknown[],
    proximoId: 1,
  },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const eqDe = (r: Registro, coluna: string) => r.filters.find(f => f.method === 'eq' && f.args[0] === coluna)?.args[1]
  const duble = criarDuble((r): Resposta => {
    if (r.table === 'buy_together_lists') {
      if (r.insert) {
        const nova = { id: `l${banco.proximoId++}`, ...(r.insert as Linha), updated_at: '2026-11-02T10:00:00Z' }
        banco.listas.push(nova)
        return { data: { id: nova.id } }
      }
      if (r.update) return { data: null }
      if (r.delete) {
        const id = eqDe(r, 'id')
        banco.listas = banco.listas.filter(l => l.id !== id)
        return { data: null }
      }
      return { data: banco.listas }
    }
    if (r.table === 'buy_together_list_items') {
      const lista = eqDe(r, 'list_id')
      if (r.delete) {
        const ids = (r.filters.find(f => f.method === 'in')?.args[1] ?? []) as string[]
        banco.itens = banco.itens.filter(i => !(i.list_id === lista && ids.includes(i.product_id as string)))
        return { data: null }
      }
      if (r.upsert) {
        for (const novo of r.upsert.rows as Linha[]) {
          const i = banco.itens.findIndex(x => x.list_id === novo.list_id && x.product_id === novo.product_id)
          if (i >= 0) banco.itens[i] = { ...banco.itens[i], ...novo }
          else banco.itens.push(novo)
        }
        return { data: null }
      }
      if (String(r.select?.[0]).includes('product:products')) {
        return {
          data: [...banco.itens]
            .sort((a, b) => (a.position as number) - (b.position as number))
            .map(i => {
              const p = banco.produtos.find(x => x.id === i.product_id)
              return { ...i, product: p ? { ...p, capa: null } : null }
            }),
        }
      }
      return { data: banco.itens.filter(i => i.list_id === lista).map(i => ({ product_id: i.product_id })) }
    }
    if (r.table === 'buy_together_list_usage') return { data: banco.usos }
    if (r.table === 'products') {
      if (r.select?.[1] && (r.select[1] as { head?: boolean }).head) return { count: banco.produtos.length }
      const id = eqDe(r, 'id')
      if (id) return { data: banco.produtos.find(p => p.id === id) ?? null }
      return { data: banco.produtos }
    }
    if (r.table === 'product_variants') {
      const produto = eqDe(r, 'product_id')
      return { data: banco.variacoes.filter(v => v.product_id === produto) }
    }
    return { data: [] }
  })
  banco.calls = duble.calls
  return { supabase: { from: duble.from } }
})

const toastMock = vi.hoisted(() => vi.fn())
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))

import AdminBuyTogetherPage from './AdminBuyTogetherPage'
import AdminBuyTogetherListPage from './AdminBuyTogetherListPage'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const CORRENTE = uuid(1)
const FITA = uuid(2)
const PINGENTE = uuid(3)
const FORA = uuid(4)
const V_PRATA = uuid(11)
const V_OURO = uuid(12)

const produto = (id: string, name: string, over: Linha = {}) => ({
  id, name, slug: name.toLowerCase(), base_price: 50, image_url: null, is_active: true, stock_policy: 'track',
  stock_total: 5, requires_material: false, engraving_max_chars: null, options: [{ name: 'Metal', values: ['Prata', 'Ouro'] }],
  weight_kg: null, width_cm: null, height_cm: null, length_cm: null, ...over,
})

const variacao = (id: string, product_id: string, metal: string, position: number) => ({
  id, product_id, price: 50, option_values: { Metal: metal }, image_url: null, is_active: true, stock: 3, position,
})

const montar = (rota = '/admin/compre-junto') => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/compre-junto" element={<AdminBuyTogetherPage />} />
          <Route path="/admin/compre-junto/listas/nova" element={<AdminBuyTogetherListPage />} />
          <Route path="/admin/compre-junto/listas/:id" element={<AdminBuyTogetherListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const escritas = (tabela: string) =>
  (banco.calls as Registro[]).filter(c => c.table === tabela && (c.insert || c.update || c.upsert || c.delete))

const item = (list_id: string, product_id: string, position: number, variant_ids: string[] = []) => ({ list_id, product_id, position, variant_ids })

beforeEach(() => {
  banco.listas = []
  banco.itens = []
  banco.usos = []
  banco.proximoId = 1
  banco.produtos = [
    produto(CORRENTE, 'Corrente Veneziana'),
    produto(FITA, 'Fita de Cetim'),
    produto(PINGENTE, 'Pingente Estrela'),
    produto(FORA, 'Corrente Antiga', { is_active: false }),
  ]
  banco.variacoes = [variacao(V_PRATA, CORRENTE, 'Prata', 0), variacao(V_OURO, CORRENTE, 'Ouro', 1)]
  toastMock.mockClear()
  banco.calls.length = 0
})

const semear = () => {
  banco.listas = [{ id: 'l9', name: 'Correntes', updated_at: '2026-11-02T10:00:00Z' }]
  banco.itens = [item('l9', CORRENTE, 0), item('l9', FITA, 1), item('l9', PINGENTE, 2)]
}

describe('índice das listas', () => {
  it('sem listas, explica o que é uma lista e oferece "Nova lista"', async () => {
    montar()
    expect(await screen.findByText(/Uma lista junta as peças que você oferece junto com outras joias/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Nova lista' }).length).toBeGreaterThan(0)
    expect(screen.getByTestId('contagem-de-listas')).toHaveTextContent('(0)')
  })

  it('mostra peças, uso em joias e o aviso de peça que saiu do ar', async () => {
    semear()
    banco.itens.push(item('l9', FORA, 3))
    banco.usos = [{ list_id: 'l9', product_id: 'x', product_name: 'Anel Sol' }, { list_id: 'l9', product_id: 'y', product_name: 'Anel Lua' }]
    montar()
    const linha = await screen.findByTestId('lista-l9')
    expect(within(linha).getByText('Correntes')).toBeInTheDocument()
    expect(within(linha).getByText('4 de 12')).toBeInTheDocument()
    expect(within(linha).getByText('2 joias')).toBeInTheDocument()
    expect(screen.getByTestId('aviso-l9')).toHaveTextContent('1 peça saiu do ar')
    expect(screen.getByTestId('contagem-de-listas')).toHaveTextContent('(1)')
  })

  it('lista sem uso diz "Nenhuma joia"', async () => {
    semear()
    montar()
    expect(await within(await screen.findByTestId('lista-l9')).findByText('Nenhuma joia')).toBeInTheDocument()
  })

  it('a leitura que falha diz que falhou, e não "nenhuma lista"', async () => {
    semear()
    const { supabase } = await import('@estrelinha/supabase/client')
    const original = supabase.from
    ;(supabase as { from: unknown }).from = () => {
      throw new Error('banco fora do ar')
    }
    montar()
    expect(await screen.findByText('Não foi possível ler as listas.')).toBeInTheDocument()
    expect(screen.queryByText(/Uma lista junta as peças/)).not.toBeInTheDocument()
    ;(supabase as { from: unknown }).from = original
  })
})

describe('editor — criar a lista', () => {
  it('o nome tem contador e teto de 40; sem nome o Salvar fica desabilitado e a barra diz por quê', async () => {
    montar('/admin/compre-junto/listas/nova')
    const campo = await screen.findByLabelText('Nome da lista')
    expect(campo).toHaveAttribute('maxlength', '40')
    expect(screen.getByTestId('contador-do-nome')).toHaveTextContent('0 / 40')
    expect(screen.getByRole('button', { name: 'Salvar lista' })).toBeDisabled()
    expect(screen.getByTestId('estado-de-gravacao')).toHaveTextContent('Dê um nome à lista para salvar.')
    fireEvent.change(campo, { target: { value: 'Correntes' } })
    expect(screen.getByTestId('contador-do-nome')).toHaveTextContent('9 / 40')
    expect(screen.getByRole('button', { name: 'Salvar lista' })).toBeEnabled()
    expect(screen.getByTestId('estado-de-gravacao')).toHaveTextContent('Alterações não salvas')
  })

  it('lista sem peças pode ser salva (só o nome é exigido) e a tela diz que não pode ser usada ainda', async () => {
    montar('/admin/compre-junto/listas/nova')
    expect(await screen.findByTestId('lista-sem-pecas')).toHaveTextContent('Nenhuma peça ainda.')
    fireEvent.change(screen.getByLabelText('Nome da lista'), { target: { value: 'Vazia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar lista' }))
    await waitFor(() => expect(escritas('buy_together_lists')).toHaveLength(1))
    expect(escritas('buy_together_lists')[0].insert).toEqual({ name: 'Vazia' })
    expect(escritas('buy_together_list_items')).toHaveLength(0)
  })

  it('acrescenta peças pela busca e grava nome e posições; a peça já na lista e a fora do ar vêm desabilitadas com o motivo', async () => {
    montar('/admin/compre-junto/listas/nova')
    fireEvent.change(await screen.findByLabelText('Nome da lista'), { target: { value: 'Correntes' } })
    const busca = screen.getByLabelText('Acrescentar uma peça')
    fireEvent.change(busca, { target: { value: 'corrente' } })
    fireEvent.click(await screen.findByTestId(`peca-${CORRENTE}`))
    fireEvent.change(busca, { target: { value: 'fita' } })
    fireEvent.click(await screen.findByTestId(`peca-${FITA}`))

    fireEvent.change(busca, { target: { value: 'corrente' } })
    expect(await screen.findByTestId(`ja-escolhida-${CORRENTE}`)).toHaveTextContent('Já está na lista')
    expect(screen.getByTestId(`peca-${CORRENTE}`)).toBeDisabled()
    expect(screen.getByTestId(`ja-escolhida-${FORA}`)).toHaveTextContent('Fora do ar')
    expect(screen.getByTestId(`peca-${FORA}`)).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar lista' }))
    await waitFor(() => expect(escritas('buy_together_list_items')).toHaveLength(1))
    expect(escritas('buy_together_lists')[0].insert).toEqual({ name: 'Correntes' })
    expect(escritas('buy_together_list_items')[0].upsert?.rows).toEqual([
      { list_id: 'l1', product_id: CORRENTE, position: 0, variant_ids: [] },
      { list_id: 'l1', product_id: FITA, position: 1, variant_ids: [] },
    ])
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lista salva.' }))
  })

  it('a 13ª peça é recusada com o texto do design e não entra', async () => {
    const dozeProdutos = Array.from({ length: 12 }, (_, i) => produto(uuid(100 + i), `Peça ${i}`))
    banco.produtos = [...dozeProdutos, produto(uuid(200), 'Peça treze')]
    banco.listas = [{ id: 'l9', name: 'Cheia', updated_at: '2026-11-02T10:00:00Z' }]
    banco.itens = dozeProdutos.map((p, i) => item('l9', p.id as string, i))
    montar('/admin/compre-junto/listas/l9')
    expect(await screen.findByTestId('contador-de-pecas')).toHaveTextContent('12 de 12')
    fireEvent.change(screen.getByLabelText('Acrescentar uma peça'), { target: { value: 'treze' } })
    fireEvent.click(await screen.findByTestId(`peca-${uuid(200)}`))
    expect(await screen.findByTestId('faixa-de-recusa')).toHaveTextContent(
      'Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista.',
    )
    expect(screen.getByTestId('contador-de-pecas')).toHaveTextContent('12 de 12')
  })
})

describe('editor — ordenar, tirar e liberar variações', () => {
  const ordemNaTela = () =>
    within(screen.getByTestId('pecas-da-lista'))
      .getAllByRole('listitem')
      .filter(li => li.getAttribute('data-testid')?.startsWith('peca-da-lista-'))
      .map(li => li.getAttribute('data-testid'))

  it('"Descer" e "Subir" reordenam; a primeira não sobe e a última não desce; salvar grava a nova ordem', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    await screen.findByTestId('peca-da-lista-2')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Descer Corrente Veneziana' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Subir Corrente Veneziana' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer Pingente Estrela' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Descer Corrente Veneziana' }))
    await waitFor(() => expect(screen.getByTestId('peca-da-lista-1')).toHaveTextContent('Corrente Veneziana'))
    expect(screen.getByTestId('peca-da-lista-0')).toHaveTextContent('Fita de Cetim')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar lista' }))
    await waitFor(() => expect(escritas('buy_together_list_items')).toHaveLength(1))
    expect(escritas('buy_together_list_items')[0].upsert?.rows).toEqual([
      { list_id: 'l9', product_id: FITA, position: 0, variant_ids: [] },
      { list_id: 'l9', product_id: CORRENTE, position: 1, variant_ids: [] },
      { list_id: 'l9', product_id: PINGENTE, position: 2, variant_ids: [] },
    ])
    expect(ordemNaTela()).toHaveLength(3)
  })

  it('arrastar uma peça para o lugar de outra troca a ordem', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    await screen.findByTestId('peca-da-lista-2')
    fireEvent.dragStart(screen.getByTestId('peca-da-lista-0'))
    fireEvent.drop(screen.getByTestId('peca-da-lista-2'))
    await waitFor(() => expect(screen.getByTestId('peca-da-lista-2')).toHaveTextContent('Corrente Veneziana'))
    expect(screen.getByTestId('peca-da-lista-0')).toHaveTextContent('Fita de Cetim')
  })

  it('"Tirar" apaga a peça da lista ao salvar', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    await screen.findByTestId('peca-da-lista-2')
    fireEvent.click(screen.getByRole('button', { name: 'Tirar Fita de Cetim da lista' }))
    await waitFor(() => expect(screen.queryByTestId('peca-da-lista-2')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar lista' }))
    await waitFor(() => expect(escritas('buy_together_list_items').length).toBeGreaterThan(0))
    const apagou = escritas('buy_together_list_items').find(c => c.delete)!
    expect(apagou.filters).toContainEqual({ method: 'in', args: ['product_id', [FITA]] })
    expect(banco.itens.map(i => i.product_id)).toEqual([CORRENTE, PINGENTE])
  })

  it('libera variações por peça: "todas as ativas (N)" até marcar, "k de N" depois, e "Oferecer todas" volta', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    expect((await screen.findByTestId('resumo-variacoes-0')).textContent).toBe('Variações oferecidas: todas as ativas (2)')
    fireEvent.click(within(screen.getByTestId('peca-da-lista-0')).getByRole('button', { name: 'Escolher quais' }))
    const marcadores = screen.getByTestId('variacoes-0')
    expect(within(marcadores).getByText(/inclusive as que você criar depois/)).toBeInTheDocument()
    fireEvent.click(within(marcadores).getByRole('button', { name: /Ouro/ }))
    expect(screen.getByTestId('resumo-variacoes-0').textContent).toBe('Variações oferecidas: 1 de 2')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar lista' }))
    await waitFor(() => expect(escritas('buy_together_list_items')).toHaveLength(1))
    expect((escritas('buy_together_list_items')[0].upsert?.rows as Linha[])[0]).toEqual({
      list_id: 'l9', product_id: CORRENTE, position: 0, variant_ids: [V_OURO],
    })

    fireEvent.click(within(screen.getByTestId('peca-da-lista-0')).getByRole('button', { name: 'Oferecer todas' }))
    expect(screen.getByTestId('resumo-variacoes-0')).toHaveTextContent('todas as ativas (2)')
  })

  it('peça que saiu do ar vem marcada, com o aviso, e sem marcadores de variação', async () => {
    semear()
    banco.itens.push(item('l9', FORA, 3))
    montar('/admin/compre-junto/listas/l9')
    expect(await screen.findByTestId('saiu-do-ar-3')).toHaveTextContent('saiu do ar')
    expect(screen.getByTestId('aviso-fora-do-ar-3')).toHaveTextContent(
      'Esta peça saiu do ar. A loja a pula em todas as joias até ela voltar; tire-a da lista se não for voltar.',
    )
    expect(screen.queryByTestId('resumo-variacoes-3')).not.toBeInTheDocument()
  })

  it('se nenhuma das variações liberadas existe mais, a tela avisa que a loja pula a peça', async () => {
    semear()
    banco.itens[0] = item('l9', CORRENTE, 0, [uuid(999)])
    montar('/admin/compre-junto/listas/l9')
    expect(await screen.findByText(/Nenhuma das variações liberadas existe mais/)).toBeInTheDocument()
  })
})

describe('editor — em uso e excluir', () => {
  it('mostra em quantas joias a lista está, com até quatro nomes', async () => {
    semear()
    banco.usos = ['Anel A', 'Anel B', 'Anel C', 'Anel D', 'Anel E'].map((n, i) => ({ list_id: 'l9', product_id: `p${i}`, product_name: n }))
    montar('/admin/compre-junto/listas/l9')
    const uso = await screen.findByTestId('em-uso')
    await waitFor(() =>
      expect(uso).toHaveTextContent('5 joias oferecem esta lista. Mudar aqui muda o Compre Junto de todas elas.'),
    )
    expect(uso).toHaveTextContent('Anel D')
    expect(uso).not.toHaveTextContent('Anel E')
    expect(uso).toHaveTextContent('Ver as 5 joias')
  })

  it('excluir lista em uso é recusado nomeando as joias, e nada é apagado', async () => {
    semear()
    banco.usos = ['Anel A', 'Anel B', 'Anel C', 'Anel D'].map((n, i) => ({ list_id: 'l9', product_id: `p${i}`, product_name: n }))
    montar('/admin/compre-junto/listas/l9')
    await waitFor(() => expect(screen.getByTestId('em-uso')).toHaveTextContent('4 joias'))
    fireEvent.click(screen.getByRole('button', { name: /Excluir lista/ }))
    expect(await screen.findByTestId('faixa-de-recusa')).toHaveTextContent(
      'Esta lista está em uso em 4 joias (Anel A, Anel B, Anel C e outras). Tire-a delas antes de excluir.',
    )
    expect(escritas('buy_together_lists')).toHaveLength(0)
  })

  it('excluir lista sem uso apaga, avisa e volta ao índice', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    await screen.findByTestId('peca-da-lista-0')
    fireEvent.click(screen.getByRole('button', { name: /Excluir lista/ }))
    await waitFor(() => expect(escritas('buy_together_lists')).toHaveLength(1))
    expect(escritas('buy_together_lists')[0].filters).toContainEqual({ method: 'eq', args: ['id', 'l9'] })
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lista “Correntes” excluída.' }))
    expect(await screen.findByRole('heading', { name: 'Compre Junto' })).toBeInTheDocument()
  })

  it('o banco recusando (restrict) vira a frase acionável, e não o texto cru', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    await screen.findByTestId('peca-da-lista-0')
    const { supabase } = await import('@estrelinha/supabase/client')
    const original = supabase.from
    ;(supabase as { from: unknown }).from = (tabela: string) => {
      const b = original(tabela) as unknown as Record<string, unknown>
      if (tabela === 'buy_together_lists') {
        b.delete = () => ({ eq: () => Promise.resolve({ error: { code: '23503', message: 'violates foreign key' } }) })
      }
      return b
    }
    fireEvent.click(screen.getByRole('button', { name: /Excluir lista/ }))
    expect(await screen.findByTestId('faixa-de-recusa')).toHaveTextContent(
      'Esta lista está em uso e não pode ser excluída. Tire-a das joias que a usam antes.',
    )
    ;(supabase as { from: unknown }).from = original
  })
})

const FRASE_DA_LOJA =
  'Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma. Peças fora do ar, sem nenhuma variação à venda, ou que sejam a própria joia da página são puladas.'
const DICA_DO_NOME =
  'É este nome que a cliente lê no Compre Junto, na página de cada joia que usa a lista. Escreva como você falaria com ela: “Correntes”, “Pingentes para a mesma corrente”.'

describe('editor — os textos do protótipo', () => {
  it('"Como a cliente vê" descreve o que a loja faz, e a frase antiga sumiu', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    expect(await screen.findByText(FRASE_DA_LOJA)).toBeInTheDocument()
    expect(screen.queryByText(/O nome da lista é o título do bloco/)).not.toBeInTheDocument()
  })

  it.each([
    ['na lista nova', '/admin/compre-junto/listas/nova'],
    ['na lista existente', '/admin/compre-junto/listas/l9'],
  ])('a dica sob "Nome da lista" aparece %s, apontada pelo aria-describedby do campo', async (_, rota) => {
    semear()
    montar(rota)
    const campo = await screen.findByLabelText('Nome da lista')
    const dica = screen.getByText(DICA_DO_NOME)
    expect(dica.id).not.toBe('')
    expect((campo.getAttribute('aria-describedby') ?? '').split(/\s+/)).toContain(dica.id)
  })

  it('"Em uso" com uma joia fica no singular, com a consequência', async () => {
    semear()
    banco.usos = [{ list_id: 'l9', product_id: 'p0', product_name: 'Anel A' }]
    montar('/admin/compre-junto/listas/l9')
    const uso = await screen.findByTestId('em-uso')
    await waitFor(() =>
      expect(uso).toHaveTextContent('1 joia oferece esta lista. Mudar aqui muda o Compre Junto de todas elas.'),
    )
    expect(uso).toHaveTextContent('Anel A')
  })

  it('"Em uso" sem joias diz quando a lista entra na loja', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    expect((await screen.findByTestId('em-uso')).textContent).toBe(
      'Nenhuma joia usa esta lista ainda. Ela entra na loja quando você a escolher no Compre Junto de uma joia.',
    )
  })

  it('a busca "Acrescentar uma peça" só lista a partir de 2 letras, e no máximo 8', async () => {
    banco.produtos = Array.from({ length: 12 }, (_, i) => produto(uuid(300 + i), `Colar ${String(i).padStart(2, '0')}`))
    montar('/admin/compre-junto/listas/nova')
    const busca = await screen.findByLabelText('Acrescentar uma peça')
    expect(busca).toHaveAttribute('placeholder', 'Buscar pelo nome da joia')
    await waitFor(() => expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('12 no catálogo'))
    expect(screen.queryByTestId('pecas-encontradas')).not.toBeInTheDocument()

    fireEvent.change(busca, { target: { value: 'c' } })
    expect(screen.queryByTestId('pecas-encontradas')).not.toBeInTheDocument()
    expect(screen.queryByTestId('busca-sem-resultado')).not.toBeInTheDocument()

    fireEvent.change(busca, { target: { value: 'co' } })
    expect(within(await screen.findByTestId('pecas-encontradas')).getAllByRole('button')).toHaveLength(8)
  })

  it('a trilha começa por "Compre Junto", sem o nível "Catálogo"', async () => {
    semear()
    montar('/admin/compre-junto/listas/l9')
    const trilha = await screen.findByRole('navigation', { name: 'Trilha' })
    await waitFor(() => expect(trilha.textContent).toBe('Compre JuntoCorrentes'))
    expect(trilha).not.toHaveTextContent('Catálogo')
  })
})
