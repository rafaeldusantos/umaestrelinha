// Feature `83` · T09 — o caminho da Início até a Loja ao vivo pelo cartão "Agora na loja", pela árvore
// REAL (`<App />` com sessão admin sobre o dublê). `LAV-05`, `LAV-50`, e o critério 1 do PRD
// ATRAVESSANDO as duas telas (Visitas e Vendas da faixa == as da seção, nos três períodos), e o foco
// no título ao entrar e ao voltar (`LAV-62`, conserto da rodada 1 do Verificador).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake, type RespostaRpc } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComAcessos } from '@/test/movimento'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'

let instantes: number[] = []

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('store_overview', resumo())
  instantes = []
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const chamadas = () => fake.chamadasDe('store_movement').length
const responder = (r: (n: number) => RespostaRpc) =>
  fake.aoChamarRpc('store_movement', (n) => {
    instantes.push(Date.now())
    return r(n)
  })
const sempre = (m = movimentoComAcessos()) => responder(() => ({ data: m, error: null }))
const andarAte = async (ms: number) => {
  const alvo = instantes[instantes.length - 1] + ms
  await andar(Math.max(0, alvo - Date.now()))
}

const abrir = async () => {
  await montarApp('/')
  await andar(50)
}

const cartao = () => screen.getByTestId('cartao-agora-na-loja')
const faixa = () => screen.getByRole('region', { name: 'Movimento da loja' })
const valorDoGrupo = (dentro: HTMLElement, rotulo: string, falado: string) => {
  const g = within(dentro).getByRole('group', { name: new RegExp(`^${rotulo}, ${falado}, `) })
  return g.getAttribute('aria-label')!.slice(`${rotulo}, ${falado}, `.length)
}
const PERIODOS = [
  ['Hoje', 'hoje'],
  ['Ontem', 'ontem'],
  ['Semana', 'esta semana'],
] as const

/** Valores DISTINTOS por período e por campo (`L-013`). */
const distinto = () =>
  movimentoComAcessos({
    periodos: {
      hoje: { visitas: 41, vendas: 3, faturamento: 300, ticket: 100 },
      ontem: { visitas: 12, vendas: 5, faturamento: 500, ticket: 100 },
      semana: { visitas: 230, vendas: 9, faturamento: 900, ticket: 100 },
    },
  })

describe('o foco ao entrar e ao voltar (LAV-62)', () => {
  it('tocar o cartão leva o foco ao h1 "Loja ao vivo"; o Voltar o devolve ao h1 da Início', async () => {
    sempre()
    await abrir()
    fireEvent.click(cartao())
    await andar(50)
    expect(window.location.pathname).toBe('/ao-vivo')
    const titulo = screen.getByRole('heading', { level: 1, name: 'Loja ao vivo' })
    expect(document.activeElement).toBe(titulo)
    expect(titulo).toHaveAttribute('tabindex', '-1')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/')
    // com dado, o h1 da Início é a saudação (`MovementHero`), não a palavra "Início"
    const inicio = screen.getByRole('heading', { level: 1 })
    expect(within(faixa()).getByRole('heading', { level: 1 })).toBe(inicio)
    expect(document.activeElement).toBe(inicio)
  })
})

describe('o período entre as duas telas (LAV-50)', () => {
  it('Ontem na faixa e o toque ⇒ `/ao-vivo` com Ontem pressionado; voltar ⇒ a faixa reabre em Ontem', async () => {
    sempre(distinto())
    await abrir()
    fireEvent.click(within(faixa()).getByRole('button', { name: 'Ontem' }))
    fireEvent.click(cartao())
    await andar(50)
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(screen.getByRole('button', { name: 'Ontem' })).toHaveAttribute('aria-pressed', 'true')
    expect(window.history.state.usr).toEqual({ doApp: true, periodo: 'ontem' })
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/')
    expect(within(faixa()).getByRole('button', { name: 'Ontem' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(faixa()).getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('CRITÉRIO 1 DO PRD — Visitas e Vendas da faixa == as da seção, nos três períodos', async () => {
    sempre(distinto())
    await abrir()
    const naFaixa: Record<string, string[]> = {}
    for (const [botao, falado] of PERIODOS) {
      fireEvent.click(within(faixa()).getByRole('button', { name: botao }))
      naFaixa[botao] = [valorDoGrupo(faixa(), 'Visitas', falado), valorDoGrupo(faixa(), 'Vendas', falado)]
    }
    expect(naFaixa).toEqual({ Hoje: ['41', '3'], Ontem: ['12', '5'], Semana: ['230', '9'] })

    fireEvent.click(cartao())
    await andar(50)
    expect(window.location.pathname).toBe('/ao-vivo')
    const secao = screen.getByRole('region', { name: 'Acessos' })
    const naSecao: Record<string, string[]> = {}
    for (const [botao, falado] of PERIODOS) {
      fireEvent.click(within(secao).getByRole('button', { name: botao }))
      naSecao[botao] = [valorDoGrupo(secao, 'Visitas', falado), valorDoGrupo(secao, 'Vendas', falado)]
    }
    expect(naSecao).toEqual(naFaixa)
    // a mesma leitura: nenhuma chamada nova ao abrir a tela além da que o observador novo faz
    expect(fake.chamadasDe('store_movement').every((c) => c.args.length === 0)).toBe(true)
  })
})

describe('as releituras da Início (LAV-05)', () => {
  it('com a aba visível, a cada 30 s: nada a 29,8 s da última, uma a 30,3 s', async () => {
    sempre()
    await abrir()
    expect(chamadas()).toBe(1)
    await andarAte(29_800)
    expect(chamadas()).toBe(1)
    await andarAte(30_300)
    expect(chamadas()).toBe(2)
  })

  it('em segundo plano: nem o aviso do Realtime, nem 90 s ATRAVESSANDO a virada leem; de volta ao foco, uma', async () => {
    // As DUAS leituras da Início atravessam a virada em segundo plano: o movimento e o resumo. O
    // critério 5 do PRD é "nenhuma leitura em segundo plano", e contar só o movimento deixaria o timer
    // da virada do resumo ler com a aba oculta sem nada acusar (gate adversarial do Lote 2).
    const virada = { lido_em: '2026-10-23T02:59:50.000Z', expira_em: '2026-10-23T03:00:00.000Z' }
    fake.responderRpc('store_overview', resumo(virada))
    sempre(movimentoComAcessos(virada))
    await abrir()
    const resumos = () => fake.chamadasDe('store_overview').length
    expect(chamadas()).toBe(1)
    expect(resumos()).toBe(1)
    act(() => focusManager.setFocused(false))
    act(() => {
      expect(fake.emitir('orders')).toBe(1)
    })
    await andar(50)
    expect(chamadas()).toBe(1)
    expect(resumos()).toBe(1)
    await andar(90_000)
    expect(chamadas()).toBe(1)
    expect(resumos()).toBe(1)
    act(() => focusManager.setFocused(true))
    await andar(50)
    expect(chamadas()).toBe(2)
    expect(resumos()).toBe(2)
  })

  it('com a aba visível, o aviso do Realtime continua relendo', async () => {
    sempre()
    await abrir()
    act(() => {
      fake.emitir('orders')
    })
    await andar(50)
    expect(chamadas()).toBe(2)
  })
})
