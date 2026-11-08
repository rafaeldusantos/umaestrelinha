// A montagem de um pedido sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): a busca
// de clientes e os endereços salvos da cliente escolhida. Molde de `clientesComClientReal.test.tsx`.
//
// O cenário a impedir: a RLS devolveria a uma conta SEM papel admin as linhas DELA, sem erro. Aqui
// `customer_list` e `addresses` respondem com os dados de uma cliente, e só a recusa de `atelie_clock`
// (403 `42501`) os barra. Rede caída é falha, nunca recusa.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_RELOGIO = '/rest/v1/rpc/atelie_clock'
const CUSTOMER_LIST = '/rest/v1/customer_list'
const ADDRESSES = '/rest/v1/addresses'
const ROLES = '/rest/v1/user_roles'

const ID_DELA = '00000000-0000-4000-c094-000000000777'
const NOME_DELA = 'Clarice Sem Papel'
const EMAIL_DELA = 'clarice.sem.papel@exemplo.invalid'
const RUA_DELA = 'Rua Secreta da Clarice'
const DELA = new RegExp(`${NOME_DELA}|${EMAIL_DELA.replace(/\./g, '\\.')}|${RUA_DELA}`)

const ok = (corpo: unknown): RespostaRpcReal => ({ status: 200, corpo })
const RECUSA_403: RespostaRpcReal = { status: 403, corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' } }
const RELOGIO_OK: RespostaRpcReal = ok({ lido_em: '2026-11-07T12:00:00.123456+00:00' })

const TABELAS = {
  customer_list: ok([{ id: ID_DELA, name: NOME_DELA, email: EMAIL_DELA, phone: '51988887777', has_account: true, orders_total: 1 }]),
  addresses: ok([
    { id: 'e1', label: null, cep: '90010-000', street: RUA_DELA, number: '1', complement: null, neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', is_default: true, created_at: '2026-01-01T00:00:00Z' },
  ]),
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** A montagem aberta como "Montar pedido" a abre: a sentinela dos passos, que empilha o passo 1. */
const abrir = (relogio: RespostaRpcReal) => {
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc: { atelie_clock: relogio }, tabelas: TABELAS })
  window.history.pushState({ usr: { doApp: true, passoDaMontagem: 0 }, key: 'montar', idx: 0 }, '', '/pedidos/montar')
  render(<App />)
  return r
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a busca de clientes da montagem, sobre o client real', () => {
  it('par: com o papel e a RPC em 200, a cliente aparece na busca — a régua "nenhum texto dela" tem alvo', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !document.body.textContent?.includes(NOME_DELA); i++) await andar(50)
    expect(document.body.textContent).toContain(NOME_DELA)
    expect(r.quantos(RPC_RELOGIO)).toBeGreaterThan(0)
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
  })

  it('conta sem papel: RPC 403 `42501` + a linha DELA do outro lado ⇒ a recusa, e nenhum dado dela em instante nenhum', async () => {
    // A conta abre com o papel conferido (sem ele o guarda nem monta a tela) e o perde quando a primeira
    // confirmação sai: a RPC recusa, e a conferência do papel também.
    const r = abrir(RECUSA_403)
    const instantes: string[] = [document.body.textContent ?? '']
    for (let i = 0; i < 60 && r.quantos(RPC_RELOGIO) === 0; i++) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    r.estado.papel = 'not-admin'
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })

  it('a RPC com a rede caída ⇒ falha de leitura, NUNCA a recusa, e nenhum dado dela', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc: { atelie_clock: 'rede' }, tabelas: TABELAS })
    window.history.pushState({ usr: { doApp: true, passoDaMontagem: 0 }, key: 'montar', idx: 0 }, '', '/pedidos/montar')
    render(<App />)
    const instantes: string[] = []
    for (let feito = 0; feito < 5000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(ROLES)).toBe(1)
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })
})

describe('os endereços salvos da cliente escolhida, sobre o client real', () => {
  it('par: escolhida com o papel de pé, o endereço salvo dela aparece', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: new RegExp(NOME_DELA) }); i++) await andar(50)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(NOME_DELA) }))
    for (let i = 0; i < 60 && !document.body.textContent?.includes(RUA_DELA); i++) await andar(50)
    expect(document.body.textContent).toContain(RUA_DELA)
    expect(r.quantos(ADDRESSES)).toBe(1)
  })

  it('conta sem papel na leitura dos endereços: RPC 403 `42501` ⇒ a recusa, e o endereço dela em instante nenhum', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: new RegExp(NOME_DELA) }); i++) await andar(50)
    r.estado.rpc.atelie_clock = RECUSA_403
    r.estado.papel = 'not-admin'
    fireEvent.click(screen.getByRole('button', { name: new RegExp(NOME_DELA) }))
    const instantes: string[] = []
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.quantos(ADDRESSES)).toBeGreaterThan(0)
    expect(instantes.findIndex((t) => t.includes(RUA_DELA))).toBe(-1)
  })
})
