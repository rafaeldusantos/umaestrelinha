import { describe, expect, it } from 'vitest'
import {
  categoryIdsFromLinks,
  normalizeCategoryLinks,
  normalizeOptions,
  normalizeVariants,
  toOptionValues,
  toStockPolicy,
} from '../index'

// Estes normalizadores nasceram no mapper da loja (07/T18) e foram promovidos para `core` na
// 11/T21, quando o backoffice passou a ler as mesmas colunas para editar a grade. Os testes diretos
// existem porque a regra agora tem DOIS consumidores: a divergência entre eles seria uma grade
// publicada que a vitrine não mostra, sem erro em lugar nenhum.
//
// A tolerância é a mesma de `normalizeImages`: nunca lançar. Dado torto perde o campo, não a tela.

describe('toStockPolicy', () => {
  it('aceita as três políticas do CHECK do banco', () => {
    expect(toStockPolicy('track')).toBe('track')
    expect(toStockPolicy('backorder')).toBe('backorder')
    expect(toStockPolicy('none')).toBe('none')
  })

  it('valor desconhecido cai em track — o default da coluna e o mais conservador', () => {
    expect(toStockPolicy('sei-la')).toBe('track')
    expect(toStockPolicy(null)).toBe('track')
    expect(toStockPolicy(undefined)).toBe('track')
    expect(toStockPolicy(7)).toBe('track')
  })
})

describe('toOptionValues', () => {
  it('mantém só par eixo→valor com string não vazia', () => {
    expect(toOptionValues({ Tamanho: '4,5 cm', Acabamento: '', Cor: null, Pack: 2 })).toEqual({
      Tamanho: '4,5 cm',
    })
  })

  it('array, null e escalar viram objeto vazio, sem throw', () => {
    expect(toOptionValues(['4,5 cm'])).toEqual({})
    expect(toOptionValues(null)).toEqual({})
    expect(toOptionValues('4,5 cm')).toEqual({})
  })
})

describe('normalizeOptions', () => {
  it('preserva nome, valores e position', () => {
    expect(normalizeOptions([{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 2 }])).toEqual([
      { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 2 },
    ])
  })

  it('eixo sem valores é descartado — viraria um seletor vazio', () => {
    expect(normalizeOptions([{ name: 'Tamanho', values: [], position: 0 }])).toEqual([])
  })

  it('eixo sem nome é descartado — viraria um seletor sem rótulo', () => {
    expect(normalizeOptions([{ name: '   ', values: ['4,5 cm'], position: 0 }])).toEqual([])
  })

  it('apara o nome e descarta valor não-string ou vazio', () => {
    expect(normalizeOptions([{ name: '  Cor  ', values: ['Rosa', '', 3, null], position: 0 }])).toEqual([
      { name: 'Cor', values: ['Rosa'], position: 0 },
    ])
  })

  it('position ausente ou não numérica cai no índice do array', () => {
    expect(
      normalizeOptions([
        { name: 'Tamanho', values: ['4,5 cm'] },
        { name: 'Cor', values: ['Rosa'], position: 'primeiro' },
      ]),
    ).toEqual([
      { name: 'Tamanho', values: ['4,5 cm'], position: 0 },
      { name: 'Cor', values: ['Rosa'], position: 1 },
    ])
  })

  it('entrada que não é array, ou com lixo dentro, devolve lista sem throw', () => {
    expect(normalizeOptions(null)).toEqual([])
    expect(normalizeOptions('Tamanho')).toEqual([])
    expect(normalizeOptions([null, 42, { name: 'Cor', values: ['Rosa'], position: 0 }])).toHaveLength(1)
  })
})

describe('normalizeVariants', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 'v1',
    product_id: 'p1',
    option_values: { Tamanho: '4,5 cm' },
    name: 'Grande',
    sku: 'SLR-45',
    price: 7.9,
    compare_price: 9.9,
    stock: 3,
    weight_kg: 0.018,
    image_url: 'v.webp',
    is_active: true,
    position: 1,
    ...over,
  })

  it('mapeia a linha inteira preservando os valores do banco', () => {
    expect(normalizeVariants([row()], 'p1')[0]).toEqual({
      id: 'v1',
      product_id: 'p1',
      option_values: { Tamanho: '4,5 cm' },
      name: 'Grande',
      sku: 'SLR-45',
      price: 7.9,
      compare_price: 9.9,
      stock: 3,
      weight_kg: 0.018,
      image_url: 'v.webp',
      is_active: true,
      position: 1,
      // Feature 30: a identidade pública da linha. A asserção foi reescrita porque a spec mudou o
      // comportamento — e segue sendo IGUALDADE EXATA, que é o que impede um campo entrar no
      // mapeamento sem ninguém decidir. Ganhou os casos abaixo em vez de ser afrouxada.
      nuvemshop_id: null,
    })
  })

  it('nuvemshop_id do banco é preservado — é o offer_id que o Google indexou (GSH-10)', () => {
    expect(normalizeVariants([row({ nuvemshop_id: 1259936246 })], 'p1')[0].nuvemshop_id).toBe(
      1259936246,
    )
  })

  it('nuvemshop_id ausente vira null — linha criada no admin nunca esteve no Google', () => {
    expect(normalizeVariants([row()], 'p1')[0].nuvemshop_id).toBeNull()
  })

  it('nuvemshop_id ilegível vira null, nunca NaN', () => {
    expect(normalizeVariants([row({ nuvemshop_id: '1259936246' })], 'p1')[0].nuvemshop_id).toBeNull()
    expect(normalizeVariants([row({ nuvemshop_id: Number.NaN })], 'p1')[0].nuvemshop_id).toBeNull()
  })

  it('linha sem id é descartada — o variant_id do pedido vem dela', () => {
    expect(normalizeVariants([row({ id: undefined }), row({ id: '' })], 'p1')).toEqual([])
  })

  it('is_active só é true quando o banco disse true — ausente nasce PAUSADA', () => {
    expect(normalizeVariants([row({ is_active: undefined })], 'p1')[0].is_active).toBe(false)
    expect(normalizeVariants([row({ is_active: 'true' })], 'p1')[0].is_active).toBe(false)
    expect(normalizeVariants([row({ is_active: 1 })], 'p1')[0].is_active).toBe(false)
  })

  it('price ilegível vira null, nunca 0 — 0 seria uma variação de graça', () => {
    expect(normalizeVariants([row({ price: undefined })], 'p1')[0].price).toBeNull()
    expect(normalizeVariants([row({ price: 'R$ 7,90' })], 'p1')[0].price).toBeNull()
    expect(normalizeVariants([row({ price: Number.NaN })], 'p1')[0].price).toBeNull()
  })

  it('price 0 explícito é preservado — é diferente de "sem preço"', () => {
    expect(normalizeVariants([row({ price: 0 })], 'p1')[0].price).toBe(0)
  })

  it('stock ilegível vira 0, e negativo é preservado (backorder vende no negativo)', () => {
    expect(normalizeVariants([row({ stock: undefined })], 'p1')[0].stock).toBe(0)
    expect(normalizeVariants([row({ stock: -3 })], 'p1')[0].stock).toBe(-3)
  })

  it('product_id ausente cai no id do produto que está sendo lido', () => {
    expect(normalizeVariants([row({ product_id: undefined })], 'p-dono')[0].product_id).toBe('p-dono')
  })

  it('entrada que não é array, ou com lixo dentro, devolve lista sem throw', () => {
    expect(normalizeVariants(null, 'p1')).toEqual([])
    expect(normalizeVariants([null, 42, row()], 'p1')).toHaveLength(1)
  })
})

describe('normalizeCategoryLinks / categoryIdsFromLinks', () => {
  it('preserva category_id e position', () => {
    expect(normalizeCategoryLinks([{ category_id: 'c1', position: 2 }])).toEqual([
      { category_id: 'c1', position: 2 },
    ])
  })

  it('vínculo sem category_id é descartado', () => {
    expect(normalizeCategoryLinks([{ position: 0 }, { category_id: '', position: 1 }])).toEqual([])
  })

  it('position ausente cai no índice', () => {
    expect(normalizeCategoryLinks([{ category_id: 'c1' }, { category_id: 'c2' }])).toEqual([
      { category_id: 'c1', position: 0 },
      { category_id: 'c2', position: 1 },
    ])
  })

  it('categoryIdsFromLinks devolve os ids na ordem de position, não na do array', () => {
    expect(
      categoryIdsFromLinks([
        { category_id: 'terceira', position: 2 },
        { category_id: 'primeira', position: 0 },
        { category_id: 'segunda', position: 1 },
      ]),
    ).toEqual(['primeira', 'segunda', 'terceira'])
  })

  it('sem vínculo devolve lista vazia, sem throw', () => {
    expect(categoryIdsFromLinks(null)).toEqual([])
  })
})
