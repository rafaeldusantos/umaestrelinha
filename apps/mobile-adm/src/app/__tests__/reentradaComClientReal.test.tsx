// Feature 72, fecho das lacunas da verificação r3 da Fase 6 — a REENTRADA, sobre o supabase-js REAL.
//
// A r3 achou que os resets das refs do `AuthProvider` no logout e no "Tentar de novo" não tinham
// régua: apagar qualquer um deixava a suíte verde (mutantes X05, X06 e X07), e as três consequências
// foram medidas com sonda. Aqui cada uma vira caso, pelo provider (o estado) e, nas duas que prendem
// o app, pelo `<App />` inteiro (a tela):
//
//   1. sair com a checagem do papel EM VOO e entrar de novo com a mesma conta ⇒ `admin` e a Início
//      (sem o reset de `emVoo` no logout, a entrada nova era ignorada e a tela seguia deslogada);
//   2. "Tentar de novo" com uma repergunta da volta da aba EM VOO ⇒ sai do `loading` e chega a
//      `admin` (sem o reset de `emVoo` no retry, splash eterna);
//   3. sair e entrar de novo com a mesma conta paga `loading = true` (a splash) entre o `SIGNED_IN` e
//      a resposta do papel — nunca uma janela deslogada sem `loading` (sem o reset de `presente`, a
//      entrada era tratada como repergunta de quem já estava na tela).
//
// Relógio falso, determinístico, sem rede (`src/test/clientReal.ts`). A volta da aba é o
// `visibilitychange` com `bubbles` (o supabase-js escuta em `window`), e o caso 2 exige os dois
// `SIGNED_IN` (o da abertura e o da volta) para a régua não passar sobre um evento que não saiu.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthContext } from '@estrelinha/auth'
import App from '@/app/App'
import { real, USUARIO, type Cenario } from '@/test/clientReal'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ADRI = USUARIO.email
const ROLES = '/rest/v1/user_roles'

let historico: string[] = []
let ctx: ReturnType<typeof useAuthContext> | null = null
const Sonda = () => {
  const c = useAuthContext()
  ctx = c
  const s = `${c.adminStatus}|${c.loading}|${c.user?.email ?? 'ninguém'}`
  if (historico[historico.length - 1] !== s) historico.push(s)
  return <p data-testid="sonda">{s}</p>
}
const sonda = () => screen.getByTestId('sonda').textContent
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
/** Um `act` por passo de 50 ms: dentro de UM `act` o React só renderiza no fim. */
const andarVigiando = async (ms: number, aCada?: () => void) => {
  for (let feito = 0; feito < ms; feito += 50) {
    await andar(Math.min(50, ms - feito))
    aCada?.()
  }
}
const contar = (evento: string) => real.atual!.eventos.filter((e) => e === evento).length

const montarSonda = (cenario: Cenario) => {
  const r = real.criar(cenario)
  render(<AuthProvider><Sonda /></AuthProvider>)
  return r
}
const montarApp = (cenario: Cenario, caminho: string) => {
  const r = real.criar(cenario)
  window.history.pushState({}, '', caminho)
  render(<App />)
  return r
}

/** Entra e sai pelo client real: são os eventos dele (`SIGNED_IN`, `SIGNED_OUT`) que o provider ouve. */
const entrar = () =>
  act(async () => {
    await real.atual!.client.auth.signInWithPassword({ email: ADRI, password: 'senha-certa' })
  })
const sair = () =>
  act(async () => {
    await real.atual!.client.auth.signOut()
  })

const inicio = () => screen.queryByRole('heading', { level: 1, name: 'Início' })
const splash = () => screen.queryByRole('status', { name: 'Abrindo o painel do ateliê' })
const formularioDeLogin = () => screen.queryByRole('button', { name: /entrar/i })

beforeEach(() => {
  historico = []
  ctx = null
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('1 — sair com a checagem do papel em voo e entrar de novo com a MESMA conta (X06)', () => {
  it('provider: a entrada nova é resolvida e chega a `admin`, em vez de ficar deslogada', async () => {
    const r = montarSonda({ sessao: 'ausente', papel: 'admin', cadastro: 'ok', atrasoMs: 3000 })
    await andar(100)
    await entrar()
    await andarVigiando(500)
    expect(sonda()).toBe('not-admin|true|ninguém') // a checagem do papel está no ar
    await sair()
    await andarVigiando(200)
    expect(sonda()).toBe('not-admin|false|ninguém')

    r.estado.atrasoMs = 100
    await entrar()
    await andarVigiando(4000) // passa também do instante em que a resposta VELHA chegaria
    expect(contar('SIGNED_IN:com')).toBe(2)
    expect(sonda()).toBe(`admin|false|${ADRI}`)
  })

  it('<App />: a Início abre, e o formulário de login sai da tela', async () => {
    const r = montarApp({ sessao: 'ausente', papel: 'admin', cadastro: 'ok', atrasoMs: 3000 }, '/login')
    await andar(700)
    expect(formularioDeLogin()).not.toBeNull()
    await entrar()
    await andarVigiando(500)
    await sair()
    await andarVigiando(200)

    r.estado.atrasoMs = 100
    await entrar()
    await andarVigiando(4000)
    expect(contar('SIGNED_IN:com')).toBe(2)
    expect(inicio()).not.toBeNull()
    expect(formularioDeLogin()).toBeNull()
  })
})

describe('2 — "Tentar de novo" com uma repergunta da volta da aba em voo (X07)', () => {
  it('provider: sai do `loading` e chega a `admin` — sem spinner eterno', async () => {
    const r = montarSonda({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    await andar(9000)
    expect(sonda()).toBe(`unknown|false|${ADRI}`)

    r.estado.atrasoMs = 3000
    r.voltarAba()
    await andarVigiando(200)
    expect(contar('SIGNED_IN:com')).toBe(2) // o da abertura e o da volta: a repergunta está no ar
    const papelAntes = r.quantos(ROLES)

    r.estado.papel = 'admin'
    await act(async () => {
      void ctx!.retryAdminCheck()
    })
    expect(sonda()).toBe(`unknown|true|${ADRI}`)
    await andarVigiando(5000)
    expect(r.quantos(ROLES)).toBeGreaterThan(papelAntes) // o retry perguntou de novo
    expect(sonda()).toBe(`admin|false|${ADRI}`)
  })

  it('<App />: da tela "Não consegui conferir" à Início, sem ficar na splash', async () => {
    const r = montarApp({ sessao: 'valida', papel: 'falha', cadastro: 'ok' }, '/')
    await andar(9000)
    const tentar = screen.getByRole('button', { name: 'Tentar de novo' })

    r.estado.atrasoMs = 3000
    r.voltarAba()
    await andarVigiando(200)
    expect(contar('SIGNED_IN:com')).toBe(2)

    r.estado.papel = 'admin'
    fireEvent.click(tentar)
    await andarVigiando(5000)
    expect(splash()).toBeNull()
    expect(inicio()).not.toBeNull()
  })
})

describe('3 — sair e entrar de novo com a mesma conta paga `loading` (X05)', () => {
  it('entre o segundo `SIGNED_IN` e a resposta do papel o estado é `loading`, nunca deslogado sem `loading`', async () => {
    const r = montarSonda({ sessao: 'ausente', papel: 'admin', cadastro: 'ok' })
    await andar(100)
    await entrar()
    await andarVigiando(1000)
    expect(sonda()).toBe(`admin|false|${ADRI}`)
    await sair()
    await andarVigiando(200)
    expect(sonda()).toBe('not-admin|false|ninguém')
    const marca = historico.length

    r.estado.atrasoMs = 500
    await entrar()
    await andarVigiando(1000)
    expect(contar('SIGNED_IN:com')).toBe(2)
    // A primeira coisa que a tela vê depois da entrada é a splash (`loading`), e depois a admin.
    expect(historico.slice(marca)).toEqual(['not-admin|true|ninguém', `admin|false|${ADRI}`])
  })

  it('VIZINHA — sem sair, o `SIGNED_IN` do mesmo usuário (a volta da aba) NÃO paga `loading`', async () => {
    const r = montarSonda({ sessao: 'ausente', papel: 'admin', cadastro: 'ok' })
    await andar(100)
    await entrar()
    await andarVigiando(1000)
    const marca = historico.length
    r.estado.atrasoMs = 500
    r.voltarAba()
    await andarVigiando(1000)
    expect(contar('SIGNED_IN:com')).toBe(2)
    expect(historico.slice(marca)).toEqual([])
  })
})
