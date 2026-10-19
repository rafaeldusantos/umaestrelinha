// Feature 67 (T05) — o pool da marcação traz o que a regra de sugestão e o "Hoje" leem.
//
// O dublê enxerga o `select`, a ordem e o `range` de cada página: é o que prova que as colunas novas
// vão de fato ao banco (o probe HTTP contra o banco local, como admin, conferiu a mesma string —
// `AD-012`), e que a leitura truncada falha em vez de virar um catálogo menor.

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, ehContagem, type Registro } from '@/test/dubleSupabase'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { PRODUCT_MARKING_COLUMNS, lerCatalogoParaMarcar, toProdutoParaMarcar } from '../useProductMarkingPool'

const linha = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Peça ${id}`,
  slug: id,
  is_active: true,
  base_price: 10,
  tags: [],
  product_categories: [],
  ...extra,
})

let total = 0
let pagina: unknown[] = []
let calls: Registro[] = []

beforeEach(() => {
  total = 2
  pagina = [linha('a'), linha('b')]
  const d = criarDuble(r => (ehContagem(r) ? { count: total } : { data: pagina }))
  calls = d.calls
  fromMock.mockReset().mockImplementation(d.from)
})

describe('as colunas da 67 vão ao banco', () => {
  it('a página pede o select inteiro, com os eixos, as variações, as duas marcações e a miniatura', async () => {
    await lerCatalogoParaMarcar()
    const paginaLida = calls.find(c => !ehContagem(c))!
    expect(paginaLida.table).toBe('products')
    expect(paginaLida.select).toEqual([PRODUCT_MARKING_COLUMNS])
    expect(PRODUCT_MARKING_COLUMNS).toBe(
      'id, name, slug, is_active, base_price, tags, product_categories(category_id), options, thumb:images->0->>url, ' +
        'product_variants(id, option_values, is_active, position), product_filter_values(value_id), ' +
        'product_option_filter_values(option_name, option_value, value_id)',
    )
    expect(paginaLida.filters).toEqual([
      { method: 'order', args: ['name'] },
      { method: 'order', args: ['id'] },
      { method: 'range', args: [0, 999] },
    ])
  })

  it('a leitura truncada FALHA (a contagem diz 3, a página traz 2)', async () => {
    total = 3
    await expect(lerCatalogoParaMarcar()).rejects.toThrow('leitura incompleta de catálogo de produtos: 2 de 3')
  })

  it('catálogo vazio não lê página nenhuma', async () => {
    total = 0
    expect(await lerCatalogoParaMarcar()).toEqual([])
    expect(calls).toHaveLength(1)
  })
})

describe('toProdutoParaMarcar — as colunas novas', () => {
  it('eixos na ordem de position, variações com option_values só de texto, e as duas marcações', () => {
    const p = toProdutoParaMarcar(
      linha('a', {
        thumb: 'https://x/1.webp',
        options: [
          { name: 'Letra', values: ['A', 'B'], position: 1 },
          { name: 'Cor', values: ['Prata 925', 7], position: 0 },
          { name: '', values: ['x'], position: 2 },
        ],
        product_variants: [
          { id: 'v1', option_values: { Cor: 'Prata 925', Letra: 'A', lixo: 3 }, is_active: true, position: 0 },
          { id: 'v2', option_values: null, is_active: false, position: 1 },
        ],
        product_filter_values: [{ value_id: 'prata' }, { value_id: 'prata' }, { value_id: null }],
        product_option_filter_values: [
          { option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' },
          { option_name: 'Cor', option_value: '', value_id: 'prata' },
        ],
      }),
    )
    expect(p.thumb).toBe('https://x/1.webp')
    expect(p.options).toEqual([
      { name: 'Cor', values: ['Prata 925'], position: 0 },
      { name: 'Letra', values: ['A', 'B'], position: 1 },
    ])
    expect(p.variants).toEqual([
      { id: 'v1', option_values: { Cor: 'Prata 925', Letra: 'A' }, is_active: true, position: 0 },
      { id: 'v2', option_values: {}, is_active: false, position: 1 },
    ])
    expect(p.filter_value_ids).toEqual(['prata'])
    expect(p.option_marks).toEqual([{ option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' }])
  })

  it('linha sem as colunas novas (cache antigo) vira listas vazias e miniatura nula', () => {
    const p = toProdutoParaMarcar(linha('a'))
    expect(p).toMatchObject({ thumb: null, options: [], variants: [], filter_value_ids: [], option_marks: [] })
  })
})
