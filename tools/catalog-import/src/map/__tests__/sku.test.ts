import { describe, expect, it } from 'vitest'

import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawProduct } from '../../nuvemshop/types.ts'
import { dedupeSkus } from '../sku.ts'
import { mapVariants, type VariantRow } from '../variant.ts'

const reais = products as RawProduct[]

const slugByProduct = new Map(reais.map(p => [p.id, (p.handle as { pt: string }).pt]))
const todasVariacoes = () => reais.flatMap(mapVariants)

const variant = (over: Partial<VariantRow> & { nuvemshop_id: number }): VariantRow => ({
  product_nuvemshop_id: 1,
  name: null,
  sku: null,
  price: 10,
  compare_price: null,
  stock: 0,
  option_values: {},
  weight_kg: null,
  is_active: true,
  position: 1,
  image_nuvemshop_id: null,
  ...over,
})

describe('dedupeSkus — SKU vazio', () => {
  it('não trata null como duplicata: várias variações podem ficar sem SKU', () => {
    const { variants, discarded } = dedupeSkus(
      [variant({ nuvemshop_id: 1 }), variant({ nuvemshop_id: 2 }), variant({ nuvemshop_id: 3 })],
      slugByProduct,
    )
    expect(variants.every(v => v.sku === null)).toBe(true)
    expect(discarded).toEqual([])
  })
})

describe('dedupeSkus — duplicata DENTRO do mesmo produto', () => {
  it('mantém a primeira e nulifica as seguintes', () => {
    const { variants, discarded } = dedupeSkus(
      [
        variant({ nuvemshop_id: 1, product_nuvemshop_id: 7, sku: 'BA-002' }),
        variant({ nuvemshop_id: 2, product_nuvemshop_id: 7, sku: 'BA-002' }),
        variant({ nuvemshop_id: 3, product_nuvemshop_id: 7, sku: 'BA-002' }),
      ],
      new Map([[7, 'produto-sete']]),
    )
    expect(variants.map(v => v.sku)).toEqual(['BA-002', null, null])
    expect(discarded).toHaveLength(2)
    expect(discarded[0]).toEqual({
      sku: 'BA-002',
      product_slug: 'produto-sete',
      variant_nuvemshop_id: 2,
      motivo: 'lote',
    })
  })
})

describe('dedupeSkus — duplicata ENTRE produtos diferentes', () => {
  it('nulifica a segunda ocorrência — é o caso que só a varredura global pega', () => {
    const { variants, discarded } = dedupeSkus(
      [
        variant({ nuvemshop_id: 1, product_nuvemshop_id: 10, sku: 'BA-002' }),
        variant({ nuvemshop_id: 2, product_nuvemshop_id: 20, sku: 'BA-002' }),
      ],
      new Map([[10, 'produto-dez'], [20, 'produto-vinte']]),
    )
    expect(variants.map(v => v.sku)).toEqual(['BA-002', null])
    expect(discarded).toHaveLength(1)
    expect(discarded[0].product_slug).toBe('produto-vinte')
    expect(discarded[0].variant_nuvemshop_id).toBe(2)
  })
})

describe('dedupeSkus — SKU já ocupado por linha fora do lote', () => {
  it('nulifica e reporta motivo `banco`', () => {
    const { variants, discarded } = dedupeSkus(
      [variant({ nuvemshop_id: 1, product_nuvemshop_id: 10, sku: 'MANUAL-1' })],
      new Map([[10, 'produto-dez']]),
      new Set(['MANUAL-1']),
    )
    expect(variants[0].sku).toBeNull()
    expect(discarded[0].motivo).toBe('banco')
  })

  it('não nulifica SKU do lote que não colide com o conjunto ocupado', () => {
    const { variants, discarded } = dedupeSkus(
      [variant({ nuvemshop_id: 1, sku: 'LIVRE' })],
      slugByProduct,
      new Set(['OUTRO']),
    )
    expect(variants[0].sku).toBe('LIVRE')
    expect(discarded).toEqual([])
  })
})

describe('dedupeSkus — determinismo', () => {
  it('duas execuções com a mesma entrada preservam os mesmos SKUs', () => {
    const entrada = [
      variant({ nuvemshop_id: 1, sku: 'A' }),
      variant({ nuvemshop_id: 2, sku: 'A' }),
      variant({ nuvemshop_id: 3, sku: 'B' }),
    ]
    const primeira = dedupeSkus(entrada, slugByProduct).variants.map(v => v.sku)
    const segunda = dedupeSkus(entrada, slugByProduct).variants.map(v => v.sku)
    expect(primeira).toEqual(segunda)
    expect(primeira).toEqual(['A', null, 'B'])
  })

  it('não muta a entrada', () => {
    const entrada = [variant({ nuvemshop_id: 1, sku: 'A' }), variant({ nuvemshop_id: 2, sku: 'A' })]
    dedupeSkus(entrada, slugByProduct)
    expect(entrada[1].sku).toBe('A')
  })
})

describe('dedupeSkus — no catálogo real', () => {
  it('o recorte real contém duplicata dentro do produto E entre produtos', () => {
    const brutos = todasVariacoes().map(v => v.sku).filter((s): s is string => s !== null)
    expect(brutos.length).toBeGreaterThan(new Set(brutos).size)
  })

  it('nenhum SKU sobrevive duas vezes depois da deduplicação', () => {
    const { variants } = dedupeSkus(todasVariacoes(), slugByProduct)
    const sobreviventes = variants.map(v => v.sku).filter((s): s is string => s !== null)
    expect(sobreviventes.length).toBe(new Set(sobreviventes).size)
  })

  it('nenhuma variação é perdida — só o SKU', () => {
    const antes = todasVariacoes()
    const { variants, discarded } = dedupeSkus(antes, slugByProduct)
    expect(variants).toHaveLength(antes.length)
    expect(variants.map(v => v.nuvemshop_id)).toEqual(antes.map(v => v.nuvemshop_id))
    expect(discarded.length).toBeGreaterThan(0)
  })

  it('todo descarte nomeia o produto e a variação, para o relatório', () => {
    const { discarded } = dedupeSkus(todasVariacoes(), slugByProduct)
    for (const d of discarded) {
      expect(d.sku).not.toBe('')
      expect(d.product_slug).not.toBe('')
      expect(d.variant_nuvemshop_id).toBeGreaterThan(0)
    }
  })
})
