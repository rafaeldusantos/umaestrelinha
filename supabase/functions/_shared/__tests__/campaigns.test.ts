import { describe, expect, it } from 'vitest'

import { createFakeSupabase } from '../testing/fakes.ts'
import { liveCampaignMarks } from '../campaigns.ts'

// O leitor das functions: a campanha em vigência pelo relógio DA FUNCTION (nunca o do navegador) e
// a marcação de cada peça pedida. A vigência é decidida por `core/campaigns/live.ts`: início
// inclusivo, fim exclusivo, desligada nunca vale.

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  starts_at: '2026-11-27T03:00:00.000Z',
  ends_at: '2026-11-30T03:00:00.000Z',
  active: true,
}

const DENTRO = Date.parse('2026-11-28T12:00:00.000Z')
const ANTES = Date.parse('2026-11-27T02:59:59.999Z')
const NO_FIM = Date.parse('2026-11-30T03:00:00.000Z')

const cenario = (campanhas: unknown[] = [BLACK]) =>
  createFakeSupabase({
    lists: {
      campaigns: campanhas,
      product_campaigns: (eqs) =>
        eqs.some(([c, v]) => c === 'campaign_id' && v === 'camp-black')
          ? [
              { product_id: 'p-black', percent: 20 },
              { product_id: 'p-outra', percent: 30 },
            ]
          : [],
    },
  })

describe('liveCampaignMarks', () => {
  it('em vigência: a campanha e o percentual de cada peça marcada', async () => {
    const supabase = cenario()
    const r = await liveCampaignMarks(supabase.client, () => DENTRO, ['p-black', 'p-comum'])
    expect(r.error).toBeNull()
    expect(r.campaign).toEqual({ id: 'camp-black', name: 'Black Friday' })
    expect(r.percentOf.get('p-black')).toBe(20)
    expect(r.percentOf.has('p-comum')).toBe(false)
    const leitura = supabase.reads.find((l) => l.table === 'product_campaigns')
    expect(leitura?.in).toEqual([['product_id', ['p-black', 'p-comum']]])
  })

  it('antes do início e no instante do fim: nenhuma campanha, e as marcações nem são lidas', async () => {
    for (const agora of [ANTES, NO_FIM]) {
      const supabase = cenario()
      const r = await liveCampaignMarks(supabase.client, () => agora, ['p-black'])
      expect(r.campaign).toBeNull()
      expect(r.percentOf.size).toBe(0)
      expect(supabase.reads.some((l) => l.table === 'product_campaigns')).toBe(false)
    }
  })

  it('desligada nunca vale, mesmo dentro da janela', async () => {
    const r = await liveCampaignMarks(cenario([{ ...BLACK, active: false }]).client, () => DENTRO, ['p-black'])
    expect(r.campaign).toBeNull()
  })

  it('a leitura das campanhas falhando é erro, nunca "sem campanha"', async () => {
    const supabase = createFakeSupabase({ listErrorByTable: { campaigns: { message: 'fora do ar' } } })
    const r = await liveCampaignMarks(supabase.client, () => DENTRO, ['p-black'])
    expect(r.error).not.toBeNull()
  })

  it('sem peça pedida, nada é lido', async () => {
    const supabase = cenario()
    const r = await liveCampaignMarks(supabase.client, () => DENTRO, [])
    expect(r.campaign).toBeNull()
    expect(supabase.reads).toEqual([])
  })
})
