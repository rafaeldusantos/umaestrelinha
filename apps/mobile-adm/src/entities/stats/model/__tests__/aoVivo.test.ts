// Feature `83` · T06 — `LAV-06`, `LAV-50`: o endereço da Loja ao vivo e o período que viaja na entrada
// do histórico (nunca na URL).
import { afterEach, describe, expect, it } from 'vitest'
import {
  AO_VIVO_PATH,
  estadoDaEntrada,
  gravarPeriodoNaEntrada,
  periodoDaEntrada,
  periodoDoInicio,
} from '../aoVivo'
import { PERIODOS, ehPeriodo } from '../periodos'

describe('AO_VIVO_PATH e estadoDaEntrada', () => {
  it('a rota é `/ao-vivo`, e o estado leva `doApp` e o período', () => {
    expect(AO_VIVO_PATH).toBe('/ao-vivo')
    expect(estadoDaEntrada('ontem')).toEqual({ doApp: true, periodo: 'ontem' })
    expect(estadoDaEntrada('semana')).toEqual({ doApp: true, periodo: 'semana' })
  })
})

describe('periodoDaEntrada (LAV-50)', () => {
  it.each(['hoje', 'ontem', 'semana'] as const)('o período %s do estado é o período inicial', (p) => {
    expect(periodoDaEntrada({ doApp: true, periodo: p })).toBe(p)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['objeto vazio', {}],
    ["'mes' (fora do vocabulário)", { periodo: 'mes' }],
    ['um número', { periodo: 3 }],
    ['a string solta', 'ontem'],
    ['o rótulo com maiúscula', { periodo: 'Ontem' }],
  ])('%s ⇒ Hoje', (_, estado) => {
    expect(periodoDaEntrada(estado)).toBe('hoje')
  })
})

describe('ehPeriodo', () => {
  it('só os três ids do vocabulário', () => {
    expect(PERIODOS.map((p) => p.id)).toEqual(['hoje', 'ontem', 'semana'])
    expect(PERIODOS.every((p) => ehPeriodo(p.id))).toBe(true)
    expect(ehPeriodo('mes')).toBe(false)
    expect(ehPeriodo(undefined)).toBe(false)
  })
})

describe('periodoDoInicio / gravarPeriodoNaEntrada (o período da Início ao voltar)', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))

  it('grava o período NA ENTRADA ATUAL, preservando `key`/`idx` e o estado, sem tocar a URL', () => {
    window.history.replaceState({ usr: { outro: 1 }, key: 'k1', idx: 4 }, '', '/?x=1#y')
    const tamanho = window.history.length

    gravarPeriodoNaEntrada('ontem')

    expect(window.history.state).toEqual({ usr: { outro: 1, periodo: 'ontem' }, key: 'k1', idx: 4 })
    expect(window.location.pathname + window.location.search + window.location.hash).toBe('/?x=1#y')
    expect(window.history.length).toBe(tamanho)
    expect(periodoDoInicio(window.history.state.usr)).toBe('ontem')
  })

  it('sem estado na entrada, cria o `usr` com o período', () => {
    window.history.replaceState(null, '', '/')
    gravarPeriodoNaEntrada('semana')
    expect(window.history.state).toEqual({ usr: { periodo: 'semana' } })
    expect(periodoDoInicio(window.history.state.usr)).toBe('semana')
  })

  it('a entrada sem período gravado (ou com valor fora do vocabulário) reabre em Hoje', () => {
    expect(periodoDoInicio(null)).toBe('hoje')
    expect(periodoDoInicio({ periodo: 'mes' })).toBe('hoje')
  })
})
