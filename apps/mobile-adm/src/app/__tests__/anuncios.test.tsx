// Feature 72, T22 — o leitor de tela fica sabendo da tela nova (`MAF-29`, `MAF-30`), pela árvore
// REAL (`<App />`). No QA o TalkBack só repetia "Clientes, atual" ao trocar de aba (o `<title>` era o
// mesmo nas quatro), e a queda da rede não era anunciada.
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

let online = true
beforeEach(() => {
  fake.reset()
  online = true
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  vi.useFakeTimers({ shouldAdvanceTime: true })
  document.title = 'Ateliê · Uma Estrelinha'
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const tocarAba = (nome: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('link', { name: nome }))
    await vi.advanceTimersByTimeAsync(50)
  })

describe('o título do documento é o da aba (MAF-29)', () => {
  it('aberto em /pedidos ⇒ "Pedidos · Ateliê"; trocando, o título acompanha nas quatro', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    await screen.findByRole('heading', { level: 1, name: 'Pedidos' })
    expect(document.title).toBe('Pedidos · Ateliê')
    for (const [aba, titulo] of [
      ['Clientes', 'Clientes · Ateliê'],
      ['Descontos', 'Descontos · Ateliê'],
      ['Início', 'Início · Ateliê'],
    ]) {
      await tocarAba(aba)
      expect(document.title).toBe(titulo)
    }
  })

  it('saindo pelas abas, o Login volta ao título do app (nunca "Pedidos · Ateliê" na tela de entrar)', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    await screen.findByRole('heading', { level: 1, name: 'Pedidos' })
    await act(async () => {
      fake.perderSessao()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(await screen.findByRole('heading', { name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(document.title).toBe('Ateliê · Uma Estrelinha')
  })
})

describe('o foco vai ao título da página ao trocar de aba (MAF-29)', () => {
  it('tocar Clientes leva o foco ao h1 "Clientes"', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Início' })
    await tocarAba('Clientes')
    const titulo = screen.getByRole('heading', { level: 1, name: 'Clientes' })
    expect(document.activeElement).toBe(titulo)
    expect(titulo).toHaveAttribute('tabindex', '-1')
  })

  it('o voltar do Android também anuncia: o foco vai ao título da aba anterior', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/')
    await screen.findByRole('heading', { level: 1, name: 'Início' })
    await tocarAba('Pedidos')
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    const titulo = screen.getByRole('heading', { level: 1, name: 'Início' })
    expect(document.activeElement).toBe(titulo)
    expect(document.title).toBe('Início · Ateliê')
  })

  it('na abertura o foco NÃO é roubado — ninguém trocou de nada', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    const titulo = await screen.findByRole('heading', { level: 1, name: 'Pedidos' })
    expect(document.activeElement).not.toBe(titulo)
  })
})

describe('a queda da rede é anunciada (MAF-30)', () => {
  it('com o app aberto, a rede cai ⇒ a frase numa região viva ASSERTIVA', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    await screen.findByRole('heading', { level: 1, name: 'Pedidos' })
    await act(async () => {
      online = false
      window.dispatchEvent(new Event('offline'))
      await vi.advanceTimersByTimeAsync(50)
    })
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveAttribute('aria-live', 'assertive')
    expect(alerta).toHaveTextContent('Sem conexão. Os dados da loja aparecem quando a internet voltar.')
  })
})
