// Feature 72, conserto r2 da verificação da Fase 6 — o `AuthProvider` REAL sobre o supabase-js REAL.
//
// A r2 achou que o dublê (`fakeSupabase.ts`) provava uma ordem de eventos que o client não produz
// (`L-055`). Aqui o que roda é o `GoTrueClient` e o `PostgrestClient` de verdade (2.110.7); só a rede
// e o storage são trocados (`src/test/clientReal.ts`). Determinístico: relógio falso, sem rede.
//
// O que se prova, cada um com a vizinha que mostra que a régua discrimina:
//   1. o `INITIAL_SESSION` nulo de uma leitura que FALHOU não desfaz o `unknown` (`MAF-22`/`MAF-23`);
//      a sessão ausente de verdade e o `SIGNED_OUT` continuam levando a "sem sessão";
//   2. reperguntar o papel de quem já está presente (o `SIGNED_IN` da volta da aba) não mexe em
//      `loading` — a loja desmonta o checkout quando ele pisca;
//   3. o dedupe `emVoo`: um evento do mesmo usuário no meio da checagem não repete a consulta nem
//      reabre o teto além de 8 s;
//   4. o cadastro que estourou o teto volta a ser pedido no próximo evento, sem mexer em `loading`.
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthContext } from '@estrelinha/auth'
import { real, USUARIO, type Cenario } from '@/test/clientReal'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ADRI = USUARIO.email
const ROLES = '/rest/v1/user_roles'
const CUSTOMERS = '/rest/v1/customers'

let historico: string[] = []
let ctx: ReturnType<typeof useAuthContext> | null = null
const Sonda = () => {
  const c = useAuthContext()
  ctx = c
  const s = `${c.adminStatus}|${c.loading}|${c.user?.email ?? 'ninguém'}|${c.customer?.name ?? 'sem-cadastro'}`
  if (historico[historico.length - 1] !== s) historico.push(s)
  return <p data-testid="sonda">{s}</p>
}
const sonda = () => screen.getByTestId('sonda').textContent
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
/**
 * Anda em passos de 50 ms, um `act` por passo. Dentro de UM `act` o React só renderiza no fim, então
 * um `loading` posto e tirado no mesmo `andar(600)` nunca chega ao histórico — e a régua de "não
 * pisca" seria verdadeira nos dois mundos (medido: o mutante sobreviveu assim).
 */
const andarVigiando = async (ms: number) => {
  for (let feito = 0; feito < ms; feito += 50) await andar(Math.min(50, ms - feito))
}

const montar = (cenario: Cenario) => {
  const r = real.criar(cenario)
  render(<AuthProvider><Sonda /></AuthProvider>)
  return r
}

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

describe('1 — o INITIAL_SESSION nulo de uma leitura que falhou não é logout (MAF-22/MAF-23)', () => {
  it('sessão salva vencida e a renovação sem rede: `unknown` aos 8 s, e CONTINUA `unknown` depois do INITIAL_SESSION nulo', async () => {
    const r = montar({ sessao: 'vencida', papel: 'admin', cadastro: 'ok' })
    await andar(7999)
    expect(sonda()).toBe('not-admin|true|ninguém|sem-cadastro')
    await andar(1)
    expect(sonda()).toBe('unknown|false|ninguém|sem-cadastro')

    // O client tenta renovar por ~30 s e desiste; aí emite INITIAL_SESSION com sessão null.
    await andar(60_000)
    expect(r.eventos).toContain('INITIAL_SESSION:null') // a régua exige o evento que a r2 achou
    expect(r.sessaoSalva()).toBe(true) // e a sessão continua salva: é falha, não logout
    expect(sonda()).toBe('unknown|false|ninguém|sem-cadastro')
    expect(historico).not.toContain('not-admin|false|ninguém|sem-cadastro')
  })

  it('VIZINHA — sem sessão salva, o mesmo INITIAL_SESSION nulo é "sem sessão" (vai ao Login)', async () => {
    const r = montar({ sessao: 'ausente', papel: 'admin', cadastro: 'ok' })
    await andar(100)
    expect(r.eventos).toContain('INITIAL_SESSION:null')
    expect(sonda()).toBe('not-admin|false|ninguém|sem-cadastro')
  })

  it('VIZINHA — o `SIGNED_OUT` de verdade, com a checagem no `unknown`, leva a "sem sessão"', async () => {
    const r = montar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    await andar(9000)
    expect(sonda()).toBe(`unknown|false|${ADRI}|Adri Muniz`)
    await act(async () => {
      await ctx!.signOut()
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(r.eventos).toContain('SIGNED_OUT:null')
    expect(sonda()).toBe('not-admin|false|ninguém|sem-cadastro')
  })
})

describe('2 — reperguntar o papel de quem já está presente não mexe em `loading`', () => {
  it('papel falhou ⇒ `unknown`; a volta da aba (SIGNED_IN) repergunta à rede, e `loading` nunca volta a `true`', async () => {
    const r = montar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    await andar(9000)
    expect(sonda()).toBe(`unknown|false|${ADRI}|Adri Muniz`)
    const antes = r.quantos(ROLES)
    const marca = historico.length

    // A resposta demora: sem o atraso, o `loading` posto e tirado no mesmo tique nunca renderiza, e
    // a régua seria verdadeira nos dois mundos.
    r.estado.atrasoMs = 500
    r.voltarAba()
    await andarVigiando(9000)
    expect(r.eventos).toContain('SIGNED_IN:com') // o evento que o client emite na volta da aba
    expect(r.quantos(ROLES)).toBeGreaterThan(antes) // perguntou de novo
    expect(historico.slice(marca).some((s) => s.includes('|true|'))).toBe(false)
    expect(sonda()).toBe(`unknown|false|${ADRI}|Adri Muniz`)
  })

  it('VIZINHA — a rede voltou: a mesma volta da aba promove a `admin`, ainda sem piscar `loading`', async () => {
    const r = montar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    await andar(9000)
    const marca = historico.length
    r.estado.papel = 'admin'
    r.estado.atrasoMs = 500
    r.voltarAba()
    await andarVigiando(600)
    expect(sonda()).toBe(`admin|false|${ADRI}|Adri Muniz`)
    expect(historico.slice(marca).some((s) => s.includes('|true|'))).toBe(false)
  })

  it('VIZINHA — o "Tentar de novo" PÕE `loading` (é pedido de quem está na tela) e o devolve ao terminar', async () => {
    const r = montar({ sessao: 'valida', papel: 'falha', cadastro: 'ok' })
    await andar(9000)
    r.estado.papel = 'admin'
    r.estado.atrasoMs = 500
    await act(async () => {
      void ctx!.retryAdminCheck()
    })
    expect(sonda()).toBe(`unknown|true|${ADRI}|Adri Muniz`)
    await andar(600)
    expect(sonda()).toBe(`admin|false|${ADRI}|Adri Muniz`)
  })
})

describe('3 — o dedupe `emVoo`', () => {
  it('na abertura, `getSession` e `INITIAL_SESSION` entregam o mesmo usuário: UMA consulta do papel e uma do cadastro', async () => {
    const r = montar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', atrasoMs: 500 })
    await andar(2000)
    expect(r.eventos).toContain('INITIAL_SESSION:com')
    expect(sonda()).toBe(`admin|false|${ADRI}|Adri Muniz`)
    expect(r.quantos(ROLES)).toBe(1)
    expect(r.quantos(CUSTOMERS)).toBe(1)
  })

  it('um SIGNED_IN do mesmo usuário NO MEIO da checagem de um login não repete a consulta nem reabre o teto: `unknown` aos 8 s do login', async () => {
    const r = montar({ sessao: 'ausente', papel: 'pendura', cadastro: 'ok' })
    await andar(100)
    expect(sonda()).toBe('not-admin|false|ninguém|sem-cadastro')
    await act(async () => {
      await ctx!.signIn(ADRI, 'senha-certa')
      await vi.advanceTimersByTimeAsync(0)
    })
    // O `setTimeout(0)` do ouvinte e o início da checagem: o teto de 8 s começa aqui.
    await andar(1)
    expect(sonda()).toBe('not-admin|true|ninguém|sem-cadastro')
    await andar(4000)
    r.voltarAba()
    await andar(10)
    expect(r.quantos(ROLES)).toBe(1)
    await andar(3988) // 7.999 ms desde o começo da checagem
    expect(sonda()).toBe('not-admin|true|ninguém|sem-cadastro')
    await andar(1) // 8.000: o teto do LOGIN, não um novo contado da volta da aba
    expect(sonda()).toBe(`unknown|false|${ADRI}|Adri Muniz`)
    expect(r.quantos(ROLES)).toBe(1)
  })
})

describe('4 — o cadastro que estourou o teto volta a ser pedido', () => {
  it('cadastro pendurado ⇒ `null` aos 8 s; o próximo evento do mesmo usuário o pede de novo, sem perguntar o papel e sem `loading`', async () => {
    const r = montar({ sessao: 'valida', papel: 'admin', cadastro: 'pendura' })
    await andar(8000)
    expect(sonda()).toBe(`admin|false|${ADRI}|sem-cadastro`)
    const papelAntes = r.quantos(ROLES)
    const cadastroAntes = r.quantos(CUSTOMERS)
    const marca = historico.length

    r.estado.cadastro = 'ok'
    r.estado.atrasoMs = 500
    r.voltarAba()
    await andarVigiando(600)
    expect(sonda()).toBe(`admin|false|${ADRI}|Adri Muniz`)
    expect(r.quantos(CUSTOMERS)).toBe(cadastroAntes + 1)
    expect(r.quantos(ROLES)).toBe(papelAntes) // o papel conferido não é reperguntado
    expect(historico.slice(marca).some((s) => s.includes('|true|'))).toBe(false)
  })

  // Fecho da r3 (X04): o "não" conferido também fica guardado. Sem isso, toda cliente da loja pede
  // `user_roles` a cada volta da aba, e no app uma conta sem papel cuja repergunta falha passa da
  // recusa para "Não consegui conferir". A vizinha acima só provava o caso `admin`.
  it('VIZINHA — o `not-admin` conferido também não é reperguntado: a volta da aba (com a rede do papel caída) não pede o papel nem muda a resposta', async () => {
    const r = montar({ sessao: 'valida', papel: 'not-admin', cadastro: 'ok' })
    await andar(2000)
    expect(sonda()).toBe(`not-admin|false|${ADRI}|Adri Muniz`)
    expect(r.quantos(ROLES)).toBe(1)
    const marca = historico.length
    const signedIn = () => r.eventos.filter((e) => e === 'SIGNED_IN:com').length
    const antes = signedIn()

    r.estado.papel = 'falha'
    r.voltarAba()
    await andarVigiando(1000)
    expect(signedIn()).toBe(antes + 1) // a régua exige o evento da volta da aba
    r.voltarAba()
    await andarVigiando(1000)
    expect(signedIn()).toBe(antes + 2)
    expect(r.quantos(ROLES)).toBe(1)
    expect(sonda()).toBe(`not-admin|false|${ADRI}|Adri Muniz`)
    expect(historico.slice(marca)).toEqual([])
  })

  it('VIZINHA — com o cadastro já lido, a volta da aba não pede nada à rede', async () => {
    const r = montar({ sessao: 'valida', papel: 'admin', cadastro: 'ok' })
    await andar(2000)
    const antes = r.pedidos.length
    r.voltarAba()
    await andar(100)
    expect(r.eventos).toContain('SIGNED_IN:com')
    expect(r.pedidos.length).toBe(antes)
  })
})
