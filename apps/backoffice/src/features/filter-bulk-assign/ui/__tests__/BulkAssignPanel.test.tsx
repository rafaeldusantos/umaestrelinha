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

const montar = (marcadas: string[] = ['c1']) =>
  render(
    <BulkAssignPanel
      valueName="Prata 925"
      produtos={PRODUTOS}
      categorias={CATEGORIAS}
      marcadas={new Set(marcadas)}
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

  it('a coluna diz "Marcada" / "Não marcada" pelo que o banco devolveu', () => {
    montar(['c1'])
    expect(screen.getByTestId('situacao-c1')).toHaveTextContent('Marcada')
    expect(screen.getByTestId('situacao-a1')).toHaveTextContent('Não marcada')
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
