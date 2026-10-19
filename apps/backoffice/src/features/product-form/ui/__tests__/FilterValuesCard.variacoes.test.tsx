// Feature 67 (T07) — o bloco "Filtros da loja" pela peça e pelas variações (`VFL-01`, `VFL-02`,
// `VFL-04`, `VFL-07`, `VFL-29`..`VFL-31`).
//
// Inventário de `vi.mock` (`L-030`): o catálogo de filtros e as recusas (`@/entities/filter`, provados
// por conta própria) — o resto do barrel é o original —, e `@estrelinha/core/filters` com o ORIGINAL
// por dentro e um espião em `suggestMarks`: é o espião que prova que a sugestão deste bloco é a mesma
// função da fila (`VFL-31`), chamada com a peça como ela está no formulário.

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OptionMark } from '@estrelinha/core/filters'

const h = vi.hoisted(() => ({
  grupos: [] as unknown[],
  recusas: [] as unknown[],
  gravarRecusas: vi.fn(),
  suggestSpy: vi.fn(),
  /** Rodada 2 (B13): todo `from()` do client passa por aqui — "não grava" se assere na rede. */
  from: vi.fn(),
}))

// Rodada 2 da verificação: o client dublado registra qualquer `from()`. Nada neste bloco lê pela
// rede durante os casos (catálogo e recusas são dublados acima), então qualquer chamada aqui é uma
// escrita que "Aceitar" não pode fazer (`VFL-30`).
vi.mock('@estrelinha/supabase/client', () => {
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'insert', 'upsert', 'update', 'delete', 'eq', 'in', 'is', 'order']) builder[m] = () => builder
  builder.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok)
  return { supabase: { from: (...a: unknown[]) => (h.from(...a), builder) } }
})

vi.mock('@/entities/filter', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/filter')>()),
  useAdminFilterCatalog: () => ({ groups: h.grupos, loading: false, error: null }),
  useSuggestionDismissals: () => ({ recusas: h.recusas, carregando: false, erro: null }),
  gravarRecusas: (...a: unknown[]) => h.gravarRecusas(...a),
}))
vi.mock('@estrelinha/core/filters', async importOriginal => {
  const orig = await importOriginal<typeof import('@estrelinha/core/filters')>()
  return {
    ...orig,
    suggestMarks: (input: Parameters<typeof orig.suggestMarks>[0]) => {
      h.suggestSpy(input)
      return orig.suggestMarks(input)
    },
  }
})

import FilterValuesCard, { type PecaDoFormulario } from '../FilterValuesCard'
import { SUGGESTION_DISMISSALS_KEY } from '@/entities/filter'

const valor = (id: string, group_id: string, name: string, sort_order: number, suggest_terms: string[] = []) => ({
  id, group_id, name, slug: id, sort_order, marked_count: 0, option_marked_count: 0, suggest_terms,
})

const variacao = (id: string, option_values: Record<string, string>, is_active = true, image_url: string | null = null) => ({
  id, option_values, is_active, image_url, position: Number(id.replace(/\D/g, '')) || 0,
})

let peca: PecaDoFormulario
let marcas: OptionMark[]
let selecionados: string[]
const onChange = vi.fn()
const onOptionMarksChange = vi.fn()
let qc: QueryClient

beforeEach(() => {
  h.grupos = [
    {
      id: 'acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0, created_at: '',
      values: [
        valor('prata', 'acab', 'Prata 925', 0),
        valor('ouro', 'acab', 'Folheado a ouro', 1),
        valor('rodio', 'acab', 'Folheado a ródio', 2),
      ],
    },
    {
      id: 'tipo', name: 'Tipo de joia', slug: 'tipo-de-joia', is_active: true, sort_order: 1, created_at: '',
      values: [valor('colar', 'tipo', 'Colar', 0)],
    },
  ]
  h.recusas = []
  h.gravarRecusas.mockReset().mockResolvedValue(null)
  h.suggestSpy.mockReset()
  h.from.mockReset()
  onChange.mockReset()
  onOptionMarksChange.mockReset()
  selecionados = ['colar']
  marcas = [{ option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' }]
  peca = {
    id: 'p1',
    name: 'Colar Coração com Letra',
    tags: [],
    options: [
      { name: 'Cor', values: ['Prata 925', 'Folheado a Ouro', 'Folheado a Ródio'], position: 0 },
      { name: 'Letra', values: ['A', 'B'], position: 1 },
    ],
    variants: [
      variacao('v1', { Cor: 'Prata 925', Letra: 'A' }, true, 'https://x/prata.webp'),
      variacao('v2', { Cor: 'Prata 925', Letra: 'B' }),
      variacao('v3', { Cor: 'Folheado a Ouro', Letra: 'A' }),
      variacao('v4', { Cor: 'Folheado a Ródio', Letra: 'A' }, false),
    ],
  }
  qc = new QueryClient()
})

const montar = (over: Partial<{ peca: PecaDoFormulario; marcas: OptionMark[]; selecionados: string[] }> = {}) =>
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <FilterValuesCard
          selected={over.selecionados ?? selecionados}
          onChange={onChange}
          optionMarks={over.marcas ?? marcas}
          onOptionMarksChange={onOptionMarksChange}
          product={over.peca ?? peca}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const variacoes = () => screen.getByRole('region', { name: 'Pelas variações' })

describe('VFL-01 — um cartão por eixo, uma linha por texto, na ordem de options', () => {
  it('os eixos na ordem, as linhas na ordem, e o chip marcado diz "Grupo › Valor"', () => {
    montar()
    const secao = variacoes()
    expect(within(secao).getByText('Pelas variações')).toBeInTheDocument()
    expect(
      within(secao).getByText(
        'Marque o que muda de uma variação para outra. A marcação vale para toda variação com o mesmo texto.',
      ),
    ).toBeInTheDocument()
    const eixos = within(secao).getAllByRole('button', { name: / opç(ão|ões)/ })
    expect(eixos.map(b => b.textContent)).toEqual(['Cor3 opções', 'Letra2 opções · nenhuma marcada'])
    const linhas = within(secao).getAllByRole('group').filter(g => g.getAttribute('aria-label')?.startsWith('Cor = '))
    expect(linhas.map(g => g.getAttribute('aria-label'))).toEqual([
      'Cor = Prata 925',
      'Cor = Folheado a Ouro',
      'Cor = Folheado a Ródio',
    ])
    const prata = within(secao).getByRole('group', { name: 'Cor = Prata 925' })
    expect(within(prata).getByText('2 variações ativas')).toBeInTheDocument()
    expect(within(prata).getByRole('button', { name: 'Acabamento › Prata 925' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })).getByText('1 variação ativa')).toBeInTheDocument()
  })

  it('o eixo sem marcação nem sugestão nasce RECOLHIDO, e abre ao tocar', () => {
    montar()
    const letra = within(variacoes()).getByRole('button', { name: /^Letra/ })
    expect(letra).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Letra = A' })).toBeNull()
    fireEvent.click(letra)
    expect(letra).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('group', { name: 'Letra = A' })).toBeInTheDocument()
    expect(letra.textContent).toBe('Letra2 opções')
  })

  it('o "Marcar" da linha acrescenta a marcação daquela opção, e tocar no chip marcado a tira', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Cor = Folheado a Ouro' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Folheado a ouro' }))
    expect(onOptionMarksChange).toHaveBeenLastCalledWith([
      ...marcas,
      { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'ouro' },
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Acabamento › Prata 925' }))
    expect(onOptionMarksChange).toHaveBeenLastCalledWith([])
  })

  it('a busca do "Marcar" recorta pela dobra (sem acento, sem caixa)', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Cor = Folheado a Ouro' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar valor' }), { target: { value: 'RODIO' } })
    expect(screen.getByRole('checkbox', { name: 'Folheado a ródio' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Prata 925' })).toBeNull()
  })

  it('alvos de toque: chips, "Marcar" e o cabeçalho do eixo com min-h-11', () => {
    montar()
    for (const b of [
      screen.getByRole('button', { name: 'Acabamento › Prata 925' }),
      screen.getByRole('button', { name: 'Marcar Cor = Prata 925' }),
      within(variacoes()).getByRole('button', { name: /^Letra/ }),
    ]) {
      expect(b.className).toMatch(/(?:^|\s)min-h-11(?![-\w])/)
    }
  })
})

describe('VFL-02 — sem eixo, sem seção', () => {
  it('a peça sem options não ganha "Pelas variações" nem o título "Na peça toda"', () => {
    montar({ peca: { ...peca, options: [], variants: [] } })
    expect(screen.queryByRole('region', { name: 'Pelas variações' })).toBeNull()
    expect(screen.queryByText('Na peça toda')).toBeNull()
    expect(screen.getByRole('group', { name: 'Acabamento' })).toBeInTheDocument()
  })

  it('com eixo, as duas seções têm título', () => {
    montar()
    expect(screen.getByText('Na peça toda')).toBeInTheDocument()
    expect(screen.getByText('Pelas variações')).toBeInTheDocument()
  })
})

describe('VFL-04 — o que já vale para a peça toda', () => {
  it('no "Marcar", o valor marcado na peça toda vem desabilitado e com o motivo', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Marcar Cor = Folheado a Ouro' }))
    const colar = screen.getByRole('checkbox', { name: 'Colar Já vale para a peça toda' })
    expect(colar).toBeDisabled()
    expect(colar).toBeChecked()
  })

  it('a marcação por opção de um valor também marcado na peça toda aparece desabilitada, com o texto', () => {
    montar({ marcas: [{ option_name: 'Cor', option_value: 'Prata 925', value_id: 'colar' }] })
    const linha = screen.getByRole('group', { name: 'Cor = Prata 925' })
    expect(within(linha).getByRole('button', { name: 'Tipo de joia › Colar' })).toBeDisabled()
    expect(within(linha).getByText('Já vale para a peça toda')).toBeInTheDocument()
  })
})

describe('VFL-07 — "Sem variação ativa"', () => {
  it('a linha diz isso, o chip é removível, e a frase diz que não casa nada', () => {
    montar({ marcas: [{ option_name: 'Cor', option_value: 'Folheado a Ródio', value_id: 'rodio' }] })
    const linha = screen.getByRole('group', { name: 'Cor = Folheado a Ródio' })
    expect(within(linha).getByText('Sem variação ativa')).toBeInTheDocument()
    expect(
      within(linha).getByText('Marcada, mas não casa nada na loja enquanto as 1 variação estiver desativada.'),
    ).toBeInTheDocument()
    fireEvent.click(within(linha).getByRole('button', { name: 'Remover Acabamento › Folheado a ródio' }))
    expect(onOptionMarksChange).toHaveBeenLastCalledWith([])
  })

  it('com várias desativadas, o plural', () => {
    montar({
      peca: { ...peca, variants: [...peca.variants, variacao('v5', { Cor: 'Folheado a Ródio', Letra: 'B' }, false)] },
      marcas: [{ option_name: 'Cor', option_value: 'Folheado a Ródio', value_id: 'rodio' }],
    })
    expect(
      screen.getByText('Marcada, mas não casa nada na loja enquanto as 2 variações estiverem desativadas.'),
    ).toBeInTheDocument()
  })
})

describe('VFL-29..31 — as sugestões no próprio produto', () => {
  it('a sugestão por opção é um chip tracejado com a faixa do motivo; "Aceitar" só muda o estado', async () => {
    montar()
    const linha = screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })
    const chip = within(linha).getByTestId('chip-sugerido')
    expect(chip).toHaveTextContent('Acabamento › Folheado a ouro')
    expect(chip.className).toMatch(/(?:^|\s)border-dashed(?![-\w])/)
    expect(within(linha).getByText('Sugestão: Folheado a ouro — Opção Cor = Folheado a Ouro')).toBeInTheDocument()
    fireEvent.click(within(linha).getByRole('button', { name: 'Aceitar' }))
    expect(onOptionMarksChange).toHaveBeenLastCalledWith([
      ...marcas,
      { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'ouro' },
    ])
    // Rodada 3 (R04): drena microtarefas e um tique de timer ANTES de asserir a ausência. Logo depois
    // do clique, uma escrita adiada (`Promise.resolve().then(…)`, `setTimeout(…, 0)`) ainda não rodou,
    // e "não gravou" seria verdade nos dois mundos.
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(h.gravarRecusas).not.toHaveBeenCalled()
    expect(h.from).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('o eixo com sugestão nasce aberto mesmo sem marcação', () => {
    montar({ marcas: [] })
    expect(within(variacoes()).getByRole('button', { name: /^Cor/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('"Recusar" grava a recusa NA HORA, com o alvo da opção, e invalida a chave das recusas', async () => {
    const espiao = vi.spyOn(qc, 'invalidateQueries')
    montar()
    const linha = screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })
    await act(async () => {
      fireEvent.click(within(linha).getByRole('button', { name: 'Recusar' }))
    })
    expect(h.gravarRecusas).toHaveBeenCalledWith([
      { product_id: 'p1', value_id: 'ouro', option_name: 'Cor', option_value: 'Folheado a Ouro' },
    ])
    expect(espiao).toHaveBeenCalledWith({ queryKey: SUGGESTION_DISMISSALS_KEY })
    expect(onOptionMarksChange).not.toHaveBeenCalled()
  })

  it('a falha da recusa aparece e NÃO invalida nada', async () => {
    h.gravarRecusas.mockResolvedValue('permission denied')
    const espiao = vi.spyOn(qc, 'invalidateQueries')
    montar()
    await act(async () => {
      fireEvent.click(within(screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })).getByRole('button', { name: 'Recusar' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('permission denied')
    expect(espiao).not.toHaveBeenCalled()
  })

  it('a recusa gravada cala a sugestão', () => {
    h.recusas = [{ product_id: 'p1', value_id: 'ouro', option_name: 'Cor', option_value: 'Folheado a Ouro' }]
    montar()
    expect(screen.queryByText(/^Sugestão: Folheado a ouro/)).toBeNull()
  })

  it('a sugestão da peça toda (tag) tracejada no chip; "Aceitar" marca a peça toda', async () => {
    montar({ peca: { ...peca, tags: ['Prata925'] }, marcas: [], selecionados: [] })
    const acab = screen.getByRole('group', { name: 'Acabamento' })
    expect(within(acab).getByRole('button', { name: 'Prata 925' })).toHaveAttribute('data-sugerido', 'true')
    expect(within(acab).getByText("Sugestão: Prata 925 — Tag 'Prata925'")).toBeInTheDocument()
    fireEvent.click(within(acab).getByRole('button', { name: 'Aceitar' }))
    expect(onChange).toHaveBeenLastCalledWith(['prata'])
    // Rodada 2 (B13): a mesma régua de "não grava" do caso por opção — nem recusa, nem `from()`.
    // Rodada 3 (R04): depois de drenar microtarefas e um tique de timer, como no caso por opção.
    await act(async () => {
      await new Promise(r => setTimeout(r, 0))
    })
    expect(h.gravarRecusas).not.toHaveBeenCalled()
    expect(h.from).not.toHaveBeenCalled()
    expect(onOptionMarksChange).not.toHaveBeenCalled()
  })

  it('aceitar por opção um valor da peça toda TROCA (e avisa antes)', () => {
    montar({ marcas: [], selecionados: ['ouro'] })
    const linha = screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })
    expect(within(linha).getByText('Aceitar troca a marcação da peça toda por esta opção.')).toBeInTheDocument()
    fireEvent.click(within(linha).getByRole('button', { name: 'Aceitar' }))
    expect(onOptionMarksChange).toHaveBeenLastCalledWith([
      { option_name: 'Cor', option_value: 'Folheado a Ouro', value_id: 'ouro' },
    ])
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('produto novo: "Recusar" não grava (não há peça), e a faixa diz por quê', () => {
    montar({ peca: { ...peca, id: null } })
    const linha = screen.getByRole('group', { name: 'Cor = Folheado a Ouro' })
    expect(within(linha).getByRole('button', { name: 'Recusar' })).toBeDisabled()
    expect(within(linha).getByText('Salve o produto para poder recusar.')).toBeInTheDocument()
  })

  it('VFL-31 — a regra é a de `core`, chamada com a peça do FORMULÁRIO e as recusas dela', () => {
    h.recusas = [{ product_id: 'p1', value_id: 'x', option_name: '', option_value: '' }]
    montar()
    const entrada = h.suggestSpy.mock.calls.at(-1)![0]
    expect(entrada.products).toHaveLength(1)
    expect(entrada.products[0]).toMatchObject({
      id: 'p1',
      name: 'Colar Coração com Letra',
      filter_value_ids: ['colar'],
      option_marks: marcas,
    })
    expect(entrada.products[0].variants.map((v: { id: string }) => v.id)).toEqual(['v1', 'v2', 'v3', 'v4'])
    expect(entrada.dismissals).toEqual(h.recusas)
    expect(entrada.catalog.values.map((v: { id: string }) => v.id)).toEqual(['prata', 'ouro', 'rodio', 'colar'])
  })
})
