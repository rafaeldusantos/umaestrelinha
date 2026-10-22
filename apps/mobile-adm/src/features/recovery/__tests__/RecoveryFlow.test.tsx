// Feature 72, T12 — recuperar o acesso por CÓDIGO, pela árvore REAL (`<App />` sobre o
// `AuthProvider` real): `MAF-12`. O desfecho é o do login (`MAF-09`/`MAF-11`).
import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AUTH_ERROR_FALLBACK } from '@estrelinha/core/auth'
import { REENVIO_SEGUNDOS } from '../ui/RecoveryFlow'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const EMAIL = 'adri@exemplo.invalid'

const clicar = (nome: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name: nome }))
    await vi.advanceTimersByTimeAsync(50)
  })

const digitar = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })

const ateOCodigo = async () => {
  await montarApp('/login')
  await clicar('Esqueci minha senha')
  digitar('E-mail', ' Adri@Exemplo.invalid ')
  await clicar('Enviar código')
}

const ateASenha = async () => {
  await ateOCodigo()
  digitar('Código', '123456')
  await clicar('Conferir código')
}

describe('passo 1 — o e-mail', () => {
  it('"Esqueci minha senha" abre a recuperação, com a copy de CÓDIGO', async () => {
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar acesso' })).toBeInTheDocument()
    expect(screen.getByText(/Enviamos um código de 6 dígitos/)).toBeInTheDocument()
  })

  it('enviar pede o código para o e-mail normalizado e nomeia o endereço', async () => {
    await ateOCodigo()
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(EMAIL)
    expect(screen.getByRole('status')).toHaveTextContent(`Enviamos um código de 6 dígitos para ${EMAIL}.`)
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
  })

  it('e-mail inválido é recusado sem ir à rede', async () => {
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    digitar('E-mail', 'nao-e-email')
    await clicar('Enviar código')
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido')
    expect(fake.client.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})

describe('passo 2 — o código, com reenvio e espera de 60 s', () => {
  it('a espera é de 60 s: aos 59 o reenvio segue travado, aos 60 libera e reenvia', async () => {
    expect(REENVIO_SEGUNDOS).toBe(60)
    await ateOCodigo()
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(59_000))
    expect(screen.getByRole('button', { name: 'Reenviar em 0:01' })).toBeDisabled()
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    const reenviar = screen.getByRole('button', { name: 'Reenviar código' })
    expect(reenviar).toBeEnabled()
    await clicar('Reenviar código')
    expect(fake.client.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2)
    // A espera recomeça a cada envio.
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled()
  })

  it('código fora do formato de 6 dígitos é recusado sem ir à rede', async () => {
    await ateOCodigo()
    digitar('Código', '12345')
    await clicar('Conferir código')
    expect(screen.getByRole('alert')).toHaveTextContent('O código tem 6 dígitos.')
    expect(fake.client.auth.verifyOtp).not.toHaveBeenCalled()
  })

  // BUG-20261022-codigo-colado-com-espaco-recusado: colado do e-mail, o código vem com espaço. Com
  // `maxLength={6}` o NAVEGADOR cortava o texto cru (` 123 456` virava ` 123 4`) antes de qualquer
  // limpeza, e a Adri lia "O código tem 6 dígitos." sobre o código certo. jsdom não aplica
  // `maxlength` a `change`, então a régua é dupla: o atributo que corta o texto cru não existe, e o
  // campo guarda só os dígitos, no máximo seis.
  it('código colado com espaço e quebra de linha vira os 6 dígitos e confere', async () => {
    await ateOCodigo()
    const campo = screen.getByLabelText('Código')
    expect(campo).not.toHaveAttribute('maxlength')
    digitar('Código', ' 123 456\n')
    expect(campo).toHaveValue('123456')
    digitar('Código', '12a3b4c5d6e7')
    expect(campo).toHaveValue('123456')
    await clicar('Conferir código')
    expect(fake.client.auth.verifyOtp).toHaveBeenCalledWith(expect.objectContaining({ token: '123456' }))
  })

  it('código errado ou vencido mostra a frase do @estrelinha/auth e fica no passo', async () => {
    fake.estado.erroDoCodigo = { message: 'Token has expired or is invalid', code: 'otp_expired', status: 403 }
    await ateOCodigo()
    digitar('Código', '654321')
    await clicar('Conferir código')
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou expirado. Peça um novo.')
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
  })

  it('o código confere como RECUPERAÇÃO, para o e-mail digitado', async () => {
    await ateASenha()
    expect(fake.client.auth.verifyOtp).toHaveBeenCalledWith({ email: EMAIL, token: '123456', type: 'recovery' })
  })
})

describe('passo 3 — a senha nova', () => {
  it('a sessão aberta pelo código NÃO pula o passo: mesmo admin, a tela fica na senha nova', async () => {
    fake.tornarAdmin(EMAIL)
    await ateASenha()
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
    // Desde o `MAF-24` o passo tem rota própria: ficar nele é ficar em `/recuperar/senha`.
    expect(window.location.pathname).toBe('/recuperar/senha')
  })

  it('a régua do painel recusa ANTES da rede — confirmação diferente', async () => {
    await ateASenha()
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-2')
    await clicar('Salvar e entrar')
    expect(screen.getByRole('alert')).toHaveTextContent('A confirmação não confere com a senha nova')
    expect(fake.client.auth.updateUser).not.toHaveBeenCalled()
  })

  it('a régua do painel recusa ANTES da rede — senha curta', async () => {
    await ateASenha()
    digitar('Senha nova', 'abc')
    digitar('Repita a senha nova', 'abc')
    await clicar('Salvar e entrar')
    expect(screen.getByRole('alert')).toHaveTextContent('A senha precisa de pelo menos 6 caracteres')
    expect(fake.client.auth.updateUser).not.toHaveBeenCalled()
  })

  it('senha aceita, conta admin ⇒ grava e cai na Início (o mesmo desfecho do login)', async () => {
    fake.tornarAdmin(EMAIL)
    await ateASenha()
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-1')
    await clicar('Salvar e entrar')
    expect(fake.client.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-boa-1' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })

  it('a gravação da senha FALHA ⇒ o aviso fica, o passo fica e ninguém entra (mesmo admin)', async () => {
    // S09 da verificação r3: o código já abriu a sessão no passo 2, então seguir para `onEntrou`
    // depois de uma gravação recusada levaria a dona à Início SEM a senha nova gravada, e o aviso
    // sumiria junto com a tela.
    fake.tornarAdmin(EMAIL)
    await ateASenha()
    fake.client.auth.updateUser.mockResolvedValueOnce({ data: {}, error: { message: 'boom', status: 400 } } as never)
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-1')
    await clicar('Salvar e entrar')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(fake.client.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-boa-1' })
    expect(screen.getByRole('alert')).toHaveTextContent(AUTH_ERROR_FALLBACK)
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Início' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/recuperar/senha')
  })

  it('senha aceita, conta SEM o papel ⇒ a recusa do login', async () => {
    await ateASenha()
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-1')
    await clicar('Salvar e entrar')
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta conta não tem acesso ao painel.')
    expect(window.location.pathname).toBe('/login')
  })
})

describe('a copy é de código, nunca de link', () => {
  it('nenhum dos três passos fala em "link"', async () => {
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    const passos = [document.body.textContent]
    digitar('E-mail', EMAIL)
    await clicar('Enviar código')
    passos.push(document.body.textContent)
    digitar('Código', '123456')
    await clicar('Conferir código')
    passos.push(document.body.textContent)
    expect(passos).toHaveLength(3)
    for (const texto of passos) expect(texto).not.toMatch(/link/i)
  })

  it('"Voltar para entrar" devolve o formulário de entrar', async () => {
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    await clicar('Voltar para entrar')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// Feature 72, T18/T19 — a recuperação com ROTA (`MAF-24`) e o código já enviado (`MAF-25`).
//
// O voltar do Android é o do navegador (`history.back()`), e nada é interceptado: cada passo é uma
// entrada do histórico. O e-mail vai no `history.state`, NUNCA no endereço.
// ---------------------------------------------------------------------------------------------

const voltar = () =>
  act(async () => {
    window.history.back()
    await vi.advanceTimersByTimeAsync(50)
  })

describe('cada passo tem rota, e o voltar volta um passo (MAF-24)', () => {
  it('"Esqueci minha senha" leva a /recuperar, e o voltar devolve ao Login', async () => {
    // O histórico do jsdom é um só para o arquivo inteiro, e um `/login` deixado por um teste
    // anterior passaria por "o voltar devolve ao Login" mesmo com o `/login` DESTE teste substituído
    // (verificação da Fase 6, V16). Uma entrada-sentinela antes dele torna conhecido o que fica atrás:
    // se "Esqueci minha senha" substituir a entrada em vez de empilhar, o voltar cai na sentinela.
    window.history.pushState({}, '', '/__antes-deste-teste')
    await montarApp('/login')
    const entradasNoLogin = window.history.length
    await clicar('Esqueci minha senha')
    expect(window.location.pathname).toBe('/recuperar')
    expect(window.history.length).toBe(entradasNoLogin + 1)
    await voltar()
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
  })

  it('do passo do código, o voltar volta ao passo do e-mail — com o e-mail preenchido', async () => {
    await ateOCodigo()
    expect(window.location.pathname).toBe('/recuperar/codigo')
    await voltar()
    expect(window.location.pathname).toBe('/recuperar')
    expect(screen.getByLabelText('E-mail')).toHaveValue(EMAIL)
    await voltar()
    expect(window.location.pathname).toBe('/login')
  })

  it('do passo da senha nova, o voltar volta ao passo do código', async () => {
    await ateASenha()
    expect(window.location.pathname).toBe('/recuperar/senha')
    await voltar()
    expect(window.location.pathname).toBe('/recuperar/codigo')
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
  })

  it('o e-mail NÃO vai no endereço, em passo nenhum', async () => {
    await ateASenha()
    const enderecos = [window.location.href]
    await voltar()
    enderecos.push(window.location.href)
    await voltar()
    enderecos.push(window.location.href)
    expect(enderecos).toHaveLength(3)
    for (const e of enderecos) {
      expect(e).not.toContain('adri')
      expect(decodeURIComponent(e)).not.toContain('@')
    }
  })

  it('o passo do código aberto DIRETO, sem estado, volta ao primeiro passo', async () => {
    await montarApp('/recuperar/codigo')
    expect(window.location.pathname).toBe('/recuperar')
    expect(screen.getByLabelText('E-mail')).toHaveValue('')
  })

  it('o passo da senha aberto DIRETO, sem estado, volta ao primeiro passo', async () => {
    await montarApp('/recuperar/senha')
    expect(window.location.pathname).toBe('/recuperar')
    expect(screen.queryByLabelText('Senha nova')).not.toBeInTheDocument()
  })

  // V12 da verificação da Fase 6: o `replaceState` que este caso fazia era apagado pelo `pushState`
  // do `montarApp`, e ele repetia o caso "sem estado". O estado agora entra na própria entrada, e a
  // VIZINHA prova que ele é lido de verdade: com a marca do código conferido, o passo fica.
  it('o passo da senha com só o e-mail no estado (sem o código conferido) também volta ao primeiro', async () => {
    await montarApp('/recuperar/senha', { estado: { email: EMAIL } })
    expect(window.location.pathname).toBe('/recuperar')
    expect(screen.queryByLabelText('Senha nova')).not.toBeInTheDocument()
  })

  it('VIZINHA — o passo da senha com o e-mail E o código conferido no estado fica no passo', async () => {
    await montarApp('/recuperar/senha', { estado: { email: EMAIL, conferido: true } })
    expect(window.location.pathname).toBe('/recuperar/senha')
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
  })

  it('o fim da recuperação, para admin, chega à Início pelo efeito do Login', async () => {
    fake.tornarAdmin(EMAIL)
    await ateASenha()
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-1')
    await clicar('Salvar e entrar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/')
  })
})

// BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao (reteste de QA da 72): gravada a senha, o
// voltar da Início mostrava de novo "Digite o código…" a quem já estava dentro, e só o quarto voltar
// saía do app. A régua: com uma entrada-sentinela antes do Login, o PRIMEIRO voltar da Início cai nela.
describe('gravada a senha, os passos saem do histórico', () => {
  const SENTINELA = '/__antes-deste-teste'
  // A sentinela não é rota do app: o coringa do router a troca por `/` assim que ela aparece. A régua
  // é o endereço que o VOLTAR alcança, lido no `popstate`, antes de qualquer redirecionamento.
  const voltarRegistrando = async () => {
    const vistos: string[] = []
    const ouvir = () => vistos.push(window.location.pathname)
    window.addEventListener('popstate', ouvir)
    await voltar()
    window.removeEventListener('popstate', ouvir)
    return vistos[0]
  }
  const salvar = async () => {
    digitar('Senha nova', 'senha-boa-1')
    digitar('Repita a senha nova', 'senha-boa-1')
    await clicar('Salvar e entrar')
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeInTheDocument()
  }

  it('o caminho direto: o primeiro voltar da Início sai da recuperação (cai antes do Login)', async () => {
    fake.tornarAdmin(EMAIL)
    window.history.pushState({}, '', SENTINELA)
    await ateASenha()
    await salvar()
    expect(window.location.pathname).toBe('/')
    expect(await voltarRegistrando()).toBe(SENTINELA)
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })

  it('com "Trocar o e-mail" no meio (uma entrada a mais), o voltar também sai de uma vez', async () => {
    fake.tornarAdmin(EMAIL)
    window.history.pushState({}, '', SENTINELA)
    await ateOCodigo()
    await clicar('Trocar o e-mail')
    expect(window.location.pathname).toBe('/recuperar')
    await clicar('Enviar código')
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    digitar('Código', '123456')
    await clicar('Conferir código')
    await salvar()
    expect(await voltarRegistrando()).toBe(SENTINELA)
  })

  it('com o reenvio (troca a entrada, não empilha), o voltar também sai de uma vez', async () => {
    fake.tornarAdmin(EMAIL)
    window.history.pushState({}, '', SENTINELA)
    await ateOCodigo()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    await clicar('Reenviar código')
    digitar('Código', '123456')
    await clicar('Conferir código')
    await salvar()
    expect(await voltarRegistrando()).toBe(SENTINELA)
  })

  it('VIZINHA — o passo da senha aberto sem a conta (estado antigo) ainda leva à Início, trocando só a sua entrada', async () => {
    // A sessão que o código abriu já existe (o passo da senha só monta com ela conferida).
    fake.comSessao(EMAIL, { admin: true })
    await montarApp('/recuperar/senha', { estado: { email: EMAIL, conferido: true } })
    await salvar()
    expect(window.location.pathname).toBe('/')
  })
})

describe('o código já enviado há pouco (MAF-25)', () => {
  const pedirCom429 = async () => {
    fake.estado.erroDoEnvio = { message: 'For security purposes, you can only request this after 30 seconds.', code: 'over_email_send_rate_limit', status: 429 }
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    digitar('E-mail', ' Adri@Exemplo.invalid ')
    await clicar('Enviar código')
  }

  it('o 429 leva ao passo do código mesmo assim, dizendo que já enviamos', async () => {
    await pedirCom429()
    expect(window.location.pathname).toBe('/recuperar/codigo')
    expect(screen.getByLabelText('Código')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(`Já enviamos um código há pouco para ${EMAIL}.`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('com o reenvio contando, e o código que ela já tem confere', async () => {
    await pedirCom429()
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled()
    digitar('Código', '123456')
    await clicar('Conferir código')
    expect(fake.client.auth.verifyOtp).toHaveBeenCalledWith({ email: EMAIL, token: '123456', type: 'recovery' })
    expect(screen.getByLabelText('Senha nova')).toBeInTheDocument()
  })

  it('VIZINHA — outra falha de envio (500) continua no passo do e-mail, com o motivo', async () => {
    fake.estado.erroDoEnvio = { message: 'Error sending recovery email', code: 'unexpected_failure', status: 500 }
    await montarApp('/login')
    await clicar('Esqueci minha senha')
    digitar('E-mail', EMAIL)
    await clicar('Enviar código')
    expect(window.location.pathname).toBe('/recuperar')
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível enviar seu código agora.')
    expect(screen.queryByLabelText('Código')).not.toBeInTheDocument()
  })
})
