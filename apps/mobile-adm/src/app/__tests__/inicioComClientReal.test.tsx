// Feature `73` · T19 · `MAI-22`, `MAI-24` — a Início sobre o supabase-js REAL (`src/test/clientReal.ts`):
// o `PostgrestClient` de verdade transforma a resposta HTTP em `{ error }`, e é ESSE objeto que a vigia
// da recusa lê. O dublê do client devolve o `{ error }` já montado, então só daqui se prova que o 403
// do PostgREST chega com `code: '42501'` (recusa) e que o 500 e a falha de rede chegam SEM ele (falha
// do bloco, nunca "Esta conta não tem acesso").
//
// Relógio falso, sem rede; o corpo do 403 é o que o PostgREST manda para `raise … using errcode =
// '42501'` (a forma da migration da `73`).
process.env.TZ = 'UTC'

import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type Cenario, type RespostaRpcReal } from '@/test/clientReal'
import { movimento } from '@/test/movimento'
import { resumo } from '@/test/resumo'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_MOVIMENTO = '/rest/v1/rpc/store_movement'
const RPC_RESUMO = '/rest/v1/rpc/store_overview'
const ROLES = '/rest/v1/user_roles'

const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'permission denied for function store_overview' },
}
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'internal error' } }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const andarEmPassos = async (ms: number) => {
  for (let feito = 0; feito < ms; feito += 50) await andar(Math.min(50, ms - feito))
}

const abrir = async (rpc: Cenario['rpc']) => {
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc })
  window.history.pushState({}, '', '/')
  render(<App />)
  await andarEmPassos(1000)
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

const topo = () => screen.queryByRole('region', { name: 'Movimento da loja' })

describe('a Início sobre o client real', () => {
  it('par: as duas RPCs respondem 200 e a tela desenha os números', async () => {
    const r = await abrir({ store_movement: { status: 200, corpo: movimento() }, store_overview: { status: 200, corpo: resumo() } })
    expect(screen.getByRole('group', { name: /^Faturamento, hoje, R\$\s1\.077$/ })).toBeInTheDocument()
    expect(r.quantos(RPC_MOVIMENTO)).toBe(1)
    expect(r.quantos(RPC_RESUMO)).toBe(1)
  })

  it('403 `42501` com o papel já tirado na reconferência ⇒ o Login com SEM_ACESSO e nenhum número', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { store_movement: RECUSA_403, store_overview: { status: 200, corpo: resumo() } },
    })
    window.history.pushState({}, '', '/')
    render(<App />)
    // A abertura conferiu `admin`; a partir daqui a próxima consulta do papel diz "sem papel".
    for (let i = 0; i < 40 && r.quantos(RPC_MOVIMENTO) === 0; i++) await andar(50)
    r.estado.papel = 'not-admin'
    await andarEmPassos(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.quantos(RPC_MOVIMENTO)).toBe(1)
    expect(document.body.textContent).not.toMatch(/R\$\s?\d|Precisa de você|Últimos pedidos/)
  })

  it.each([
    ['500', ERRO_500],
    ['falha de rede', 'rede' as const],
  ])('%s no movimento ⇒ a falha do bloco, NUNCA a recusa — e o papel não é reconferido', async (_nome, resposta) => {
    const r = await abrir({ store_movement: resposta, store_overview: { status: 200, corpo: resumo() } })
    await andarEmPassos(3000) // a única repetição da falha que não é recusa
    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(within(topo()!).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(RPC_MOVIMENTO)).toBe(2)
    expect(r.quantos(ROLES)).toBe(1)
    // Os blocos do resumo seguem com os números deles.
    expect(document.querySelector('[data-bloco="aguardando"]')?.textContent).toContain('3')
  })
})
