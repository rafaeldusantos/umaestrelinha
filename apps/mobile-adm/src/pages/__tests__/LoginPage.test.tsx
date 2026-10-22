// Feature 72, T11 — entrar no ateliê, pela árvore REAL (`<App />` sobre o `AuthProvider` real):
// `MAF-08`..`MAF-11`.
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const temToken = (el: Element, token: string) => el.getAttribute('class')!.split(/\s+/).includes(token)

const preencher = (email: string, senha: string) => {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
}

const entrar = () =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await vi.advanceTimersByTimeAsync(50)
  })

describe('a tela de entrar (MAF-08)', () => {
  it('título, subtítulo, os dois campos, as duas ações e o aviso de acesso restrito', async () => {
    await montarApp('/login')
    expect(screen.getByText('Ateliê · painel')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(screen.getByText('Pedidos, clientes e descontos da loja, no seu celular.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esqueci minha senha' })).toBeInTheDocument()
    expect(screen.getByText('Acesso restrito a quem cuida da loja.')).toBeInTheDocument()
  })

  it('mostrar/ocultar a senha troca o tipo do campo e o rótulo do botão, com alvo de 48 px', async () => {
    await montarApp('/login')
    const mostrar = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(temToken(mostrar, 'h-12')).toBe(true)
    expect(temToken(mostrar, 'w-12')).toBe(true)
    fireEvent.click(mostrar)
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })

  it('os campos e as ações têm 48 px (h-12 / min-h-12)', async () => {
    await montarApp('/login')
    expect(temToken(screen.getByLabelText('E-mail'), 'h-12')).toBe(true)
    expect(temToken(screen.getByLabelText('Senha'), 'h-12')).toBe(true)
    expect(temToken(screen.getByRole('button', { name: 'Entrar' }), 'h-12')).toBe(true)
    expect(temToken(screen.getByRole('button', { name: 'Esqueci minha senha' }), 'min-h-12')).toBe(true)
  })
})

describe('admin entra (MAF-09)', () => {
  it('senha certa e papel admin ⇒ a aba Início', async () => {
    fake.tornarAdmin('adri@exemplo.invalid')
    await montarApp('/login')
    preencher('adri@exemplo.invalid', 'senha-certa')
    await entrar()
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('BUG-20260802 — com o papel ainda em voo, nada de recusa nem de navegação; quando ele resolve, a Início', async () => {
    fake.tornarAdmin('adri@exemplo.invalid')
    await montarApp('/login')
    const soltar = fake.segurarPapel()
    preencher('adri@exemplo.invalid', 'senha-certa')
    await entrar()
    // O login foi aceito e o provider ainda não sabe o papel.
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledTimes(1)
    await act(() => vi.advanceTimersByTimeAsync(2000))
    expect(screen.queryByText('Esta conta não tem acesso ao painel.')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
    await act(async () => {
      soltar()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})

describe('senha errada (MAF-10)', () => {
  it('mostra a frase de authErrorMessage e mantém o e-mail', async () => {
    fake.estado.erroDoLogin = { message: 'Invalid login credentials', code: 'invalid_credentials', status: 400 }
    await montarApp('/login')
    preencher('adri@exemplo.invalid', 'errada')
    await entrar()
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
    expect(screen.getByLabelText('E-mail')).toHaveValue('adri@exemplo.invalid')
    expect(window.location.pathname).toBe('/login')
  })
})

describe('conta sem o papel (MAF-11)', () => {
  it('a recusa, com "Sair" — e nenhuma leitura de dado da loja', async () => {
    await montarApp('/login')
    preencher('cliente@exemplo.invalid', 'senha-certa')
    await entrar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta conta não tem acesso ao painel.')
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    // As únicas consultas foram as do próprio `AuthProvider` (o papel e o cadastro de quem entrou).
    expect(fake.estado.tabelas.length).toBeGreaterThan(0)
    expect(fake.leiturasDeDado()).toEqual([])
  })

  it('troca de conta SEM SIGNED_OUT (outra aba entra com a conta admin): com o papel da nova em voo, a recusa da anterior NÃO fica na tela', async () => {
    // A conta A (sem o papel) já está aberta e recusada; a B (admin) entra por cima, sem sair da A —
    // o supabase-js propaga o login de outra aba da mesma origem como um SIGNED_IN. Enquanto o
    // provider resolve o papel de B, `user` ainda é A (ele só grava `user` junto com o papel):
    // é aqui, e só aqui, que o `!authLoading` de `recusada` decide.
    fake.comSessao('cliente@exemplo.invalid', { admin: false })
    fake.tornarAdmin('adri@exemplo.invalid')
    await montarApp('/login')
    expect(await screen.findByText('Esta conta não tem acesso ao painel.')).toBeInTheDocument()

    const soltar = fake.segurarPapel()
    await act(async () => {
      await fake.client.auth.signInWithPassword({ email: 'adri@exemplo.invalid', password: 'senha-certa' })
      await vi.advanceTimersByTimeAsync(2000)
    })
    expect(screen.queryByText('Esta conta não tem acesso ao painel.')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')

    await act(async () => {
      soltar()
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('"Sair" encerra a sessão e devolve o formulário', async () => {
    await montarApp('/login')
    preencher('cliente@exemplo.invalid', 'senha-certa')
    await entrar()
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Sair' }))
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(fake.client.auth.signOut).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Esta conta não tem acesso ao painel.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
  })
})

// Feature 72, T20 — Entrar com e-mail ou senha vazios (`MAF-26`): o formulário é `noValidate`, e o
// vazio ia ao servidor e voltava "E-mail inválido" para quem nem tinha escrito nada.
describe('Entrar com campo vazio (MAF-26)', () => {
  it.each([
    ['os dois vazios', '', ''],
    ['só a senha', 'adri@exemplo.invalid', ''],
    ['só o e-mail', '', 'senha-certa'],
    ['e-mail só com espaços', '   ', 'senha-certa'],
    ['senha só com espaços', 'adri@exemplo.invalid', '   '],
  ])('%s ⇒ "Informe o e-mail e a senha.", sem ir à rede', async (_caso, email, senha) => {
    await montarApp('/login')
    preencher(email, senha)
    await entrar()
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o e-mail e a senha.')
    expect(fake.client.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('VIZINHA — os dois preenchidos vão à rede', async () => {
    await montarApp('/login')
    preencher('adri@exemplo.invalid', 'senha-certa')
    await entrar()
    expect(fake.client.auth.signInWithPassword).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Informe o e-mail e a senha.')).not.toBeInTheDocument()
  })
})
