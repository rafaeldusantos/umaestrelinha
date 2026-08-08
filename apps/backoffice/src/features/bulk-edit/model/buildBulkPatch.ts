// PLS-06 — a aritmética da edição em massa, pura.
//
// É aqui que um erro custa dinheiro em silêncio: um `+10%` que vira `+1%` reprecifica o catálogo
// inteiro e ninguém percebe até o fechamento do mês. Por isso a conta vive fora do painel, com
// teste contra cálculo manual — e por isso a prévia mostra antes → depois **antes** de gravar.

import type { AdminListRow } from '@/entities/product/api/productQuery'

export type PriceMode = 'set' | 'increase' | 'decrease' | 'round'
export type StockMode = 'set' | 'add' | 'subtract'
export type StatusMode = 'activate' | 'pause' | 'schedule'
export type ListMode = 'add' | 'remove' | 'replace'

export interface BulkFields {
  /** Campo ausente = interruptor desligado. É o que garante "só o que está ligado muda". */
  price?: { mode: PriceMode; value: number; endingIn90: boolean }
  stock?: { mode: StockMode; value: number }
  status?: { mode: StatusMode; scheduledAt?: string | null }
  tags?: { mode: Exclude<ListMode, 'replace'>; values: string[] }
  categories?: { mode: ListMode; values: string[] }
}

export interface BulkPatch {
  id: string
  values: Record<string, unknown>
}

export interface IgnoredRow {
  id: string
  name: string
  field: 'stock'
  reason: string
}

export interface PreviewRow {
  id: string
  name: string
  before: number
  after: number
}

export interface ImpactPreview {
  /** As primeiras linhas afetadas, para conferência a olho. */
  rows: PreviewRow[]
  /** Ticket médio de preço antes e depois — só faz sentido quando o campo Preço está ligado. */
  avgBefore: number | null
  avgAfter: number | null
  warnings: string[]
}

export interface BulkResult {
  patches: BulkPatch[]
  ignored: IgnoredRow[]
  preview: ImpactPreview
}

const PREVIEW_ROWS = 5

const toCents = (value: number) => Math.round(value * 100) / 100

/**
 * O menor valor terminado em `,90` que **não é menor** que o preço calculado.
 *
 * Arredonda para CIMA de propósito: pedir `+10%` e receber um preço abaixo do +10% (é o que o
 * arredondamento para o mais próximo faria com 14,90 → 16,39 → 15,90) transformaria um reajuste em
 * um desconto sem ninguém pedir.
 */
export const roundToEnding90 = (value: number): number => {
  if (value <= 0.9) return 0.9
  const base = Math.floor(value)
  const candidate = base - 0.1
  // `16,39` → base 16 → 15,90 é menor, então sobe para 16,90.
  return toCents(candidate >= value ? candidate : base + 0.9)
}

const applyPriceMode = (price: number, field: NonNullable<BulkFields['price']>): number => {
  const raw =
    field.mode === 'set' ? field.value
      : field.mode === 'increase' ? price * (1 + field.value / 100)
      : field.mode === 'decrease' ? price * (1 - field.value / 100)
      : price // `round`: o modo é só o arredondamento

  const bounded = Math.max(0, raw)
  return field.endingIn90 ? roundToEnding90(bounded) : toCents(bounded)
}

const applyList = (current: string[], mode: ListMode, values: string[]): string[] => {
  if (mode === 'replace') return [...values]
  if (mode === 'remove') return current.filter(v => !values.includes(v))
  return [...new Set([...current, ...values])]
}

/** Produto que não controla estoque não tem saldo para somar; produto com grade tem por linha. */
const stockIgnoreReason = (row: AdminListRow): string | null => {
  if (row.stock_policy === 'none') return 'não controla estoque'
  if (row.options.length > 0 && row.variants.some(v => v.is_active && v.price !== null)) {
    return 'estoque é por variação'
  }
  return null
}

export const buildBulkPatch = (selection: readonly AdminListRow[], fields: BulkFields): BulkResult => {
  const patches: BulkPatch[] = []
  const ignored: IgnoredRow[] = []
  const previewRows: PreviewRow[] = []
  const warnings: string[] = []

  for (const row of selection) {
    const values: Record<string, unknown> = {}

    if (fields.price) {
      const after = applyPriceMode(row.price, fields.price)
      values.base_price = after
      if (previewRows.length < PREVIEW_ROWS) {
        previewRows.push({ id: row.id, name: row.name, before: row.price, after })
      }
    }

    if (fields.stock) {
      const reason = stockIgnoreReason(row)
      if (reason) {
        ignored.push({ id: row.id, name: row.name, field: 'stock', reason })
      } else {
        const next =
          fields.stock.mode === 'set' ? fields.stock.value
            : fields.stock.mode === 'add' ? row.stock_total + fields.stock.value
            : row.stock_total - fields.stock.value
        // Saldo negativo não existe no estoque; subtrair demais para em zero.
        values.stock_total = Math.max(0, Math.round(next))
      }
    }

    if (fields.status) {
      if (fields.status.mode === 'activate') values.is_active = true
      if (fields.status.mode === 'pause') values.is_active = false
      if (fields.status.mode === 'schedule') {
        values.scheduled_at = fields.status.scheduledAt ?? null
        // Agendar sem tirar da loja não agenda nada: o produto já está publicado.
        values.is_active = false
      }
    }

    if (fields.tags) {
      values.tags = applyList(row.tags, fields.tags.mode, fields.tags.values)
    }

    // Categorias são N:N (`product_categories`), não coluna: o patch carrega a lista alvo e quem
    // grava é o chamador, com o mesmo diff que o formulário usa.
    if (fields.categories) {
      values.category_ids = applyList(row.category_ids, fields.categories.mode, fields.categories.values)
    }

    if (Object.keys(values).length > 0) patches.push({ id: row.id, values })
  }

  if (ignored.length > 0) {
    warnings.push(`${ignored.length} produto(s) ignorado(s) no campo Estoque`)
  }
  if (fields.categories?.mode === 'replace') {
    warnings.push('Substituir categorias remove as categorias atuais dos produtos selecionados')
  }
  if (fields.price?.mode === 'set' && fields.price.value === 0) {
    warnings.push('Definir o preço como R$ 0,00 tira os produtos de venda')
  }

  const priced = fields.price ? selection : []
  const avgBefore = priced.length > 0 ? toCents(priced.reduce((s, r) => s + r.price, 0) / priced.length) : null
  const avgAfter =
    priced.length > 0
      ? toCents(priced.reduce((s, r) => s + applyPriceMode(r.price, fields.price!), 0) / priced.length)
      : null

  return { patches, ignored, preview: { rows: previewRows, avgBefore, avgAfter, warnings } }
}

/**
 * O snapshot do estado ANTERIOR das linhas que serão alteradas — é o que o desfazer regrava.
 *
 * Só as colunas que o patch toca entram: devolver a linha inteira faria o desfazer sobrescrever
 * campos que outra pessoa mudou nesse meio tempo.
 */
export const snapshotFor = (
  selection: readonly AdminListRow[],
  patches: readonly BulkPatch[],
): BulkPatch[] =>
  patches.map(patch => {
    const row = selection.find(r => r.id === patch.id)!
    const values: Record<string, unknown> = {}
    if ('base_price' in patch.values) values.base_price = row.price
    if ('stock_total' in patch.values) values.stock_total = row.stock_total
    if ('is_active' in patch.values) values.is_active = row.is_active
    if ('scheduled_at' in patch.values) values.scheduled_at = row.scheduled_at
    if ('tags' in patch.values) values.tags = row.tags
    if ('category_ids' in patch.values) values.category_ids = row.category_ids
    return { id: patch.id, values }
  })
