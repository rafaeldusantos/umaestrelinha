import { vi } from 'vitest'

import type { OrderWriteClient, OrderWriteDeps } from '../types.ts'

/**
 * O dublê do client que **registra a cadeia inteira** — cada método, com os argumentos, na ordem —,
 * para as asserções compararem a cadeia por IGUALDADE (`L-060`). Um dublê que só devolvesse um valor
 * tornaria a guarda de status (`.eq('status', …)`, `.in('status', …)`) inauditável: trocá-la pelo
 * filtro errado deixaria a suíte verde (memória "dublê que não enxerga").
 *
 * `log` é a ordem global das idas ao banco e dos avisos — é com ele que se prova "o passo seguinte
 * não roda" (`L-050`).
 */

export type Passo = [string, ...unknown[]]

export interface Cadeia {
  tabela: string
  passos: Passo[]
}

export interface ChamadaRpc {
  fn: string
  args: unknown
}

/** O que a cadeia (ou a RPC) devolve ao ser aguardada. Lançar aqui = promessa REJEITADA. */
export type Responder = (c: Cadeia) => unknown
export type ResponderRpc = (c: ChamadaRpc) => unknown

export interface Duble {
  client: OrderWriteClient
  deps: OrderWriteDeps
  notify: ReturnType<typeof vi.fn>
  cadeias: Cadeia[]
  rpcs: ChamadaRpc[]
  log: string[]
  /** O que cada cadeia devolve. Padrão: `update` ⇒ uma linha; `insert` ⇒ sem erro. */
  responder: Responder
  responderRpc: ResponderRpc
  /** `from()` / `rpc()` lançando na hora — a exceção SÍNCRONA do client. */
  fromLancaSincrono: boolean
  rpcLancaSincrono: boolean
}

const METODOS = ['update', 'insert', 'upsert', 'delete', 'select', 'eq', 'neq', 'in', 'is', 'order', 'limit', 'single', 'maybeSingle']

export const UMA_LINHA = (id = 'ord-1') => ({ data: [{ id }], error: null })
export const ZERO_LINHAS = { data: [], error: null }
export const ERRO = { data: null, error: { message: 'erro do PostgREST' } }

export function criarDuble(): Duble {
  const d: Duble = {
    client: null as unknown as OrderWriteClient,
    deps: null as unknown as OrderWriteDeps,
    notify: vi.fn(),
    cadeias: [],
    rpcs: [],
    log: [],
    responder: (c) => {
      const primeiro = c.passos[0]?.[0]
      if (primeiro === 'update') return UMA_LINHA()
      return { data: null, error: null }
    },
    responderRpc: () => ({ data: { ok: true, status: 'material_recebido', reason: null }, error: null }),
    fromLancaSincrono: false,
    rpcLancaSincrono: false,
  }

  const builder = (cadeia: Cadeia) => {
    const b: Record<string, unknown> = {}
    for (const m of METODOS) {
      b[m] = (...args: unknown[]) => {
        cadeia.passos.push([m, ...args])
        return b
      }
    }
    b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      d.log.push(`${cadeia.passos[0]?.[0] ?? '?'} ${cadeia.tabela}`)
      let valor: unknown
      try {
        valor = d.responder(cadeia)
      } catch (e) {
        return Promise.reject(e).then(resolve, reject)
      }
      return Promise.resolve(valor).then(resolve, reject)
    }
    return b
  }

  d.notify.mockImplementation(async (orderId: string, trigger: string) => {
    d.log.push(`notify ${trigger}`)
    return true
  })

  d.client = {
    from: (tabela: string) => {
      if (d.fromLancaSincrono) throw new Error('from lançou')
      const cadeia: Cadeia = { tabela, passos: [] }
      d.cadeias.push(cadeia)
      return builder(cadeia)
    },
    rpc: (fn: string, args: unknown) => {
      if (d.rpcLancaSincrono) throw new Error('rpc lançou')
      const chamada = { fn, args }
      d.rpcs.push(chamada)
      d.log.push(`rpc ${fn}`)
      try {
        return Promise.resolve(d.responderRpc(chamada))
      } catch (e) {
        return Promise.reject(e)
      }
    },
    functions: { invoke: vi.fn() },
  } as unknown as OrderWriteClient

  d.deps = { client: d.client, notify: d.notify as unknown as OrderWriteDeps['notify'] }
  return d
}

/** As cadeias de uma tabela, só com os passos — para comparar por igualdade. */
export const passosDe = (d: Duble, tabela: string): Passo[][] =>
  d.cadeias.filter((c) => c.tabela === tabela).map((c) => c.passos)
