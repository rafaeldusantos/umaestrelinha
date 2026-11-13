import { describe, expect, it } from 'vitest'
import { defaultQuery, emptyFilters } from '@/entities/product/api/productQuery'
import { campaignProductsHref } from '@/entities/campaign'
import { readSavedViews } from '../savedViews'
import { buildChips } from '../filterChips'
import { productQueryFromParams, productQueryToParams } from '../queryUrl'

// O filtro da lista de produtos pela campanha de desconto: a URL, o chip e a visão salva.

const storage = (valor: unknown): Storage => {
  const raw = JSON.stringify(valor)
  return { getItem: () => raw } as unknown as Storage
}

const daUrl = (href: string) => productQueryFromParams(new URL(href, 'https://painel.exemplo').searchParams)

describe('a campanha no endereço da lista', () => {
  it('o "Ver as peças" da campanha abre a lista recortada pela campanha', () => {
    expect(daUrl(campaignProductsHref('camp-1')).filters).toEqual({ ...emptyFilters(), campaignId: 'camp-1' })
  })

  it('o "Ver as peças" de um percentual abre recortada pela campanha e pelo percentual', () => {
    expect(daUrl(campaignProductsHref('camp-1', 15)).filters).toEqual({
      ...emptyFilters(), campaignId: 'camp-1', campaignPercent: 15,
    })
  })

  it('o recorte é escrito como `campanha` e `percentual`', () => {
    const p = productQueryToParams({ ...defaultQuery(), filters: { ...emptyFilters(), campaignId: 'camp-1', campaignPercent: 20 } })
    expect(p.toString()).toBe('campanha=camp-1&percentual=20')
  })

  it('percentual sem campanha não é escrito nem lido', () => {
    expect(productQueryToParams({ ...defaultQuery(), filters: { ...emptyFilters(), campaignPercent: 20 } }).toString()).toBe('')
    expect(daUrl('/admin/produtos?percentual=20').filters.campaignPercent).toBeNull()
  })

  it.each(['abc', '0', '-5', '15.5', ''])('percentual ilegível (%s) cai no "todos os percentuais"', valor => {
    const f = daUrl(`/admin/produtos?campanha=camp-1&percentual=${valor}`).filters
    expect(f.campaignId).toBe('camp-1')
    expect(f.campaignPercent).toBeNull()
  })
})

describe('o chip da campanha', () => {
  const nomes = { 'camp-1': 'Black Friday' }

  it('diz o nome da campanha, e o `x` tira a campanha e o percentual', () => {
    const filtros = { ...emptyFilters(), tags: ['prata'], campaignId: 'camp-1', campaignPercent: 15 }
    const chip = buildChips(filtros, {}, {}, nomes).find(c => c.key === 'campanha')!
    expect(chip.label).toBe('Campanha: Black Friday · 15%')
    expect(chip.clear(filtros)).toEqual({ ...filtros, campaignId: null, campaignPercent: null })
  })

  it('sem percentual, diz só a campanha', () => {
    const chip = buildChips({ ...emptyFilters(), campaignId: 'camp-1' }, {}, {}, nomes).find(c => c.key === 'campanha')!
    expect(chip.label).toBe('Campanha: Black Friday')
  })

  it('percentual sem campanha não vira chip', () => {
    expect(buildChips({ ...emptyFilters(), campaignPercent: 15 }, {}, {}, nomes)).toEqual([])
  })
})

describe('a visão salva e a campanha', () => {
  it('a visão salva antes da campanha abre sem o recorte, e o resto dela intacto', () => {
    const antiga = {
      id: 'v1', name: 'Prata',
      filters: { view: 'ativos', categoryIds: [], supplierIds: [], tags: ['prata'], priceMin: null, priceMax: null },
    }
    const [v] = readSavedViews(storage([antiga]))
    expect(v.filters).toEqual({ ...emptyFilters(), view: 'ativos', tags: ['prata'] })
  })

  it('a visão nova guarda a campanha e o percentual', () => {
    const nova = { id: 'v2', name: 'BF 15', filters: { ...emptyFilters(), campaignId: 'camp-1', campaignPercent: 15 } }
    const [v] = readSavedViews(storage([nova]))
    expect(v.filters.campaignId).toBe('camp-1')
    expect(v.filters.campaignPercent).toBe(15)
  })
})
