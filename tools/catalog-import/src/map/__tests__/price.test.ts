import { describe, expect, it } from 'vitest'

import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawProduct, RawVariant } from '../../nuvemshop/types.ts'
import { comparePrice, decimal, effectivePrice } from '../price.ts'

const reais = products as RawProduct[]

/**
 * Fixture com os três campos de dinheiro DIVERGENTES.
 *
 * `L-013`: quando os campos candidatos valem o mesmo número, o teste não detecta leitura do campo
 * errado. Aqui `price`, `promotional_price` e `compare_at_price` são todos diferentes de propósito.
 */
const variant = (over: Partial<RawVariant> = {}): RawVariant => ({
  id: 1,
  product_id: 1,
  image_id: null,
  position: 1,
  price: '380.00',
  promotional_price: '299.00',
  compare_at_price: '420.00',
  stock_management: true,
  stock: 5,
  weight: '0.030',
  width: null,
  height: null,
  depth: null,
  sku: null,
  values: [],
  visible: true,
  created_at: '',
  updated_at: '',
  ...over,
})

describe('effectivePrice — qual dos três campos a loja cobra (CAT-04)', () => {
  it('cobra o promocional quando ele existe, não o de tabela nem o "de"', () => {
    expect(effectivePrice(variant())).toBe(299)
  })

  it('cobra o de tabela quando não há promocional', () => {
    expect(effectivePrice(variant({ promotional_price: null }))).toBe(380)
  })

  it('devolve null quando não há preço nenhum', () => {
    expect(effectivePrice(variant({ price: null, promotional_price: null }))).toBeNull()
  })

  it('devolve null para string vazia e para valor não numérico', () => {
    expect(effectivePrice(variant({ price: '  ', promotional_price: null }))).toBeNull()
    expect(effectivePrice(variant({ price: 'sob consulta', promotional_price: null }))).toBeNull()
  })

  it('devolve null para zero e negativo — não são preço vendável', () => {
    expect(effectivePrice(variant({ price: '0.00', promotional_price: null }))).toBeNull()
    expect(effectivePrice(variant({ price: '-10.00', promotional_price: null }))).toBeNull()
  })
})

describe('comparePrice — a guarda do "de" riscado (CAT-04)', () => {
  it('devolve o "de" quando ele é MAIOR que o preço cobrado', () => {
    expect(comparePrice(variant())).toBe(420)
  })

  it('devolve null quando o "de" é IGUAL ao preço cobrado', () => {
    // É o caso de 3.346 das 3.357 variações medidas. Sem esta guarda, a loja riscaria um preço
    // idêntico ao que cobra em praticamente todo o catálogo.
    expect(comparePrice(variant({ compare_at_price: '299.00' }))).toBeNull()
  })

  it('devolve null quando o "de" é MENOR que o preço cobrado', () => {
    expect(comparePrice(variant({ compare_at_price: '100.00' }))).toBeNull()
  })

  it('compara contra o preço EFETIVO, não contra o de tabela', () => {
    // price 380, promo 299, compare 380: como a loja cobra 299, o 380 É um "de" verdadeiro.
    expect(comparePrice(variant({ compare_at_price: '380.00' }))).toBe(380)
  })

  it('devolve null quando não há preço cobrado', () => {
    expect(comparePrice(variant({ price: null, promotional_price: null }))).toBeNull()
  })

  it('devolve null quando o "de" está ausente ou vazio', () => {
    expect(comparePrice(variant({ compare_at_price: null }))).toBeNull()
    expect(comparePrice(variant({ compare_at_price: '' }))).toBeNull()
  })
})

describe('no catálogo real', () => {
  const variants = reais.flatMap(p => p.variants)

  it('a guarda descarta os "de" espelhados e mantém os verdadeiros', () => {
    const espelhados = variants.filter(
      v => v.compare_at_price !== null && Number(v.compare_at_price) === effectivePrice(v),
    )
    expect(espelhados.length).toBeGreaterThan(0)
    for (const v of espelhados) expect(comparePrice(v)).toBeNull()

    const verdadeiros = variants.filter(
      v => v.compare_at_price !== null && effectivePrice(v) !== null
        && Number(v.compare_at_price) > effectivePrice(v)!,
    )
    expect(verdadeiros.length).toBeGreaterThan(0)
    for (const v of verdadeiros) expect(comparePrice(v)).toBe(Number(v.compare_at_price))
  })

  it('nenhum `compare_price` resultante é menor ou igual ao preço cobrado', () => {
    for (const v of variants) {
      const de = comparePrice(v)
      if (de !== null) expect(de).toBeGreaterThan(effectivePrice(v)!)
    }
  })
})

describe('decimal — string decimal da origem para número', () => {
  it('converte peso em string para número', () => {
    expect(decimal('0.030')).toBe(0.03)
  })

  it('devolve null para nulo, vazio, zero e não numérico', () => {
    expect(decimal(null)).toBeNull()
    expect(decimal('')).toBeNull()
    expect(decimal('0')).toBeNull()
    expect(decimal('leve')).toBeNull()
  })
})
