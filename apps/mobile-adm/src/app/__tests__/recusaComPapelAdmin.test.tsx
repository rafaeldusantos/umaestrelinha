// Feature `76` · conserto do QA · `BUG-20261024-recusa-com-papel-admin-vira-tempestade-de-requisicoes`
// — `MAC-11`, `MAC-37`, `MAI-22`. Sobre o `<App />` real e o supabase-js REAL.
//
// O estado: a conta AINDA é admin em `user_roles`, mas `atelie_clock` responde 403 `42501` e a consulta
// da tela responde 500. A vigia reconfere o papel UMA vez; o papel volta `admin`; a página remonta, a
// consulta recomeça (e o React Query apaga o erro de uma consulta sem dado enquanto ela lê). Se o
// "episódio" acabasse nesse instante sem erro, o `42501` seguinte reconferiria de novo, para sempre:
// ~140 requisições por segundo e a tela presa na splash. O episódio só acaba com uma leitura BOA.
process.env.TZ = 'UTC'

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const ID = '00000000-0000-4000-c076-000000000888'
const RPC_RELOGIO = '/rest/v1/rpc/atelie_clock'
const ROLES = '/rest/v1/user_roles'

const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'boom' } }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const ROTAS = [
  ['/clientes', '/rest/v1/customer_list'],
  [`/clientes/${ID}`, '/rest/v1/customer_list'],
  ['/pedidos', '/rest/v1/order_list'],
  [`/pedidos/${ID}`, '/rest/v1/order_list'],
  ['/', '/rest/v1/rpc/store_movement'],
] as const

beforeEach(() => {
  vi.useFakeTimers()
  esquecerRolagens()
  esquecerTermos()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe.each(ROTAS)('%s com `42501` e o papel ainda admin', (rota, consulta) => {
  it('reconfere o papel poucas vezes e para: nada de laço de requisições', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RECUSA_403, store_movement: RECUSA_403, store_overview: RECUSA_403 },
      tabelas: {
        customer_list: ERRO_500,
        order_list: ERRO_500,
        customer_directory: ERRO_500,
        order_items: ERRO_500,
        order_status_history: ERRO_500,
        order_notes: ERRO_500,
        order_notifications: ERRO_500,
      },
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let feito = 0; feito < 8000; feito += 50) await andar(50)

    // Cada volta do laço custa uma consulta da tela, um relógio e uma consulta do papel.
    expect(r.quantos(ROLES)).toBeLessThanOrEqual(4)
    expect(r.quantos(RPC_RELOGIO)).toBeLessThanOrEqual(8)
    expect(r.quantos(consulta)).toBeLessThanOrEqual(10)
  })
})

// Feature `83` · T09 (`LAV-05`): a Início relê o movimento a cada 30 s. Com a recusa e o papel ainda
// admin, o intervalo PARA (`refetchInterval` devolve `false` com `42501`) — senão cada ciclo reabriria
// o episódio e reconferiria o papel de novo. Quatro ciclos e mais: UMA reconferência.
describe('`/` com `42501` e o papel ainda admin, por mais de quatro ciclos de 30 s', () => {
  it('o papel é reconferido UMA vez (a abertura e a reconferência), e o movimento para de ser lido', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RECUSA_403, store_movement: RECUSA_403, store_overview: RECUSA_403 },
    })
    window.history.pushState({}, '', '/')
    render(<App />)
    for (let feito = 0; feito < 8000; feito += 50) await andar(50)
    const movimentosDepoisDaRecusa = r.quantos('/rest/v1/rpc/store_movement')
    for (let ciclo = 0; ciclo < 5; ciclo++) await andar(30_000)
    expect(r.quantos(ROLES)).toBe(2)
    expect(r.quantos('/rest/v1/rpc/store_movement')).toBe(movimentosDepoisDaRecusa)
  })
})
