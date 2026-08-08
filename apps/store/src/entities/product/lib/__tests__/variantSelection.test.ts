import { describe, expect, it } from 'vitest'
import {
  availableValuesFor,
  canAddSelection,
  CARD_MAX_AXES,
  findVariant,
  hasSellableGrid,
  initialSelection,
  needsProductPage,
  orderedOptions,
  PAGE_MAX_AXES,
  visibleOptions,
  type GridProduct,
} from '../variantSelection'
import type { OptionValues, ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// PST-05: seletores gerados de `products.options` na ordem de `position` — até 3 na página, 2 no
// card (A7). PST-08: disponibilidade respeita `stock_policy`. PST-10: variação ativa com `options`
// vazio é produto sem variação.

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (
  option_values: OptionValues,
  overrides: Partial<ProductVariant> = {},
): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values,
  name: null,
  sku: null,
  price: 4.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const grid = (over: Partial<GridProduct> = {}): GridProduct => ({
  options: [option('Tamanho', ['3,5 cm', '4,5 cm'], 0), option('Acabamento', ['Fosco', 'Brilhante'], 1)],
  variants: [],
  stock_policy: 'track',
  ...over,
})

describe('orderedOptions / visibleOptions — ordem e teto de eixos (PST-05 AC 1-2)', () => {
  it('ordena por position, não pela ordem do array', () => {
    const ordered = orderedOptions([
      option('Acabamento', ['Fosco'], 2),
      option('Tamanho', ['4,5 cm'], 0),
      option('Cor', ['Rosa'], 1),
    ])
    expect(ordered.map(o => o.name)).toEqual(['Tamanho', 'Cor', 'Acabamento'])
  })

  it('eixo sem valores é descartado — seria um seletor vazio', () => {
    expect(orderedOptions([option('Tamanho', [], 0), option('Cor', ['Rosa'], 1)])).toHaveLength(1)
  })

  it('empate de position resolve por nome, para a ordem não trocar entre renders', () => {
    const ordered = orderedOptions([option('Pack', ['2 un'], 0), option('Cor', ['Rosa'], 0)])
    expect(ordered.map(o => o.name)).toEqual(['Cor', 'Pack'])
  })

  it('a página mostra até 3 eixos', () => {
    const options = [
      option('Tamanho', ['4,5 cm'], 0),
      option('Acabamento', ['Fosco'], 1),
      option('Cor', ['Rosa'], 2),
      option('Pack', ['2 un'], 3),
    ]
    expect(visibleOptions(options, PAGE_MAX_AXES).map(o => o.name)).toEqual([
      'Tamanho',
      'Acabamento',
      'Cor',
    ])
  })

  it('o card mostra 2 eixos — os dois primeiros por position', () => {
    const options = [
      option('Cor', ['Rosa'], 2),
      option('Tamanho', ['4,5 cm'], 0),
      option('Acabamento', ['Fosco'], 1),
    ]
    expect(visibleOptions(options, CARD_MAX_AXES).map(o => o.name)).toEqual([
      'Tamanho',
      'Acabamento',
    ])
  })

  it('com 3 eixos o card leva para a página do produto; com 2, não', () => {
    expect(
      needsProductPage([
        option('Tamanho', ['4,5 cm'], 0),
        option('Acabamento', ['Fosco'], 1),
        option('Cor', ['Rosa'], 2),
      ]),
    ).toBe(true)
    expect(
      needsProductPage([option('Tamanho', ['4,5 cm'], 0), option('Acabamento', ['Fosco'], 1)]),
    ).toBe(false)
  })
})

describe('hasSellableGrid — PST-10', () => {
  it('eixo + linha ativa com preço = vendido por variação', () => {
    expect(
      hasSellableGrid({ options: [option('Tamanho', ['4,5 cm'], 0)], variants: [variant({})] }),
    ).toBe(true)
  })

  it('variação ativa com options VAZIO é tratada como produto sem variação (PST-10)', () => {
    expect(hasSellableGrid({ options: [], variants: [variant({})] })).toBe(false)
  })

  it('eixo cadastrado mas grade toda pausada não é vendável por variação', () => {
    expect(
      hasSellableGrid({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { is_active: false })],
      }),
    ).toBe(false)
  })

  it('eixo cadastrado mas linha ativa SEM preço não é vendável — cair nela seria undercharge', () => {
    expect(
      hasSellableGrid({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { price: null })],
      }),
    ).toBe(false)
  })
})

describe('findVariant — a linha que casa com a escolha', () => {
  it('casa todos os eixos escolhidos', () => {
    const alvo = variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })
    const variants = [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }), alvo]
    expect(findVariant(variants, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })?.id).toBe(alvo.id)
  })

  it('combinação que não existe na grade devolve null, não a primeira linha', () => {
    const variants = [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' })]
    expect(findVariant(variants, { Tamanho: '5,5 cm', Acabamento: 'Fosco' })).toBeNull()
  })

  it('seleção vazia devolve null — sem escolha não há linha', () => {
    expect(findVariant([variant({ Tamanho: '4,5 cm' })], {})).toBeNull()
  })
})

describe('availableValuesFor — disponibilidade por eixo (PST-08 / AC 16)', () => {
  it('track com stock 0: o valor sai da lista de disponíveis', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { stock: 5 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 }),
      ],
    })
    const disponiveis = availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })
    expect([...disponiveis]).toEqual(['3,5 cm'])
  })

  it('backorder com stock 0: o valor continua disponível (AC 7)', () => {
    const product = grid({
      stock_policy: 'backorder',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: -3 })],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
  })

  it('none com stock 0: o valor continua disponível (AC 6)', () => {
    const product = grid({
      stock_policy: 'none',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 })],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
  })

  it('linha pausada é indisponível em qualquer política — is_active vence a política', () => {
    const product = grid({
      stock_policy: 'none',
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { is_active: false })],
    })
    expect(availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' }).size).toBe(0)
  })

  it('a disponibilidade de um eixo depende do OUTRO eixo escolhido', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 7 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Brilhante' }, { stock: 0 }),
      ],
    })
    expect([...availableValuesFor(product, 'Tamanho', { Acabamento: 'Fosco' })]).toEqual(['4,5 cm'])
    expect(availableValuesFor(product, 'Tamanho', { Acabamento: 'Brilhante' }).size).toBe(0)
  })
})

describe('initialSelection — a combinação que já vem escolhida', () => {
  it('começa na primeira linha DISPONÍVEL por position, não na primeira do array', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { position: 1, stock: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Brilhante' }, { position: 0, stock: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { position: 2, stock: 9 }),
      ],
    })
    expect(initialSelection(product, PAGE_MAX_AXES)).toEqual({
      Tamanho: '4,5 cm',
      Acabamento: 'Fosco',
    })
  })

  it('grade toda esgotada cai na primeira linha existente — seletor não abre vazio', () => {
    const product = grid({
      variants: [
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { position: 0, stock: 0 }),
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { position: 1, stock: 0 }),
      ],
    })
    expect(initialSelection(product, PAGE_MAX_AXES)).toEqual({
      Tamanho: '4,5 cm',
      Acabamento: 'Fosco',
    })
  })

  it('produto sem eixo devolve seleção vazia — não há o que escolher', () => {
    expect(initialSelection(grid({ options: [] }), PAGE_MAX_AXES)).toEqual({})
  })

  it('no card, a seleção cobre só os 2 primeiros eixos', () => {
    const product = grid({
      options: [
        option('Tamanho', ['4,5 cm'], 0),
        option('Acabamento', ['Fosco'], 1),
        option('Cor', ['Rosa'], 2),
      ],
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' })],
    })
    expect(Object.keys(initialSelection(product, CARD_MAX_AXES))).toEqual(['Tamanho', 'Acabamento'])
  })
})

describe('canAddSelection — o que pode entrar no carrinho (AC 16)', () => {
  it('combinação com stock 0 e policy track NÃO entra no carrinho', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 0 })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })

  it('combinação com saldo entra', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { stock: 2 })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(true)
  })

  it('linha sem preço não entra — o servidor recusaria com 422', () => {
    const product = grid({
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { price: null })],
    })
    expect(canAddSelection(product, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })

  it('combinação inexistente não entra', () => {
    const product = grid({ variants: [variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' })] })
    expect(canAddSelection(product, { Tamanho: '5,5 cm', Acabamento: 'Fosco' })).toBe(false)
  })
})
