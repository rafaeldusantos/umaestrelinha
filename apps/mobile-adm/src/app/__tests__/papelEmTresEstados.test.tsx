// Feature 72, T16/T17 — o papel em TRÊS estados (`MAF-22`) e a tela do "não sei" (`MAF-23`), que
// fecham a `BL-048`. Sobre o `AuthProvider` REAL e o `<App />` inteiro.
//
// O defeito: com o Wi-Fi "conectado" e sem saída, a consulta do papel falhava e virava `false` — a
// dona lia "Esta conta não tem acesso ao painel." sobre a própria conta, e a única ação, "Sair",
// apagava a sessão salva. Com os pacotes sumindo, a splash não saía nunca (90 s medidos).
//
// Relógio falso SEM `shouldAdvanceTime`: a régua dos 8 s é 7.999 ainda na splash, 8.000 a frase, e
// o relógio de verdade andando por baixo empurraria o primeiro instante para depois do segundo.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_CHECK_TIMEOUT_MS, AuthProvider, useAuthContext } from '@estrelinha/auth'
import { fake } from '@/test/fakeSupabase'
import App from '@/app/App'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const ADRI = 'adri@exemplo.invalid'
const FRASE = 'Não consegui conferir seu acesso.'
const RECUSA = 'Esta conta não tem acesso ao painel.'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const splash = () => screen.queryByRole('status', { name: 'Abrindo o painel do ateliê' })

const abrir = async (caminho: string) => {
  window.history.pushState({}, '', caminho)
  render(<App />)
  await andar(0)
}

/** Lê o contexto do provider real, sem tela nenhuma no meio. */
const Sonda = () => {
  const { adminStatus, isAdmin, loading } = useAuthContext()
  return <p data-testid="sonda">{`${adminStatus}|${isAdmin}|${loading}`}</p>
}
const sonda = () => screen.getByTestId('sonda').textContent

describe('o AuthProvider expõe três estados (MAF-22)', () => {
  it('o teto é de 8 s', () => {
    expect(ADMIN_CHECK_TIMEOUT_MS).toBe(8000)
  })

  it('admin ⇒ `admin`, e `isAdmin` é verdadeiro', async () => {
    fake.comSessao(ADRI, { admin: true })
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('admin|true|false')
  })

  it('conta sem o papel ⇒ `not-admin` (a consulta RESPONDEU que não)', async () => {
    fake.comSessao('cliente@exemplo.invalid', { admin: false })
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('not-admin|false|false')
  })

  it('sem sessão ⇒ `not-admin`', async () => {
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('not-admin|false|false')
  })

  it('a consulta do papel FALHA (falha rápida) ⇒ `unknown`, na hora — nunca `not-admin`', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('unknown|false|false')
  })

  it('a consulta do papel NÃO RESPONDE ⇒ carregando até 7.999 ms, `unknown` aos 8.000', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarPapel()
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(7999)
    expect(sonda()).toBe('not-admin|false|true')
    await andar(1)
    expect(sonda()).toBe('unknown|false|false')
  })

  it('a leitura da SESSÃO não responde ⇒ carregando até 7.999 ms, `unknown` aos 8.000', async () => {
    fake.estado.getSessionPendente = true
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(7999)
    expect(sonda()).toBe('not-admin|false|true')
    await andar(1)
    expect(sonda()).toBe('unknown|false|false')
  })

  it('o teto da abertura é UM só: sessão em 5 s e papel pendurado ⇒ `unknown` aos 8 s, não aos 13', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarPapel()
    let soltarSessao = () => {}
    fake.client.auth.getSession.mockImplementationOnce(
      () => new Promise((r) => (soltarSessao = () => r({ data: { session: fake.estado.sessao } }))) as never,
    )
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(5000)
    soltarSessao()
    await andar(2999)
    expect(sonda()).toBe('not-admin|false|true')
    await andar(1)
    expect(sonda()).toBe('unknown|false|false')
  })

  it('`retryAdminCheck` refaz a leitura e a consulta: com a rede de volta, `admin`', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    let retry: () => Promise<void> = async () => {}
    const ComRetry = () => {
      retry = useAuthContext().retryAdminCheck
      return <Sonda />
    }
    render(<AuthProvider><ComRetry /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('unknown|false|false')
    const consultasAntes = fake.estado.tabelas.filter((t) => t === 'user_roles').length

    fake.estado.erroDoPapel = null
    await act(async () => {
      await retry()
    })
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles').length).toBe(consultasAntes + 1)
    expect(sonda()).toBe('admin|true|false')
  })
})

describe('o app no estado `unknown` (MAF-23)', () => {
  it('reaberto com a sessão salva e o papel FALHANDO: a frase honesta, "Tentar de novo", nunca a recusa nem "Sair"', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    await abrir('/pedidos')
    await andar(600)
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    // Não manda ao login: a tela é do guarda, na própria rota.
    expect(window.location.pathname).toBe('/pedidos')
    // A sessão salva continua.
    expect(fake.client.auth.signOut).not.toHaveBeenCalled()
    expect(fake.estado.sessao?.user.email).toBe(ADRI)
  })

  it('o papel PENDURADO: a splash fica até 7.999 ms e sai aos 8.000, com a frase', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarPapel()
    await abrir('/')
    await andar(7999)
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
  })

  it('a SESSÃO pendurada, aberto em /login: a splash sai aos 8 s com a frase, não com o formulário', async () => {
    fake.estado.getSessionPendente = true
    await abrir('/login')
    await andar(7999)
    expect(splash()).toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
  })

  it('"Tentar de novo" com a rede de volta abre a aba', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    await abrir('/pedidos')
    await andar(600)
    fake.estado.erroDoPapel = null
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
  })

  it('o "Tentar de novo" pendurado: a MESMA tela com "Conferindo…" até 7.999 ms, nunca a splash, e aos 8.000 o botão volta', async () => {
    // Paper cut do reteste de QA da 72: a nova tentativa trocava a tela pela splash por 7 a 8 s, e o
    // "Conferindo…" nunca aparecia. Quem carrega aqui é uma nova tentativa, não a abertura.
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    await abrir('/pedidos')
    await andar(600)
    fake.estado.erroDoPapel = null
    fake.pendurarPapel()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await vi.advanceTimersByTimeAsync(7999)
    })
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.getByRole('button', { name: 'Conferindo…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled()
  })

  it('a abertura com a sessão salva continua com a SPLASH (a marca é só da nova tentativa)', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarPapel()
    await abrir('/pedidos')
    await andar(3000)
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conferindo…' })).not.toBeInTheDocument()
  })

  it('entrando pelo Login com o papel falhando: a frase, nunca a recusa', async () => {
    await abrir('/login')
    await andar(600)
    fake.tornarAdmin(ADRI)
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ADRI } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-certa' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('VIZINHA — a conta que RESPONDEU sem o papel ainda recebe a recusa com "Sair"', async () => {
    fake.comSessao('cliente@exemplo.invalid', { admin: false })
    await abrir('/pedidos')
    await andar(600)
    expect(screen.getByRole('alert')).toHaveTextContent(RECUSA)
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------
// Conserto r1 da verificação da Fase 6 (V01, V03, V26, V06). As precisões estão na `spec.md`, no
// bloco "Precisões da verificação independente da Fase 6".
// ---------------------------------------------------------------------------------------------

const FORMAS = [
  ['responde `{ error }`', 'erro'],
  ['lança na hora', 'lanca'],
  ['devolve a promessa rejeitada', 'rejeita'],
] as const

describe('"a consulta falha" nas três formas, nas três leituras (MAF-22, V01/V03)', () => {
  it.each(FORMAS)('o PAPEL %s ⇒ `unknown`, nunca `not-admin`', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDoPapel = falha
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('unknown|false|false')
  })

  it.each(FORMAS)('a SESSÃO %s ⇒ `unknown`, nunca `not-admin`', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDaSessao = falha
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('unknown|false|false')
  })

  it.each(FORMAS)('o CADASTRO %s ⇒ o papel que respondeu vale: `admin`', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDoCadastro = falha
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('admin|true|false')
  })

  it.each(FORMAS)('no app, o papel que %s: a frase, nunca a recusa', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDoPapel = falha
    await abrir('/pedidos')
    await andar(600)
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
  })

  it.each(FORMAS)('no app, a sessão que %s: a frase, nunca o formulário nem a recusa', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDaSessao = falha
    await abrir('/pedidos')
    await andar(600)
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos')
  })

  it.each(FORMAS)('no app, o cadastro que %s: a aba abre (a recusa nunca aparece)', async (_forma, falha) => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDoCadastro = falha
    await abrir('/pedidos')
    await andar(600)
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.queryByText(RECUSA)).not.toBeInTheDocument()
  })
})

describe('a splash sai em no máximo 8 s também com o cadastro e a sessão pendurados (MAF-23, V26)', () => {
  it('Wi-Fi sem saída: o papel E o cadastro pendurados ⇒ splash até 7.999, a frase aos 8.000', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarPapel()
    fake.pendurarCadastro()
    await abrir('/')
    await andar(7999)
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
  })

  it('só o cadastro pendurado (o papel respondeu admin) ⇒ splash até 7.999, a aba aos 8.000', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarCadastro()
    await abrir('/pedidos')
    await andar(7999)
    expect(splash()).toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
  })

  it('a sessão pendurada, aberto numa aba ⇒ splash até 7.999, a frase aos 8.000', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarSessao()
    await abrir('/pedidos')
    await andar(7999)
    expect(splash()).toBeInTheDocument()
    expect(screen.queryByText(FRASE)).not.toBeInTheDocument()
    await andar(1)
    expect(splash()).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
  })
})

describe('`unknown` nunca fica guardado como resolvido (MAF-23, V06)', () => {
  const consultasDoPapel = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

  it('depois de um `unknown`, a renovação do token do MESMO usuário pergunta o papel de novo', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('unknown|false|false')
    const antes = consultasDoPapel()

    fake.estado.erroDoPapel = null
    fake.renovarToken()
    await andar(0)
    expect(consultasDoPapel()).toBe(antes + 1)
    expect(sonda()).toBe('admin|true|false')
  })

  it('VIZINHA — depois de um `admin`, a renovação do token NÃO pergunta de novo', async () => {
    fake.comSessao(ADRI, { admin: true })
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(0)
    expect(sonda()).toBe('admin|true|false')
    const antes = consultasDoPapel()
    fake.renovarToken()
    await andar(0)
    expect(consultasDoPapel()).toBe(antes)
    expect(sonda()).toBe('admin|true|false')
  })

  it('"Tentar de novo" no app vai à rede de novo, uma vez por toque', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.erroDoPapel = { message: 'Failed to fetch' }
    await abrir('/pedidos')
    await andar(600)
    const antes = consultasDoPapel()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(consultasDoPapel()).toBe(antes + 1)
    expect(screen.getByRole('alert')).toHaveTextContent(FRASE)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(consultasDoPapel()).toBe(antes + 2)
  })
})
