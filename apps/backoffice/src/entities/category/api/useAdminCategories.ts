import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbCategory } from '@estrelinha/supabase/types'

export interface AdminCategory extends DbCategory {
  product_count?: number
  emoji?: string
  updated_at?: string | null
  children?: AdminCategory[]
}

/**
 * As colunas da categoria — nomeadas, não `*` (mesmo molde do `LIST_SELECT` da listagem v2).
 *
 * Nomear é o que faz uma coluna nova aparecer aqui de propósito, e não de carona. `parent_id`,
 * `banner_url`, `color_accent` e `updated_at` nasceram na migration da `T52`: até ela, o código
 * inteiro lia e escrevia essas quatro sem que existissem, e todo save morria em PGRST204.
 */
export const CATEGORY_SELECT = [
  'id', 'name', 'slug', 'description', 'icon', 'image_url',
  'banner_url', 'color_accent', 'active', 'sort_order', 'parent_id',
  // Feature 16: a vaga na barra do topo da loja e o card promocional do menu. Provadas por probe
  // HTTP antes de existirem em tipo — `PATCH` com `Prefer: return=representation` devolvendo os
  // valores persistidos (`AD-012`).
  'show_in_menu', 'menu_promo',
  'created_at', 'updated_at',
].join(', ')

/** Uma linha de `category_product_counts` (a view da `T52`). */
interface CategoryCountRow {
  category_id: string
  product_count: number
}

export const useAdminCategories = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * Falha de leitura, para a tela poder dizer "quebrou" em vez de "está vazio".
   *
   * A tela de Coleções (removida na feature 16) engolia o erro exatamente aqui — `setCollections([])`
   * — e por isso mostrava grade vazia para sempre, em cima de uma tabela que **nunca existiu**. Não
   * ter como distinguir "não há categorias" de "a consulta falhou" foi o que fez um defeito de schema
   * passar meses parecendo uma tela sem conteúdo.
   */
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Duas consultas pequenas, em paralelo, em vez de um join que traria o catálogo.
    //
    // A contagem sai de `category_product_counts` — a view sobre `product_categories`, que é a
    // fonte real dos vínculos desde a `04`. O que existia aqui era `select('*, products(count)')`,
    // que conta pelo FK legado `products.category_id`: hoje os dois números coincidem porque o dado
    // é anterior à virada, mas o formulário de produto só escreve na `product_categories` — a
    // contagem antiga divergiria em silêncio no primeiro produto novo.
    const [categoriesResult, countsResult] = await Promise.all([
      supabase.from('categories').select(CATEGORY_SELECT).order('sort_order'),
      supabase.from('category_product_counts').select('category_id, product_count'),
    ])

    if (categoriesResult.error || !categoriesResult.data) {
      setCategories([])
      setError(categoriesResult.error?.message ?? 'Não foi possível carregar as categorias.')
      setLoading(false)
      return
    }

    // Contagem é conveniência, não requisito: se a view falhar, a tela ainda organiza categorias —
    // só mostra zero. Derrubar a lista inteira porque um número não veio seria pior que o número
    // faltando.
    const countById = new Map<string, number>()
    for (const row of (countsResult.data ?? []) as CategoryCountRow[]) {
      countById.set(row.category_id, row.product_count)
    }

    // `as unknown as` e não `as DbCategory[]`: o `select` é uma string montada em runtime
    // (`CATEGORY_SELECT`), então o supabase-js não consegue derivar a forma da linha e devolve
    // `GenericStringError[]`. A asserção direta é rejeitada pelo TS — com razão, os tipos não se
    // sobrepõem. Passar por `unknown` deixa explícito que quem garante a forma é o `CATEGORY_SELECT`
    // logo acima, não o compilador.
    setCategories(
      (categoriesResult.data as unknown as DbCategory[]).map(c => ({
        ...c,
        parent_id: c.parent_id ?? null,
        product_count: countById.get(c.id) ?? 0,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const tree = useMemo(() => {
    const roots: AdminCategory[] = []
    const childrenMap: Record<string, AdminCategory[]> = {}
    categories.forEach(c => {
      if (c.parent_id) {
        if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = []
        childrenMap[c.parent_id].push(c)
      } else {
        roots.push(c)
      }
    })
    return roots.map(r => ({ ...r, children: childrenMap[r.id] || [] }))
  }, [categories])

  /**
   * Devolve `{ error, id }`: o `id` é o que permite ao "Criar categoria" inline do formulário de
   * produto já deixar a nova categoria MARCADA (11/T31, PFM-05 AC 3). Quem só checa `error`
   * continua funcionando.
   */
  const createCategory = async (cat: Partial<DbCategory>) => {
    const { data, error } = await supabase.from('categories').insert(cat).select('id').maybeSingle()
    if (!error) await fetchCategories()
    return { error, id: (data as { id?: string } | null)?.id ?? null }
  }

  const updateCategory = async (id: string, updates: Partial<DbCategory>) => {
    const { error } = await supabase.from('categories').update(updates).eq('id', id)
    if (!error) await fetchCategories()
    return error
  }

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) await fetchCategories()
    return error
  }

  /** `Mostrar` / `Ocultar` da barra de massa: UM update para N ids. */
  const updateCategoriesBatch = async (ids: string[], updates: Partial<DbCategory>) => {
    if (ids.length === 0) return null
    const { error } = await supabase.from('categories').update(updates).in('id', ids)
    if (!error) await fetchCategories()
    return error
  }

  /** `Excluir` da barra de massa: UM delete para N ids. */
  const deleteCategoriesBatch = async (ids: string[]) => {
    if (ids.length === 0) return null
    const { error } = await supabase.from('categories').delete().in('id', ids)
    if (!error) await fetchCategories()
    return error
  }

  /**
   * `Mover para…` da barra de massa.
   *
   * Não cabe no `updateCategoriesBatch`: o `parent_id` é o mesmo para todas, mas a `sort_order` é
   * uma por linha (cada uma entra numa posição diferente no destino), e um `update ... in (ids)`
   * só sabe gravar UM payload. Um update por linha, pelo mesmo motivo do `updateSortOrders` — e um
   * único refetch no fim, em vez de dois se isto fossem duas chamadas encadeadas.
   */
  const moveCategories = async (
    entries: { id: string; parent_id: string | null; sort_order: number }[],
  ) => {
    if (entries.length === 0) return null
    const results = await Promise.all(
      entries.map(({ id, ...updates }) =>
        supabase.from('categories').update(updates).eq('id', id),
      ),
    )
    const failure = results.find(r => r.error)?.error ?? null
    if (!failure) await fetchCategories()
    return failure
  }

  /**
   * O arraste do modo Reordenar.
   *
   * Um update por linha, de propósito: `upsert` exigiria mandar `name` e `slug` (NOT NULL) junto de
   * cada posição, o que transforma um reordenar em uma reescrita da linha inteira — e um `name`
   * desatualizado no payload sobrescreveria o nome real. Quem chama já manda **só as linhas que
   * mudaram de posição** (`reorderWithinParent`), então N é o trecho arrastado, não a lista.
   */
  const updateSortOrders = async (entries: { id: string; sort_order: number }[]) => {
    if (entries.length === 0) return null
    const results = await Promise.all(
      entries.map(({ id, sort_order }) =>
        supabase.from('categories').update({ sort_order }).eq('id', id),
      ),
    )
    const failure = results.find(r => r.error)?.error ?? null
    if (!failure) await fetchCategories()
    return failure
  }

  return {
    categories, tree, loading, error, fetchCategories,
    createCategory, updateCategory, deleteCategory,
    updateCategoriesBatch, deleteCategoriesBatch, moveCategories, updateSortOrders,
  }
}
