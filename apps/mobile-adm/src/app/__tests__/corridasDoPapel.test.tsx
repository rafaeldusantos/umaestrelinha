// Feature 72, conserto r1 da verificação da Fase 6 — as duas corridas do papel, sobre o
// `AuthProvider` REAL (e o `<App />` inteiro no caso do app).
//
// P1 (existia antes desta feature, e o painel também a tinha): a resposta do papel chega DEPOIS de a
// sessão cair, e a conta que já saiu voltava como admin.
// P3 (nova na Fase 6): o teto de um "Tentar de novo" apagava, 8 s depois, um `admin` que outra
// leitura da sessão já tinha conferido.
//
// O conserto é a GERAÇÃO da resolução em `packages/auth/src/AuthContext.tsx`: toda conclusão confere
// se ainda é a resolução vigente antes de gravar. Determinístico: relógio falso e as respostas
// seguradas e soltas à mão.
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthContext } from '@estrelinha/auth'
import { fake } from '@/test/fakeSupabase'
import App from '@/app/App'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const ADRI = 'adri@exemplo.invalid'
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

let retry: () => Promise<void> = async () => {}
const Sonda = () => {
  const c = useAuthContext()
  retry = c.retryAdminCheck
  return <p data-testid="sonda">{`${c.adminStatus}|${c.isAdmin}|${c.loading}|${c.user?.email ?? 'ninguém'}`}</p>
}
const sonda = () => screen.getByTestId('sonda').textContent

describe('P1 — a resposta do papel depois de a sessão cair é descartada', () => {
  it('no provider: a conta que saiu NÃO volta como admin', async () => {
    fake.comSessao(ADRI, { admin: true })
    const soltar = fake.segurarPapel()
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(100)
    expect(sonda()).toBe('not-admin|false|true|ninguém')
    fake.perderSessao()
    await andar(10)
    expect(sonda()).toBe('not-admin|false|false|ninguém')
    soltar()
    await andar(10)
    expect(sonda()).toBe('not-admin|false|false|ninguém')
    // E continua assim depois do teto: a resposta velha não deixou nada pendurado.
    await andar(8000)
    expect(sonda()).toBe('not-admin|false|false|ninguém')
  })

  it('VIZINHA — sem a sessão cair, a mesma resposta segurada promove a admin', async () => {
    fake.comSessao(ADRI, { admin: true })
    const soltar = fake.segurarPapel()
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(100)
    soltar()
    await andar(10)
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)
  })

  it('no app: aberto numa aba, a sessão cai com o papel em voo ⇒ fica no Login, a aba não abre', async () => {
    fake.comSessao(ADRI, { admin: true })
    const soltar = fake.segurarPapel()
    window.history.pushState({}, '', '/pedidos')
    render(<App />)
    await andar(100)
    fake.perderSessao()
    await andar(700)
    expect(window.location.pathname).toBe('/login')
    soltar()
    await andar(700)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar no ateliê' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Pedidos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Início' })).not.toBeInTheDocument()
  })
})

describe('P3 — o teto de um "Tentar de novo" não apaga um `admin` já conferido', () => {
  it('a leitura anterior responde `admin` com a do retry pendurada: 8 s depois continua `admin`', async () => {
    fake.comSessao(ADRI, { admin: true })
    let soltarPrimeira = () => {}
    fake.client.auth.getSession.mockImplementationOnce(
      () => new Promise((r) => (soltarPrimeira = () => r({ data: { session: fake.estado.sessao }, error: null }))) as never,
    )
    fake.client.auth.getSession.mockImplementationOnce(() => new Promise(() => {}) as never)
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(8000)
    expect(sonda()).toBe('unknown|false|false|ninguém')

    await act(async () => {
      void retry()
    })
    await andar(100)
    expect(sonda()).toBe('unknown|false|true|ninguém')
    soltarPrimeira()
    await andar(100)
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)

    // O teto do retry vence aqui (8 s depois dele). Antes do conserto, ele marcava `unknown`.
    await andar(8000)
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)
  })

  it('VIZINHA — sem resposta nenhuma, o teto do retry ainda marca `unknown` aos 8 s', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.pendurarSessao()
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(8000)
    await act(async () => {
      void retry()
    })
    await andar(7999)
    expect(sonda()).toBe('unknown|false|true|ninguém')
    await andar(1)
    expect(sonda()).toBe('unknown|false|false|ninguém')
  })

  it('a leitura da sessão pendurada não apaga um login feito no meio dela', async () => {
    // O teto da abertura não pode marcar `unknown` sobre a conta que entrou (e foi conferida) antes
    // de ele vencer: o login é uma resolução mais nova que a leitura.
    fake.pendurarSessao()
    fake.tornarAdmin(ADRI)
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(1000)
    await act(async () => {
      await fake.client.auth.signInWithPassword({ email: ADRI, password: 'senha-certa' })
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)
    await andar(8000)
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)
  })

  it('a leitura da sessão que responde DEPOIS de outra conta entrar é descartada', async () => {
    // A leitura saiu com a sessão da conta A; enquanto ela vinha, a conta B entrou. A resposta velha
    // não pode trocar B por A: uma identidade nova começou depois de a leitura sair.
    const OUTRA = 'outra@exemplo.invalid'
    fake.comSessao(ADRI, { admin: true })
    const sessaoAntiga = fake.estado.sessao
    let soltarLeitura = () => {}
    fake.client.auth.getSession.mockImplementationOnce(
      () => new Promise((r) => (soltarLeitura = () => r({ data: { session: sessaoAntiga }, error: null }))) as never,
    )
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(100)
    await act(async () => {
      await fake.client.auth.signInWithPassword({ email: OUTRA, password: 'senha-certa' })
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(sonda()).toBe(`not-admin|false|false|${OUTRA}`)
    soltarLeitura()
    await andar(100)
    expect(sonda()).toBe(`not-admin|false|false|${OUTRA}`)
  })
})

// Conserto r2 da Fase 6: o dublê emite o que o supabase-js emite (`INITIAL_SESSION`, e o `SIGNED_IN`
// da volta da aba). A régua contra o client REAL está em `contratoComClientReal.test.tsx`; aqui, a
// mesma ordem de eventos sobre o dublê, que é onde o resto da suíte roda.
describe('o dublê com paridade de eventos (conserto r2)', () => {
  it('a leitura da sessão com `{ error }` emite INITIAL_SESSION nulo, e o estado CONTINUA `unknown`', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDaSessao = 'erro'
    const ouvido: string[] = []
    render(<AuthProvider><Sonda /></AuthProvider>)
    fake.client.auth.onAuthStateChange((e: string, s: unknown) => ouvido.push(`${e}:${s ? 'com' : 'null'}`))
    await andar(100)
    expect(ouvido).toContain('INITIAL_SESSION:null')
    expect(sonda()).toBe('unknown|false|false|ninguém')
    await andar(10_000)
    expect(sonda()).toBe('unknown|false|false|ninguém')
  })

  it('papel `unknown`: a volta da aba repergunta sem pôr `loading`, e promove quando o papel responde', async () => {
    fake.comSessao(ADRI, { admin: true })
    fake.estado.falhaDoPapel = 'erro'
    render(<AuthProvider><Sonda /></AuthProvider>)
    await andar(100)
    expect(sonda()).toBe(`unknown|false|false|${ADRI}`)
    fake.estado.falhaDoPapel = null
    const soltar = fake.segurarPapel()
    const lidasAntes = fake.estado.tabelas.filter((t) => t === 'user_roles').length
    fake.voltarAba()
    await andar(10)
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles').length).toBe(lidasAntes + 1)
    expect(sonda()).toBe(`unknown|false|false|${ADRI}`) // com a repergunta em voo, `loading` segue falso
    soltar()
    await andar(10)
    expect(sonda()).toBe(`admin|true|false|${ADRI}`)
  })
})
