// Feature `74` · T12 — `lerComPapel` contra o supabase-js DE VERDADE (`MAP-37`, Success Criterion 3:
// "provado contra o supabase-js real, não por dublê"). Só o `fetch` é nosso: o `PostgrestClient` real
// monta a URL, lê o corpo do 403 e devolve `{ error }` com o código que o Postgres mandou.
//
// O client é criado aqui, e não pelo `clientReal.ts` do app: aquele arquivo é cópia deliberada do da
// loja (`clientRealPareado.test.ts`), e responder `order_list` não é assunto da loja.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyOrderSlice,
  buildOrderSearchCondition,
  cursorFilter,
  needsActionOrFilter,
} from '@estrelinha/core/orders'

import { ACCESS_DENIED_CODE } from '@estrelinha/core/hooks/useStoreOverview'

import { COLUNAS_DA_LISTA } from '../../model/linha'
import { lerComPapel } from '../lerComPapel'

/** A régua da vigia (`ehRecusaDePapel`, features/access-check): o código de recusa de `core`. */
const ehRecusaDePapel = (erro: unknown) => (erro as { code?: unknown } | null)?.code === ACCESS_DENIED_CODE

let cliente: SupabaseClient
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: new Proxy({}, { get: (_a, k) => {
    const v = (cliente as unknown as Record<string | symbol, unknown>)[k]
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(cliente) : v
  } }),
}))

type Resposta = { status: number; corpo: unknown } | 'rede' | { segurar: Promise<void>; status: number; corpo: unknown }
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA_403 = { status: 403, corpo: { code: '42501', message: 'acesso restrito ao painel', details: null, hint: null } }
const LINHAS = { status: 200, corpo: [{ id: 'pedido-dela' }] }

let pedidos: { caminho: string; busca: URLSearchParams; quando: number }[] = []
let relogio = 0

const montar = (respostas: Record<string, Resposta>) => {
  pedidos = []
  relogio = 0
  const fetchFalso = async (entrada: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(entrada))
    pedidos.push({ caminho: url.pathname, busca: url.searchParams, quando: relogio++ })
    const r = respostas[url.pathname]
    if (!r) throw new Error(`sem resposta para ${url.pathname}`)
    if (r === 'rede') throw new TypeError('Failed to fetch')
    if ('segurar' in r) await r.segurar
    return new Response(JSON.stringify(r.corpo), { status: r.status, headers: { 'content-type': 'application/json' } })
  }
  cliente = createClient('http://127.0.0.1:54441', 'chave-de-teste', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchFalso as typeof fetch },
  })
}

const lista = () => async () => {
  const { data, error } = await cliente.from('order_list').select(COLUNAS_DA_LISTA)
  if (error) throw error
  return data
}

beforeEach(() => montar({}))

describe('lerComPapel com o supabase-js real', () => {
  it('RPC 42501 (403) + order_list com as linhas DA CLIENTE ⇒ lança o 42501, e nenhuma linha sai', async () => {
    montar({ '/rest/v1/rpc/atelie_clock': RECUSA_403, '/rest/v1/order_list': LINHAS })
    let saiu: unknown = 'nada'
    const erro = await lerComPapel(lista()).then((r) => (saiu = r), (e: unknown) => e)
    expect((erro as { code: string }).code).toBe('42501')
    expect(ehRecusaDePapel(erro)).toBe(true)
    expect(saiu).toBe('nada')
    // E a consulta saiu mesmo (as linhas da cliente existiam do outro lado): é a recusa que as barra.
    expect(pedidos.map((p) => p.caminho).sort()).toEqual(['/rest/v1/order_list', '/rest/v1/rpc/atelie_clock'])
  })

  it('RPC 42501 + order_list com erro de rede ⇒ ainda 42501', async () => {
    // O PostgrestClient real REPETE um GET que falhou por rede, com recuo por `setTimeout`: o relógio
    // falso anda o tempo à mão (molde de `clientReal.ts`).
    vi.useFakeTimers()
    montar({ '/rest/v1/rpc/atelie_clock': RECUSA_403, '/rest/v1/order_list': 'rede' })
    const promessa = lerComPapel(lista()).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(120_000)
    vi.useRealTimers()
    const erro = await promessa
    expect(ehRecusaDePapel(erro)).toBe(true)
    expect(pedidos.filter((p) => p.caminho === '/rest/v1/order_list').length).toBeGreaterThan(0)
  })

  it('RPC com rede caída ⇒ erro SEM o código de recusa (falha de leitura, MAP-38)', async () => {
    montar({ '/rest/v1/rpc/atelie_clock': 'rede', '/rest/v1/order_list': LINHAS })
    const erro = (await lerComPapel(lista()).catch((e: unknown) => e)) as { code?: string; message: string }
    expect(ehRecusaDePapel(erro)).toBe(false)
    expect(erro.message).toContain('Failed to fetch')
  })

  it('RPC ok + order_list com 500 ⇒ o erro da consulta', async () => {
    montar({
      '/rest/v1/rpc/atelie_clock': { status: 200, corpo: { lido_em: LIDO_EM } },
      '/rest/v1/order_list': { status: 500, corpo: { code: 'XX000', message: 'boom', details: null, hint: null } },
    })
    const erro = (await lerComPapel(lista()).catch((e: unknown) => e)) as { code: string }
    expect(erro.code).toBe('XX000')
  })

  it('RPC ok ⇒ as linhas e o `lido_em` do banco, com a RPC chamada por POST sem corpo de argumento', async () => {
    montar({ '/rest/v1/rpc/atelie_clock': { status: 200, corpo: { lido_em: LIDO_EM } }, '/rest/v1/order_list': LINHAS })
    await expect(lerComPapel(lista())).resolves.toEqual({ resultado: LINHAS.corpo, lido_em: LIDO_EM })
  })

  it('as duas requisições saem ANTES de a RPC responder (paralelo de verdade, não em série)', async () => {
    let soltar = () => {}
    const segurar = new Promise<void>((r) => (soltar = r))
    montar({
      '/rest/v1/rpc/atelie_clock': { segurar, status: 200, corpo: { lido_em: LIDO_EM } },
      '/rest/v1/order_list': LINHAS,
    })
    const promessa = lerComPapel(lista())
    await vi.waitFor(() => expect(pedidos).toHaveLength(2))
    soltar()
    await expect(promessa).resolves.toMatchObject({ lido_em: LIDO_EM })
  })

  it('Q-T4: a cadeia de core vira, na URL do supabase-js, os TRÊS `or=` lado a lado que o probe 02 mediu', async () => {
    montar({ '/rest/v1/rpc/atelie_clock': { status: 200, corpo: { lido_em: LIDO_EM } }, '/rest/v1/order_list': { status: 200, corpo: [] } })
    const cursor = { created_at: '2026-10-05T23:34:12.017605+00:00', id: '00000000-0000-4000-8000-000000000001' }
    await lerComPapel(async () => {
      let q = cliente.from('order_list').select('id')
      q = applyOrderSlice(q, { visao: 'precisa-acao' })
      q = q.or(buildOrderSearchCondition('#0244') as string).or(cursorFilter(cursor, 'asc'))
      const { error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).limit(25)
      if (error) throw error
      return null
    })
    const busca = pedidos.find((p) => p.caminho === '/rest/v1/order_list')!.busca
    expect(busca.getAll('or')).toEqual([
      `(${needsActionOrFilter()})`,
      `(${buildOrderSearchCondition('0244')})`,
      `(${cursorFilter(cursor, 'asc')})`,
    ])
    expect(busca.get('order')).toBe('created_at.asc,id.asc')
    expect(busca.get('limit')).toBe('25')
  })
})
