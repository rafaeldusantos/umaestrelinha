import { describe, expect, it } from 'vitest'
import { isVariantAvailable } from '../../pricing/index.ts'
import {
  resolveAddons,
  variantSellable,
  type AddonConfig,
  type AddonList,
  type PieceProduct,
  type PieceVariant,
} from '../index.ts'

const variant = (id: string, over: Partial<PieceVariant> = {}): PieceVariant => ({
  id,
  price: 10,
  stock: 5,
  is_active: true,
  position: 0,
  option_values: {},
  ...over,
})

const grid = (id: string, variants: PieceVariant[], over: Partial<PieceProduct> = {}): PieceProduct => ({
  id,
  stock_policy: 'track',
  stock_total: 0,
  options: [{ name: 'Cor', values: ['Ouro', 'Prata'] }],
  variants,
  ...over,
})

const simple = (id: string, over: Partial<PieceProduct> = {}): PieceProduct => ({
  id,
  stock_policy: 'track',
  stock_total: 4,
  options: [],
  variants: [],
  ...over,
})

const product = (id: string, position: number, target: string, over: Partial<AddonConfig> = {}): AddonConfig => ({
  id,
  position,
  kind: 'product',
  targetProductId: target,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  ...over,
})

const list = (id: string, position: number, listId: string, over: Partial<AddonConfig> = {}): AddonConfig => ({
  id,
  position,
  kind: 'list',
  targetProductId: null,
  listId,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  ...over,
})

const listOf = (id: string, productIds: string[], variantIds: Record<string, string[]> = {}): AddonList => ({
  id,
  name: `Lista ${id}`,
  items: productIds.map((productId, position) => ({
    productId,
    position,
    variantIds: variantIds[productId] ?? [],
  })),
})

const run = (
  addons: AddonConfig[],
  products: PieceProduct[],
  lists: AddonList[] = [],
  main: { id?: string; variantId?: string | null } = {},
) =>
  resolveAddons({
    mainProductId: main.id ?? 'main',
    mainVariantId: main.variantId ?? null,
    addons,
    lists,
    products,
  })

describe('variantSellable acompanha a regra de disponibilidade do preço', () => {
  it('concorda com isVariantAvailable em toda combinação de política, estoque e pausa', () => {
    for (const policy of ['track', 'none', 'backorder'] as const) {
      for (const stock of [0, 3]) {
        for (const is_active of [true, false]) {
          const v = variant('v', { stock, is_active })
          expect(variantSellable(v, policy)).toBe(isVariantAvailable(v as never, policy))
        }
      }
    }
  })

  it('variação sem preço nunca é vendável', () => {
    expect(variantSellable(variant('v', { price: null }), 'none')).toBe(false)
  })
})

describe('resolveAddons — disponibilidade', () => {
  it('peça fora do ar (ausente da leitura) some; o outro adicional continua', () => {
    const r = run([product('a1', 0, 'x'), product('a2', 1, 'y')], [simple('y')])
    expect(r.map(a => a.id)).toEqual(['a2'])
  })

  it('peça simples esgotada some; com política de não controlar estoque, fica', () => {
    expect(run([product('a1', 0, 'x')], [simple('x', { stock_total: 0 })])).toEqual([])
    expect(run([product('a1', 0, 'x')], [simple('x', { stock_total: 0, stock_policy: 'none' })])).toHaveLength(1)
  })

  it('peça com grade sem nenhuma variação vendável some', () => {
    const esgotada = grid('x', [variant('v1', { stock: 0 }), variant('v2', { is_active: false })])
    expect(run([product('a1', 0, 'x')], [esgotada])).toEqual([])
  })

  it('devolve só as variações vendáveis, na ordem da grade', () => {
    const p = grid('x', [
      variant('v1', { position: 1 }),
      variant('v2', { stock: 0, position: 2 }),
      variant('v3', { position: 0 }),
    ])
    const [a] = run([product('a1', 0, 'x')], [p])
    expect(a.pieces[0].variantIds).toEqual(['v3', 'v1'])
    expect(a.pieces[0].simple).toBe(false)
  })

  it('variações liberadas restringem a peça; se todas sumiram, a peça não vira "todas"', () => {
    const p = grid('x', [variant('v1'), variant('v2')])
    const restrita = run([product('a1', 0, 'x', { targetVariantIds: ['v2'] })], [p])
    expect(restrita[0].pieces[0].variantIds).toEqual(['v2'])
    expect(restrita[0].pieces[0].liberated).toEqual(['v2'])
    const sumiram = run([product('a1', 0, 'x', { targetVariantIds: ['apagada'] })], [p])
    expect(sumiram).toEqual([])
  })

  it('liberada mas esgotada: a peça some', () => {
    const p = grid('x', [variant('v1'), variant('v2', { stock: 0 })])
    expect(run([product('a1', 0, 'x', { targetVariantIds: ['v2'] })], [p])).toEqual([])
  })

  it('peça simples com variações liberadas que não existem some', () => {
    expect(run([product('a1', 0, 'x', { targetVariantIds: ['v9'] })], [simple('x')])).toEqual([])
  })
})

describe('resolveAddons — listas', () => {
  it('as peças saem na ordem da dona e só a indisponível some', () => {
    const l = listOf('L', ['a', 'b', 'c'])
    const r = run([list('a1', 0, 'L')], [simple('c'), simple('a'), simple('b', { stock_total: 0 })], [l])
    expect(r[0].pieces.map(p => p.productId)).toEqual(['a', 'c'])
    expect(r[0].listName).toBe('Lista L')
  })

  it('lista sem nenhuma peça disponível some inteira', () => {
    const l = listOf('L', ['a'])
    expect(run([list('a1', 0, 'L')], [], [l])).toEqual([])
  })

  it('as variações liberadas valem por peça da lista', () => {
    const l = listOf('L', ['a'], { a: ['v2'] })
    const r = run([list('a1', 0, 'L')], [grid('a', [variant('v1'), variant('v2')])], [l])
    expect(r[0].pieces[0].variantIds).toEqual(['v2'])
  })

  it('a lista pula o próprio produto principal, só ali', () => {
    const l = listOf('L', ['main', 'a'])
    const products = [simple('main'), simple('a')]
    expect(run([list('a1', 0, 'L')], products, [l])[0].pieces.map(p => p.productId)).toEqual(['a'])
    // Em outro produto principal a mesma lista continua inteira.
    expect(
      run([list('a1', 0, 'L')], products, [l], { id: 'outro' })[0].pieces.map(p => p.productId),
    ).toEqual(['main', 'a'])
  })

  it('a lista pula a peça que já é outro adicional do produto, seja peça avulsa ou de outra lista', () => {
    const l1 = listOf('L1', ['a', 'b'])
    const l2 = listOf('L2', ['b', 'c'])
    const products = [simple('a'), simple('b'), simple('c')]
    // Adicional de peça avulsa vence a lista, mesmo vindo depois na ordem.
    const r = run([list('a1', 0, 'L1'), product('a2', 1, 'a')], products, [l1])
    expect(r.find(x => x.id === 'a1')!.pieces.map(p => p.productId)).toEqual(['b'])
    expect(r.find(x => x.id === 'a2')!.pieces.map(p => p.productId)).toEqual(['a'])
    // Entre duas listas, a primeira na ordem da dona fica com a peça.
    const duas = run([list('a1', 0, 'L1'), list('a2', 1, 'L2')], products, [l1, l2])
    expect(duas[0].pieces.map(p => p.productId)).toEqual(['a', 'b'])
    expect(duas[1].pieces.map(p => p.productId)).toEqual(['c'])
  })

  it('a lista sem peça sobrando depois das puladas some', () => {
    const l = listOf('L', ['main'])
    expect(run([list('a1', 0, 'L')], [simple('main')], [l])).toEqual([])
  })

  it('adicional de peça que é o próprio principal some', () => {
    expect(run([product('a1', 0, 'main')], [simple('main')])).toEqual([])
  })
})

describe('resolveAddons — a variação do principal', () => {
  it('o adicional escondido naquela variação some e os outros ficam', () => {
    const addons = [product('a1', 0, 'x', { hiddenOnVariantIds: ['vm1'] }), product('a2', 1, 'y')]
    const products = [simple('x'), simple('y')]
    expect(run(addons, products, [], { variantId: 'vm1' }).map(a => a.id)).toEqual(['a2'])
    expect(run(addons, products, [], { variantId: 'vm2' }).map(a => a.id)).toEqual(['a1', 'a2'])
    expect(run(addons, products, [], { variantId: null }).map(a => a.id)).toEqual(['a1', 'a2'])
  })

  it('a ordem de saída é a posição, não a de entrada', () => {
    const r = run([product('b', 2, 'y'), product('a', 0, 'x')], [simple('x'), simple('y')])
    expect(r.map(a => a.id)).toEqual(['a', 'b'])
  })
})
