import { describe, expect, it } from 'vitest'
import { emptyFilters } from '@/entities/product/api/productQuery'
import { readSavedViews } from '../savedViews'
import { buildChips } from '../filterChips'

// Feature 80 — FOR-18 (o chip) e FOR-19 (a visão salva antes do filtro existir).

const storage = (valor: unknown): Storage => {
  const raw = JSON.stringify(valor)
  return { getItem: () => raw } as unknown as Storage
}

describe('FOR-19 — visões salvas antes da feature 80', () => {
  it('a visão sem `supplierIds` abre com o filtro vazio, e o resto dela intacto', () => {
    const antiga = {
      id: 'v1', name: 'Anime barato',
      filters: { view: 'ativos', categoryIds: ['cat-anime'], tags: [], priceMin: null, priceMax: 20 },
    }
    const [v] = readSavedViews(storage([antiga]))
    expect(v.filters).toEqual({ ...emptyFilters(), view: 'ativos', categoryIds: ['cat-anime'], priceMax: 20 })
    expect(v.filters.supplierIds).toEqual([])
  })

  it('a visão nova guarda o fornecedor', () => {
    const nova = { id: 'v2', name: 'Do ateliê', filters: { ...emptyFilters(), supplierIds: ['atelie'] } }
    expect(readSavedViews(storage([nova]))[0].filters.supplierIds).toEqual(['atelie'])
  })
})

describe('FOR-18 — o chip do fornecedor', () => {
  it('diz o nome e o `x` tira só o fornecedor', () => {
    const filtros = { ...emptyFilters(), categoryIds: ['c1'], supplierIds: ['atelie'] }
    const chip = buildChips(filtros, { c1: 'Anime' }, { atelie: 'Ateliê Prata' }).find(c => c.key === 'forn-atelie')!
    expect(chip.label).toBe('Fornecedor: Ateliê Prata')
    expect(chip.clear(filtros)).toEqual({ ...filtros, supplierIds: [] })
  })

  it('filtro de visão antiga, sem o campo, não gera chip nem quebra', () => {
    const { supplierIds: _fora, ...semCampo } = emptyFilters()
    expect(buildChips(semCampo as never, {})).toEqual([])
  })
})
