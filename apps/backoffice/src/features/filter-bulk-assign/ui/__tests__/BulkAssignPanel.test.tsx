// Feature 66 — `BulkAssignPanel` (`FLT-15`..`FLT-19`, `FLT-42`, `FLT-43`; T09 e T12).
//
// O componente real, sem dublê nenhum: a busca passa pela régua de verdade (`buscarProdutos`, com a
// dobra de `dobrarTexto`). Quem grava é `onMark`/`onUnmark`, e a asserção é a CHAMADA — quantas vezes
// e com quais ids —, não só o que a tela mostra depois.

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProdutoParaMarcar } from '@/entities/product'
import BulkAssignPanel from '../BulkAssignPanel'

const p = (id: string, name: string, extra: Partial<ProdutoParaMarcar> = {}): ProdutoParaMarcar => ({
  id,
  name,
  slug: id,
  is_active: true,
  base_price: 100,
  tags: [],
  category_ids: [],
  thumb: null,
  options: [],
  variants: [],
  filter_value_ids: [],
  option_marks: [],
  ...extra,
})

const PRODUTOS = [
  p('a1', 'Anel Coração com Cinzas', { category_ids: ['aneis'], tags: ['Prata925', 'Afetivo'] }),
  p('a2', 'Anel Infinito Pelo de Pet', { category_ids: ['aneis'], tags: ['pet'] }),
  p('c1', 'Colar Gota de Leite', { category_ids: ['colares'], tags: ['Prata925'] }),
  p('c2', 'Colar Estrela', { category_ids: ['colares'] }),
]

const CATEGORIAS = [
  { id: 'aneis', name: 'Anéis' },
  { id: 'colares', name: 'Colares' },
]

let onMark: ReturnType<typeof vi.fn>
let onUnmark: ReturnType<typeof vi.fn>

beforeEach(() => {
  onMark = vi.fn().mockResolvedValue(null)
  onUnmark = vi.fn().mockResolvedValue(null)
})

const montar = (
  marcadas: string[] = ['c1'],
  porOpcao?: Map<string, { option_name: string; option_value: string }[]>,
) =>
  render(
    <BulkAssignPanel
      valueName="Prata 925"
      produtos={PRODUTOS}
      categorias={CATEGORIAS}
      marcadas={new Set(marcadas)}
      porOpcao={porOpcao}
      onMark={onMark}
      onUnmark={onUnmark}
    />,
  )

const nomesVisiveis = () =>
  within(screen.getByRole('list', { name: 'Peças' }))
    .getAllByRole('checkbox')
    .map(c => c.getAttribute('aria-label'))

const buscar = (termo: string) => fireEvent.change(screen.getByLabelText('Buscar peça pelo nome'), { target: { value: termo } })

describe('FLT-15 — os recortes da lista', () => {
  it('a busca dobra acento e caixa nos dois sentidos, e casa toda palavra em qualquer ordem', () => {
    montar()
    buscar('CORACAO anel')
    expect(nomesVisiveis()).toEqual(['Anel Coração com Cinzas'])
  })

  it('o recorte por categoria', () => {
    montar()
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'colares' } })
    expect(nomesVisiveis()).toEqual(['Colar Estrela', 'Colar Gota de Leite'])
  })

  it('"Marcadas" mostra só as marcadas, "Não marcadas" só as outras', () => {
    montar(['c1', 'a2'])
    fireEvent.click(screen.getByRole('button', { name: 'Marcadas' }))
    expect(nomesVisiveis()).toEqual(['Anel Infinito Pelo de Pet', 'Colar Gota de Leite'])
    fireEvent.click(screen.getByRole('button', { name: 'Não marcadas' }))
    expect(nomesVisiveis()).toEqual(['Anel Coração com Cinzas', 'Colar Estrela'])
  })

  // Feature 67 (`VFL-32`): a peça marcada passou a dizer COMO — "Peça toda" no lugar de "Marcada".
  it('a coluna diz "Peça toda" / "Não marcada" pelo que o banco devolveu', () => {
    montar(['c1'])
    expect(screen.getByTestId('situacao-c1').textContent).toBe('Peça toda')
    expect(screen.getByTestId('situacao-a1').textContent).toBe('Não marcada')
  })
})

describe('FLT-18 — "Selecionar todos" pega só os visíveis, e diz o número', () => {
  it('com a lista recortada, seleciona só o recorte e o botão diz o número', async () => {
    montar([])
    buscar('anel')
    expect(screen.getByText(/Selecionar todos \(2\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Selecionar todos/ }))
    expect(screen.getByRole('button', { name: 'Marcar 2 produtos' })).toBeEnabled()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 produtos' }))
    })
    expect(onMark).toHaveBeenCalledTimes(1)
    expect([...onMark.mock.calls[0][0]].sort()).toEqual(['a1', 'a2'])
  })

  it('tocar de novo desfaz só os visíveis', () => {
    montar([])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    buscar('anel')
    fireEvent.click(screen.getByRole('checkbox', { name: /Selecionar todos/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Selecionar todos/ }))
    expect(screen.getByRole('button', { name: 'Marcar 1 produto' })).toBeEnabled()
  })
})

describe('FLT-16/FLT-17 — marcar e remover, uma chamada cada', () => {
  it('marcar leva a seleção inteira (a já marcada é no-op no banco)', async () => {
    montar(['c1'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Gota de Leite' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar 2 produtos' }))
    })
    expect(onMark).toHaveBeenCalledTimes(1)
    expect(onMark).toHaveBeenCalledWith(['c1', 'c2'])
    expect(onUnmark).not.toHaveBeenCalled()
  })

  it('remover leva só as selecionadas que estão marcadas, e o botão diz quantas', async () => {
    montar(['c1'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Gota de Leite' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remover de 1 produto' }))
    })
    expect(onUnmark).toHaveBeenCalledTimes(1)
    expect(onUnmark).toHaveBeenCalledWith(['c1'])
  })

  it('sem nada marcado na seleção, "Remover de 0 produtos" fica indisponível', () => {
    montar([])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    expect(screen.getByRole('button', { name: 'Remover de 0 produtos' })).toBeDisabled()
  })

  it('deu certo: a seleção esvazia', async () => {
    montar([])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar 1 produto' }))
    })
    expect(screen.getByText('0 peças selecionadas')).toBeInTheDocument()
  })
})

describe('FLT-19 — a falha não marca nada e a seleção fica', () => {
  it('mostra o erro, mantém as caixas e a coluna continua "Não marcada"', async () => {
    onMark.mockResolvedValue('sem rede')
    montar([])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Estrela' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar 1 produto' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('sem rede')
    expect(screen.getByRole('checkbox', { name: 'Colar Estrela' })).toBeChecked()
    expect(screen.getByTestId('situacao-c2')).toHaveTextContent('Não marcada')
  })
})

describe('FLT-42/FLT-43 — "Com a tag…" só recorta', () => {
  it('lista as tags com a contagem, as mais usadas primeiro', () => {
    montar()
    const opcoes = within(screen.getByLabelText('Com a tag…')).getAllByRole('option').map(o => o.textContent)
    expect(opcoes).toEqual(['Com a tag…', 'Prata925 (2)', 'Afetivo (1)', 'pet (1)'])
  })

  it('escolher a tag recorta a lista e NÃO grava nada nem seleciona nada', () => {
    montar()
    fireEvent.change(screen.getByLabelText('Com a tag…'), { target: { value: 'Prata925' } })
    expect(nomesVisiveis()).toEqual(['Anel Coração com Cinzas', 'Colar Gota de Leite'])
    expect(onMark).not.toHaveBeenCalled()
    expect(onUnmark).not.toHaveBeenCalled()
    expect(screen.getByText('0 peças selecionadas')).toBeInTheDocument()
  })

  it('tag combina com a busca (E)', () => {
    montar()
    fireEvent.change(screen.getByLabelText('Com a tag…'), { target: { value: 'Prata925' } })
    buscar('colar')
    expect(nomesVisiveis()).toEqual(['Colar Gota de Leite'])
  })
})

// Feature 67 (T10) — a marcação por opção na marcação em massa (`VFL-32`, `VFL-34`).
describe('VFL-32 — a coluna "Hoje" com as três formas', () => {
  const opcoes = new Map([
    ['a2', [{ option_name: 'Cor', option_value: 'Prata 925' }, { option_name: 'Tipos de elo', option_value: 'Prata 925' }]],
  ])

  it('peça toda, por opção (com eixo e texto) e nada', () => {
    montar(['c1'], opcoes)
    expect(screen.getByTestId('situacao-c1').textContent).toBe('Peça toda')
    expect(screen.getByTestId('situacao-a2').textContent).toBe('Por opção: Cor = Prata 925, Tipos de elo = Prata 925')
    expect(screen.getByTestId('situacao-a1').textContent).toBe('Não marcada')
  })

  it('"Marcadas" conta as duas formas', () => {
    montar(['c1'], opcoes)
    fireEvent.click(screen.getByRole('button', { name: 'Marcadas' }))
    expect(nomesVisiveis()).toEqual(['Anel Infinito Pelo de Pet', 'Colar Gota de Leite'])
  })
})

describe('VFL-34 — "Remover de N" tira as duas formas, e a confirmação diz isso', () => {
  const opcoes = new Map([['a2', [{ option_name: 'Cor', option_value: 'Prata 925' }]]])

  it('com marcação por opção na seleção: confirma, e só então remove as duas', async () => {
    montar(['c1'], opcoes)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Colar Gota de Leite' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Infinito Pelo de Pet' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover de 2 produtos' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(within(dialogo).getByText('Remover “Prata 925” de 2 produtos?')).toBeInTheDocument()
    expect(
      within(dialogo).getByText(
        'Saem as duas formas de marcação: na peça toda e por opção (1 peça marcada por opção). As peças continuam no catálogo.',
      ),
    ).toBeInTheDocument()
    expect(onUnmark).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Remover' }))
    })
    expect(onUnmark).toHaveBeenCalledWith(['c1', 'a2'])
  })

  it('"Manter" não remove nada', async () => {
    montar([], opcoes)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Anel Infinito Pelo de Pet' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remover de 1 produto' }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Manter' }))
    expect(onUnmark).not.toHaveBeenCalled()
  })
})
