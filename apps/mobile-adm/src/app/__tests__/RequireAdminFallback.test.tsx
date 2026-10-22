// Feature 72, T08 (o teste da T03) — `RequireAdmin` com e sem `fallback`, sobre o `AuthProvider`
// REAL com a sessão ainda sem resposta. Sem o prop, o esqueleto do painel (que o Backoffice continua
// vendo); com ele, o que o app passar — e nunca os dois.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, RequireAdmin } from '@estrelinha/auth'
import { fake } from '@/test/fakeSupabase'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  fake.estado.getSessionPendente = true
})

const montar = (guarda: React.ReactNode) =>
  render(
    <AuthProvider>
      <MemoryRouter>{guarda}</MemoryRouter>
    </AuthProvider>,
  )

describe('RequireAdmin — o fallback do carregamento', () => {
  it('SEM fallback, o esqueleto do painel (tokens estrelinha-admin-*)', () => {
    const { container } = montar(
      <RequireAdmin>
        <p>conteúdo guardado</p>
      </RequireAdmin>,
    )
    expect(container.querySelector('.bg-estrelinha-admin-bg')).not.toBeNull()
    expect(screen.queryByText('conteúdo guardado')).not.toBeInTheDocument()
  })

  it('COM fallback, o fallback — e não o esqueleto', () => {
    const { container } = montar(
      <RequireAdmin fallback={<p>splash do ateliê</p>}>
        <p>conteúdo guardado</p>
      </RequireAdmin>,
    )
    expect(screen.getByText('splash do ateliê')).toBeInTheDocument()
    expect(container.querySelector('.bg-estrelinha-admin-bg')).toBeNull()
    expect(screen.queryByText('conteúdo guardado')).not.toBeInTheDocument()
  })
})

// Feature 72, T16 — o estado `unknown` do papel (`MAF-23`). Sem `unknownFallback`, o padrão do
// PAINEL (a mesma frase, com "Tentar de novo", nos tokens `estrelinha-admin-*`) — é o que o
// Backoffice passa a ver no lugar do `Navigate` que levava à recusa falsa. Com ele, o do app.
describe('RequireAdmin — o papel não conferido', () => {
  const papelFalhando = async (guarda: React.ReactNode) => {
    fake.estado.getSessionPendente = false
    fake.comSessao('adri@exemplo.invalid', { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    const r = montar(guarda)
    await act(async () => {})
    return r
  }

  it('SEM `unknownFallback`, a frase do painel com "Tentar de novo" — e não o login nem o conteúdo', async () => {
    const { container } = await papelFalhando(
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route path="*" element={<RequireAdmin><p>conteúdo guardado</p></RequireAdmin>} />
      </Routes>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui conferir seu acesso.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(container.querySelector('.bg-estrelinha-admin-bg')).not.toBeNull()
    expect(screen.queryByText('tela de login')).not.toBeInTheDocument()
    expect(screen.queryByText('conteúdo guardado')).not.toBeInTheDocument()
  })

  it('o "Tentar de novo" do painel refaz a consulta e, com a rede de volta, abre o conteúdo', async () => {
    await papelFalhando(<RequireAdmin><p>conteúdo guardado</p></RequireAdmin>)
    fake.estado.erroDoPapel = null
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    })
    expect(await screen.findByText('conteúdo guardado')).toBeInTheDocument()
  })

  it('COM `unknownFallback`, o dele — e não o do painel', async () => {
    const { container } = await papelFalhando(
      <RequireAdmin unknownFallback={<p>tela do ateliê</p>}>
        <p>conteúdo guardado</p>
      </RequireAdmin>,
    )
    expect(screen.getByText('tela do ateliê')).toBeInTheDocument()
    expect(container.querySelector('.bg-estrelinha-admin-bg')).toBeNull()
  })

  it('VIZINHA — conta que respondeu sem o papel continua indo ao login', async () => {
    fake.estado.getSessionPendente = false
    fake.comSessao('cliente@exemplo.invalid', { admin: false })
    montar(
      <Routes>
        <Route path="/login" element={<p>tela de login</p>} />
        <Route path="*" element={<RequireAdmin><p>conteúdo guardado</p></RequireAdmin>} />
      </Routes>,
    )
    expect(await screen.findByText('tela de login')).toBeInTheDocument()
    expect(screen.queryByText('Não consegui conferir seu acesso.')).not.toBeInTheDocument()
  })
})
