import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@nanapin/supabase/client'
import { normalizeImages } from '@nanapin/core/media'
import { normalizeOptions, normalizeVariants, toStockPolicy, categoryIdsFromLinks } from '@nanapin/core/product'
import type { DbProduct } from '@nanapin/supabase/types'
import {
  escapeSearchTerm,
  pageRange,
  PRODUCT_VIEWS,
  SORT_COLUMN,
  type AdminListRow,
  type ProductQuery,
  type ProductViewId,
} from './productQuery'

export interface AdminProduct extends DbProduct {
  category_name?: string
}

/**
 * O catálogo inteiro, para os SELETORES (produtos relacionados, compre junto, order bump,
 * coleções). Não é o caminho da listagem — esse é `useAdminProductList`, que pagina e conta no
 * servidor (PLS-01).
 *
 * Continua trazendo tudo de propósito: um `<select>` de produto precisa da lista fechada, e três
 * telas dependem disso. Trocar por busca paginada nesses seletores é outra feature.
 */
export const useAdminProducts = () => {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })

    if (error || !data) {
      setProducts([])
    } else {
      setProducts(data.map((p: any) => ({
        ...p,
        images: normalizeImages(p.images),
        tags: p.tags ?? [],
        price: p.base_price ?? p.price ?? 0,
        compare_price: p.original_price ?? p.compare_price ?? null,
        stock_total: p.stock_total ?? 0,
        low_stock_threshold: p.low_stock_threshold ?? 5,
        category_name: p.categories?.name,
      })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const getProduct = useCallback(async (id: string): Promise<AdminProduct | null> => {
    const cached = products.find(p => p.id === id)
    if (cached) return cached

    const { data, error } = await supabase.from('products').select('*, categories(name)').eq('id', id).single()
    if (error || !data) return null
    return {
      ...data,
      images: normalizeImages(data.images),
      tags: data.tags ?? [],
      price: data.base_price ?? data.price ?? 0,
      compare_price: data.original_price ?? data.compare_price ?? null,
      stock_total: data.stock_total ?? 0,
      low_stock_threshold: data.low_stock_threshold ?? 5,
      related_product_ids: data.related_product_ids ?? [], buy_together_ids: data.buy_together_ids ?? [],
      variants: normalizeVariants(data.product_variants, data.id),
      category_name: (data as any).categories?.name,
    }
  }, [products])

  /**
   * Devolve `{ error, id }`: o `id` é indispensável para gravar `product_categories` e
   * `product_variants` de um produto NOVO (11/T21b) — sem ele as relações não têm dono.
   * O retorno de erro segue compatível com quem só checa `error`.
   */
  const createProduct = async (product: Record<string, any>) => {
    const { data, error } = await supabase.from('products').insert(product).select('id').maybeSingle()
    if (!error) await fetchProducts()
    return { error, id: (data as { id?: string } | null)?.id ?? null }
  }

  const updateProduct = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('products').update(updates).eq('id', id)
    if (!error) await fetchProducts()
    return error
  }

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) await fetchProducts()
    return error
  }

  return { products, loading, fetchProducts, getProduct, createProduct, updateProduct, deleteProduct }
}

// === Listagem v2: paginação, filtro e contagem NO SERVIDOR (PLS-01) ==============================

/**
 * As colunas que a listagem mostra — nomeadas, não `*`.
 *
 * `select('*')` traria `description` (HTML inteiro) e a coluna legada `variants` de cada linha; com
 * 25 linhas por página isso é o mesmo desperdício de antes, só que paginado. Nomear também deixa a
 * remoção das colunas legadas (`T42`) sem nada para atualizar aqui.
 */
export const LIST_SELECT = [
  'id', 'name', 'slug', 'base_price', 'original_price', 'images', 'tags',
  'is_active', 'stock_total', 'low_stock_threshold', 'stock_policy', 'options',
  'seo_title', 'seo_description', 'scheduled_at', 'created_at', 'updated_at',
  'product_variants(id, product_id, sku, name, price, compare_price, stock, weight_kg, image_url, is_active, position, option_values)',
  'product_categories(category_id, position)',
].join(', ')

/* eslint-disable @typescript-eslint/no-explicit-any */
export const toListRow = (row: any): AdminListRow => ({
  id: row.id,
  name: row.name ?? '',
  slug: row.slug ?? '',
  price: row.base_price ?? 0,
  compare_price: row.original_price ?? null,
  images: normalizeImages(row.images),
  tags: Array.isArray(row.tags) ? row.tags : [],
  is_active: row.is_active ?? false,
  stock_total: row.stock_total ?? 0,
  low_stock_threshold: row.low_stock_threshold ?? 5,
  stock_policy: toStockPolicy(row.stock_policy),
  options: normalizeOptions(row.options),
  variants: normalizeVariants(row.product_variants, row.id),
  category_ids: categoryIdsFromLinks(row.product_categories),
  seo_title: row.seo_title ?? null,
  seo_description: row.seo_description ?? null,
  scheduled_at: row.scheduled_at ?? null,
  created_at: row.created_at ?? '',
  updated_at: row.updated_at ?? null,
})

/**
 * A visão vira filtro de coluna. Todas as formas foram conferidas contra o PostgREST local.
 *
 * **Limitação declarada**: `sem-estoque` olha `products.stock_total`, o saldo do produto SEM grade.
 * Produto com grade tem o saldo nas linhas de `product_variants`, e o PostgREST não sabe agregar o
 * recurso embutido para filtrar o pai — isso pede uma view no Postgres. Não foi feito porque esta
 * feature não tem task de migration antes da `T42`; é a primeira coisa a trocar quando o catálogo
 * misturar os dois modelos em escala. Mesma classe da nota A19 da feature 11.
 */
const applyView = (builder: any, view: ProductViewId): any => {
  switch (view) {
    case 'ativos':
      return builder.eq('is_active', true)
    case 'rascunhos':
      return builder.eq('is_active', false)
    case 'sem-estoque':
      return builder.eq('stock_policy', 'track').eq('stock_total', 0)
    case 'sem-imagem':
      // `images` é jsonb desde a 07/T3: lista vazia é o valor `[]`, não NULL.
      return builder.eq('images', '[]')
    case 'sem-seo':
      return builder.or('seo_title.is.null,seo_title.eq.,seo_description.is.null,seo_description.eq.')
    case 'agendados':
      return builder.not('scheduled_at', 'is', null)
    default:
      return builder
  }
}

/**
 * A contagem de cada visão (PLS-02 AC 3), com `head: true` — o servidor devolve só o número, sem
 * uma linha sequer.
 *
 * São 7 requisições, em paralelo, **uma vez por montagem** — não a cada mudança de filtro. A
 * alternativa (uma view no Postgres com os 7 contadores) é melhor e não foi feita: esta feature só
 * tem migration na `T42`, e inventar uma no meio da listagem é escopo que ninguém revisou. Mesma
 * classe da nota A19 da feature 11.
 */
export const useProductViewCounts = () => {
  const [counts, setCounts] = useState<Partial<Record<ProductViewId, number>>>({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const entries = await Promise.all(
        PRODUCT_VIEWS.map(async view => {
          const builder = applyView(
            supabase.from('products').select('id', { count: 'exact', head: true }),
            view.id,
          )
          const { count } = await builder
          return [view.id, count ?? 0] as const
        }),
      )
      if (!cancelled) setCounts(Object.fromEntries(entries) as Record<ProductViewId, number>)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return counts
}

export interface ProductListResult {
  rows: AdminListRow[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  /** Todas as linhas do filtro atual, sem paginar — só sob pedido explícito (PLS-05 AC 2). */
  fetchAllFiltered: () => Promise<AdminListRow[]>
  createProductsBatch: (
    rows: Record<string, unknown>[],
    buildVariants?: (ids: string[]) => Record<string, unknown>[],
  ) => Promise<{ error: unknown; ids: string[] }>
  updateProductsBatch: (
    patches: { id: string; values: Record<string, unknown> }[],
  ) => Promise<{ changed: number; failed: string[] }>
  /** RFN-02: **um** delete para N ids, e um refetch. */
  deleteProductsBatch: (ids: string[]) => Promise<{ deleted: number; failed: number; message?: string }>
  /** RFN-04: o diff de `product_categories` — um delete e um insert, no máximo. */
  applyCategoryWrites: (write: {
    inserts: { product_id: string; category_id: string; position: number }[]
    deletes: { product_id: string; category_id: string }[]
  }) => Promise<{ error: unknown }>
}

/**
 * A listagem pergunta ao servidor (PLS-01).
 *
 * @param query Página, busca, filtros e ordenação. O hook refaz a consulta quando o CONTEÚDO da
 *              query muda — comparado por serialização, porque a página monta o objeto a cada
 *              render e comparar por identidade daria laço infinito.
 */
export const useAdminProductList = (query: ProductQuery): ProductListResult => {
  const [rows, setRows] = useState<AdminListRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryKey = useMemo(() => JSON.stringify(query), [query])

  /**
   * Monta a consulta filtrada (sem paginar). Devolve `null` quando o filtro já exclui tudo — aí
   * nem chega a pedir a página.
   */
  const buildFilteredQuery = useCallback(async (current: ProductQuery): Promise<{ builder: any } | null> => {
    // As consultas auxiliares vêm ANTES de montar a do catálogo: categoria sem nenhum produto
    // encerra aqui, sem chegar a pedir a página.
    let categoryProductIds: string[] | null = null
    if (current.filters.categoryIds.length > 0) {
      // Categoria é N:N (`product_categories`), então não há coluna do produto para filtrar. Duas
      // consultas resolvem no servidor; filtrar em memória traria o catálogo inteiro de volta.
      const { data: links } = await supabase
        .from('product_categories')
        .select('product_id')
        .in('category_id', current.filters.categoryIds)
      categoryProductIds = [...new Set((links ?? []).map((l: any) => l.product_id as string))]
      if (categoryProductIds.length === 0) return null
    }

    const term = escapeSearchTerm(current.search)
    let searchCondition: string | null = null
    if (term !== '') {
      // O SKU vive em `product_variants`. O PostgREST casa pai por filho com `!inner`, mas não sabe
      // fazer OR entre coluna do pai e coluna do filho no mesmo request — daí a consulta prévia.
      const { data: skuRows } = await supabase
        .from('product_variants')
        .select('product_id')
        .ilike('sku', `%${term}%`)
      const skuIds = [...new Set((skuRows ?? []).map((v: any) => v.product_id as string))]

      const conditions = [`name.ilike.%${term}%`, `tags.cs.{"${term}"}`]
      if (skuIds.length > 0) conditions.push(`id.in.(${skuIds.join(',')})`)
      searchCondition = conditions.join(',')
    }

    let builder: any = supabase.from('products').select(LIST_SELECT, { count: 'exact' })
    builder = applyView(builder, current.filters.view)
    if (categoryProductIds) builder = builder.in('id', categoryProductIds)
    if (current.filters.tags.length > 0) builder = builder.contains('tags', current.filters.tags)
    if (current.filters.priceMin !== null) builder = builder.gte('base_price', current.filters.priceMin)
    if (current.filters.priceMax !== null) builder = builder.lte('base_price', current.filters.priceMax)
    if (searchCondition) builder = builder.or(searchCondition)

    // Embrulhado num objeto DE PROPÓSITO: o builder do `supabase-js` é *thenable*, e uma função
    // `async` que o devolvesse cru faria o `await` do chamador **executar a consulta** e receber o
    // resultado no lugar do builder. O bug some ao tirar o thenable do valor de retorno.
    return { builder: builder.order(SORT_COLUMN[current.sort.key], { ascending: current.sort.dir === 'asc' }) }
  }, [])

  const refetch = useCallback(async () => {
    const current: ProductQuery = JSON.parse(queryKey)
    setLoading(true)
    setError(null)

    const query = await buildFilteredQuery(current)
    if (!query) {
      setRows([]); setTotal(0); setLoading(false)
      return
    }

    const [from, to] = pageRange(current.page, current.pageSize)
    const { data, error: queryError, count } = await query.builder.range(from, to)

    if (queryError) {
      setRows([]); setTotal(0)
      setError(queryError.message ?? 'Não foi possível carregar os produtos')
    } else {
      setRows((data ?? []).map(toListRow))
      // `count` é o total do FILTRO no servidor, não o tamanho da página.
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [queryKey, buildFilteredQuery])

  useEffect(() => { refetch() }, [refetch])

  /**
   * PLS-05 AC 2: "selecionar os N do filtro", não só a página visível.
   *
   * Esta é a **única** leitura da listagem que não pagina, e é deliberada: para reajustar 160
   * produtos é preciso ter os 160 valores atuais — sem eles não há prévia de impacto nem snapshot
   * de desfazer. Acontece só quando o admin pede, nunca na carga da tela.
   */
  const fetchAllFiltered = useCallback(async (): Promise<AdminListRow[]> => {
    const current: ProductQuery = JSON.parse(queryKey)
    const query = await buildFilteredQuery(current)
    if (!query) return []
    const { data, error: queryError } = await query.builder
    return queryError ? [] : (data ?? []).map(toListRow)
  }, [queryKey, buildFilteredQuery])

  /**
   * PLS-08: **um** insert para N produtos, **um** para as variações e **um** refetch — não um
   * `createProduct` por linha, que era o defeito 16 (40 produtos = 40 `SELECT`s do catálogo).
   *
   * @param buildVariants Recebe os ids recém-criados, na MESMA ordem das linhas enviadas, e
   *                      devolve as variações. Existe porque a variação só tem dono depois que o
   *                      produto existe — é o segundo insert da grade rápida (T41).
   */
  const createProductsBatch = useCallback(
    async (
      newRows: Record<string, unknown>[],
      buildVariants?: (ids: string[]) => Record<string, unknown>[],
    ) => {
      const { data, error: insertError } = await supabase.from('products').insert(newRows).select('id')
      const ids = ((data ?? []) as { id: string }[]).map(r => r.id)

      let variantError: unknown = null
      if (!insertError && buildVariants) {
        const variantRows = buildVariants(ids)
        if (variantRows.length > 0) {
          const { error: writeError } = await supabase.from('product_variants').insert(variantRows)
          variantError = writeError
        }
      }

      if (!insertError) await refetch()
      return { error: insertError ?? variantError, ids }
    },
    [refetch],
  )

  /**
   * Edição em massa (PLS-06). Um `update` por linha porque os valores diferem entre linhas e o
   * PostgREST não expressa "update many com valores distintos" — `upsert` exigiria mandar a linha
   * inteira, o que sobrescreveria colunas que ninguém pediu para mudar. O que a task exige é **um
   * refetch**, e é isso que se garante aqui.
   */
  const updateProductsBatch = useCallback(
    async (patches: { id: string; values: Record<string, unknown> }[]) => {
      const failed: string[] = []
      for (const patch of patches) {
        const { error: updateError } = await supabase.from('products').update(patch.values).eq('id', patch.id)
        if (updateError) failed.push(patch.id)
      }
      await refetch()
      return { changed: patches.length - failed.length, failed }
    },
    [refetch],
  )

  /**
   * RFN-02. Um `delete … in (ids)` para o lote inteiro — não N deletes.
   *
   * Falha parcial de verdade não existe aqui: ou o `in` apaga tudo o que casou, ou o statement
   * falha inteiro (tipicamente por FK de `order_items.variant_id`). O que se relata é isso.
   */
  const deleteProductsBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return { deleted: 0, failed: 0 }
      const { error: deleteError } = await supabase.from('products').delete().in('id', ids)
      await refetch()
      return deleteError
        ? { deleted: 0, failed: ids.length, message: (deleteError as { message?: string }).message }
        : { deleted: ids.length, failed: 0 }
    },
    [refetch],
  )

  /** RFN-04. O diff já vem pronto de `planCategoryWrites`; aqui é só I/O. */
  const applyCategoryWrites = useCallback(
    async (write: {
      inserts: { product_id: string; category_id: string; position: number }[]
      deletes: { product_id: string; category_id: string }[]
    }) => {
      for (const link of write.deletes) {
        const { error: deleteError } = await supabase
          .from('product_categories')
          .delete()
          .eq('product_id', link.product_id)
          .eq('category_id', link.category_id)
        if (deleteError) return { error: deleteError }
      }
      if (write.inserts.length > 0) {
        const { error: insertError } = await supabase.from('product_categories').insert(write.inserts)
        if (insertError) return { error: insertError }
      }
      return { error: null }
    },
    [],
  )

  return {
    rows, total, loading, error, refetch, fetchAllFiltered,
    createProductsBatch, updateProductsBatch, deleteProductsBatch, applyCategoryWrites,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
