// PLS-07 — o parse do Excel, a validação linha a linha e o lote de insert.

import { describe, expect, it } from 'vitest'
import type { ProductOption } from '@estrelinha/supabase/types'

import {
  buildInsertBatch,
  emptyDefaults,
  footerSummary,
  MAX_ROWS,
  parseClipboardGrid,
  validateRow,
  validateRows,
  type GridRow,
} from './quickGrid'

const TAMANHO: ProductOption = { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }
const ACABAMENTO: ProductOption = { name: 'Acabamento', values: ['Fosco'], position: 1 }

/** As 8 linhas do teste independente da spec — a 8ª sem preço. */
const OITO_LINHAS = [
  'Luffy Gear 5\tanime;one piece\tR$ 14,90\t20\tluffy;onepiece\tLUF',
  'Levi Ackerman\tanime\tR$ 14,90\t15\taot\tLEV',
  'Gojo Satoru\tanime\tR$ 16,90\t10\tjjk\tGOJ',
  'Nezuko\tanime\t18,40\t8\tkimetsu\tNEZ',
  'Pikachu\tgames\t12,90\t30\tpokemon\tPIK',
  'Darth Vader\tfilmes\t14,90\t12\tstarwars\tDAR',
  'Among Us\tgames\t9,90\t25\tamongus\tAMO',
  'Sem Preço\tanime\t\t5\ttesto\tSEM',
].join('\n')

const row = (over: Partial<GridRow> = {}): GridRow => ({
  imageUrl: null,
  name: 'Produto',
  categories: [],
  price: 14.9,
  stock: 10,
  tags: [],
  skuBase: '',
  ...over,
})

describe('parseClipboardGrid — colar do Excel (PLS-07 AC 4)', () => {
  it('converte 8 linhas de TSV em 8 linhas, com as colunas certas', () => {
    const { rows } = parseClipboardGrid(OITO_LINHAS)

    expect(rows).toHaveLength(8)
    expect(rows[0]).toEqual({
      imageUrl: null,
      name: 'Luffy Gear 5',
      categories: ['anime', 'one piece'],
      price: 14.9,
      stock: 20,
      tags: ['luffy', 'onepiece'],
      skuBase: 'LUF',
    })
  })

  it('aplica a MESMA máscara do formulário ao preço colado', () => {
    const { rows } = parseClipboardGrid('A\t\tR$ 1.234,56\t\t\t')

    // `1.234,56` em pt-BR é mil duzentos e trinta e quatro — não 1,23.
    expect(rows[0].price).toBe(1234.56)
  })

  it('célula de preço vazia vira `null`, não zero', () => {
    const { rows } = parseClipboardGrid('Sem Preço\t\t\t5\t\t')

    expect(rows[0].price).toBeNull()
    expect(rows[0].stock).toBe(5)
  })

  it('tolera CRLF e linhas em branco no meio', () => {
    const { rows } = parseClipboardGrid('A\t\t10\r\n\r\nB\t\t20\r\n')

    expect(rows.map(r => r.name)).toEqual(['A', 'B'])
  })

  it('colar 500 linhas limita a 200 e informa quantas ficaram de fora (A24)', () => {
    const texto = Array.from({ length: 500 }, (_, i) => `Produto ${i}\t\t9,90`).join('\n')

    const { rows, truncated } = parseClipboardGrid(texto)

    expect(rows).toHaveLength(MAX_ROWS)
    expect(truncated).toBe(300)
  })

  it('dentro do teto não trunca nada', () => {
    const { truncated } = parseClipboardGrid('A\t\t9,90')

    expect(truncated).toBe(0)
  })
})

describe('validateRow — erro por linha (PLS-07 AC 6)', () => {
  it('linha sem preço acusa `Preço é obrigatório`', () => {
    const errors = validateRow(row({ price: null }), emptyDefaults(), new Set())

    expect(errors).toEqual([{ field: 'price', message: 'Preço é obrigatório' }])
  })

  it('preço zero é informado e inválido — mensagem diferente de "obrigatório"', () => {
    const errors = validateRow(row({ price: 0 }), emptyDefaults(), new Set())

    expect(errors[0].message).toBe('Preço precisa ser maior que zero')
  })

  it('linha sem nome acusa `Nome é obrigatório`', () => {
    const errors = validateRow(row({ name: '  ' }), emptyDefaults(), new Set())

    expect(errors.some(e => e.field === 'name')).toBe(true)
  })

  it('colisão de slug NOMEIA a URL em conflito, não diz só "já existe"', () => {
    const errors = validateRow(row({ name: 'Luffy Gear 5' }), emptyDefaults(), new Set(['luffy-gear-5']))

    expect(errors).toContainEqual({
      field: 'slug',
      message: 'já existe um produto com a URL /luffy-gear-5',
    })
  })

  it('linha válida não acusa nada', () => {
    expect(validateRow(row(), emptyDefaults(), new Set())).toEqual([])
  })

  it('duas linhas com o mesmo nome colidem entre si, não só contra o banco', () => {
    const statuses = validateRows([row({ name: 'Luffy' }), row({ name: 'Luffy' })], emptyDefaults(), new Set())

    expect(statuses[0].errors).toEqual([])
    expect(statuses[1].errors[0].message).toBe('já existe um produto com a URL /luffy')
  })
})

describe('footerSummary — `N prontas · M com erro` (PLS-07 AC 7)', () => {
  it('8 linhas com uma sem preço dão `7 prontas · 1 com erro`', () => {
    const { rows } = parseClipboardGrid(OITO_LINHAS)

    expect(footerSummary(validateRows(rows, emptyDefaults(), new Set()))).toBe('7 prontas · 1 com erro')
  })

  it('linha totalmente vazia não conta como erro', () => {
    const statuses = validateRows(
      [row(), { ...row(), imageUrl: null, name: '', price: null, stock: null }],
      emptyDefaults(),
      new Set(),
    )

    expect(footerSummary(statuses)).toBe('1 pronta · 0 com erro')
  })
})

describe('buildInsertBatch — criar só as válidas, com a grade dos padrões (AC 8-9)', () => {
  it('cria SÓ as 7 válidas, como rascunho', () => {
    const { rows } = parseClipboardGrid(OITO_LINHAS)

    const { products } = buildInsertBatch(rows, emptyDefaults(), new Set())

    expect(products).toHaveLength(7)
    expect(products.every(p => p.is_active === false)).toBe(true)
    expect(products.map(p => p.name)).not.toContain('Sem Preço')
  })

  it('a linha herda o preço e o estoque colados, e o slug sai do nome', () => {
    const { products } = buildInsertBatch([row({ name: 'Luffy Gear 5', price: 14.9, stock: 20 })], emptyDefaults())

    expect(products[0]).toMatchObject({
      name: 'Luffy Gear 5',
      slug: 'luffy-gear-5',
      base_price: 14.9,
      stock_total: 20,
    })
  })

  it('os padrões do lote entram no produto: eixos e peso', () => {
    const defaults = { ...emptyDefaults(), options: [TAMANHO], weightKg: 0.018 }

    const { products } = buildInsertBatch([row()], defaults)

    expect(products[0].options).toEqual([TAMANHO])
    expect(products[0].weight_kg).toBe(0.018)
  })

  it('cada produto nasce com a grade do CRUZAMENTO dos eixos, herdando o preço da linha (A4)', () => {
    const defaults = { ...emptyDefaults(), options: [TAMANHO, ACABAMENTO] }

    const { products, variants } = buildInsertBatch([row({ price: 16.9 }), row({ name: 'Outro', price: 9.9 })], defaults)

    // 2 tamanhos × 1 acabamento = 2 linhas por produto, 2 produtos = 4 variações.
    expect(products).toHaveLength(2)
    expect(variants).toHaveLength(4)
    expect(variants.filter(v => v.rowIndex === 0).every(v => v.price === 16.9)).toBe(true)
    expect(variants.filter(v => v.rowIndex === 1).every(v => v.price === 9.9)).toBe(true)
    expect(variants[0].option_values).toEqual({ Tamanho: '3,5 cm', Acabamento: 'Fosco' })
  })

  it('sem eixo declarado, o produto nasce simples e sem variação', () => {
    const { products, variants } = buildInsertBatch([row()], emptyDefaults())

    expect(products).toHaveLength(1)
    expect(variants).toEqual([])
  })

  it('o SKU sai do SKU base da linha quando informado', () => {
    const defaults = { ...emptyDefaults(), options: [TAMANHO] }

    const { variants } = buildInsertBatch([row({ name: 'Luffy Gear 5', skuBase: 'LUF' })], defaults)

    expect(variants[0].sku).toContain('LUF')
  })

  it('linha com erro não entra no lote nem gera variação', () => {
    const defaults = { ...emptyDefaults(), options: [TAMANHO] }

    const { products, variants } = buildInsertBatch([row(), row({ name: 'Ruim', price: null })], defaults)

    expect(products).toHaveLength(1)
    expect(variants.every(v => v.rowIndex === 0)).toBe(true)
  })

  it('slug já ocupado no banco tira a linha do lote', () => {
    const { products } = buildInsertBatch([row({ name: 'Luffy' })], emptyDefaults(), new Set(['luffy']))

    expect(products).toEqual([])
  })
})
