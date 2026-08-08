// PLS-04 — o que cada coluna da listagem mostra, como função pura.
//
// Estas regras decidem se um número aparece, se uma célula é editável e se um aviso acende. Erradas,
// elas não quebram nada: mostram a lista errada, calada. Por isso vivem fora do componente, com
// teste 1:1 com as ACs.
//
// A precedência é a mesma da vitrine: **a grade manda no preço**. Se o produto tem linhas
// vendáveis, o `base_price` não é o que o caixa cobra (`07`/`resolveItemPrice`), e editar o campo
// errado na listagem seria anunciar um valor que a loja não pratica.

import { priceRange } from '@nanapin/core/pricing'
import type { AdminListRow } from '@/entities/product/api/productQuery'

/** Uma linha é vendável quando está ativa e tem preço. Mesma regra de `priceRange`. */
const isSellable = (v: AdminListRow['variants'][number]) => v.is_active && v.price !== null

/**
 * PST-10 (regra da `07`): variação ativa **com** `options` vazio é grade incompleta — a loja não
 * consegue mostrar seletor para ela, então o produto fica com uma linha que ninguém consegue
 * escolher. Aqui vira badge; lá vira produto simples.
 */
export const hasIncompleteGrid = (row: AdminListRow): boolean =>
  row.options.length === 0 && row.variants.some(v => v.is_active)

/** Tem grade que a loja consegue vender: eixo declarado + ao menos uma linha vendável. */
export const hasSellableGrid = (row: AdminListRow): boolean =>
  row.options.length > 0 && row.variants.some(isSellable)

export type PriceCell =
  | { kind: 'single'; price: number; editable: true }
  | { kind: 'range'; min: number; max: number; count: number; editable: false; reason: string }

/** Por que a célula de preço fica travada. Desabilitar sem dizer por quê lê como bug (spec). */
export const PRICE_LOCKED_REASON =
  'O preço deste produto vive na grade de variações — edite na aba Preços & variações.'

export const priceCell = (row: AdminListRow): PriceCell => {
  const range = hasSellableGrid(row) ? priceRange(row.variants) : null
  if (!range) return { kind: 'single', price: row.price, editable: true }
  return {
    kind: 'range',
    min: range.min,
    max: range.max,
    count: range.count,
    editable: false,
    reason: PRICE_LOCKED_REASON,
  }
}

export type StockCell =
  | { kind: 'always'; editable: false; label: string }
  | { kind: 'grid'; total: number; editable: false; reason: string }
  | { kind: 'number'; total: number; editable: true; low: boolean }

/** PLS-04: `stock_policy: none` é o modo dos personalizados — não há saldo para editar. */
export const stockCell = (row: AdminListRow): StockCell => {
  if (row.stock_policy === 'none') {
    return { kind: 'always', editable: false, label: 'sempre disponível' }
  }
  if (hasSellableGrid(row)) {
    // Com grade, o saldo é a soma das linhas — e cada linha tem o próprio. Editar um número só aqui
    // gravaria em `products.stock_total`, que a loja com grade nem lê.
    return {
      kind: 'grid',
      total: row.variants.filter(v => v.is_active).reduce((sum, v) => sum + (v.stock ?? 0), 0),
      editable: false,
      reason: 'O estoque deste produto é por variação — edite na grade.',
    }
  }
  return {
    kind: 'number',
    total: row.stock_total,
    editable: true,
    low: row.stock_total > 0 && row.stock_total <= row.low_stock_threshold,
  }
}

export type StatusKind = 'ativo' | 'esgotado' | 'rascunho' | 'agendado'

export interface StatusCell {
  kind: StatusKind
  label: string
}

/**
 * PLS-04 AC 12. A ordem importa: agendado vence ativo (ainda não está na loja), e esgotado só faz
 * sentido para quem controla estoque.
 */
export const statusCell = (row: AdminListRow, now: Date = new Date()): StatusCell => {
  if (row.scheduled_at && new Date(row.scheduled_at) > now) {
    return { kind: 'agendado', label: `Agendado · ${formatScheduled(row.scheduled_at)}` }
  }
  if (!row.is_active) return { kind: 'rascunho', label: 'Rascunho' }

  const stock = stockCell(row)
  const esgotado =
    (stock.kind === 'number' && stock.total === 0) || (stock.kind === 'grid' && stock.total === 0)
  if (row.stock_policy === 'track' && esgotado) return { kind: 'esgotado', label: 'Esgotado' }

  return { kind: 'ativo', label: 'Ativo' }
}

const formatScheduled = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
}

export type RowBadge = 'sem imagem' | 'grade incompleta' | 'sem SEO'

/** Pendências que o admin resolve de dentro da própria listagem. */
export const rowBadges = (row: AdminListRow): RowBadge[] => {
  const badges: RowBadge[] = []
  if (row.images.length === 0) badges.push('sem imagem')
  if (hasIncompleteGrid(row)) badges.push('grade incompleta')
  if (!row.seo_title?.trim() || !row.seo_description?.trim()) badges.push('sem SEO')
  return badges
}
