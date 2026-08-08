import { describe, expect, it } from 'vitest'
import {
  applyBulk,
  applyRegenerate,
  buildRegeneratePlan,
  fillColumn,
  generateSkus,
} from './gridActions'
import { isTempVariantId } from './persistProduct'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// PFM-08 AC 6, 9, 10 e 14: ações em massa só nas selecionadas, Preencher coluna nos 4 modos, e
// Regerar mostrando o diff antes de aplicar sem destruir o que já existia.

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

describe('buildRegeneratePlan — o diff ANTES de aplicar (AC 6)', () => {
  it('conta o que vai ser criado e o que vai ser removido, sem alterar nada', () => {
    const antes = [
      variant('v-35-fos', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' } }),
      variant('v-orfa', { option_values: { Tamanho: '9,9 cm', Acabamento: 'Fosco' } }),
    ]

    const plan = buildRegeneratePlan(antes, options)

    expect(plan.toCreate).toHaveLength(3)
    expect(plan.toRemove.map(v => v.id)).toEqual(['v-orfa'])
    expect(plan.toKeep.map(v => v.id)).toEqual(['v-35-fos'])
    // Nada foi mutado.
    expect(antes).toHaveLength(2)
  })

  it('`toKeep` devolve o OBJETO ORIGINAL — regerar não zera preço de quem já estava lá', () => {
    const existente = variant('v-35-fos', {
      option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' },
      price: 4.9,
      stock: 7,
      sku: 'SLR-35-FOS',
    })

    const plan = buildRegeneratePlan([existente], options)

    expect(plan.toKeep[0]).toBe(existente)
    expect(plan.toKeep[0].price).toBe(4.9)
  })

  it('reduzir de 2 eixos para 1: as 4 combinações antigas viram ÓRFÃS (edge case da spec)', () => {
    // A spec exige que "as variações do cruzamento antigo apareçam no diff como a remover, e
    // nenhuma suma sem o admin confirmar". Com um eixo só, nenhuma linha de 2 eixos sobrevive —
    // e as 2 combinações de 1 eixo passam a ser novas. As duas metades são verdade ao mesmo tempo.
    const plan = buildRegeneratePlan(grid(), [options[0]])

    expect(plan.toRemove).toHaveLength(4)
    expect(plan.toKeep).toEqual([])
    expect(plan.toCreate).toEqual([{ Tamanho: '3,5 cm' }, { Tamanho: '4,5 cm' }])
  })

  it('grade já completa não tem nada a criar nem a remover', () => {
    const plan = buildRegeneratePlan(grid(), options)
    expect(plan.toCreate).toEqual([])
    expect(plan.toRemove).toEqual([])
  })
})

describe('applyRegenerate', () => {
  it('linhas novas nascem SEM PREÇO e PAUSADAS — nenhuma entra na loja por acidente', () => {
    const next = applyRegenerate([], options, 'p1')

    expect(next).toHaveLength(4)
    next.forEach(v => {
      expect(v.price).toBeNull()
      expect(v.is_active).toBe(false)
      expect(isTempVariantId(v.id)).toBe(true)
    })
  })

  it('preserva as existentes com preço e estoque intactos', () => {
    const existente = variant('v-35-fos', {
      option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' },
      price: 4.9,
      stock: 7,
    })

    const next = applyRegenerate([existente], options, 'p1')

    const mantida = next.find(v => v.id === 'v-35-fos')!
    expect(mantida.price).toBe(4.9)
    expect(mantida.stock).toBe(7)
  })

  it('remove as órfãs por padrão', () => {
    const orfa = variant('v-orfa', { option_values: { Tamanho: '9,9 cm', Acabamento: 'Fosco' } })
    const next = applyRegenerate([orfa], options, 'p1')

    expect(next.some(v => v.id === 'v-orfa')).toBe(false)
  })

  it('com removeOrphans false, mantém as órfãs na grade', () => {
    const orfa = variant('v-orfa', { option_values: { Tamanho: '9,9 cm', Acabamento: 'Fosco' } })
    const next = applyRegenerate([orfa], options, 'p1', { removeOrphans: false })

    expect(next.some(v => v.id === 'v-orfa')).toBe(true)
  })

  it('a position das novas continua a das mantidas, sem colidir', () => {
    const existente = variant('v-35-fos', {
      option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' },
      position: 0,
    })
    const next = applyRegenerate([existente], options, 'p1')

    expect(new Set(next.map(v => v.position)).size).toBe(next.length)
  })

  it('sem eixos, regerar não cria nada — não existe cruzamento de zero eixos', () => {
    expect(applyRegenerate([], [], 'p1')).toEqual([])
  })
})
