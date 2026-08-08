// Regressão de BUG-20260802-primeiro-login-do-admin-volta-para-a-tela.
//
// O sintoma era a lojista digitar a senha certa e voltar para o formulário vazio, sem mensagem: a
// página navegava no sucesso do `signInWithPassword`, chegava em `/admin` antes de o `AuthProvider`
// resolver o papel, e o `RequireAdmin` a devolvia. A segunda tentativa entrava, porque aí `isAdmin` já
// estava no contexto.
//
// O que estes testes fixam: a navegação só acontece **depois** de o contexto fechar `loading`, e conta
// sem permissão recebe uma frase em vez de um vaivém silencioso.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...real, useNavigate: () => navigate }
})

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { auth } }))

/** O estado do contexto, trocável entre renders — é o que simula a resolução assíncrona do papel. */
const ctx = vi.hoisted(() => ({ current: { user: null as unknown, isAdmin: false, loading: false } }))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ctx.current }))

import AdminLoginPage from './AdminLoginPage'

const montar = () =>
  render(
    <MemoryRouter>
      <AdminLoginPage />
    </MemoryRouter>,
  )

const preencherEEnviar = async () => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@umaestrelinha.dev' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'admin123' } })
  fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.signInWithPassword.mockResolvedValue({ error: null })
  ctx.current = { user: null, isAdmin: false, loading: false }
})

describe('AdminLoginPage', () => {
  it('não navega enquanto o papel não resolveu, mesmo com a credencial aceita', async () => {
    const view = montar()
    await preencherEEnviar()

    // Credencial aceita, contexto ainda resolvendo: é exatamente o instante em que a versão antiga
    // navegava e era expulsa de volta.
    ctx.current = { user: { id: 'u-admin' }, isAdmin: false, loading: true }
    view.rerender(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalled())
    expect(navigate).not.toHaveBeenCalled()
  })

  it('entra no painel quando o papel resolve como admin', async () => {
    const view = montar()
    await preencherEEnviar()
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalled())

    ctx.current = { user: { id: 'u-admin' }, isAdmin: true, loading: false }
    view.rerender(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin', { replace: true }))
  })

  it('conta autenticada sem papel de admin recebe explicação, não um vaivém', async () => {
    const view = montar()
    await preencherEEnviar()
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalled())

    ctx.current = { user: { id: 'cliente' }, isAdmin: false, loading: false }
    view.rerender(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Esta conta não tem acesso ao painel.')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('credencial errada segue mostrando o erro de sempre', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'invalid' } })
    montar()
    await preencherEEnviar()

    expect(await screen.findByText('E-mail ou senha inválidos')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })
})
