import { describe, expect, it } from 'vitest'
import { stockFact, type SummaryInput } from './summaryFacts'
import type { ProductVariant } from '@nanapin/supabase/types'

// O estoque do card Resumo. `Não controla` vem de BUG-20260802: com a política *Não controlar*
// marcada na aba Preços, o inspetor mostrava `0 un.` — esgotado, no único modo em que a loja nunca
// esgota. O caso "sem grade" entrou junto porque era a mesma linha devolvendo zero fixo.

const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v1',
  product_id: 'p1',
  option_values: {},
  name: null,
  sku: null,
  price: 1490,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const form = (over: Partial<SummaryInput> = {}): SummaryInput => ({
  price: 1490,
  cost_price: 0,
  options: [],
  variants: [],
  images: [],
  weight_kg: 0,
  stock_total: 0,
  stock_policy: 'track',
  ...over,
})

describe('stockFact — o estoque do Resumo', () => {
  it('com `Não controlar` diz `Não controla`, não `0 un.`', () => {
    expect(stockFact(form({ stock_policy: 'none', stock_total: 0 }))).toEqual({
      label: 'Estoque',
      value: 'Não controla',
    })
  })

  it('`Não controlar` vence a grade — nem a soma das linhas é saldo nesse modo', () => {
    const withGrid = form({
      stock_policy: 'none',
      options: [{ name: 'Tamanho', values: ['P'], position: 0 }],
      variants: [variant({ stock: 84 })],
    })

    expect(stockFact(withGrid).value).toBe('Não controla')
  })

  it('com grade vendável, soma as linhas ATIVAS e diz `somado`', () => {
    const withGrid = form({
      options: [{ name: 'Tamanho', values: ['P', 'M'], position: 0 }],
      variants: [
        variant({ id: 'v1', stock: 50 }),
        variant({ id: 'v2', stock: 34 }),
        variant({ id: 'v3', stock: 999, is_active: false }),
      ],
    })

    expect(stockFact(withGrid)).toEqual({ label: 'Estoque somado', value: '84 un.' })
  })

  it('sem grade, mostra o saldo do PRODUTO — não zero fixo', () => {
    expect(stockFact(form({ stock_total: 40 }))).toEqual({ label: 'Estoque', value: '40 un.' })
  })

  it('`Vender no negativo` continua mostrando o número: o saldo ainda existe', () => {
    expect(stockFact(form({ stock_policy: 'backorder', stock_total: 0 }))).toEqual({
      label: 'Estoque',
      value: '0 un.',
    })
  })

  it('eixo declarado sem linha vendável não é grade — o saldo é o do produto', () => {
    const noSellable = form({
      stock_total: 12,
      options: [{ name: 'Tamanho', values: ['P'], position: 0 }],
      variants: [variant({ price: null })],
    })

    expect(stockFact(noSellable)).toEqual({ label: 'Estoque', value: '12 un.' })
  })
})
