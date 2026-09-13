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

/**
 * O estado do contexto, trocável entre renders — é o que simula a resolução assíncrona do papel.
 *
 * As três funções de recuperação entram aqui porque a feature 48 pôs `ForgotPasswordFlow` dentro
 * desta página, e ele as consome do MESMO contexto. É o `L-030` na prática: um `vi.mock` que
 * substitui o módulo inteiro quebra no primeiro hook novo que a página passar a usar — e o erro
 * aparece no render, não na asserção.
 */
const recuperacao = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  verifyRecoveryCode: vi.fn(),
  updatePassword: vi.fn(),
}))
const ctx = vi.hoisted(() => ({
  current: { user: null as unknown, isAdmin: false, loading: false },
}))
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ ...ctx.current, ...recuperacao }),
}))

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

// ---------------------------------------------------------------------------------------------
// Feature 48 — "Esqueci minha senha" no próprio painel (`USR-39`..`USR-43`).
//
// **O fluxo NÃO é mockado.** É a página que tem de montá-lo: apagar `<ForgotPasswordFlow />` de
// `AdminLoginPage.tsx` precisa reprovar aqui. Um teste que compusesse a árvore por conta própria
// passaria com o botão sumido da tela inteira — o defeito que a feature 44 quase entregou.
// ---------------------------------------------------------------------------------------------

describe('AdminLoginPage — a recuperação de senha', () => {
  beforeEach(() => {
    recuperacao.resetPassword.mockReset().mockResolvedValue({ error: null })
    recuperacao.verifyRecoveryCode.mockReset().mockResolvedValue({ error: null })
    recuperacao.updatePassword.mockReset().mockResolvedValue({ error: null })
  })

  const abrirRecuperacao = () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))
  }

  it('USR-39: o botão existe no login e abre o fluxo — a PÁGINA é quem o monta', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }))

    expect(await screen.findByText('Redefinir senha')).toBeInTheDocument()
    // E o formulário de entrar sai da frente: os dois juntos confundiriam qual senha é qual.
    expect(screen.queryByRole('button', { name: /^Entrar$/ })).not.toBeInTheDocument()
  })

  it('USR-39: pedir o código chama `resetPassword` e confirma NOMEANDO o endereço', async () => {
    abrirRecuperacao()
    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'Adri@Exemplo.INVALID' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() =>
      expect(recuperacao.resetPassword).toHaveBeenCalledWith('Adri@Exemplo.INVALID'),
    )
    // Sem nomear o endereço, quem digitou errado fica esperando um e-mail que foi para outro lugar.
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Enviamos um código de 6 dígitos para adri@exemplo.invalid.',
    )
  })

  it('falha no envio mostra o motivo e NÃO avança para o passo do código', async () => {
    recuperacao.resetPassword.mockResolvedValue({ error: 'Aguarde alguns segundos para reenviar' })
    abrirRecuperacao()
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde alguns segundos')
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })

  const chegarNoCodigo = async () => {
    abrirRecuperacao()
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'a@b.invalid' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    return await screen.findByLabelText('Código')
  }

  it('USR-40: o código certo leva ao passo da senha nova', async () => {
    const campo = await chegarNoCodigo()
    fireEvent.change(campo, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir código' }))

    await waitFor(() =>
      expect(recuperacao.verifyRecoveryCode).toHaveBeenCalledWith('a@b.invalid', '123456'),
    )
    expect(await screen.findByLabelText('Senha nova')).toBeInTheDocument()
  })

  it('USR-41: código errado mostra a mensagem e DEIXA pedir outro, sem recarregar', async () => {
    recuperacao.verifyRecoveryCode.mockResolvedValue({
      error: 'Código inválido ou expirado. Peça um novo.',
    })
    const campo = await chegarNoCodigo()
    fireEvent.change(campo, { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir código' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou expirado')

    fireEvent.click(screen.getByRole('button', { name: 'Enviar outro código' }))
    // Volta ao passo do e-mail COM o endereço preenchido: quem só errou o código não o redigita.
    expect(await screen.findByLabelText('E-mail')).toHaveValue('a@b.invalid')
  })

  const chegarNaSenha = async () => {
    const campo = await chegarNoCodigo()
    fireEvent.change(campo, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Conferir código' }))
    return await screen.findByLabelText('Senha nova')
  }

  it('USR-40: a senha nova passa pelas MESMAS recusas de USR-11 e USR-23', async () => {
    const nova = await chegarNaSenha()

    fireEvent.change(nova, { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('Repita a senha nova'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A senha precisa de pelo menos 6 caracteres',
    )
    expect(recuperacao.updatePassword).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Senha nova'), { target: { value: 'nova-segura-1' } })
    fireEvent.change(screen.getByLabelText('Repita a senha nova'), { target: { value: 'outra-1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A confirmação não confere com a senha nova',
    )
    expect(recuperacao.updatePassword).not.toHaveBeenCalled()
  })

  it('USR-42: gravar a senha leva ao painel — o MESMO desfecho do login normal', async () => {
    // Quem decide o destino é o efeito que já existia na página. Uma segunda regra de "para onde ir
    // depois de entrar" seria a divergência que esta feature combate em toda parte.
    ctx.current = { user: { id: 'u1' }, isAdmin: true, loading: false }
    const nova = await chegarNaSenha()

    fireEvent.change(nova, { target: { value: 'nova-segura-1' } })
    fireEvent.change(screen.getByLabelText('Repita a senha nova'), {
      target: { value: 'nova-segura-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }))

    await waitFor(() => expect(recuperacao.updatePassword).toHaveBeenCalledWith('nova-segura-1'))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin', { replace: true }))
  })

  it('USR-42: conta SEM papel lê a frase de sempre, e não vai para o painel', async () => {
    // O outro desfecho do mesmo efeito. Sem este par, o caso acima passaria num `navigate` cravado.
    ctx.current = { user: { id: 'u1' }, isAdmin: false, loading: false }
    const nova = await chegarNaSenha()

    fireEvent.change(nova, { target: { value: 'nova-segura-1' } })
    fireEvent.change(screen.getByLabelText('Repita a senha nova'), {
      target: { value: 'nova-segura-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }))

    expect(await screen.findByText('Esta conta não tem acesso ao painel.')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('falha ao gravar a senha mostra o motivo e NÃO navega', async () => {
    recuperacao.updatePassword.mockResolvedValue({ error: 'Sessão expirada. Entre novamente.' })
    ctx.current = { user: { id: 'u1' }, isAdmin: true, loading: false }
    const nova = await chegarNaSenha()

    fireEvent.change(nova, { target: { value: 'nova-segura-1' } })
    fireEvent.change(screen.getByLabelText('Repita a senha nova'), {
      target: { value: 'nova-segura-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sessão expirada')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('USR-43: "Voltar para entrar" devolve o formulário de login em qualquer passo', async () => {
    await chegarNoCodigo()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para entrar' }))

    expect(await screen.findByRole('button', { name: /^Entrar$/ })).toBeInTheDocument()
    expect(screen.queryByText('Redefinir senha')).not.toBeInTheDocument()
  })

  it('USR-43: dá para voltar já do primeiro passo', async () => {
    abrirRecuperacao()
    await screen.findByText('Redefinir senha')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar para entrar' }))

    expect(await screen.findByRole('button', { name: /^Entrar$/ })).toBeInTheDocument()
  })
})
