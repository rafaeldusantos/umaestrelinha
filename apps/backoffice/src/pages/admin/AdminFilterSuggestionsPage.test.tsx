// Feature 67 (T08/T09) — `/admin/filtros/sugestoes`, a PÁGINA real (`VFL-18`..`VFL-27`).
//
// Inventário de `vi.mock` (`L-030`): o client do supabase (o dublê que enxerga e que GUARDA estado —
// gravar uma marcação muda o que a próxima leitura devolve, que é como "a fila atualiza sem
// recarregar" se prova de verdade) e `useAdminFilterCatalog` (provado por conta própria; aqui o
// `fetchCatalog` é espião), mais `@estrelinha/auth` — o caso D1 monta o `AdminLayout` real, e o menu
// da conta dele lê o e-mail da sessão (em produção o `AuthProvider` envolve o app inteiro, em
// `main.tsx`). O pool da marcação, as recusas, a regra de `core` e as escritas são REAIS.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, ehContagem, type Registro } from '@/test/dubleSupabase'

const h = vi.hoisted(() => ({
  fromMock: vi.fn(),
  grupos: [] as unknown[],
  fetchCatalog: vi.fn(),
}))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: h.fromMock, auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null }) }))
vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: h.grupos, loading: false, error: null, fetchCatalog: h.fetchCatalog }),
}))

import AdminFilterSuggestionsPage from './AdminFilterSuggestionsPage'
import { AdminLayout } from '@/widgets/admin-layout'

interface Linha {
  id: string
  name: string
  tags: string[]
  product_variants: { id: string; option_values: Record<string, string>; is_active: boolean; position: number }[]
  product_filter_values: { value_id: string }[]
  product_option_filter_values: { option_name: string; option_value: string; value_id: string }[]
}

let produtos: Linha[] = []
let recusas: Record<string, string>[] = []
let calls: Registro[] = []
let falhar: string | null = null

const linha = (id: string, name: string, extra: Partial<Linha> = {}): Linha => ({
  id, name, tags: [], product_variants: [], product_filter_values: [], product_option_filter_values: [], ...extra,
})
const v = (id: string, Cor: string, is_active = true) => ({ id, option_values: { Cor }, is_active, position: 0 })

const responder = (r: Registro) => {
  if (r.upsert || r.delete) {
    if (falhar === r.table) return { error: { message: 'sem rede' } }
    const rows = (r.upsert?.rows ?? []) as Record<string, string>[]
    if (r.table === 'product_option_filter_values')
      for (const x of rows) produtos.find(p => p.id === x.product_id)!.product_option_filter_values.push(x as never)
    if (r.table === 'product_filter_values' && r.upsert)
      for (const x of rows) produtos.find(p => p.id === x.product_id)!.product_filter_values.push({ value_id: x.value_id })
    if (r.table === 'product_filter_values' && r.delete) {
      const ids = r.filters.find(f => f.method === 'in')!.args[1] as string[]
      for (const p of produtos) if (ids.includes(p.id)) p.product_filter_values = []
    }
    if (r.table === 'filter_suggestion_dismissals') recusas.push(...rows)
    return { error: null }
  }
  if (r.table === 'products') return ehContagem(r) ? { count: produtos.length } : { data: structuredClone(produtos) }
  if (r.table === 'filter_suggestion_dismissals') return ehContagem(r) ? { count: recusas.length } : { data: [...recusas] }
  return { data: [] }
}

const valor = (id: string, group_id: string, name: string, sort_order: number) => ({
  id, group_id, name, slug: id, sort_order, marked_count: 0, option_marked_count: 0, suggest_terms: [],
})

beforeEach(() => {
  falhar = null
  recusas = []
  h.fetchCatalog.mockReset().mockResolvedValue(undefined)
  h.grupos = [
    {
      id: 'acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0, created_at: '',
      values: [valor('prata', 'acab', 'Prata 925', 0)],
    },
    {
      id: 'tipo', name: 'Tipo de joia', slug: 'tipo', is_active: true, sort_order: 1, created_at: '',
      values: [valor('pingente', 'tipo', 'Pingente', 0)],
    },
  ]
  produtos = [
    linha('a', 'Colar Coração com Letra', { product_variants: [v('a1', 'Prata 925'), v('a2', 'Prata 925'), v('a3', 'Folheado a Ouro')] }),
    linha('b', 'Gota Patinha', {
      product_variants: [v('b1', 'Prata 925'), v('b2', 'Ouro Rosé')],
      product_filter_values: [{ value_id: 'prata' }],
    }),
    linha('c', 'Anel Gota', { product_variants: [v('c1', 'Prata 925')] }),
    linha('d', 'Brinco', { tags: ['Prata925'] }),
  ]
  const d = criarDuble(responder)
  calls = d.calls
  h.fromMock.mockReset().mockImplementation(d.from)
})

let local = ''
const Onde = () => {
  const l = useLocation()
  local = l.pathname + l.search
  return null
}

const montar = (rota = '/admin/filtros/sugestoes') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/filtros/sugestoes" element={<><AdminFilterSuggestionsPage /><Onde /></>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return qc
}

const lista = () => screen.getByRole('region', { name: 'Motivos' })
const detalhe = () => screen.getByRole('region', { name: 'Motivo aberto' })
const esperarFila = () => waitFor(() => expect(lista()).toBeInTheDocument())

describe('VFL-18 — os motivos, com valor, alvo e contagem literais', () => {
  it('o cabeçalho, o total pendente e uma linha por motivo', async () => {
    montar()
    await esperarFila()
    expect(screen.getByRole('heading', { name: 'Sugestões' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Filtros da loja › Sugestões — o que o nome, as tags e as opções das peças já dizem. Nada é marcado até você aprovar.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId('total-pendente')).toHaveTextContent('4 pendentes')
    expect(screen.getByRole('link', { name: 'Voltar aos filtros' })).toHaveAttribute('href', '/admin/filtros')
    const motivos = within(lista()).getAllByRole('button', { name: /peças?$/ })
    expect(motivos.map(b => b.textContent)).toEqual([
      'Opção Cor = Prata 925sugere Acabamento › Prata 925 · nesta opção3 peças',
      "Tag 'Prata925'sugere Acabamento › Prata 925 · peça toda1 peça",
    ])
  })
})

describe('VFL-19 — o motivo aberto lista as peças, todas selecionadas', () => {
  it('título, nota, selo da troca, as colunas e as linhas', async () => {
    montar()
    await esperarFila()
    const d = detalhe()
    expect(within(d).getByText('Motivo · Opção da peça')).toBeInTheDocument()
    expect(within(d).getByRole('heading', { name: 'Cor = “Prata 925” ⇒ Acabamento › Prata 925' })).toBeInTheDocument()
    expect(
      within(d).getByText('Vale só para as variações com esse texto em cada peça. As outras opções da mesma peça não são marcadas.'),
    ).toBeInTheDocument()
    expect(within(d).getByText('1 troca a marcação da peça toda')).toBeInTheDocument()
    expect(within(d).getByText('3 peças · 3 selecionadas')).toBeInTheDocument()
    expect(within(d).getByText('Variações que casam')).toBeInTheDocument()
    expect(within(d).getByText('Hoje')).toBeInTheDocument()
    for (const nome of ['Colar Coração com Letra', 'Gota Patinha', 'Anel Gota'])
      expect(within(d).getByRole('checkbox', { name: nome })).toBeChecked()
    const a = within(d).getByTestId('peca-a')
    expect(within(a).getByTestId('casam')).toHaveTextContent('2 de 3')
    expect(within(a).getByText('3 variações · Cor também: Folheado a Ouro')).toBeInTheDocument()
    expect(within(a).getByTestId('hoje')).toHaveTextContent('Sem marcação')
    // VFL-27: o aviso NA LINHA, antes do clique.
    expect(within(within(d).getByTestId('peca-b')).getByTestId('hoje')).toHaveTextContent('Peça toda → troca')
    expect(within(d).getByText('3 de 3 selecionadas')).toBeInTheDocument()
    expect(within(d).getByText('Os dois botões valem para as selecionadas. As desmarcadas continuam na fila.')).toBeInTheDocument()
    expect(within(d).getByRole('button', { name: 'Recusar 3' })).toBeInTheDocument()
    expect(within(d).getByRole('button', { name: 'Aprovar 3 nesta opção' })).toBeInTheDocument()
  })

  it('abrir outro motivo vai para a URL, e o detalhe troca', async () => {
    montar()
    await esperarFila()
    fireEvent.click(within(lista()).getByRole('button', { name: /^Tag 'Prata925'/ }))
    expect(local).toContain('motivo=')
    expect(within(detalhe()).getByRole('heading', { name: "Tag 'Prata925' ⇒ Acabamento › Prata 925" })).toBeInTheDocument()
    expect(within(detalhe()).getByRole('button', { name: 'Aprovar 1 na peça toda' })).toBeInTheDocument()
  })

  it('desmarcar uma muda os números dos dois botões', async () => {
    montar()
    await esperarFila()
    fireEvent.click(within(detalhe()).getByRole('checkbox', { name: 'Anel Gota' }))
    expect(within(detalhe()).getByText('3 peças · 2 selecionadas')).toBeInTheDocument()
    expect(within(detalhe()).getByRole('button', { name: 'Aprovar 2 nesta opção' })).toBeInTheDocument()
  })
})

describe('VFL-20/24/27 — aprovar grava, troca na ordem, e a fila se atualiza sem recarregar', () => {
  it('aprova as selecionadas; a desmarcada continua na fila; o catálogo é relido', async () => {
    montar()
    await esperarFila()
    fireEvent.click(within(detalhe()).getByRole('checkbox', { name: 'Anel Gota' }))
    await act(async () => {
      fireEvent.click(within(detalhe()).getByRole('button', { name: 'Aprovar 2 nesta opção' }))
    })
    const escritas = calls.filter(c => c.upsert || c.delete).map(c => `${c.delete ? 'delete' : 'upsert'} ${c.table}`)
    expect(escritas).toEqual(['upsert product_option_filter_values', 'delete product_filter_values'])
    // A fila foi RELIDA (as duas chaves invalidadas): o motivo agora tem só a desmarcada.
    await waitFor(() =>
      expect(within(lista()).getByRole('button', { name: /^Opção Cor = Prata 925/ })).toHaveTextContent('1 peça'),
    )
    expect(screen.getByTestId('total-pendente')).toHaveTextContent('2 pendentes')
    expect(h.fetchCatalog).toHaveBeenCalledWith('revalidar')
  })

  it('VFL-21 — recusar grava e some, e não volta numa releitura', async () => {
    montar()
    await esperarFila()
    fireEvent.click(within(lista()).getByRole('button', { name: /^Tag 'Prata925'/ }))
    await act(async () => {
      fireEvent.click(within(detalhe()).getByRole('button', { name: 'Recusar 1' }))
    })
    expect(recusas).toEqual([{ product_id: 'd', value_id: 'prata', option_name: '', option_value: '' }])
    await waitFor(() => expect(within(lista()).queryByRole('button', { name: /^Tag 'Prata925'/ })).toBeNull())
  })

  it('VFL-23 — a falha deixa a seleção, não marca nada e não relê', async () => {
    falhar = 'product_option_filter_values'
    montar()
    await esperarFila()
    fireEvent.click(within(detalhe()).getByRole('checkbox', { name: 'Anel Gota' }))
    const leiturasAntes = calls.filter(c => !c.upsert && !c.delete).length
    await act(async () => {
      fireEvent.click(within(detalhe()).getByRole('button', { name: 'Aprovar 2 nesta opção' }))
    })
    expect(within(detalhe()).getByRole('alert')).toHaveTextContent('sem rede')
    expect(within(detalhe()).getByText('3 peças · 2 selecionadas')).toBeInTheDocument()
    expect(within(detalhe()).getByRole('checkbox', { name: 'Anel Gota' })).not.toBeChecked()
    expect(calls.some(c => c.delete)).toBe(false)
    expect(calls.filter(c => !c.upsert && !c.delete).length).toBe(leiturasAntes)
    expect(h.fetchCatalog).not.toHaveBeenCalled()
  })
})

describe('VFL-25 — recortes', () => {
  it('por fonte, por grupo e pela busca dobrada', async () => {
    montar()
    await esperarFila()
    const fonte = within(lista()).getByRole('group', { name: 'Fonte' })
    fireEvent.click(within(fonte).getByRole('button', { name: 'Tag' }))
    expect(within(lista()).getAllByRole('button', { name: /peças?$/ })).toHaveLength(1)
    fireEvent.click(within(fonte).getByRole('button', { name: 'Todas' }))
    fireEvent.change(within(lista()).getByRole('combobox', { name: 'Grupo de filtro' }), { target: { value: 'tipo' } })
    expect(within(lista()).getByText('Nenhum motivo neste recorte.')).toBeInTheDocument()
    fireEvent.change(within(lista()).getByRole('combobox', { name: 'Grupo de filtro' }), { target: { value: '' } })
    fireEvent.change(within(lista()).getByRole('textbox', { name: 'Buscar no motivo' }), { target: { value: 'PRATA925' } })
    expect(within(lista()).getAllByRole('button', { name: /peças?$/ }).map(b => b.textContent?.slice(0, 15))).toEqual([
      "Tag 'Prata925's",
    ])
    expect(within(lista()).getByRole('textbox', { name: 'Buscar no motivo' })).toHaveAttribute(
      'placeholder',
      'Buscar no motivo (ex.: rosé, chaveiro)',
    )
  })

  it('?valor= recorta pelo valor (o atalho da marcação em massa)', async () => {
    produtos.push(linha('e', 'Pingente Lua'), linha('f', 'Pingente Sol'))
    montar('/admin/filtros/sugestoes?valor=pingente')
    await esperarFila()
    expect(within(lista()).getAllByRole('button', { name: /peças?$/ }).map(b => b.textContent)).toEqual([
      "Nome contém 'pingente'sugere Tipo de joia › Pingente · peça toda2 peças",
    ])
  })
})

describe('VFL-26 — os dois vazios', () => {
  it('sem grupo nenhum: diz isso e linka para /admin/filtros', async () => {
    h.grupos = []
    montar()
    await waitFor(() => expect(screen.getByText('Nenhum grupo de filtro ainda.')).toBeInTheDocument())
    expect(screen.getByText('As sugestões aparecem depois que você cria os grupos e os valores.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar os filtros da loja' })).toHaveAttribute('href', '/admin/filtros')
  })

  it('nada sobrando: "Nenhuma sugestão pendente"', async () => {
    produtos = [linha('z', 'Brinco')]
    montar()
    await waitFor(() => expect(screen.getByText('Nenhuma sugestão pendente')).toBeInTheDocument())
    expect(screen.getByTestId('total-pendente')).toHaveTextContent('0 pendentes')
  })
})

describe('celular — o motivo aberto é a URL', () => {
  it('com ?motivo= a lista sai da frente e o voltar a devolve', async () => {
    montar()
    await esperarFila()
    fireEvent.click(within(lista()).getByRole('button', { name: /^Opção Cor = Prata 925/ }))
    expect(lista().parentElement!.className).toMatch(/(?:^|\s)hidden(?![-\w])/)
    expect(screen.getByRole('heading', { name: 'Cor = “Prata 925”' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(local).not.toContain('motivo=')
  })
})

// D1 da prova em navegador (feature 67): a barra "Recusar N / Aprovar N" é `sticky bottom-0`, e
// `sticky` gruda no CONTÊINER DE ROLAGEM mais próximo — qualquer ancestral com `overflow` diferente de
// `visible`. Havia dois: o `section` do motivo (`overflow-hidden`, pelo canto arredondado) e o `main`
// do painel (`overflow-auto`). Quem rola é o documento, então a barra grudava no fim do motivo: medido,
// 13.993px numa janela de 900. jsdom não tem CSS nem layout, então a régua é a CLASSE de cada
// ancestral, na página real montada DENTRO do layout real — a medida é do navegador
// (`prova-navegador.md`, "Reprova depois do conserto").
describe('D1 — a barra de ação gruda na janela: nada entre ela e o documento é contêiner de rolagem', () => {
  const OVERFLOW = /(?:^|\s)(?:[\w-]+:)*overflow(?:-[xy])?-(?:auto|hidden|clip|scroll)(?![-\w])/

  /** Os ancestrais da barra, até o `<html>`, cujas classes declaram `overflow`. */
  const contemDeRolagem = (barra: Element): string[] => {
    const achados: string[] = []
    for (let e = barra.parentElement; e; e = e.parentElement) {
      const cls = e.getAttribute('class') ?? ''
      if (OVERFLOW.test(cls)) achados.push(`${e.tagName.toLowerCase()}: ${cls}`)
    }
    return achados
  }

  const montarNoLayout = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/admin/filtros/sugestoes']}>
          <Routes>
            <Route element={<AdminLayout />}>
              <Route path="/admin/filtros/sugestoes" element={<AdminFilterSuggestionsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('a barra é `sticky bottom-0`, e nenhum ancestral até o documento declara `overflow`', async () => {
    montarNoLayout()
    await esperarFila()
    const barra = within(detalhe()).getByTestId('barra-do-motivo')
    const tokens = (barra.getAttribute('class') ?? '').split(/\s+/)
    expect(tokens).toContain('sticky')
    expect(tokens).toContain('bottom-0')
    // Os botões estão DENTRO da barra — senão a régua mediria uma barra vazia.
    expect(within(barra).getByRole('button', { name: 'Aprovar 3 nesta opção' })).toBeInTheDocument()
    expect(within(barra).getByRole('button', { name: 'Recusar 3' })).toBeInTheDocument()
    // Âncora: a caminhada atravessa o `main` do layout e o próprio `section` — sem os dois no
    // caminho, "nenhum overflow" seria verdade por não ter subido até eles.
    const caminho: string[] = []
    for (let e = barra.parentElement; e; e = e.parentElement) caminho.push(e.tagName.toLowerCase())
    expect(caminho).toContain('section')
    expect(caminho).toContain('main')
    expect(caminho[caminho.length - 1]).toBe('html')
    expect(contemDeRolagem(barra)).toEqual([])
  })

  it('SENSOR: a régua acusa as duas formas que estavam no disco (o `section` e o `main`)', () => {
    const raiz = document.createElement('div')
    raiz.innerHTML =
      '<main class="flex-1 p-6 overflow-auto"><section class="flex flex-col overflow-hidden rounded-2xl"><div id="b"></div></section></main>'
    const b = raiz.querySelector('#b')!
    expect(contemDeRolagem(b)).toEqual([
      'section: flex flex-col overflow-hidden rounded-2xl',
      'main: flex-1 p-6 overflow-auto',
    ])
  })

  it('SENSOR: prefixo de breakpoint e eixo também contam; `overflow-wrap`/`text-ellipsis` não', () => {
    const raiz = document.createElement('div')
    raiz.innerHTML =
      '<div class="lg:overflow-y-clip"><div class="overflow-wrap-anywhere break-words"><div id="b"></div></div></div>'
    expect(contemDeRolagem(raiz.querySelector('#b')!)).toEqual(['div: lg:overflow-y-clip'])
  })
})
