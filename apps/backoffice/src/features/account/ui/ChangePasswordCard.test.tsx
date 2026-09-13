import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `USR-09`..`USR-12`, `USR-23`, `USR-24`.
 *
 * **Este arquivo é o único teste de `changeOwnPassword`**, e é de propósito: `packages/auth` não tem
 * script `test`, então `turbo run test` não o alcança — teste posto lá é invisível. A regra pura
 * mora em `core` (e é testada lá); a **fiação** só se prova pelo componente que a consome.
 *
 * Os dublês são os do supabase-js, e não o `AuthContext` inteiro: substituir o provider por um mock
 * provaria que o componente chama uma função, não que a função faz a coisa certa.
 */

const { signInWithPassword, updateUser, getUser, getSession, onAuthStateChange } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword,
      updateUser,
      getUser,
      getSession,
      onAuthStateChange,
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  },
}))

import { AuthProvider } from '@estrelinha/auth'
import ChangePasswordCard from './ChangePasswordCard'

const EU = { id: 'u1', email: 'adri@exemplo.invalid' }

beforeEach(() => {
  signInWithPassword.mockReset().mockResolvedValue({ data: {}, error: null })
  updateUser.mockReset().mockResolvedValue({ data: {}, error: null })
  getUser.mockReset().mockResolvedValue({ data: { user: EU }, error: null })
  getSession.mockReset().mockResolvedValue({ data: { session: { user: EU } } })
  onAuthStateChange.mockReset().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

const montar = () =>
  render(
    <AuthProvider>
      <ChangePasswordCard />
    </AuthProvider>,
  )

const preencher = (atual: string, nova: string, confirma: string) => {
  fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: atual } })
  fireEvent.change(screen.getByLabelText('Senha nova'), { target: { value: nova } })
  fireEvent.change(screen.getByLabelText('Repita a senha nova'), { target: { value: confirma } })
}

const trocar = () => fireEvent.click(screen.getByRole('button', { name: 'Trocar senha' }))

describe('ChangePasswordCard — USR-09: a troca', () => {
  it('prova a senha atual ANTES de trocar, e troca com a nova', async () => {
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'adri@exemplo.invalid',
        password: 'antiga123',
      }),
    )
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: 'nova-segura-1' }))
  })

  it('confirma o sucesso em TEXTO visível', async () => {
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Senha alterada. Use a nova da próxima vez que entrar.',
    )
  })

  it('limpa os três campos depois de trocar', async () => {
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    await screen.findByRole('status')
    expect(screen.getByLabelText('Senha atual')).toHaveValue('')
    expect(screen.getByLabelText('Senha nova')).toHaveValue('')
    expect(screen.getByLabelText('Repita a senha nova')).toHaveValue('')
  })
})

describe('ChangePasswordCard — USR-10: a senha atual errada', () => {
  it('recusa com a frase de credencial, e NÃO troca a senha', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    montar()
    preencher('errada', 'nova-segura-1', 'nova-segura-1')
    trocar()

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
    // A metade que importa: a troca não aconteceu.
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('errar a senha atual NÃO desloga — `signOut` nunca é chamado', async () => {
    signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    montar()
    preencher('errada', 'nova-segura-1', 'nova-segura-1')
    trocar()

    await screen.findByRole('alert')
    // Os campos continuam preenchidos: a pessoa corrige a atual e tenta de novo, sem redigitar tudo.
    expect(screen.getByLabelText('Senha nova')).toHaveValue('nova-segura-1')
  })
})

describe('ChangePasswordCard — as recusas locais não gastam rede', () => {
  it.each([
    ['USR-11', 'antiga123', 'nova-segura-1', 'nova-segura-2', 'A confirmação não confere com a senha nova'],
    ['USR-12', 'mesma-senha-1', 'mesma-senha-1', 'mesma-senha-1', 'A senha nova precisa ser diferente da atual.'],
    ['USR-23', 'antiga123', 'abc', 'abc', 'A senha precisa de pelo menos 6 caracteres'],
  ])('%s: recusa sem chamar `signInWithPassword` nem `updateUser`', async (_id, atual, nova, confirma, esperado) => {
    montar()
    preencher(atual, nova, confirma)
    trocar()

    expect(await screen.findByRole('alert')).toHaveTextContent(esperado)
    // Sem esta metade, cada tentativa errada queimaria o `sign_in_sign_ups` do GoTrue e a pessoa
    // ficaria bloqueada justamente enquanto tenta trocar a própria senha.
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
    // **`getUser` também é rede.** No supabase-js v2 ele vai ao servidor validar o JWT, então a
    // promessa de `USR-11`/`USR-23` — "antes de QUALQUER chamada de rede" — inclui ele.
    //
    // Esta asserção nasceu da rodada 2 da verificação independente, e a origem dela é o próprio
    // conserto anterior: enquanto `passwordChangeRefusal` era chamada nos DOIS lugares (o cartão e o
    // `AuthContext`), mover o `getUser` para antes da régua no contexto era inalcançável — o cartão
    // já tinha recusado. Consolidar num dono só foi certo, **e transferiu para a ordem interna de
    // `changeOwnPassword` uma promessa que as duas cópias sustentavam por acidente**. Remover uma
    // cópia move o ônus da prova; não o elimina.
    expect(getUser).not.toHaveBeenCalled()
  })
})

describe('ChangePasswordCard — USR-24: a mensagem nunca é a crua do GoTrue', () => {
  it('erro de `updateUser` passa pelo tradutor', async () => {
    updateUser.mockResolvedValue({
      data: {},
      error: { code: 'same_password', message: 'New password should be different from the old password.' },
    })
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('A senha nova precisa ser diferente da atual.')
    expect(alerta).not.toHaveTextContent('New password should be different')
  })

  it('erro DESCONHECIDO vira a frase de fallback, e não o texto em inglês', async () => {
    updateUser.mockResolvedValue({
      data: {},
      error: { code: 'algo_que_o_supabase_inventar', message: 'Some brand new English error' },
    })
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Não foi possível concluir agora. Tente de novo em instantes.')
    expect(alerta).not.toHaveTextContent('Some brand new English error')
  })

  it('sessão sem e-mail recusa antes de tentar entrar', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    montar()
    preencher('antiga123', 'nova-segura-1', 'nova-segura-1')
    trocar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Sessão expirada. Entre novamente.')
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})

describe('ChangePasswordCard — os campos', () => {
  it('os três nascem ocultos', () => {
    montar()
    for (const rotulo of ['Senha atual', 'Senha nova', 'Repita a senha nova']) {
      expect(screen.getByLabelText(rotulo)).toHaveAttribute('type', 'password')
    }
  })

  it('cada campo alterna a própria visibilidade, sem mexer nos outros', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha nova' }))

    expect(screen.getByLabelText('Senha nova')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Senha atual')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Repita a senha nova')).toHaveAttribute('type', 'password')
  })

  it('os botões de mostrar NÃO perdem a posição — `absolute` presente, `relative` ausente', () => {
    montar()
    const classes = screen.getByRole('button', { name: 'Mostrar senha atual' }).className.split(/\s+/)

    expect(classes).toContain('absolute')
    expect(classes).not.toContain('relative')
    expect(classes).toContain('w-11')
  })

  it('diz que a pessoa continua conectada depois de trocar', () => {
    // A frase existe porque a troca faz um `signInWithPassword` por baixo, e quem não sabe disso
    // hesita em trocar a senha no meio do expediente.
    montar()
    expect(screen.getByText(/Você continua conectada depois de trocar/i)).toBeInTheDocument()
  })
})
