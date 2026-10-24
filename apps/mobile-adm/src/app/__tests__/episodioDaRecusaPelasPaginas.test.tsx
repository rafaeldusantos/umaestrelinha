// Feature `76` · conserto da revalidação (G1..G3) · o EPISÓDIO da recusa por papel, pelas cinco telas.
//
// `useRecusaDePapel(erros, leituraBoa)` reconfere o papel UMA vez por episódio, e o episódio só acaba
// com uma leitura BOA da tela. Cada página decide o que é "leitura boa" no segundo argumento — e é
// ali que o laço de requisições da B05 voltaria sem um teste acusar: sem o argumento o episódio nunca
// acaba (uma recusa genuína, depois de uma leitura boa, deixa de reconferir); com ele sempre
// verdadeiro, ou sem o `!isError`, o episódio acaba cedo demais (uma reconferência a mais, e a cada
// remontagem). Aqui, sobre o `<App />` real e o supabase-js REAL, duas sequências por tela:
//
// - A: leitura boa → recusa → leitura boa → recusa. A segunda recusa TEM de reconferir o papel de novo.
// - B: leitura boa → recusa → ERRO de rede → recusa. O erro que não é de papel NÃO encerra o episódio,
//   então a segunda recusa NÃO reconfere.
process.env.TZ = 'UTC'

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type Real, type RespostaRpcReal } from '@/test/clientReal'
import { cliente, fichaDeCliente, pedidoDaFicha } from '@/test/clientes'
import { movimento } from '@/test/movimento'
import { detalhe, item, linha } from '@/test/pedidos'
import { resumo } from '@/test/resumo'
import { esquecerReconferencia } from '@/features/access-check/model/useRecusaDePapel'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ROLES = '/rest/v1/user_roles'
const ID_CLIENTE = '00000000-0000-4000-c076-000000000999'
const ID_PEDIDO = '00000000-0000-4000-8000-000000000999'

const ok = (corpo: unknown): RespostaRpcReal => ({ status: 200, corpo })
const RECUSA: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const ERRO: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'boom' } }
const RELOGIO = ok({ lido_em: '2026-10-23T14:30:00.123456+00:00' })

type Estado = 'boa' | 'recusa' | 'erro'
const resposta = (e: Estado, boa: RespostaRpcReal): RespostaRpcReal => (e === 'boa' ? boa : e === 'recusa' ? RECUSA : ERRO)

/** Como cada tela deixa de ler: a maioria pelo relógio do ateliê; a Início, pelas duas RPCs dela. */
const pelaRelogio = (r: Real, e: Estado) => {
  r.estado.rpc = { atelie_clock: resposta(e, RELOGIO) }
}
const pelaInicio = (r: Real, e: Estado) => {
  r.estado.rpc = {
    store_movement: resposta(e, ok(movimento())),
    store_overview: resposta(e, ok(resumo())),
  }
}

const TABELAS = {
  customer_list: ok([cliente({ id: ID_CLIENTE })]),
  order_list: ok([linha({ id: ID_PEDIDO })]),
  customer_directory: ok([{ id: ID_CLIENTE }]),
  order_items: ok([{ ...item(), order_id: ID_PEDIDO }]),
}
const TABELAS_DA_FICHA = { ...TABELAS, customer_list: ok([fichaDeCliente({ id: ID_CLIENTE })]), order_list: ok([pedidoDaFicha()]) }
const TABELAS_DO_PEDIDO = { ...TABELAS, order_list: ok([detalhe({ id: ID_PEDIDO })]) }

const ROTAS: ReadonlyArray<readonly [string, typeof TABELAS, (r: Real, e: Estado) => void]> = [
  ['/', TABELAS, pelaInicio],
  ['/clientes', TABELAS, pelaRelogio],
  [`/clientes/${ID_CLIENTE}`, TABELAS_DA_FICHA, pelaRelogio],
  ['/pedidos', TABELAS, pelaRelogio],
  [`/pedidos/${ID_PEDIDO}`, TABELAS_DO_PEDIDO, pelaRelogio],
]

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const assentar = async () => {
  for (let feito = 0; feito < 3000; feito += 50) await andar(50)
}

beforeEach(() => {
  vi.useFakeTimers()
  esquecerRolagens()
  esquecerTermos()
  esquecerReconferencia()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Abre a rota com leitura boa e devolve o `step(estado)`: muda a resposta, volta à aba e devolve quantas vezes o papel foi perguntado. */
const abrir = async (rota: string, tabelas: typeof TABELAS, definir: (r: Real, e: Estado) => void) => {
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', tabelas })
  definir(r, 'boa')
  window.history.pushState({}, '', rota)
  render(<App />)
  await assentar()
  return async (e: Estado) => {
    definir(r, e)
    r.voltarAba()
    await assentar()
    return r.quantos(ROLES)
  }
}

describe.each(ROTAS)('%s', (rota, tabelas, definir) => {
  it('A: leitura boa encerra o episódio — a recusa seguinte reconfere o papel de novo', async () => {
    const passo = await abrir(rota, tabelas, definir)
    const n0 = await passo('boa')
    const n1 = await passo('recusa')
    expect(n1).toBeGreaterThan(n0)
    await passo('boa')
    const n2 = await passo('recusa')
    expect(n2).toBeGreaterThan(n1)
    expect(n2).toBeLessThanOrEqual(n0 + 6)
  })

  it('B: um erro que não é de papel NÃO encerra o episódio — a recusa seguinte não reconfere', async () => {
    const passo = await abrir(rota, tabelas, definir)
    await passo('boa')
    const n1 = await passo('recusa')
    await passo('erro')
    const n2 = await passo('recusa')
    expect(n2).toBe(n1)
  })
})
