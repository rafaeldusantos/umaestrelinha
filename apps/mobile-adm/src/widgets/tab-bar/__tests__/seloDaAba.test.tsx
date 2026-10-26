// Feature `74` · T25 — o selo da aba Pedidos (`MAP-31`..`MAP-33`, A24, A25, G-A24). A regra da forma
// (`textoDoSelo`, `nomeDaAbaComSelo`) e o selo pela árvore REAL (`<App />`): o número é
// `fila.precisa_acao` de `store_overview`, lido pela MESMA chave de cache da Início.
import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { movimento } from '@/test/movimento'
import { resumo } from '@/test/resumo'
import { nomeDaAbaComSelo, textoDoSelo } from '../model/selo'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const comFila = (precisa_acao: number) => resumo({ fila: { ...resumo().fila, precisa_acao } })
const barra = () => within(screen.getByRole('navigation', { name: 'Áreas do ateliê' }))
const abaPedidos = () => barra().getByRole('link', { name: /^Pedidos/ })
const selo = () => screen.queryByTestId('selo-da-aba')
const papeisPerguntados = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

beforeEach(() => {
  fake.reset()
  fake.comSessao('adri@exemplo.invalid', { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('a forma do selo (regra pura)', () => {
  it.each([
    [0, null],
    [null, null],
    [undefined, null],
    [-1, null],
    [1, '1'],
    [42, '42'],
    [99, '99'],
    [100, '99+'],
    [1234, '99+'],
  ])('textoDoSelo(%j) ⇒ %j', (n, esperado) => {
    expect(textoDoSelo(n)).toBe(esperado)
  })

  it.each([
    [1, 'Pedidos, 1 precisa de você'],
    [5, 'Pedidos, 5 precisam de você'],
    [100, 'Pedidos, 99+ precisam de você'],
    [0, 'Pedidos'],
    [null, 'Pedidos'],
  ])('nomeDaAbaComSelo("Pedidos", %j) ⇒ "%s"', (n, nome) => {
    expect(nomeDaAbaComSelo('Pedidos', n)).toBe(nome)
  })
})

describe('o selo na barra, pela árvore real (MAP-31, MAP-33)', () => {
  it('com `precisa_acao` 5: "5" sobre o ícone, `aria-hidden`; o nome diz "Pedidos, 5 precisam de você"', async () => {
    fake.responderRpc('store_overview', comFila(5))
    await montarApp('/clientes')
    await andar(50)
    expect(selo()?.textContent).toBe('5')
    expect(selo()).toHaveAttribute('aria-hidden', 'true')
    expect(abaPedidos()).toHaveAccessibleName('Pedidos, 5 precisam de você')
  })

  it('com 1: "Pedidos, 1 precisa de você"', async () => {
    fake.responderRpc('store_overview', comFila(1))
    await montarApp('/clientes')
    await andar(50)
    expect(abaPedidos()).toHaveAccessibleName('Pedidos, 1 precisa de você')
  })

  it('acima de 99: "99+"', async () => {
    fake.responderRpc('store_overview', comFila(100))
    await montarApp('/clientes')
    await andar(50)
    expect(selo()?.textContent).toBe('99+')
  })

  it('com 0: sem selo, e o nome é só "Pedidos"', async () => {
    fake.responderRpc('store_overview', comFila(0))
    await montarApp('/clientes')
    await andar(50)
    expect(selo()).toBeNull()
    expect(abaPedidos()).toHaveAccessibleName('Pedidos')
  })

  it('o selo não muda o rótulo VISÍVEL nem o alvo, e só a aba Pedidos tem selo', async () => {
    fake.responderRpc('store_overview', comFila(5))
    await montarApp('/clientes')
    await andar(50)
    const links = barra().getAllByRole('link')
    expect(links.map((l) => l.querySelector(':scope > span:last-child')?.textContent)).toEqual(['Início', 'Pedidos', 'Clientes', 'Descontos'])
    for (const l of links) expect(tokens(l)).toContain('min-h-12')
    expect(screen.getAllByTestId('selo-da-aba')).toHaveLength(1)
    expect(abaPedidos().contains(selo())).toBe(true)
    expect(tokens(selo()!)).toContain('absolute')
  })

  it('com a Início aberta: UMA chamada a `store_overview` — o selo e a página leem a mesma chave (dedupe)', async () => {
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', comFila(5))
    await montarApp('/')
    await andar(50)
    expect(selo()?.textContent).toBe('5')
    expect(fake.chamadasDe('store_overview')).toHaveLength(1)
  })
})

describe('sem leitura boa, sem selo — nunca número de cache nem zero (MAP-32, G-A24)', () => {
  it('a leitura pendente: sem selo', async () => {
    fake.pendurarRpc('store_overview')
    await montarApp('/clientes')
    await andar(50)
    expect(selo()).toBeNull()
    expect(abaPedidos()).toHaveAccessibleName('Pedidos')
  })

  it('a leitura falhou por rede: sem selo', async () => {
    fake.falharRpc('store_overview', REDE)
    await montarApp('/clientes')
    await andar(3000)
    expect(selo()).toBeNull()
  })

  it('a releitura falhou COM dado em cache: o selo some (nunca o número velho)', async () => {
    fake.aoChamarRpc('store_overview', (n) => (n === 1 ? { data: comFila(5), error: null } : { data: null, error: REDE }))
    await montarApp('/clientes')
    await andar(50)
    expect(selo()?.textContent).toBe('5')
    await act(async () => {
      window.dispatchEvent(new Event('visibilitychange'))
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(fake.chamadasDe('store_overview').length).toBeGreaterThanOrEqual(2)
    expect(selo()).toBeNull()
    expect(abaPedidos()).toHaveAccessibleName('Pedidos')
  })

  it('`42501`: sem selo, e o selo NÃO reconfere o papel (quem leva à recusa é a tela)', async () => {
    fake.falharRpc('store_overview', RECUSA)
    await montarApp('/clientes')
    await andar(3000)
    expect(selo()).toBeNull()
    expect(window.location.pathname).toBe('/clientes')
    expect(papeisPerguntados()).toBe(1)
    expect(fake.chamadasDe('store_overview')).toHaveLength(1)
  })
})
