// Feature 61 · `ANL-10`/`ANL-11` — a leitura do último envio e das contagens de fora.
//
// O dublê do client REGISTRA cada chamada da cadeia do PostgREST (`L`: dublê que não enxerga o
// filtro torna o filtro inauditável). As réguas:
// - as duas contagens são `count: 'exact', head: true` — nenhuma linha atravessa a rede;
// - cada uma filtra o SEU status e a janela de 30 dias por `paid_at`;
// - o último envio é o `sent` mais recente por `ga_purchase_at`, uma linha só.

import { beforeEach, describe, expect, it, vi } from 'vitest'

type Chamada = { tabela: string; passos: Array<[string, unknown[]]> }

const registro = vi.hoisted(() => ({
  chamadas: [] as Array<{ tabela: string; passos: Array<[string, unknown[]]> }>,
  ultima: { data: null as unknown, error: null as unknown },
  contagens: { skipped_declined: 0, failed: 0 } as Record<string, number>,
  erroContagem: null as unknown,
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => {
      const chamada: Chamada = { tabela, passos: [] }
      registro.chamadas.push(chamada)
      const statusDe = () =>
        chamada.passos.find(([m, a]) => m === 'eq' && a[0] === 'ga_purchase_status')?.[1][1] as string
      const builder: Record<string, unknown> = {}
      for (const metodo of ['select', 'eq', 'gte', 'order', 'limit']) {
        builder[metodo] = (...args: unknown[]) => {
          chamada.passos.push([metodo, args])
          return builder
        }
      }
      builder.maybeSingle = async () => {
        chamada.passos.push(['maybeSingle', []])
        return registro.ultima
      }
      // A contagem é `await` direto no builder (thenable).
      builder.then = (resolve: (v: unknown) => void) =>
        resolve({
          count: registro.contagens[statusDe()] ?? 0,
          error: registro.erroContagem,
        })
      return builder
    },
  },
}))

import {
  PURCHASE_SEND_WINDOW_DAYS,
  fetchPurchaseSendSummary,
  windowStart,
} from '../useLastPurchaseSend'

const AGORA = new Date('2026-10-05T15:00:00.000Z')

beforeEach(() => {
  registro.chamadas = []
  registro.ultima = { data: null, error: null }
  registro.contagens = { skipped_declined: 0, failed: 0 }
  registro.erroContagem = null
})

const contagemDe = (status: string) =>
  registro.chamadas.find(c =>
    c.passos.some(([m, a]) => m === 'eq' && a[0] === 'ga_purchase_status' && a[1] === status),
  )!

describe('a janela de 30 dias', () => {
  it('começa exatamente 30 dias antes de agora', () => {
    expect(PURCHASE_SEND_WINDOW_DAYS).toBe(30)
    expect(windowStart(AGORA)).toBe('2026-09-05T15:00:00.000Z')
  })
})

describe('as contagens — `head: true`, sem trazer linhas (ANL-10)', () => {
  it.each([['skipped_declined'], ['failed']])('%s: conta pelo servidor, na janela, por `paid_at`', async status => {
    await fetchPurchaseSendSummary(AGORA)
    const c = contagemDe(status)
    expect(c.tabela).toBe('orders')
    expect(c.passos).toContainEqual(['select', ['id', { count: 'exact', head: true }]])
    expect(c.passos).toContainEqual(['gte', ['paid_at', '2026-09-05T15:00:00.000Z']])
    // Nenhuma leitura de linha nesta cadeia.
    expect(c.passos.some(([m]) => m === 'maybeSingle' || m === 'limit')).toBe(false)
  })

  it('devolve as duas contagens nos campos certos — recusa não vira falha', async () => {
    registro.contagens = { skipped_declined: 3, failed: 1 }
    const r = await fetchPurchaseSendSummary(AGORA)
    expect(r.declined).toBe(3)
    expect(r.failed).toBe(1)
  })

  it('erro de contagem é erro — nunca um zero', async () => {
    registro.erroContagem = new Error('fora do ar')
    await expect(fetchPurchaseSendSummary(AGORA)).rejects.toThrow('fora do ar')
  })
})

describe('o último envio', () => {
  it('é o `sent` mais recente por `ga_purchase_at`, uma linha só', async () => {
    await fetchPurchaseSendSummary(AGORA)
    const c = contagemDe('sent')
    expect(c.passos).toContainEqual(['select', ['id, order_number, total, ga_purchase_at']])
    expect(c.passos).toContainEqual(['order', ['ga_purchase_at', { ascending: false }]])
    expect(c.passos).toContainEqual(['limit', [1]])
    expect(c.passos.some(([m]) => m === 'maybeSingle')).toBe(true)
  })

  it('sem envio nenhum devolve `last: null` (ANL-11)', async () => {
    const r = await fetchPurchaseSendSummary(AGORA)
    expect(r.last).toBeNull()
  })

  it('com envio, devolve o pedido com o total como número', async () => {
    registro.ultima = {
      data: { id: 'o1', order_number: '0244', total: '389.90', ga_purchase_at: '2026-10-05T14:32:00Z' },
      error: null,
    }
    const r = await fetchPurchaseSendSummary(AGORA)
    expect(r.last).toEqual({
      id: 'o1',
      order_number: '0244',
      total: 389.9,
      ga_purchase_at: '2026-10-05T14:32:00Z',
    })
  })

  it('erro na leitura do último envio é erro', async () => {
    registro.ultima = { data: null, error: new Error('quebrou') }
    await expect(fetchPurchaseSendSummary(AGORA)).rejects.toThrow('quebrou')
  })
})
