// Feature 72, T13 — sair e sessão perdida, pela árvore REAL (`<App />` com sessão admin): `MAF-13`
// e o edge case "a sessão expira com o app aberto".
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const temToken = (el: Element, token: string) => el.getAttribute('class')!.split(/\s+/).includes(token)
const botaoDaConta = () => screen.getByRole('button', { name: 'Sua conta' })

describe('o menu da conta (MAF-13)', () => {
  it('fica no cabeçalho de toda aba, com alvo de 48 px', async () => {
    for (const caminho of ['/', '/pedidos', '/clientes', '/descontos']) {
      const { unmount } = await montarApp(caminho)
      const botao = botaoDaConta()
      expect(botao.closest('header')).not.toBeNull()
      expect(temToken(botao, 'min-h-12')).toBe(true)
      expect(temToken(botao, 'min-w-12')).toBe(true)
      unmount()
    }
  })

  it('abre com o e-mail de quem entrou e o "Sair"', async () => {
    await montarApp('/')
    expect(botaoDaConta()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(botaoDaConta())
    expect(botaoDaConta()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(EMAIL)).toBeInTheDocument()
    expect(temToken(screen.getByRole('button', { name: 'Sair' }), 'min-h-12')).toBe(true)
  })

  it('"Sair" encerra a sessão e volta ao Login', async () => {
    await montarApp('/pedidos')
    fireEvent.click(botaoDaConta())
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(fake.estado.sessao).toBeNull()
  })

  it('o toque duplo em "Sair" encerra a sessão UMA vez', async () => {
    // S11 da verificação r3: o botão trava enquanto sai.
    await montarApp('/pedidos')
    fireEvent.click(botaoDaConta())
    const sair = screen.getByRole('button', { name: 'Sair' })
    // Dois toques como o aparelho os entrega: eventos separados, cada um com o seu render. Os dois
    // dentro do mesmo `act` não é o que acontece num celular: o React aplica o update de um evento
    // discreto antes do próximo, e o segundo toque encontra o botão travado.
    fireEvent.click(sair)
    fireEvent.click(sair)
    await act(() => vi.advanceTimersByTimeAsync(50))
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('a sessão perdida com o app aberto', () => {
  it('leva ao Login, sem aviso genérico na tela', async () => {
    await montarApp('/clientes')
    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument()
    await act(async () => {
      fake.perderSessao()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.querySelector('[data-sonner-toaster]')).toBeNull()
  })
})

// BUG-20261022-menu-da-conta-nao-fecha: o painel ficava aberto por cima de outra aba (o voltar do
// Android e o toque numa aba trocam a rota sem fechar o menu), e nem o toque fora nem Escape o
// fechavam. A régua é o painel AUSENTE depois de cada saída — e o par: tocar DENTRO dele não fecha.
describe('fecha quando ela sai dele (BUG-20261022-menu-da-conta-nao-fecha)', () => {
  const aberto = () => screen.queryByRole('button', { name: 'Sair' })

  it('trocar de aba fecha o menu', async () => {
    await montarApp('/pedidos')
    fireEvent.click(botaoDaConta())
    expect(aberto()).not.toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Descontos' }))
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(window.location.pathname).toBe('/descontos')
    expect(aberto()).toBeNull()
    expect(botaoDaConta()).toHaveAttribute('aria-expanded', 'false')
  })

  it('o voltar do Android (popstate) fecha o menu', async () => {
    await montarApp('/')
    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Pedidos' }))
      await vi.advanceTimersByTimeAsync(50)
    })
    fireEvent.click(botaoDaConta())
    expect(aberto()).not.toBeNull()
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(window.location.pathname).toBe('/')
    expect(aberto()).toBeNull()
  })

  it('tocar fora fecha; tocar dentro do painel não fecha', async () => {
    await montarApp('/')
    fireEvent.click(botaoDaConta())
    fireEvent.pointerDown(screen.getByText(EMAIL))
    expect(aberto()).not.toBeNull()
    fireEvent.pointerDown(screen.getByRole('heading', { level: 1 }))
    expect(aberto()).toBeNull()
  })

  it('Escape fecha e devolve o foco ao botão da conta', async () => {
    await montarApp('/')
    fireEvent.click(botaoDaConta())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(aberto()).toBeNull()
    expect(document.activeElement).toBe(botaoDaConta())
  })
})
