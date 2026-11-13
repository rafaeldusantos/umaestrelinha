// A porta única das marcações (`setProductsCampaign`), sobre o dublê que ENXERGA a consulta: o
// upsert com a chave de conflito, o tirar com o recorte da campanha, os lotes, o efeito conferido, e
// a recusa do banco na frase da tela.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const h = vi.hoisted(() => ({
  responder: (() => ({ data: [] })) as (r: unknown) => unknown,
  calls: [] as unknown[],
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble(r => h.responder(r) as Resposta)
  h.calls = duble.calls
  return { supabase: { from: duble.from } }
})

import { MARKING_CHUNK, setProductsCampaign } from '../api/campaignWrite'

const regs = () => h.calls as Registro[]

/** Responde à escrita com uma linha por peça do lote. */
const ecoa = (r: unknown) => {
  const reg = r as Registro
  const rows = reg.upsert ? (reg.upsert.rows as unknown[]) : ((reg.filters.find(f => f.method === 'in')?.args[1] as unknown[]) ?? [])
  return { data: rows.map(() => ({ product_id: 'p' })) }
}

beforeEach(() => {
  h.calls.length = 0
  h.responder = ecoa
})

describe('setProductsCampaign — pôr na campanha', () => {
  it('grava por upsert, com a chave (peça, campanha), e confere o efeito', async () => {
    const n = await setProductsCampaign(['p1', 'p2', 'p1'], 'bf', 15)
    expect(n).toBe(2)
    expect(regs()).toHaveLength(1)
    expect(regs()[0].table).toBe('product_campaigns')
    expect(regs()[0].upsert).toEqual({
      rows: [
        { product_id: 'p1', campaign_id: 'bf', percent: 15 },
        { product_id: 'p2', campaign_id: 'bf', percent: 15 },
      ],
      options: { onConflict: 'product_id,campaign_id' },
    })
    expect(regs()[0].select).toEqual(['product_id'])
  })

  it(`muitas peças vão em lotes de ${MARKING_CHUNK}`, async () => {
    const ids = Array.from({ length: MARKING_CHUNK * 2 + 1 }, (_, i) => `p${i}`)
    expect(await setProductsCampaign(ids, 'bf', 10)).toBe(ids.length)
    expect(regs().map(r => (r.upsert!.rows as unknown[]).length)).toEqual([MARKING_CHUNK, MARKING_CHUNK, 1])
  })

  it('percentual que não é da campanha: o 23503 do banco vira a frase', async () => {
    h.responder = () => ({ data: null, error: { code: '23503', message: 'violates foreign key constraint' } })
    await expect(setProductsCampaign(['p1'], 'bf', 40)).rejects.toThrow('40% não é um percentual desta campanha.')
  })
})

describe('setProductsCampaign — tirar da campanha', () => {
  it('percentual nulo apaga só a marcação daquela campanha, das peças pedidas', async () => {
    expect(await setProductsCampaign(['p1', 'p2'], 'bf', null)).toBe(2)
    expect(regs()).toHaveLength(1)
    expect(regs()[0].delete).toBe(true)
    expect(regs()[0].upsert).toBeUndefined()
    expect(regs()[0].filters).toEqual([
      { method: 'eq', args: ['campaign_id', 'bf'] },
      { method: 'in', args: ['product_id', ['p1', 'p2']] },
    ])
    expect(regs()[0].select).toEqual(['product_id'])
  })
})
