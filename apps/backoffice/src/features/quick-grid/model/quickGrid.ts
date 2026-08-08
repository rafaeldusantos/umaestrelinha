// PLS-07 — as três funções puras da grade rápida.
//
// Toda a regra que pode errar em silêncio mora aqui: como o preço colado do Excel é interpretado,
// o que a linha herda dos padrões do lote, e como o cruzamento dos eixos vira grade. Testar isso
// sem montar a planilha é o que torna a task viável — e é onde um `1.234` virando `1,23` seria
// pego antes de virar 20 produtos com preço errado.

import { parseBRL } from '@estrelinha/core/formatters'
import { cartesian, skuFromParts } from '@estrelinha/core/pricing'
import type { OptionValues, ProductImage, ProductOption } from '@estrelinha/supabase/types'

/** A24: colar mais que isto trava a aba. Limitar com aviso é melhor que travar em silêncio. */
export const MAX_ROWS = 200

export type ColumnId = 'image' | 'name' | 'categories' | 'price' | 'stock' | 'tags' | 'skuBase'

/**
 * A ordem das colunas da planilha, do artboard.
 *
 * `imagem` não é colável — é arquivo, não texto. Ela existe na grade (RFN-05) e é ignorada pelo
 * `parseClipboardGrid`, que trabalha só sobre as colunas de TEXTO do TSV.
 */
export const GRID_COLUMNS: { id: ColumnId; label: string; required?: boolean; pasteable?: boolean }[] = [
  { id: 'image', label: 'Imagem' },
  { id: 'name', label: 'Nome', required: true, pasteable: true },
  { id: 'categories', label: 'Categorias', pasteable: true },
  { id: 'price', label: 'Preço', required: true, pasteable: true },
  { id: 'stock', label: 'Estoque', pasteable: true },
  { id: 'tags', label: 'Tags', pasteable: true },
  { id: 'skuBase', label: 'SKU base', pasteable: true },
]

/** As colunas que o TSV do Excel preenche, na ordem. `imagem` fica de fora por não ser texto. */
export const PASTEABLE_COLUMNS: ColumnId[] = GRID_COLUMNS.filter(c => c.pasteable).map(c => c.id)

export interface GridRow {
  /** RFN-05: a foto da linha, já no Storage. `null` = linha sem imagem. */
  imageUrl: string | null
  name: string
  categories: string[]
  /** `null` = não informado. Zero é um preço informado — e inválido, o que é diferente. */
  price: number | null
  stock: number | null
  tags: string[]
  skuBase: string
}

export interface GridDefaults {
  categoryIds: string[]
  /** Os eixos aplicados a TODAS as linhas — é daqui que sai a grade de cada produto (A4). */
  options: ProductOption[]
  weightKg: number | null
  /** Sempre rascunho no fluxo desenhado; fica explícito para não virar publicação por engano. */
  asDraft: boolean
}

export const emptyRow = (): GridRow => ({
  imageUrl: null,
  name: '',
  categories: [],
  price: null,
  stock: null,
  tags: [],
  skuBase: '',
})

export const emptyDefaults = (): GridDefaults => ({
  categoryIds: [],
  options: [],
  weightKg: null,
  asDraft: true,
})

const splitList = (raw: string): string[] =>
  raw.split(/[;,]/).map(v => v.trim()).filter(v => v !== '')

const parseInteger = (raw: string): number | null => {
  const digits = raw.replace(/[^\d-]/g, '')
  if (digits === '') return null
  const value = Number(digits)
  return Number.isFinite(value) ? value : null
}

export interface ParseResult {
  rows: GridRow[]
  /** Quantas linhas foram descartadas pelo teto (A24). `0` quando coube tudo. */
  truncated: number
}

/**
 * TSV do Excel → linhas.
 *
 * O separador é TAB porque é o que a planilha coloca na área de transferência; vírgula não serve,
 * já que `Categorias` e `Tags` a usam como separador interno. O preço passa pela **mesma** máscara
 * do formulário (`parseBRL`), senão `R$ 14,90` colado viraria `14` ou `NaN`.
 */
export const parseClipboardGrid = (
  text: string,
  columns: readonly ColumnId[] = PASTEABLE_COLUMNS,
): ParseResult => {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter(line => line.trim() !== '')

  const truncated = Math.max(0, lines.length - MAX_ROWS)
  const rows = lines.slice(0, MAX_ROWS).map(line => {
    const cells = line.split('\t')
    const row = emptyRow()
    columns.forEach((column, index) => {
      const cell = (cells[index] ?? '').trim()
      if (cell === '') return
      if (column === 'name') row.name = cell
      else if (column === 'categories') row.categories = splitList(cell)
      else if (column === 'price') row.price = parseBRL(cell)
      else if (column === 'stock') row.stock = parseInteger(cell)
      else if (column === 'tags') row.tags = splitList(cell)
      else if (column === 'skuBase') row.skuBase = cell
    })
    return row
  })

  return { rows, truncated }
}

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export interface RowError {
  field: ColumnId | 'slug'
  message: string
}

/**
 * @param existingSlugs Slugs já ocupados — os do banco **e** os das linhas acima, para pegar
 *                      colisão dentro do próprio lote.
 */
export const validateRow = (
  row: GridRow,
  _defaults: GridDefaults,
  existingSlugs: ReadonlySet<string>,
): RowError[] => {
  const errors: RowError[] = []

  if (row.name.trim() === '') {
    errors.push({ field: 'name', message: 'Nome é obrigatório' })
  }
  if (row.price === null) {
    errors.push({ field: 'price', message: 'Preço é obrigatório' })
  } else if (row.price <= 0) {
    errors.push({ field: 'price', message: 'Preço precisa ser maior que zero' })
  }

  const slug = slugify(row.name)
  if (slug !== '' && existingSlugs.has(slug)) {
    // Nomear a URL em conflito, não só "já existe": é a URL que o admin precisa mudar.
    errors.push({ field: 'slug', message: `já existe um produto com a URL /${slug}` })
  }

  return errors
}

/** Uma linha só é criada quando não tem erro nenhum. */
export const isRowReady = (errors: RowError[]): boolean => errors.length === 0

export interface RowStatus {
  row: GridRow
  index: number
  errors: RowError[]
}

/**
 * Valida o lote inteiro, acumulando os slugs já usados — assim duas linhas com o mesmo nome
 * colidem entre si, e não só contra o banco.
 */
export const validateRows = (
  rows: readonly GridRow[],
  defaults: GridDefaults,
  existingSlugs: ReadonlySet<string>,
): RowStatus[] => {
  const used = new Set(existingSlugs)
  return rows.map((row, index) => {
    const errors = validateRow(row, defaults, used)
    const slug = slugify(row.name)
    if (slug !== '') used.add(slug)
    return { row, index, errors }
  })
}

/** `7 prontas · 1 com erro` (AC 7). Linha totalmente vazia não conta como erro. */
export const footerSummary = (statuses: readonly RowStatus[]): string => {
  const preenchidas = statuses.filter(s => !isEmptyRow(s.row))
  const prontas = preenchidas.filter(s => isRowReady(s.errors)).length
  const comErro = preenchidas.length - prontas
  return `${prontas} pronta${prontas === 1 ? '' : 's'} · ${comErro} com erro`
}

export const isEmptyRow = (row: GridRow): boolean =>
  row.imageUrl === null &&
  row.name.trim() === '' &&
  row.price === null &&
  row.stock === null &&
  row.categories.length === 0 &&
  row.tags.length === 0 &&
  row.skuBase.trim() === ''

export interface ProductInsert {
  name: string
  slug: string
  base_price: number
  stock_total: number
  tags: string[]
  options: ProductOption[]
  stock_policy: 'track'
  is_active: boolean
  images: ProductImage[]
  weight_kg: number | null
}

export interface VariantInsert {
  /** Preenchido pelo chamador depois do insert dos produtos — aqui só o índice da linha. */
  rowIndex: number
  option_values: OptionValues
  price: number
  stock: number
  sku: string
  is_active: boolean
  position: number
}

/**
 * As linhas VÁLIDAS viram produtos + grade (A4).
 *
 * Cada produto nasce com a grade do cruzamento dos eixos padrão, herdando o preço da linha — é
 * exatamente o que economiza as 20 idas ao formulário. Sem eixo declarado, o produto nasce simples
 * e a lista de variações sai vazia.
 */
export const buildInsertBatch = (
  rows: readonly GridRow[],
  defaults: GridDefaults,
  existingSlugs: ReadonlySet<string> = new Set(),
): { products: ProductInsert[]; variants: VariantInsert[] } => {
  const statuses = validateRows(rows, defaults, existingSlugs).filter(
    status => !isEmptyRow(status.row) && isRowReady(status.errors),
  )

  const products: ProductInsert[] = []
  const variants: VariantInsert[] = []
  const combos = cartesian(defaults.options)

  statuses.forEach((status, productIndex) => {
    const { row } = status
    const slug = slugify(row.name)
    products.push({
      name: row.name.trim(),
      slug,
      base_price: row.price!,
      stock_total: row.stock ?? 0,
      tags: row.tags,
      options: defaults.options,
      stock_policy: 'track',
      // AC 8: criado como RASCUNHO. Publicar 20 produtos sem revisar é o oposto do que a tela pede.
      is_active: !defaults.asDraft ? true : false,
      // RFN-05 AC 4: a foto da linha entra no mesmo formato da aba Mídia. Alt vem do nome, pelo
      // mesmo template puro de PMD-01 — sem inventar um segundo gerador.
      images: row.imageUrl
        ? [{ url: row.imageUrl, alt: row.name.trim() || null, source: 'upload' as const }]
        : [],
      weight_kg: defaults.weightKg,
    })

    combos.forEach((values, position) => {
      variants.push({
        rowIndex: productIndex,
        option_values: values,
        price: row.price!,
        stock: row.stock ?? 0,
        sku: skuFromParts(row.skuBase.trim() || slug, values, defaults.options),
        is_active: true,
        position,
      })
    })
  })

  return { products, variants }
}
