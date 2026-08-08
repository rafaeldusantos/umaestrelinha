// RFN-07 — os fatos do card Resumo, como funções puras.
//
// O artboard mostra **faixa de preço**, não preço. A diferença não é cosmética: produto com grade
// não vende pelo `base_price` (`resolveItemPrice`, feature 07), então mostrar `R$ 4,90` no inspetor
// de um produto que a loja cobra `R$ 14,90 – 18,40` é a mesma classe de mentira entre tela e
// cobrança que o programa inteiro existiu para matar.

import { priceRange } from '@estrelinha/core/pricing'
import type {
  ProductImage,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@estrelinha/supabase/types'

export interface SummaryInput {
  price: number
  cost_price: number
  options: ProductOption[]
  variants: ProductVariant[]
  images: ProductImage[]
  weight_kg: number
  /** O saldo do produto SEM grade. Com grade, quem baixa é a linha vendida. */
  stock_total: number
  /** `none` = sob demanda: não existe saldo a mostrar (ver `stockFact`). */
  stock_policy: StockPolicy
}

export type PriceSummary =
  | { kind: 'single'; label: string; min: number }
  | { kind: 'range'; label: string; min: number; max: number }

const hasSellableGrid = (form: Pick<SummaryInput, 'options' | 'variants'>) =>
  form.options.length > 0 && form.variants.some(v => v.is_active && v.price !== null)

/**
 * A faixa quando há grade vendável; o preço padrão quando não há.
 *
 * `label` é o rótulo do card — `Faixa de preço` só é honesto quando existe faixa.
 */
export const priceSummary = (form: SummaryInput): PriceSummary => {
  const range = hasSellableGrid(form) ? priceRange(form.variants) : null
  if (!range || range.min === range.max) {
    return { kind: 'single', label: 'Preço', min: range?.min ?? form.price }
  }
  return { kind: 'range', label: 'Faixa de preço', min: range.min, max: range.max }
}

/** `6 · 1 pausada`. Sem variação, `null` — a linha some do card em vez de mostrar zero. */
export const variantsFact = (form: SummaryInput): string | null => {
  if (form.variants.length === 0) return null
  const paused = form.variants.filter(v => !v.is_active).length
  if (paused === 0) return String(form.variants.length)
  return `${form.variants.length} · ${paused} pausada${paused === 1 ? '' : 's'}`
}

export interface StockFact {
  /** O rótulo da linha. `somado` só é verdade quando existem linhas para somar. */
  label: string
  value: string
}

/**
 * O estoque do card Resumo — **rótulo e valor juntos**, porque separá-los foi o defeito.
 *
 * Três casos, não um:
 * - política `Não controlar`: não existe saldo. Mostrar `0 un.` aqui anuncia esgotado justamente no
 *   modo em que a loja **nunca** esgota — o inverso do que o admin acabou de configurar.
 * - com grade vendável: a soma das linhas ativas, que é quem a loja baixa.
 * - sem grade: o saldo do próprio produto (`stock_total`). A versão anterior devolvia `0` fixo neste
 *   caso, contra o que o próprio comentário prometia — produto sem variação exibia `0 un.` com 40
 *   peças no estoque.
 */
export const stockFact = (form: SummaryInput): StockFact => {
  if (form.stock_policy === 'none') return { label: 'Estoque', value: 'Não controla' }
  if (hasSellableGrid(form)) {
    const total = form.variants
      .filter(v => v.is_active)
      .reduce((sum, v) => sum + (v.stock ?? 0), 0)
    return { label: 'Estoque somado', value: `${total} un.` }
  }
  return { label: 'Estoque', value: `${form.stock_total ?? 0} un.` }
}

/** `3 · 2 de mockup`. A origem vem de `images[].source`, não de heurística sobre a URL. */
export const imagesFact = (form: SummaryInput): string => {
  const mockups = form.images.filter(image => image.source === 'mockup').length
  if (mockups === 0) return String(form.images.length)
  return `${form.images.length} · ${mockups} de mockup`
}

/** `18 g`. O banco guarda kg; o artboard mostra grama, que é como o botton se pesa. */
export const weightFact = (form: SummaryInput): string =>
  `${Math.round((form.weight_kg ?? 0) * 1000)} g`

/** O `4 de 6` e a barra. `ratio` é 0..1 para a largura da barra. */
export const checklistProgress = (
  items: readonly { ok: boolean }[],
): { done: number; total: number; label: string; ratio: number } => {
  const done = items.filter(item => item.ok).length
  const total = items.length
  return {
    done,
    total,
    label: `${done} de ${total}`,
    ratio: total === 0 ? 0 : done / total,
  }
}
