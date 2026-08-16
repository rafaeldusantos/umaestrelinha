// Persistência do modelo novo (T21b — PFM-05 AC 4, PFM-07 AC 5, PFM-08, PFM-09).
//
// Por que esta task existe: nenhuma das 11 tasks originais da feature 11 gravava `options`,
// `product_categories` ou `product_variants`. Os editores todos escrevem no estado, e sem isto o
// formulário editaria e não salvaria — com a spec exigindo o contrário em `P1.4 AC 4`.
//
// O planejamento é **puro** e testado sem banco; a execução é uma função só, com o client injetado.
// A razão é a de sempre no projeto: a regra decidível sai do I/O e vira prova de test runner.
//
// ⚠️ **Atomicidade declarada, não fingida.** `supabase-js` não abre transação entre chamadas: são
// requisições HTTP independentes. Gravar produto + categorias + grade são 3 escritas, e uma falha na
// terceira deixa as duas primeiras aplicadas. Atomicidade real exigiria uma RPC no Postgres — que é
// como o projeto já resolve isso quando precisa (`apply_payment_approval`, `claim_order_email`). Aqui
// a escolha foi: **parar no primeiro erro, dizer qual passo falhou, e nunca reportar sucesso.** O
// admin reabre o formulário e vê o que entrou; o alternativo é um "salvo!" mentiroso.

import type { ProductCategoryLink, ProductVariant } from '@estrelinha/supabase/types'
import { planFaqLinks, type ProductFaqSelection } from './planFaqLinks'

// --- Identidade de linha nova ------------------------------------------------------------------

/**
 * Prefixo do id temporário de uma linha que a grade acabou de criar e que o banco ainda não conhece.
 *
 * Existir é o que permite `planVariants` distinguir "inserir" de "atualizar" sem heurística. E o
 * prefixo é o que garante o inverso do erro caro: uma linha com id **real** nunca é recriada, então
 * `order_items.variant_id` (FK `NO ACTION`) nunca fica órfã.
 */
export const TEMP_VARIANT_PREFIX = 'tmp-'

let tempCounter = 0

/** Id temporário para linha nova. Serve de `key` no React e é trocado pelo id real no save. */
export const tempVariantId = (): string => `${TEMP_VARIANT_PREFIX}${++tempCounter}`

export const isTempVariantId = (id: string): boolean => id.startsWith(TEMP_VARIANT_PREFIX)

// --- Plano de categorias -----------------------------------------------------------------------

export interface CategoryLinkPlan {
  /** Vínculos a gravar, com `position` = ordem de seleção (PFM-05 AC 4). */
  toUpsert: ProductCategoryLink[]
  /** `category_id` dos vínculos que o admin removeu. */
  toDelete: string[]
}

/**
 * @param selected Categorias na ordem em que o admin as escolheu.
 * @param saved    O que está no banco hoje.
 */
export const planCategoryLinks = (
  selected: readonly string[],
  saved: readonly string[],
): CategoryLinkPlan => {
  // Duplicata na seleção viraria violação da PK composta `(product_id, category_id)`.
  const unique: string[] = []
  for (const id of selected) {
    if (id !== '' && !unique.includes(id)) unique.push(id)
  }
  return {
    // Todos os presentes vão no upsert, não só os novos: reordenar muda a `position` de linhas que
    // já existiam, e sem regravá-las o selo da vitrine (PST-06) ficaria na ordem antiga.
    toUpsert: unique.map((category_id, position) => ({ category_id, position })),
    toDelete: saved.filter(id => !unique.includes(id)),
  }
}

// --- Plano da grade ----------------------------------------------------------------------------

/** Uma linha nova, sem `id` — o banco gera o dele. */
export type NewVariant = Omit<ProductVariant, 'id'>

export interface VariantPlan {
  toInsert: NewVariant[]
  toUpdate: ProductVariant[]
  /** `id` das linhas que saíram da grade. */
  toDelete: string[]
}

/** Duas linhas são iguais quando todo campo persistido é igual — só o que mudou vai para o update. */
const sameVariant = (a: ProductVariant, b: ProductVariant): boolean =>
  a.sku === b.sku &&
  a.name === b.name &&
  a.price === b.price &&
  a.compare_price === b.compare_price &&
  a.stock === b.stock &&
  a.weight_kg === b.weight_kg &&
  a.image_url === b.image_url &&
  a.is_active === b.is_active &&
  a.position === b.position &&
  JSON.stringify(a.option_values) === JSON.stringify(b.option_values)

export const planVariants = (
  next: readonly ProductVariant[],
  saved: readonly ProductVariant[],
): VariantPlan => {
  const savedById = new Map(saved.map(v => [v.id, v]))
  const toInsert: NewVariant[] = []
  const toUpdate: ProductVariant[] = []

  for (const variant of next) {
    if (isTempVariantId(variant.id)) {
      const { id: _ignored, ...rest } = variant
      toInsert.push(rest)
      continue
    }
    const before = savedById.get(variant.id)
    // Id real que o banco não conhece: não inventar insert com id forjado. A linha é ignorada —
    // inserir com id de outro produto ou já apagado seria corromper a FK do histórico.
    if (!before) continue
    if (!sameVariant(variant, before)) toUpdate.push(variant)
  }

  const keptIds = new Set(next.filter(v => !isTempVariantId(v.id)).map(v => v.id))
  return { toInsert, toUpdate, toDelete: saved.filter(v => !keptIds.has(v.id)).map(v => v.id) }
}

// --- Execução ----------------------------------------------------------------------------------

/** Qual escrita falhou. Vai para a mensagem que o admin lê — "erro ao salvar" não é acionável. */
export type PersistStep = 'categorias' | 'perguntas' | 'grade'

export interface PersistFailure {
  ok: false
  step: PersistStep
  message: string
}

export type PersistResult = { ok: true } | PersistFailure

/**
 * Estreitamento explícito em vez de `if (!result.ok)`.
 *
 * O backoffice compila com `strictNullChecks: false`, e sem ele o TypeScript widena o literal
 * booleano do discriminante — o narrowing por `!result.ok` não estreita, e `result.step` vira erro
 * de tipo. Um type guard funciona nos dois modos.
 */
export const isPersistFailure = (result: PersistResult): result is PersistFailure => !result.ok

/** A fatia de `supabase-js` que esta função usa. Dublê pequeno = teste que prova o que importa. */
export interface PersistClient {
  from: (table: string) => {
    insert: (rows: unknown) => Promise<{ error: { message: string } | null }>
    upsert: (
      rows: unknown,
      options?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>
    update: (values: unknown) => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
    }
    delete: () => {
      eq: (
        column: string,
        value: string,
      ) => {
        in: (column: string, values: readonly string[]) => Promise<{ error: { message: string } | null }>
      }
    }
  }
}

/**
 * Grava as duas tabelas que precisam de diff. `products` em si é gravada pelo chamador — é um
 * `update` simples de colunas, sem plano nenhum.
 *
 * Para no primeiro erro (ver a nota de atomicidade no topo).
 */
export const persistProductRelations = async (
  client: PersistClient,
  productId: string,
  input: {
    categoryIds: readonly string[]
    variants: readonly ProductVariant[]
    faqs?: readonly ProductFaqSelection[]
  },
  saved: {
    categoryIds: readonly string[]
    variants: readonly ProductVariant[]
    faqs?: readonly string[]
  },
): Promise<PersistResult> => {
  const categories = planCategoryLinks(input.categoryIds, saved.categoryIds)

  if (categories.toDelete.length > 0) {
    const { error } = await client
      .from('product_categories')
      .delete()
      .eq('product_id', productId)
      .in('category_id', categories.toDelete)
    if (error) return { ok: false, step: 'categorias', message: error.message }
  }

  if (categories.toUpsert.length > 0) {
    const { error } = await client.from('product_categories').upsert(
      categories.toUpsert.map(link => ({ ...link, product_id: productId })),
      { onConflict: 'product_id,category_id' },
    )
    if (error) return { ok: false, step: 'categorias', message: error.message }
  }

  // Perguntas frequentes (feature 28) — mesmo molde das categorias, e no mesmo bloco de propósito:
  // são as duas tabelas de vínculo do produto, e separá-las daria dois lugares para esquecer o diff.
  //
  // `input.faqs` **undefined** significa "esta tela não edita perguntas", e não "apague todas". A
  // distinção existe porque a grade rápida e a edição em massa também chamam esta função.
  if (input.faqs !== undefined) {
    const faqs = planFaqLinks(input.faqs, saved.faqs ?? [])

    if (faqs.toDelete.length > 0) {
      const { error } = await client
        .from('product_faqs')
        .delete()
        .eq('product_id', productId)
        .in('faq_id', faqs.toDelete)
      if (error) return { ok: false, step: 'perguntas', message: error.message }
    }

    if (faqs.toUpsert.length > 0) {
      const { error } = await client.from('product_faqs').upsert(
        faqs.toUpsert.map(link => ({ ...link, product_id: productId })),
        { onConflict: 'product_id,faq_id' },
      )
      if (error) return { ok: false, step: 'perguntas', message: error.message }
    }
  }

  const grid = planVariants(input.variants, saved.variants)

  // A ordem importa: apagar ANTES de inserir. `product_variants.sku` é UNIQUE global, então mover um
  // SKU de uma linha removida para uma nova colidiria se a inserção viesse primeiro.
  if (grid.toDelete.length > 0) {
    const { error } = await client
      .from('product_variants')
      .delete()
      .eq('product_id', productId)
      .in('id', grid.toDelete)
    if (error) return { ok: false, step: 'grade', message: error.message }
  }

  for (const variant of grid.toUpdate) {
    const { id, ...values } = variant
    const { error } = await client.from('product_variants').update(values).eq('id', id)
    if (error) return { ok: false, step: 'grade', message: error.message }
  }

  if (grid.toInsert.length > 0) {
    const { error } = await client
      .from('product_variants')
      .insert(grid.toInsert.map(v => ({ ...v, product_id: productId })))
    if (error) return { ok: false, step: 'grade', message: error.message }
  }

  return { ok: true }
}
