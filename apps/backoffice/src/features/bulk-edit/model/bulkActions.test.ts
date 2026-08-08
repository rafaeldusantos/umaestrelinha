// RFN-01, RFN-03, RFN-04 — as puras das ações de massa: duplicar, exportar e o diff de categorias.

import { describe, expect, it } from 'vitest'
import type { AdminListRow } from '@/entities/product/api/productQuery'

import { buildDuplicates, freeSlug } from './buildDuplicates'
import { CSV_COLUMNS, csvFileName, escapeCsvValue, toCsv, toExportRow } from './exportCsv'
import { isEmptyWrite, planCategoryWrites, splitCategoryPatches } from './applyCategories'

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  price: 14.9,
  compare_price: null,
  images: [{ url: 'a.webp', alt: 'Lua', source: 'upload' }],
  tags: ['anime', 'sailor moon'],
  is_active: true,
  stock_total: 12,
  low_stock_threshold: 5,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: [],
  seo_title: 'SEO',
  seo_description: 'SEO',
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: null,
  ...over,
})

describe('freeSlug — a cópia nunca colide (RFN-01)', () => {
  it('sem colisão, o slug é `base-copia`', () => {
    expect(freeSlug('luffy', new Set())).toBe('luffy-copia')
  })

  it('com `-copia` ocupado, numera a partir de 2', () => {
    expect(freeSlug('luffy', new Set(['luffy-copia']))).toBe('luffy-copia-2')
    expect(freeSlug('luffy', new Set(['luffy-copia', 'luffy-copia-2']))).toBe('luffy-copia-3')
  })
})

describe('buildDuplicates — cópia rasa e rascunho (RFN-01)', () => {
  it('acrescenta ` (cópia)` ao nome e nasce como RASCUNHO', () => {
    const [copy] = buildDuplicates([row()])

    expect(copy.name).toBe('Botton Sailor Moon (cópia)')
    expect(copy.is_active).toBe(false)
    expect(copy.slug).toBe('botton-sailor-moon-copia')
  })

  it('leva preço, estoque, tags, eixos e imagens', () => {
    const [copy] = buildDuplicates([row({ price: 18.4, stock_total: 7 })])

    expect(copy.base_price).toBe(18.4)
    expect(copy.stock_total).toBe(7)
    expect(copy.tags).toEqual(['anime', 'sailor moon'])
    expect(copy.images).toHaveLength(1)
  })

  it('NÃO leva o SEO — dois produtos com o mesmo título competem na busca', () => {
    const [copy] = buildDuplicates([row()])

    expect(copy.seo_title).toBeNull()
    expect(copy.seo_description).toBeNull()
  })

  it('duas cópias do MESMO produto no lote não colidem entre si', () => {
    const copies = buildDuplicates([row(), row({ id: 'p2' })])

    expect(copies.map(c => c.slug)).toEqual(['botton-sailor-moon-copia', 'botton-sailor-moon-copia-2'])
  })

  it('slug já ocupado no banco empurra a cópia para o próximo livre', () => {
    const [copy] = buildDuplicates([row()], new Set(['botton-sailor-moon-copia']))

    expect(copy.slug).toBe('botton-sailor-moon-copia-2')
  })
})

describe('exportCsv — compatível com o importador (RFN-03, A26)', () => {
  it('os cabeçalhos são exatamente os que o importador lê', () => {
    expect(CSV_COLUMNS).toEqual([
      'nome', 'descricao', 'preco', 'preco_comparativo', 'custo', 'estoque', 'slug', 'tags',
    ])
  })

  it('escapa vírgula, aspas e quebra de linha por RFC 4180', () => {
    expect(escapeCsvValue('Botton, o filme')).toBe('"Botton, o filme"')
    expect(escapeCsvValue('Diz "oi"')).toBe('"Diz ""oi"""')
    expect(escapeCsvValue('linha\nquebrada')).toBe('"linha\nquebrada"')
    expect(escapeCsvValue('simples')).toBe('simples')
  })

  it('produto com grade exporta o `base_price`, não a faixa', () => {
    const exported = toExportRow(
      row({
        price: 14.9,
        options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
        variants: [
          { id: 'v1', product_id: 'p1', option_values: {}, name: null, sku: null, price: 18.4, compare_price: null, stock: 1, weight_kg: null, image_url: null, is_active: true, position: 0 },
        ],
      }),
    )

    expect(exported.preco).toBe('14.9')
  })

  it('as tags viram lista separada por vírgula, como o importador relê', () => {
    expect(toExportRow(row()).tags).toBe('anime, sailor moon')
  })

  it('descrição e custo vêm da leitura extra, não da listagem', () => {
    const exported = toExportRow(row(), { description: 'Corpo', cost_price: 4.2 })

    expect(exported.descricao).toBe('Corpo')
    expect(exported.custo).toBe('4.2')
  })

  it('sem detalhe, descrição e custo saem vazios em vez de `undefined`', () => {
    const exported = toExportRow(row())

    expect(exported.descricao).toBe('')
    expect(exported.custo).toBe('')
  })

  it('o CSV tem cabeçalho e uma linha por produto, com CRLF', () => {
    const csv = toCsv([row(), row({ id: 'p2', name: 'Outro', slug: 'outro', tags: [] })])
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('nome,descricao,preco,preco_comparativo,custo,estoque,slug,tags')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Botton Sailor Moon')
    expect(lines[2]).toContain('Outro')
  })

  it('nome com vírgula não desloca as colunas seguintes', () => {
    const csv = toCsv([row({ name: 'Botton, edição rara' })])

    expect(csv.split('\r\n')[1].startsWith('"Botton, edição rara",')).toBe(true)
  })

  it('o nome do arquivo leva a data, sem hora', () => {
    expect(csvFileName(new Date('2026-08-01T15:30:00Z'))).toBe('produtos-2026-08-01.csv')
  })
})

describe('splitCategoryPatches — categoria não é coluna de produto (RFN-04)', () => {
  it('separa `category_ids` do resto do patch', () => {
    const { productPatches, categoryTargets } = splitCategoryPatches([
      { id: 'p1', values: { base_price: 9.9, category_ids: ['c1'] } },
    ])

    expect(productPatches).toEqual([{ id: 'p1', values: { base_price: 9.9 } }])
    expect(categoryTargets).toEqual([{ id: 'p1', categoryIds: ['c1'] }])
  })

  it('patch que SÓ tinha categorias não vira update de produto', () => {
    const { productPatches, categoryTargets } = splitCategoryPatches([
      { id: 'p1', values: { category_ids: ['c1'] } },
    ])

    expect(productPatches).toEqual([])
    expect(categoryTargets).toHaveLength(1)
  })

  it('patch sem categorias passa inteiro', () => {
    const { productPatches, categoryTargets } = splitCategoryPatches([
      { id: 'p1', values: { is_active: false } },
    ])

    expect(productPatches).toEqual([{ id: 'p1', values: { is_active: false } }])
    expect(categoryTargets).toEqual([])
  })
})

describe('planCategoryWrites — diff, não reescrita (RFN-04 AC 4)', () => {
  it('só o que entrou vira insert e só o que saiu vira delete', () => {
    const write = planCategoryWrites(
      [row({ category_ids: ['c1', 'c2'] })],
      [{ id: 'p1', categoryIds: ['c2', 'c3'] }],
    )

    expect(write.deletes).toEqual([{ product_id: 'p1', category_id: 'c1' }])
    expect(write.inserts).toEqual([{ product_id: 'p1', category_id: 'c3', position: 1 }])
  })

  it('vínculo que não mudou NÃO gera escrita nenhuma', () => {
    const write = planCategoryWrites(
      [row({ category_ids: ['c1', 'c2'] })],
      [{ id: 'p1', categoryIds: ['c1', 'c2'] }],
    )

    expect(isEmptyWrite(write)).toBe(true)
  })

  it('`Substituir` por lista vazia remove tudo', () => {
    const write = planCategoryWrites(
      [row({ category_ids: ['c1', 'c2'] })],
      [{ id: 'p1', categoryIds: [] }],
    )

    expect(write.deletes).toHaveLength(2)
    expect(write.inserts).toEqual([])
  })

  it('a `position` de quem entra segue a ordem da lista alvo', () => {
    const write = planCategoryWrites([row({ category_ids: [] })], [{ id: 'p1', categoryIds: ['a', 'b', 'c'] }])

    expect(write.inserts.map(i => i.position)).toEqual([0, 1, 2])
  })

  it('alvo sem linha correspondente é ignorado — não inventa vínculo órfão', () => {
    const write = planCategoryWrites([row()], [{ id: 'fantasma', categoryIds: ['c1'] }])

    expect(isEmptyWrite(write)).toBe(true)
  })
})
