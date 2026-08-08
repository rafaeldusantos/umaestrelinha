// RFN-01 — `Duplicar` da barra de massa.
//
// Cópia **rasa e rascunho**: nome, preço, estoque, tags, eixos e política. A grade de variações
// **não** é copiada — está declarado fora de escopo desde a `13` (copiar N linhas de
// `product_variants` exige um segundo insert com os ids recém-criados e um diff próprio, e é
// feature, não atalho de barra).
//
// O slug é o ponto que erra em silêncio: dois produtos com o mesmo slug violam o `UNIQUE` e o
// insert em lote inteiro falha — 12 cópias perdidas por causa de uma. Por isso a folga é calculada
// aqui, contra os slugs já ocupados **e** contra as cópias anteriores do mesmo lote.

import type { AdminListRow } from '@/entities/product/api/productQuery'

const COPY_SUFFIX = ' (cópia)'

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

/**
 * O primeiro slug livre a partir de `base`: `base-copia`, `base-copia-2`, `base-copia-3`…
 *
 * Não usa timestamp nem random de propósito — slug é URL, e URL de rascunho que muda a cada
 * duplicação é impossível de conferir a olho.
 */
export const freeSlug = (base: string, taken: ReadonlySet<string>): string => {
  const root = `${base}-copia`
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${n}`)) n += 1
  return `${root}-${n}`
}

export interface DuplicateInsert {
  name: string
  slug: string
  description: string
  base_price: number
  original_price: number | null
  stock_total: number
  low_stock_threshold: number
  stock_policy: AdminListRow['stock_policy']
  options: AdminListRow['options']
  tags: string[]
  images: AdminListRow['images']
  is_active: false
  seo_title: null
  seo_description: null
  scheduled_at: null
}

export const buildDuplicates = (
  rows: readonly AdminListRow[],
  takenSlugs: ReadonlySet<string> = new Set(),
): DuplicateInsert[] => {
  const taken = new Set(takenSlugs)
  return rows.map(row => {
    const slug = freeSlug(slugify(row.name) || slugify(row.slug) || 'produto', taken)
    taken.add(slug)
    return {
      name: `${row.name}${COPY_SUFFIX}`,
      slug,
      // A listagem não traz `description` (é HTML inteiro, fora do `LIST_SELECT`); a cópia nasce
      // sem ela em vez de a listagem passar a carregar o corpo de 25 produtos por página.
      description: '',
      base_price: row.price,
      original_price: row.compare_price,
      stock_total: row.stock_total,
      low_stock_threshold: row.low_stock_threshold,
      stock_policy: row.stock_policy,
      options: row.options,
      tags: row.tags,
      images: row.images,
      // Cópia é sempre rascunho: publicar 12 duplicatas sem revisar é o oposto do que a ação faz.
      is_active: false,
      // SEO não se copia — dois produtos com o mesmo título de busca competem entre si.
      seo_title: null,
      seo_description: null,
      scheduled_at: null,
    }
  })
}
