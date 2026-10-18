import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CategoryFiltersPanel, { SHEET_VALUES_PREVIEW } from '../CategoryFiltersPanel'
import { defaultFilters, type FilterBlock } from '../../model/filters'

// FLT-27 no LIMITE. A suíte da página prova "Ver todos (10)" com 10 valores; a verificação
// independente (rodada 3, 2026-10-18) mostrou que trocar "mais de 8" por "8 ou mais" sobrevivia —
// e aí um grupo de exatamente 8 mostraria um "Ver todos (8)" que não abre nada novo.

const bloco = (n: number): FilterBlock => ({
  group: { id: 'g', name: 'Letra', slug: 'letra', is_active: true, sort_order: 0 },
  values: Array.from({ length: n }, (_, i) => ({
    value: { id: `v${i}`, group_id: 'g', name: `L${i}`, slug: `l${i}`, sort_order: i },
    count: 1,
    selected: false,
    disabled: false,
  })),
})

const montar = (n: number) =>
  render(
    <CategoryFiltersPanel
      surface="sheet"
      filters={defaultFilters([0, 100])}
      onChange={() => {}}
      bounds={[0, 100]}
      blocks={[bloco(n)]}
    />,
  )

describe('"Ver todos" no limite de 8 (FLT-27)', () => {
  it('o limite é 8', () => {
    expect(SHEET_VALUES_PREVIEW).toBe(8)
  })

  it('com exatamente 8 valores, os 8 aparecem e não há "Ver todos"', () => {
    montar(8)
    const secao = screen.getByRole('region', { name: 'Letra' })
    expect(within(secao).getAllByRole('button', { name: /^L\d/ })).toHaveLength(8)
    expect(within(secao).queryByRole('button', { name: /Ver todos/ })).not.toBeInTheDocument()
  })

  it('com 9 valores, aparecem 8 e "Ver todos (9)"', () => {
    montar(9)
    const secao = screen.getByRole('region', { name: 'Letra' })
    expect(within(secao).getAllByRole('button', { name: /^L\d/ })).toHaveLength(8)
    expect(within(secao).getByRole('button', { name: 'Ver todos (9)' })).toBeInTheDocument()
  })
})
