// Estado do formulário de produto (PFM-01, parcial).
//
// Por que o estado sai da página (A17 + `design.md`): a `AdminProductFormPage` tinha 513 linhas com
// os ~30 campos num `useState` só. Isso torna impossível o que PFM-11 exige — validar um campo de
// **aba fechada** — porque o `Tabs` do Radix desmonta o conteúdo inativo e o `required` do input
// desaparece junto. Com o estado fora, a validação passa a rodar sobre o objeto inteiro no submit.
//
// Esta task só move o estado e a carga. Validação (T22), checklist (T23) e rascunho (T24) entram
// depois, sobre esta base — a página não muda visualmente aqui.

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { normalizeImages } from '@estrelinha/core/media'
import {
  categoryIdsFromLinks,
  normalizeOptions,
  normalizeVariants,
  toStockPolicy,
} from '@estrelinha/core/product'
import type {
  ProductImage,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@estrelinha/supabase/types'

/**
 * O estado editável do formulário.
 *
 * Os campos numéricos são **número**, não string: a máscara vive na apresentação (`MoneyInput`,
 * `WeightInput`), e estado em string vira `NaN` e arredondamento inconsistente.
 *
 * `sizes`, `finishes` e o JSONB legado `variants` **saíram** em `VAR-13` (13/T42): as colunas não
 * existem mais no banco. Os eixos são `options`, e as linhas vendáveis são `variants`, da tabela.
 */
export interface ProductFormState {
  name: string
  slug: string
  description: string
  /** @deprecated Coluna legada de categoria única. `category_ids` é a verdade (T31). */
  category_id: string
  /** As categorias do produto, na ordem de seleção (`product_categories.position`). */
  category_ids: string[]
  /** Tokens, como a coluna `products.tags text[]` sempre foi. Era string por vírgula na UI. */
  tags: string[]
  price: number
  compare_price: number
  cost_price: number
  stock_total: number
  low_stock_threshold: number
  /** Os eixos do produto, na ordem de `position`. Até 3 (T26). */
  options: ProductOption[]
  /** As linhas vendáveis, de `product_variants` — não mais do JSONB legado. */
  variants: ProductVariant[]
  stock_policy: StockPolicy
  /** Dias úteis. Só exibição, não entra na cotação de frete (A6). */
  production_lead_days: number | null
  images: ProductImage[]
  is_active: boolean
  is_featured: boolean
  is_new: boolean
  video_url: string
  weight_kg: number
  width_cm: number
  height_cm: number
  length_cm: number
  seo_title: string
  seo_description: string
  scheduled_at: string
  related_product_ids: string[]
  buy_together_ids: string[]
}

/**
 * Produto novo. Os defaults de dimensão (11 × 2 × 16 cm, 0,1 kg) são os mesmos que a página usava —
 * são o que o Melhor Envio recebe quando o admin não mede a embalagem (SHP-02).
 */
export const emptyProductForm = (): ProductFormState => ({
  name: '',
  slug: '',
  description: '',
  category_id: '',
  category_ids: [],
  tags: [],
  price: 0,
  compare_price: 0,
  cost_price: 0,
  stock_total: 0,
  low_stock_threshold: 5,
  options: [],
  variants: [],
  stock_policy: 'track',
  production_lead_days: null,
  images: [],
  is_active: true,
  is_featured: false,
  is_new: false,
  video_url: '',
  weight_kg: 0.1,
  width_cm: 11,
  height_cm: 2,
  length_cm: 16,
  seo_title: '',
  seo_description: '',
  scheduled_at: '',
  related_product_ids: [],
  buy_together_ids: [],
})

/** O `select` da carga do formulário. Traz a grade da TABELA e os vínculos N:N. */
export const PRODUCT_FORM_SELECT =
  '*, product_variants(*), product_categories(category_id, position)'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Linha do banco → estado do formulário.
 *
 * Exportada para teste: é aqui que mora a diferença entre carregar o modelo novo e carregar o
 * legado. `variants` vem de `product_variants` (a tabela), **nunca** de `products.variants` (o
 * JSONB), que segue no banco até `VAR-13` mas não é mais lido por código novo.
 */
export const productRowToForm = (row: any, opts: { asCopy?: boolean } = {}): ProductFormState => ({
  ...emptyProductForm(),
  name: opts.asCopy ? `${row.name ?? ''} (cópia)` : (row.name ?? ''),
  // Cópia nasce sem slug: dois produtos com o mesmo slug violam o UNIQUE, e o campo é regerado do
  // nome. Era o comportamento da página e continua.
  slug: opts.asCopy ? '' : (row.slug ?? ''),
  description: row.description ?? '',
  category_id: row.category_id ?? '',
  category_ids: categoryIdsFromLinks(row.product_categories),
  tags: Array.isArray(row.tags) ? row.tags.filter((t: unknown) => typeof t === 'string') : [],
  price: row.base_price ?? row.price ?? 0,
  compare_price: row.original_price ?? row.compare_price ?? 0,
  cost_price: row.cost_price ?? 0,
  stock_total: row.stock_total ?? 0,
  low_stock_threshold: row.low_stock_threshold ?? 5,
  options: normalizeOptions(row.options),
  variants: normalizeVariants(row.product_variants, row.id),
  stock_policy: toStockPolicy(row.stock_policy),
  production_lead_days:
    typeof row.production_lead_days === 'number' ? row.production_lead_days : null,
  images: normalizeImages(row.images),
  is_active: row.is_active ?? true,
  is_featured: row.is_featured ?? false,
  is_new: row.is_new ?? false,
  video_url: row.video_url ?? '',
  weight_kg: row.weight_kg ?? 0.1,
  width_cm: row.width_cm ?? 11,
  height_cm: row.height_cm ?? 2,
  length_cm: row.length_cm ?? 16,
  seo_title: row.seo_title ?? '',
  seo_description: row.seo_description ?? '',
  scheduled_at: row.scheduled_at ? String(row.scheduled_at).slice(0, 16) : '',
  related_product_ids: row.related_product_ids ?? [],
  buy_together_ids: row.buy_together_ids ?? [],
})
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface UseProductFormResult {
  form: ProductFormState
  /** Um campo por vez, tipado pela chave — é o que as abas chamam. */
  setField: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  /** Vários campos numa transição só (ex.: nome + slug derivado). */
  setFields: (patch: Partial<ProductFormState>) => void
  /** `true` só depois de uma edição real — carga não conta (PFM-16, badge de não salvo). */
  isDirty: boolean
  /**
   * Zera o `isDirty` sem tocar no conteúdo, e opcionalmente adota um novo snapshot de "o que está no
   * banco". Chamado no save bem-sucedido.
   */
  markSaved: (snapshot?: {
    categoryIds: string[]
    variants: ProductVariant[]
    slug: string
  }) => void
  /**
   * O que estava no banco na última carga (ou no último save). É contra isto que o diff da grade e
   * das categorias é calculado (T21b) — sem snapshot, "o que mudou?" não é respondível.
   */
  savedSnapshot: { categoryIds: string[]; variants: ProductVariant[]; slug: string }
  /**
   * Troca o formulário inteiro. É o que a oferta de restauração de rascunho (T24) chama.
   * Nasce **sujo**: o conteúdo restaurado difere do que está no banco, e é isso que o badge
   * "Alterações não salvas" tem de dizer.
   */
  replaceForm: (next: ProductFormState) => void
  loading: boolean
  isEdit: boolean
  /** Editando um produto existente: o id dele. Duplicando ou criando: `null`. */
  productId: string | null
}

/**
 * @param productId Id do produto em edição. `undefined` = produto novo.
 * @param copyFromId Id de origem quando o admin duplica (`?from=`).
 */
export const useProductForm = (
  productId?: string,
  copyFromId?: string | null,
): UseProductFormResult => {
  const [form, setForm] = useState<ProductFormState>(emptyProductForm)
  const [loading, setLoading] = useState(!!productId || !!copyFromId)
  const [isDirty, setIsDirty] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<{
    categoryIds: string[]
    variants: ProductVariant[]
    slug: string
  }>({ categoryIds: [], variants: [], slug: '' })
  // A carga escreve no estado sem sujar o formulário. Sem esta distinção, abrir um produto e sair
  // sem tocar em nada dispararia a guarda de saída da T24 e o badge "Alterações não salvas".
  const loadingRef = useRef(false)

  useEffect(() => {
    const loadId = productId || copyFromId
    if (!loadId) {
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      loadingRef.current = true
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_FORM_SELECT)
        .eq('id', loadId)
        .maybeSingle()

      if (!cancelled) {
        // Falha de leitura deixa o formulário nos defaults em vez de travar em "Carregando…" —
        // o admin ainda consegue sair da tela.
        if (!error && data) {
          const loaded = productRowToForm(data, { asCopy: !!copyFromId && !productId })
          setForm(loaded)
          // Duplicar cria linhas NOVAS: o snapshot fica vazio de propósito, senão o diff acharia
          // que a grade da cópia já existe no banco e tentaria dar `update` nos ids da origem.
          if (productId) {
            setSavedSnapshot({
              categoryIds: loaded.category_ids,
              variants: loaded.variants,
              slug: loaded.slug,
            })
          }
        }
        setLoading(false)
      }
      loadingRef.current = false
    }
    load()
    return () => {
      cancelled = true
    }
  }, [productId, copyFromId])

  const setFields = useCallback((patch: Partial<ProductFormState>) => {
    setForm(current => ({ ...current, ...patch }))
    if (!loadingRef.current) setIsDirty(true)
  }, [])

  const setField = useCallback(
    <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
      setFields({ [key]: value } as Partial<ProductFormState>)
    },
    [setFields],
  )

  const markSaved = useCallback(
    (snapshot?: { categoryIds: string[]; variants: ProductVariant[]; slug: string }) => {
      setIsDirty(false)
      if (snapshot) setSavedSnapshot(snapshot)
    },
    [],
  )

  const replaceForm = useCallback((next: ProductFormState) => {
    setForm(next)
    setIsDirty(true)
  }, [])

  return {
    form,
    setField,
    setFields,
    isDirty,
    savedSnapshot,
    markSaved,
    replaceForm,
    loading,
    isEdit: !!productId,
    productId: productId ?? null,
  }
}
