// A seção Acessos pela árvore REAL (`<App />` com sessão admin sobre o dublê do client): os quatro
// números, a variação da Semana contra a semana anterior e a nota da soma dos dias — e Visitas e
// Vendas IDÊNTICOS aos da faixa do Início para o mesmo período, lidos das duas telas montadas.
process.env.TZ = 'UTC'

import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComSacola } from '@/test/movimento'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const PERIODOS = [
  ['Hoje', 'hoje'],
  ['Ontem', 'ontem'],
  ['Semana', 'esta semana'],
] as const

/** Valores DISTINTOS por período e por campo (`L-013`). */
const distinto = () =>
  movimentoComSacola({
    periodos: {
      hoje: { visitas: 41, vendas: 3, faturamento: 300, ticket: 100 },
      ontem: { visitas: 12, vendas: 5, faturamento: 500, ticket: 100 },
      semana: { visitas: 230, vendas: 9, faturamento: 900, ticket: 100 },
    },
  })

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('store_overview', resumo())
  fake.responderRpc('store_movement', distinto())
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const valorDoGrupo = (dentro: HTMLElement, rotulo: string, falado: string) => {
  const g = within(dentro).getByRole('group', { name: new RegExp(`^${rotulo}, ${falado}, `) })
  return g.getAttribute('aria-label')!.slice(`${rotulo}, ${falado}, `.length)
}
const secao = () => screen.getByRole('region', { name: 'Acessos' })

describe('a seção Acessos na Loja ao vivo', () => {
  it('quatro números, na ordem, em cada período', async () => {
    await montarApp('/ao-vivo')
    await andar(50)
    for (const [botao, falado] of PERIODOS) {
      fireEvent.click(within(secao()).getByRole('button', { name: botao }))
      const nomes = within(screen.getByTestId('cartoes-dos-acessos'))
        .getAllByRole('group')
        .map((g) => g.getAttribute('aria-label')!.split(`, ${falado}, `)[0])
      expect(nomes).toEqual(['Visitas', 'Com sacola', 'Vendas', 'Conversão'])
    }
  })

  it('Semana: a variação contra a semana anterior nos quatro, e a nota da soma dos dias', async () => {
    await montarApp('/ao-vivo')
    await andar(50)
    fireEvent.click(within(secao()).getByRole('button', { name: 'Semana' }))
    const linhas = within(secao()).getAllByTestId('variacao').map((v) => v.textContent)
    expect(linhas).toEqual([
      '−20% vs semana anterior',
      '+25% vs semana anterior',
      '+50% vs semana anterior',
      '+88% vs semana anterior',
    ])
    expect(
      within(secao()).getByText('Com sacola, na semana, é a soma dos dias: quem pôs joia na sacola em dois dias conta duas vezes.'),
    ).toBeTruthy()
    fireEvent.click(within(secao()).getByRole('button', { name: 'Hoje' }))
    expect(within(secao()).queryByText(/soma dos dias/)).toBeNull()
  })

  it('Visitas e Vendas da seção são os da faixa do Início, nos três períodos', async () => {
    await montarApp('/')
    await andar(50)
    const faixa = screen.getByRole('region', { name: 'Movimento da loja' })
    const naFaixa: Record<string, string[]> = {}
    for (const [botao, falado] of PERIODOS) {
      fireEvent.click(within(faixa).getByRole('button', { name: botao }))
      naFaixa[botao] = [valorDoGrupo(faixa, 'Visitas', falado), valorDoGrupo(faixa, 'Vendas', falado)]
    }
    expect(naFaixa).toEqual({ Hoje: ['41', '3'], Ontem: ['12', '5'], Semana: ['230', '9'] })
    cleanup()

    await montarApp('/ao-vivo')
    await andar(50)
    const naSecao: Record<string, string[]> = {}
    for (const [botao, falado] of PERIODOS) {
      fireEvent.click(within(secao()).getByRole('button', { name: botao }))
      naSecao[botao] = [valorDoGrupo(secao(), 'Visitas', falado), valorDoGrupo(secao(), 'Vendas', falado)]
    }
    expect(naSecao).toEqual(naFaixa)
  })
})
