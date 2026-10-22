// Feature 72, T08 — o router do ateliê pela árvore REAL (`<App />`, o mesmo do `main.tsx`):
// sem sessão admin, qualquer rota cai no Login (`MAF-16`); enquanto a sessão resolve, a splash
// (`MAF-05`); e o piso de 600 ms vale mesmo com a sessão resolvida na hora (`MAF-06`).
import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const splash = () => screen.queryByRole('status', { name: 'Abrindo o painel do ateliê' })

describe('o router do ateliê', () => {
  it.each(['/', '/pedidos', '/clientes', '/descontos', '/caminho-que-nao-existe'])(
    'sem sessão, %s cai no Login',
    async (caminho) => {
      await montarApp(caminho)
      expect(await screen.findByRole('heading', { name: 'Entrar no ateliê' })).toBeInTheDocument()
      expect(window.location.pathname).toBe('/login')
    },
  )

  it('conta com sessão mas SEM o papel também cai no Login, na recusa', async () => {
    fake.comSessao('cliente@exemplo.invalid', { admin: false })
    await montarApp('/pedidos')
    expect(await screen.findByText('Esta conta não tem acesso ao painel.')).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('com sessão admin, a rota abre a aba', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos')
  })

  it('caminho desconhecido, com sessão admin, vai para a Início', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/nada-aqui')
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('reabrindo em /login com a sessão em voo, a splash fica e o formulário NÃO aparece', async () => {
    // S05 da verificação r3: em rota guardada o `fallback` do `RequireAdmin` desenharia a splash de
    // qualquer jeito, e por isso só o `/login` prova que é o `BootGate` quem segura a abertura.
    fake.estado.getSessionPendente = true
    await montarApp('/login')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar no ateliê' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('enquanto a sessão não resolve, a splash fica — e nada da loja aparece', async () => {
    fake.estado.getSessionPendente = true
    await montarApp('/pedidos')
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Pedidos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Entrar no ateliê' })).not.toBeInTheDocument()
  })

  it('MAF-06 — com a sessão resolvida na hora, a splash fica até 600 ms e sai aos 600', async () => {
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    await montarApp('/pedidos', { passarPiso: false })
    await act(() => vi.advanceTimersByTimeAsync(599))
    expect(splash()).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
  })
})
