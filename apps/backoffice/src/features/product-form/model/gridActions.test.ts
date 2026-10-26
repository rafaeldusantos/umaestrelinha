import { describe, expect, it } from 'vitest'
import {
  applyBulk,
  fillColumn,
  generateSkus,
} from './gridActions'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// PFM-08 AC 9, 10 e 14: ações em massa só nas selecionadas e Preencher coluna nos 4 modos.
// O "Regerar do cruzamento" (AC 6) saiu na feature 81 (OPV-10): a grade acompanha as opções
// sozinha, e o que importava daqueles casos — `toKeep` pelo objeto original, órfã nunca apagada às
// cegas — é provado em `gridSync.test.ts`.

const options: ProductOption[] = [
  { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 },
  { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
]

const variant = (id: string, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

/** A grade 2 × 2 completa. */
const grid = (): ProductVariant[] => [
  variant('v-35-fos', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' }, price: 4.9 }),
  variant('v-35-bri', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Brilhante' }, price: 5.4 }),
  variant('v-45-fos', { option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' }, price: null }),
  variant('v-45-bri', { option_values: { Tamanho: '4,5 cm', Acabamento: 'Brilhante' }, price: null }),
]

describe('applyBulk — só as linhas selecionadas (AC 9)', () => {
  it('aplica o patch nas selecionadas e não toca nas outras', () => {
    const next = applyBulk(grid(), ['v-35-fos', 'v-45-fos'], { price: 9.9 })

    expect(next.map(v => v.price)).toEqual([9.9, 5.4, 9.9, null])
  })

  it('seleção vazia não altera NADA — não é "aplicar a todas"', () => {
    const before = grid()
    expect(applyBulk(before, [], { price: 9.9 })).toEqual(before)
  })

  it('pausar em massa mexe só nas selecionadas', () => {
    const next = applyBulk(grid(), ['v-35-bri'], { is_active: false })
    expect(next.map(v => v.is_active)).toEqual([true, false, true, true])
  })

  it('definir estoque em massa idem', () => {
    const next = applyBulk(grid(), ['v-45-fos'], { stock: 0 })
    expect(next.map(v => v.stock)).toEqual([10, 10, 0, 10])
  })

  it('id selecionado que não existe na grade é ignorado, sem throw', () => {
    const before = grid()
    expect(applyBulk(before, ['fantasma'], { price: 1 })).toEqual(before)
  })
})

describe('generateSkus — AC 14', () => {
  it('gera no padrão PREFIXO-EIXO1-EIXO2 só nas selecionadas', () => {
    const next = generateSkus(grid(), ['v-45-bri'], 'botton-sailor-moon', options)

    expect(next.find(v => v.id === 'v-45-bri')!.sku).toBe('SLR-45-BRI')
    expect(next.find(v => v.id === 'v-35-fos')!.sku).toBeNull()
  })

  it('sobrescreve o SKU da linha selecionada — a ação é explícita, não "só se vazio"', () => {
    const next = generateSkus(
      [variant('v-a', { sku: 'ANTIGO' })],
      ['v-a'],
      'botton-sailor-moon',
      options,
    )
    expect(next[0].sku).toBe('SLR-45-FOS')
  })
})

describe('fillColumn — modo `all` e `empty` (AC 10)', () => {
  it('`all` aplica em todas as linhas', () => {
    const next = fillColumn({ variants: grid(), field: 'price', mode: 'all', value: 7.5 })
    expect(next.map(v => v.price)).toEqual([7.5, 7.5, 7.5, 7.5])
  })

  it('`empty` preenche SÓ as vazias e não atropela o que o admin digitou', () => {
    const next = fillColumn({ variants: grid(), field: 'price', mode: 'empty', value: 7.5 })
    expect(next.map(v => v.price)).toEqual([4.9, 5.4, 7.5, 7.5])
  })

  it('`empty` no estoque trata 0 como valor preenchido, não como vazio', () => {
    const next = fillColumn({
      variants: [variant('v-a', { stock: 0 })],
      field: 'stock',
      mode: 'empty',
      value: 50,
    })
    expect(next[0].stock).toBe(0)
  })

  it('estoque é arredondado para inteiro', () => {
    const next = fillColumn({ variants: [variant('v-a')], field: 'stock', mode: 'all', value: 7.6 })
    expect(next[0].stock).toBe(8)
  })

  it('com seleção, `all` vale só para as selecionadas', () => {
    const next = fillColumn({
      variants: grid(),
      field: 'price',
      mode: 'all',
      value: 7.5,
      selectedIds: ['v-35-fos'],
    })
    expect(next.map(v => v.price)).toEqual([7.5, 5.4, null, null])
  })
})

describe('fillColumn — modo `increase` (+N%)', () => {
  it('`+10%` arredonda a 2 casas — sem isto sai 6,490000000000001', () => {
    const next = fillColumn({
      variants: [variant('v-a', { price: 5.9 })],
      field: 'price',
      mode: 'increase',
      value: 10,
    })
    expect(next[0].price).toBe(6.49)
  })

  it('`+10%` NÃO toca em linha sem preço — 10% de nada não é 0', () => {
    const next = fillColumn({ variants: grid(), field: 'price', mode: 'increase', value: 10 })
    expect(next.map(v => v.price)).toEqual([5.39, 5.94, null, null])
  })

  it('percentual negativo desconta', () => {
    const next = fillColumn({
      variants: [variant('v-a', { price: 10 })],
      field: 'price',
      mode: 'increase',
      value: -20,
    })
    expect(next[0].price).toBe(8)
  })
})

describe('fillColumn — modo `copyGroup` (AC 10)', () => {
  it('copia o valor do grupo de origem casando os OUTROS eixos', () => {
    const next = fillColumn({
      variants: grid(),
      field: 'price',
      mode: 'copyGroup',
      sourceGroup: '3,5 cm',
      options,
    })

    // Fosco do 4,5 recebe o Fosco do 3,5 (4,90); Brilhante recebe o Brilhante (5,40).
    expect(next.find(v => v.id === 'v-45-fos')!.price).toBe(4.9)
    expect(next.find(v => v.id === 'v-45-bri')!.price).toBe(5.4)
  })

  it('o grupo de ORIGEM não é alterado', () => {
    const next = fillColumn({
      variants: grid(),
      field: 'price',
      mode: 'copyGroup',
      sourceGroup: '3,5 cm',
      options,
    })
    expect(next.find(v => v.id === 'v-35-fos')!.price).toBe(4.9)
  })

  it('combinação sem par na origem fica intacta', () => {
    const variants = [
      variant('v-35-fos', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' }, price: 4.9 }),
      variant('v-45-esp', {
        option_values: { Tamanho: '4,5 cm', Acabamento: 'Especial' },
        price: null,
      }),
    ]
    const next = fillColumn({
      variants,
      field: 'price',
      mode: 'copyGroup',
      sourceGroup: '3,5 cm',
      options,
    })
    expect(next[1].price).toBeNull()
  })

  it('sem eixos declarados, copiar de grupo não faz nada', () => {
    const before = grid()
    expect(
      fillColumn({ variants: before, field: 'price', mode: 'copyGroup', sourceGroup: 'x', options: [] }),
    ).toEqual(before)
  })
})
