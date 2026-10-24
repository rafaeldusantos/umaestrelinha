// Feature `74` · T29 · `MAP-36`, `MAP-37`, `MAP-38`, Success Criterion 3 — a lista e o detalhe sobre
// o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): só o `fetch` e o storage são nossos.
//
// O cenário que a feature existe para impedir: a RLS de `orders` devolve a uma conta SEM papel os
// pedidos DELA como cliente, sem erro nenhum (probe `03-cliente-sem-papel`). Aqui o `order_list`
// responde com as linhas dela, e só a recusa de `atelie_clock` (403 `42501`, a forma que o PostgREST
// manda para `raise … using errcode = '42501'`) as barra. A conta abre com o papel conferido e o perde
// antes da leitura — é o único caminho em que a página monta (sem papel na abertura, o `RequireAdmin`
// nem a deixa montar, e o teste não provaria `lerComPapel`).
//
// "Em nenhum instante observado": o DOM é lido a cada passo de 50 ms do relógio falso, do primeiro
// render até a recusa assumir.
process.env.TZ = 'UTC'

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { detalhe, item, linha } from '@/test/pedidos'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_RELOGIO = '/rest/v1/rpc/atelie_clock'
const ORDER_LIST = '/rest/v1/order_list'
const ROLES = '/rest/v1/user_roles'

const ID_DELA = '00000000-0000-4000-8000-000000000777'
/** Textos que só existem nas linhas DA CLIENTE — nenhum deles pode chegar ao DOM sem o papel. */
const NOME_DELA = 'Clarice Sem Papel'
const PECA_DELA = 'Anel memória da avó'
const DELA = new RegExp(`${NOME_DELA}|#0777|${PECA_DELA}`)

const LINHAS_DELA: RespostaRpcReal = {
  status: 200,
  corpo: [linha({ id: ID_DELA, order_number: '0777', customer_name: NOME_DELA })],
}
const DETALHE_DELA: RespostaRpcReal = {
  status: 200,
  corpo: [detalhe({ id: ID_DELA, order_number: '0777', customer_name: NOME_DELA })],
}
const ITENS_DELA: RespostaRpcReal = { status: 200, corpo: [item({ product_name: PECA_DELA })] }

const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const RELOGIO_OK: RespostaRpcReal = { status: 200, corpo: { lido_em: '2026-10-23T14:30:00.123456+00:00' } }
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'boom' } }

const ROTAS = [
  ['/pedidos', 'a lista'],
  [`/pedidos/${ID_DELA}`, 'o detalhe'],
] as const

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** As tabelas que as duas rotas leem, com as linhas dela; `order_list` pode ser trocada. */
const tabelas = (orderList: RespostaRpcReal, rota: string): Record<string, RespostaRpcReal> => ({
  order_list: rota === '/pedidos' ? orderList : orderList === LINHAS_DELA ? DETALHE_DELA : orderList,
  order_items: ITENS_DELA,
})

/**
 * Abre a rota com o papel conferido; quando a primeira confirmação de papel sai, a conta PERDE o papel
 * (a próxima consulta de `user_roles` diz "sem papel"). Devolve cada instante observado do `body`.
 */
const abrirEPerderOPapel = async (rota: string, relogio: RespostaRpcReal, orderList: RespostaRpcReal) => {
  const r = real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: relogio },
    tabelas: tabelas(orderList, rota),
  })
  window.history.pushState({}, '', rota)
  render(<App />)
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
  return { r, instantes }
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

describe.each(ROTAS)('%s (%s) sobre o client real', (rota) => {
  it('par: com o papel e a RPC em 200, as linhas DELA aparecem — a régua "nenhum texto dela" tem alvo', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RELOGIO_OK },
      tabelas: tabelas(LINHAS_DELA, rota),
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let i = 0; i < 40 && !screen.queryAllByText(new RegExp(NOME_DELA)).length; i++) await andar(50)
    expect(screen.getAllByText(new RegExp(NOME_DELA)).length).toBeGreaterThan(0)
    expect(document.body.textContent).toMatch(/#0777/)
    expect(r.quantos(RPC_RELOGIO)).toBeGreaterThan(0)
    expect(r.quantos(ORDER_LIST)).toBeGreaterThan(0)
  })

  it('RPC 403 `42501` + `order_list` com as linhas DELA ⇒ a recusa da `72`, e nenhuma linha em instante nenhum', async () => {
    const { r, instantes } = await abrirEPerderOPapel(rota, RECUSA_403, LINHAS_DELA)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // As linhas existiam do outro lado e a consulta saiu: é a recusa que as barra.
    expect(r.quantos(ORDER_LIST)).toBeGreaterThan(0)
    expect(instantes.length).toBeGreaterThan(60)
    const vazou = instantes.findIndex((t) => DELA.test(t))
    expect(vazou).toBe(-1)
  })

  it('RPC 403 `42501` + `order_list` em 500 ⇒ AINDA a recusa (a recusa vence a falha da consulta, E2)', async () => {
    const { instantes } = await abrirEPerderOPapel(rota, RECUSA_403, ERRO_500)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })

  it('RPC com a rede caída ⇒ falha de leitura, NUNCA a recusa, e o papel não é reconferido (MAP-38)', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: 'rede' },
      tabelas: tabelas(LINHAS_DELA, rota),
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    const instantes: string[] = []
    for (let feito = 0; feito < 5000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe(rota)
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(ROLES)).toBe(1)
    // A RPC não confirmou: as linhas que a consulta trouxe também não saem.
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })
})
