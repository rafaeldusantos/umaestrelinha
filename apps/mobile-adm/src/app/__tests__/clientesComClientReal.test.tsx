// Feature `76` · T29 · `MAC-11`, `MAC-12`, `MAC-22`, `MAC-37`, `MAC-38` — a lista, a ficha e o "Ver cliente"
// sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): só o `fetch` e o storage são
// nossos. Molde de `pedidosComClientReal.test.tsx` (feature `74`).
//
// O cenário que a feature existe para impedir: a RLS de `customers` e de `orders` devolve a uma conta SEM
// papel admin as linhas DELA como cliente, sem erro nenhum. Aqui `customer_list`, `customer_directory` e
// `order_list` respondem com as linhas de uma cliente comum, e só a recusa de `atelie_clock` (403
// `42501`) as barra. A conta abre com o papel conferido e o perde antes da leitura — o único caminho em
// que a página monta (sem papel na abertura, o `RequireAdmin` nem a deixa montar).
//
// "Em nenhum instante observado": o DOM é lido a cada passo de 50 ms do relógio falso, do primeiro render
// até a recusa assumir.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { cliente, fichaDeCliente, pedidoDaFicha } from '@/test/clientes'
import { detalhe, item } from '@/test/pedidos'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DA_LISTA } from '@/entities/customer'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_RELOGIO = '/rest/v1/rpc/atelie_clock'
const CUSTOMER_LIST = '/rest/v1/customer_list'
const CUSTOMER_DIRECTORY = '/rest/v1/customer_directory'
const ORDER_LIST = '/rest/v1/order_list'
const ROLES = '/rest/v1/user_roles'

const ID_DELA = '00000000-0000-4000-c076-000000000777'
const ID_DO_PEDIDO = '00000000-0000-4000-8000-000000000777'
/** Textos que só existem nas linhas DA CLIENTE — nenhum deles pode chegar ao DOM sem o papel. */
const NOME_DELA = 'Clarice Sem Papel'
const EMAIL_DELA = 'clarice.sem.papel@exemplo.invalid'
const PECA_DELA = 'Anel memória da avó'
const DELA = new RegExp(`${NOME_DELA}|${EMAIL_DELA.replace(/\./g, '\\.')}|98888.?7777|${PECA_DELA}`)

const LINHA_DELA = cliente({ id: ID_DELA, name: NOME_DELA, email: EMAIL_DELA, phone: '51988887777' })
const FICHA_DELA = fichaDeCliente({ id: ID_DELA, name: NOME_DELA, email: EMAIL_DELA, phone: '51988887777' })
const PEDIDO_DELA = pedidoDaFicha({ id: ID_DO_PEDIDO, order_number: '0777', item: PECA_DELA })

const ok = (corpo: unknown): RespostaRpcReal => ({ status: 200, corpo })
const RECUSA_403: RespostaRpcReal = {
  status: 403,
  corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' },
}
const RELOGIO_OK: RespostaRpcReal = ok({ lido_em: '2026-10-23T14:30:00.123456+00:00' })
const ERRO_500: RespostaRpcReal = { status: 500, corpo: { code: 'XX000', details: null, hint: null, message: 'boom' } }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

type Dados = { clientes: RespostaRpcReal; pedidos: RespostaRpcReal; diretorio: RespostaRpcReal }
const COM_AS_LINHAS: Dados = {
  clientes: ok([LINHA_DELA]),
  pedidos: ok([PEDIDO_DELA]),
  diretorio: ok([{ id: ID_DELA }]),
}
const TUDO_EM_500: Dados = { clientes: ERRO_500, pedidos: ERRO_500, diretorio: ERRO_500 }

/** As tabelas que as três rotas leem. `customer_list` serve a lista (array) e a ficha (`maybeSingle`, array de uma). */
const tabelasDa = (rota: string, d: Dados): Record<string, RespostaRpcReal> => ({
  customer_list: d.clientes === COM_AS_LINHAS.clientes && rota !== '/clientes' ? ok([FICHA_DELA]) : d.clientes,
  order_list: rota.startsWith('/pedidos/') ? ok([detalhe({ id: ID_DO_PEDIDO, customer_name: 'Outra Pessoa', customer_email: EMAIL_DELA })]) : d.pedidos,
  customer_directory: d.diretorio,
  order_items: ok([{ ...item({ product_name: PECA_DELA }), order_id: ID_DO_PEDIDO }]),
})

const ROTAS = [
  ['/clientes', 'a lista'],
  [`/clientes/${ID_DELA}`, 'a ficha'],
] as const

/**
 * Abre a rota com o papel conferido; quando a primeira confirmação de papel sai, a conta PERDE o papel
 * (a próxima consulta de `user_roles` diz "sem papel"). Devolve cada instante observado do `body`.
 */
const abrirEPerderOPapel = async (rota: string, relogio: RespostaRpcReal, dados: Dados) => {
  const r = real.criar({
    sessao: 'valida',
    papel: 'admin',
    cadastro: 'ok',
    rpc: { atelie_clock: relogio },
    tabelas: tabelasDa(rota, dados),
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

describe.each(ROTAS)('%s (%s) sobre o client real', (rota) => {
  it('par: com o papel e a RPC em 200, as linhas DELA aparecem — a régua "nenhum texto dela" tem alvo', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RELOGIO_OK },
      tabelas: tabelasDa(rota, COM_AS_LINHAS),
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let i = 0; i < 40 && !screen.queryAllByText(new RegExp(NOME_DELA)).length; i++) await andar(50)
    expect(screen.getAllByText(new RegExp(NOME_DELA)).length).toBeGreaterThan(0)
    expect(r.quantos(RPC_RELOGIO)).toBeGreaterThan(0)
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
    if (rota !== '/clientes') {
      // A ficha lê também os pedidos DELA, e o nome da peça só existe neles.
      for (let i = 0; i < 40 && !document.body.textContent?.includes(PECA_DELA); i++) await andar(50)
      expect(document.body.textContent).toContain(PECA_DELA)
      expect(r.quantos(ORDER_LIST)).toBeGreaterThan(0)
    }
  })

  it('RPC 403 `42501` + as linhas DELA do outro lado ⇒ a recusa da `72`, e nenhum texto dela em instante nenhum', async () => {
    const { r, instantes } = await abrirEPerderOPapel(rota, RECUSA_403, COM_AS_LINHAS)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    // As linhas existiam do outro lado e a consulta saiu: é a recusa que as barra.
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
    expect(instantes.length).toBeGreaterThan(60)
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })

  it('RPC 403 `42501` + as consultas em 500 ⇒ AINDA a recusa (a recusa vence a falha da consulta, E2)', async () => {
    const { instantes } = await abrirEPerderOPapel(rota, RECUSA_403, TUDO_EM_500)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })

  it('RPC com a rede caída ⇒ falha de leitura, NUNCA a recusa, e o papel não é reconferido', async () => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: 'rede' },
      tabelas: tabelasDa(rota, COM_AS_LINHAS),
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
    // A lista diz a frase dela; a ficha, a do bloco.
    expect(screen.getAllByText(rota === '/clientes' ? FALHA_DA_LISTA : FALHA_DE_LEITURA).length).toBeGreaterThan(0)
    expect(r.quantos(ROLES)).toBe(1)
    // A RPC não confirmou: as linhas que a consulta trouxe também não saem.
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })
})

describe('a ficha aberta cujo papel cai (MAC-37)', () => {
  it('a releitura volta `42501` ⇒ a recusa assume e a ficha NÃO fica desenhada, nem a do cache', async () => {
    const rota = `/clientes/${ID_DELA}`
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RELOGIO_OK },
      tabelas: tabelasDa(rota, COM_AS_LINHAS),
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let i = 0; i < 40 && !document.body.textContent?.includes(PECA_DELA); i++) await andar(50)
    expect(document.body.textContent).toContain(NOME_DELA)
    expect(document.body.textContent).toContain(PECA_DELA)

    // O papel cai: a próxima confirmação recusa, e a conferência do papel também.
    r.estado.rpc.atelie_clock = RECUSA_403
    r.estado.papel = 'not-admin'
    const instantes: string[] = []
    r.voltarAba()
    document.dispatchEvent(new Event('visibilitychange'))
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
    expect(r.quantos(RPC_RELOGIO)).toBeGreaterThan(1)
  })
})

describe('"Ver cliente" no detalhe do pedido (MAC-11, MAC-22)', () => {
  const rota = `/pedidos/${ID_DO_PEDIDO}`
  const abrirOPedido = async (relogioDepois: RespostaRpcReal, diretorio: RespostaRpcReal) => {
    const r = real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: RELOGIO_OK },
      tabelas: tabelasDa(rota, { ...COM_AS_LINHAS, diretorio }),
    })
    window.history.pushState({}, '', rota)
    render(<App />)
    for (let i = 0; i < 40 && !screen.queryByRole('button', { name: 'Ver cliente' }); i++) await andar(50)
    expect(screen.getByRole('button', { name: 'Ver cliente' })).toBeInTheDocument()
    r.estado.rpc.atelie_clock = relogioDepois
    return r
  }

  it('par: com a RPC em 200 a ficha dela abre pelo e-mail do pedido', async () => {
    const r = await abrirOPedido(RELOGIO_OK, ok([{ id: ID_DELA }]))
    fireEvent.click(screen.getByRole('button', { name: 'Ver cliente' }))
    for (let i = 0; i < 40 && window.location.pathname !== `/clientes/${ID_DELA}`; i++) await andar(50)
    expect(window.location.pathname).toBe(`/clientes/${ID_DELA}`)
    expect(r.quantos(CUSTOMER_DIRECTORY)).toBe(1)
  })

  it('a leitura do diretório devolve `42501` com a linha DELA do outro lado ⇒ a recusa assume e a ficha nunca abre', async () => {
    const r = await abrirOPedido(RECUSA_403, ok([{ id: ID_DELA }]))
    r.estado.papel = 'not-admin'
    const caminhos: string[] = []
    const instantes: string[] = []
    fireEvent.click(screen.getByRole('button', { name: 'Ver cliente' }))
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      caminhos.push(window.location.pathname)
      instantes.push(document.body.textContent ?? '')
    }
    expect(r.quantos(CUSTOMER_DIRECTORY)).toBeGreaterThan(0)
    expect(caminhos.some((c) => c.startsWith('/clientes'))).toBe(false)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes(NOME_DELA))).toBe(-1)
  })

  it('a leitura do diretório sem rede ⇒ "Não consegui abrir agora", nunca a recusa', async () => {
    const r = await abrirOPedido('rede', ok([{ id: ID_DELA }]))
    fireEvent.click(screen.getByRole('button', { name: 'Ver cliente' }))
    for (let feito = 0; feito < 2000; feito += 50) await andar(50)
    expect(window.location.pathname).toBe(rota)
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui abrir agora')
    expect(r.quantos(ROLES)).toBe(1)
  })
})
