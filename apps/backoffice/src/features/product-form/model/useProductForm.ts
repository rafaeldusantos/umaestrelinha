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
import { type MaterialKind, toMaterialKinds } from '@estrelinha/core/material'
import type {
  ProductImage,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@estrelinha/supabase/types'
import type { OptionMark } from '@estrelinha/core/filters'
import type { ProductFaqSelection } from './planFaqLinks'
import { EMPTY_SUPPLIER_ROW, supplierRowsToSave, type SupplierDraft } from './persistSupplier'
import { supplierLinksOfRow } from '@/entities/supplier'

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
  /**
   * Feature 80 — os fornecedores da peça, só do painel: cada linha é um fornecedor e o link da peça
   * nele, na ordem da dona. Moram em `suppliers`/`product_suppliers`, e não em `products`, porque
   * `products` é legível pela chave pública coluna a coluna. Sempre ao menos uma linha (a vazia é
   * "sem fornecedor"), para a tela ter onde digitar.
   */
  supplier_rows: SupplierDraft[]
  // Feature 30 — o que o feed do Google Shopping emite por produto (`GSH-19`). Vazio grava `null`:
  // uma tag `<g:brand></g:brand>` reprova a oferta, e string vazia no banco é indistinguível de
  // "preenchi com nada".
  brand: string
  mpn: string
  age_group: string
  gender: string
  google_product_category: string
  /** `null` = nunca decidido, herda o padrão da loja (sem identificador). */
  identifier_exists: boolean | null
  scheduled_at: string
  related_product_ids: string[]
  buy_together_ids: string[]
  /**
   * Feature 22 — o material afetivo é propriedade do PRODUTO.
   *
   * `requires_material` é **três estados**: `null` = ninguém decidiu ainda. É o marcador que permite
   * ao importador semear os 689 produtos do catálogo real sem apagar, na execução seguinte, o que a
   * dona decidiu. Salvar o formulário sempre grava `true`/`false`, então editar um produto é o que o
   * tira de `null` para sempre.
   *
   * `material_kinds` **vazia com `requires_material: true` é estado válido** — é a peça de material
   * livre, combinada no WhatsApp. Não confundir "não exige" com "exige e ainda não sabe qual".
   */
  requires_material: boolean | null
  material_kinds: MaterialKind[]
  /** `null` cai em `DEFAULT_ENGRAVING_MAX_CHARS`. Nunca significa "sem limite". */
  engraving_max_chars: number | null
  /**
   * As perguntas frequentes do produto, na ordem (feature 28).
   *
   * Mora no estado do formulário — e não em `useState` da página — para entrar de graça no rascunho
   * do `useFormDraft` e no `replaceForm` da restauração. Vínculo perdido num F5 é trabalho refeito.
   */
  faqs: ProductFaqSelection[]
  /**
   * Os valores de filtro marcados nesta peça (feature 66, `FLT-11`..`FLT-14`).
   *
   * No estado do formulário pelo mesmo motivo das perguntas: entra no rascunho e na restauração, e
   * o save grava o DIFF contra o snapshot — só o que entrou e o que saiu vão ao banco.
   */
  filter_value_ids: string[]
  /**
   * As marcações por OPÇÃO da peça (feature 67, `VFL-01`..`VFL-08`): "nesta peça, `Cor` = `Prata 925`
   * é o valor X". No estado pelo mesmo motivo das marcações da peça toda — rascunho, restauração e
   * diff contra o snapshot. O que vai ao bloco e ao save é a PROJEÇÃO `marcacoesVigentes` (renomear
   * eixo leva junto, remover texto apaga), nunca este campo cru.
   */
  option_marks: OptionMark[]
}

/** O que estava no banco na última carga (ou no último save) — é contra isto que o diff é feito. */
export interface ProductFormSnapshot {
  categoryIds: string[]
  variants: ProductVariant[]
  slug: string
  faqIds: string[]
  filterValueIds: string[]
  /** Feature 67. */
  optionMarks: OptionMark[]
  /** Feature 67: os eixos como estavam, para detectar a renomeação por posição (`VFL-05`). */
  options: ProductOption[]
  /** Feature 80: o fornecedor como está no banco — o que a coluna lateral mostra (FOR-16) e a base do FOR-13. */
  suppliers?: SupplierDraft[]
}

const SNAPSHOT_VAZIO: ProductFormSnapshot = {
  categoryIds: [],
  variants: [],
  slug: '',
  faqIds: [],
  filterValueIds: [],
  optionMarks: [],
  options: [],
  suppliers: [],
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
  brand: '',
  mpn: '',
  age_group: '',
  gender: '',
  google_product_category: '',
  supplier_rows: [{ ...EMPTY_SUPPLIER_ROW }],
  identifier_exists: null,
  scheduled_at: '',
  related_product_ids: [],
  buy_together_ids: [],
  // Produto NOVO nasce com `null`, não `false`: quem acabou de abrir o formulário ainda não decidiu
  // nada, e é o save que registra a decisão. Nascer `false` faria o importador nunca semear a linha.
  requires_material: null,
  material_kinds: [],
  engraving_max_chars: null,
  faqs: [],
  filter_value_ids: [],
  option_marks: [],
})

/** O `select` da carga do formulário. Traz a grade da TABELA e os vínculos N:N. */
export const PRODUCT_FORM_SELECT =
  '*, product_variants(*), product_categories(category_id, position), product_faqs(faq_id, position, answer_override), product_filter_values(value_id), product_option_filter_values(option_name, option_value, value_id), product_suppliers(url, position, suppliers(name))'

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Os fornecedores do embed, na ordem; sem nenhum, a linha vazia onde a dona digita. */
const supplierFromRow = (row: any): { supplier_rows: SupplierDraft[] } => {
  const links = supplierLinksOfRow(row)
  return { supplier_rows: links.length > 0 ? links : [{ ...EMPTY_SUPPLIER_ROW }] }
}

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
  brand: row.brand ?? '',
  mpn: row.mpn ?? '',
  age_group: row.age_group ?? '',
  gender: row.gender ?? '',
  google_product_category: row.google_product_category ?? '',
  // FOR-15: duplicar traz o fornecedor do original — a cópia costuma ser a mesma peça noutra versão.
  ...supplierFromRow(row),
  identifier_exists:
    typeof row.identifier_exists === 'boolean' ? row.identifier_exists : null,
  scheduled_at: row.scheduled_at ? String(row.scheduled_at).slice(0, 16) : '',
  related_product_ids: row.related_product_ids ?? [],
  buy_together_ids: row.buy_together_ids ?? [],
  // SEM `?? false`: `null` é informação, não ausência de valor. Coalescer aqui apagaria o marcador
  // de "nunca decidido" na primeira abertura do formulário, e o importador pararia de semear.
  requires_material: typeof row.requires_material === 'boolean' ? row.requires_material : null,
  material_kinds: toMaterialKinds(row.material_kinds),
  engraving_max_chars:
    typeof row.engraving_max_chars === 'number' ? row.engraving_max_chars : null,
  // A ordem vem do banco, mas a lista chega **sem ordenar** — o PostgREST não garante ordem de
  // embed. Ordenar aqui é o que faz a aba abrir na ordem que a loja mostra.
  faqs: Array.isArray(row.product_faqs)
    ? [...row.product_faqs]
        .sort((a: any, b: any) => (a?.position ?? 0) - (b?.position ?? 0))
        .map((link: any) => ({
          faq_id: String(link?.faq_id ?? ''),
          answer_override: link?.answer_override ?? null,
        }))
        .filter((link: { faq_id: string }) => link.faq_id !== '')
    : [],
  // Feature 66. O admin lê TODAS as marcações (a policy de escrita `for all` cobre a leitura), então
  // as de grupo desligado também chegam — e continuam editáveis (`FLT-14`).
  filter_value_ids: Array.isArray(row.product_filter_values)
    ? [
        ...new Set<string>(
          row.product_filter_values
            .map((l: any) => String(l?.value_id ?? ''))
            .filter((id: string) => id !== ''),
        ),
      ]
    : [],
  // Feature 67. Como as da peça toda: o admin lê todas, inclusive as de grupo desligado.
  option_marks: Array.isArray(row.product_option_filter_values)
    ? row.product_option_filter_values
        .map((m: any) => ({
          option_name: typeof m?.option_name === 'string' ? m.option_name : '',
          option_value: typeof m?.option_value === 'string' ? m.option_value : '',
          value_id: String(m?.value_id ?? ''),
        }))
        .filter((m: OptionMark) => m.option_name !== '' && m.option_value !== '' && m.value_id !== '')
    : [],
})
/* eslint-enable @typescript-eslint/no-explicit-any */

/** A leitura do formulário — a mesma na carga e na releitura depois do save. */
const fetchRow = (id: string) =>
  supabase.from('products').select(PRODUCT_FORM_SELECT).eq('id', id).maybeSingle()

/**
 * Como terminou a carga do produto em EDIÇÃO. `nao-encontrado`: o banco respondeu e a peça não
 * existe (link antigo, peça apagada, id colado errado — `22P02` é o id que nem é uuid). `falhou`:
 * o banco não respondeu. Nos dois a página não pode mostrar o formulário: vazio, ele diria
 * "Publicado" sobre nada, aceitaria fotos sem dono e, salvo, gravaria o vazio por cima da peça.
 */
export type ProductLoadStatus = 'ok' | 'nao-encontrado' | 'falhou'

const ID_INVALIDO = '22P02'

export interface UseProductFormResult {
  form: ProductFormState
  /** Um campo por vez, tipado pela chave — é o que as abas chamam. */
  setField: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
  /**
   * Vários campos numa transição só (ex.: nome + slug derivado). Aceita também uma função do estado
   * VIGENTE: quem acumula sobre um campo a partir de um evento assíncrono (o envio de imagens, ADI-04)
   * não pode ler o `form` do último render — dois eventos no mesmo tique escreveriam um sobre o outro.
   */
  setFields: (patch: Partial<ProductFormState> | ((current: ProductFormState) => Partial<ProductFormState>)) => void
  /** `true` só depois de uma edição real — carga não conta (PFM-16, badge de não salvo). */
  isDirty: boolean
  /**
   * Zera o `isDirty` sem tocar no conteúdo, e opcionalmente adota um novo snapshot de "o que está no
   * banco". Chamado no save bem-sucedido.
   */
  markSaved: (snapshot?: ProductFormSnapshot) => void
  /**
   * O que estava no banco na última carga (ou no último save). É contra isto que o diff da grade e
   * das categorias é calculado (T21b) — sem snapshot, "o que mudou?" não é respondível.
   */
  savedSnapshot: ProductFormSnapshot
  /**
   * Troca o formulário inteiro. É o que a oferta de restauração de rascunho (T24) chama.
   * Nasce **sujo**: o conteúdo restaurado difere do que está no banco, e é isso que o badge
   * "Alterações não salvas" tem de dizer.
   */
  replaceForm: (next: ProductFormState) => void
  /**
   * Adota campos que acabaram de ser gravados FORA do save do formulário (ligar/desligar a peça na
   * coluna lateral). Muda o estado sem sujar: o valor já é o do banco, e o badge "Alterações não
   * salvas" mentiria. Uma edição que já estava pendente continua pendente.
   */
  adoptSaved: (patch: Partial<ProductFormState>) => void
  /**
   * Relê o produto em edição do banco, sem passar por `loading` (que trocaria a página por
   * "Carregando…"). Chamado depois do save, para a página continuar aberta: as variações novas
   * nascem com id provisório, e só a releitura troca pelo id real — sem ela o próximo save
   * inseriria a grade de novo. Devolve `false` se a leitura falhou.
   */
  reload: () => Promise<boolean>
  loading: boolean
  /** Só diz algo na EDIÇÃO; produto novo e duplicação são sempre `ok`. */
  loadStatus: ProductLoadStatus
  /** Lê de novo depois de `falhou`, passando por `loading`. */
  retryLoad: () => void
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
  const [loadStatus, setLoadStatus] = useState<ProductLoadStatus>('ok')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [savedSnapshot, setSavedSnapshot] = useState<ProductFormSnapshot>(SNAPSHOT_VAZIO)
  // A carga escreve no estado sem sujar o formulário. Sem esta distinção, abrir um produto e sair
  // sem tocar em nada dispararia a guarda de saída da T24 e o badge "Alterações não salvas".
  const loadingRef = useRef(false)

  const adopt = useCallback(
    (data: Parameters<typeof productRowToForm>[0], opts: { asCopy: boolean }) => {
      const loaded = productRowToForm(data, opts)
      setForm(loaded)
      // Duplicar cria linhas NOVAS: o snapshot fica vazio de propósito, senão o diff acharia
      // que a grade da cópia já existe no banco e tentaria dar `update` nos ids da origem.
      if (productId) {
        setSavedSnapshot({
          categoryIds: loaded.category_ids,
          variants: loaded.variants,
          slug: loaded.slug,
          faqIds: loaded.faqs.map(f => f.faq_id),
          filterValueIds: loaded.filter_value_ids,
          optionMarks: loaded.option_marks,
          options: loaded.options,
          suppliers: supplierRowsToSave(loaded.supplier_rows),
        })
      }
    },
    [productId],
  )

  useEffect(() => {
    const loadId = productId || copyFromId
    if (!loadId) {
      setLoadStatus('ok')
      setLoading(false)
      return
    }

    let cancelled = false
    const load = async () => {
      loadingRef.current = true
      const { data, error } = await fetchRow(loadId)

      if (!cancelled) {
        // Falha de leitura deixa o formulário nos defaults em vez de travar em "Carregando…" —
        // o admin ainda consegue sair da tela. Na EDIÇÃO, o desfecho vai para `loadStatus` e a
        // página troca o formulário por um aviso.
        if (!error && data) adopt(data, { asCopy: !!copyFromId && !productId })
        if (productId) {
          setLoadStatus(
            !error && data
              ? 'ok'
              : (!error && !data) || (error as { code?: string }).code === ID_INVALIDO
                ? 'nao-encontrado'
                : 'falhou',
          )
        }
        setLoading(false)
      }
      loadingRef.current = false
    }
    load()
    return () => {
      cancelled = true
    }
  }, [productId, copyFromId, adopt, loadAttempt])

  const retryLoad = useCallback(() => {
    setLoading(true)
    setLoadAttempt(n => n + 1)
  }, [])

  const reload = useCallback(async () => {
    if (!productId) return false
    const { data, error } = await fetchRow(productId)
    if (error || !data) return false
    adopt(data, { asCopy: false })
    setIsDirty(false)
    return true
  }, [productId, adopt])

  const setFields = useCallback(
    (patch: Partial<ProductFormState> | ((current: ProductFormState) => Partial<ProductFormState>)) => {
      setForm(current => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) }))
      if (!loadingRef.current) setIsDirty(true)
    },
    [],
  )

  const setField = useCallback(
    <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
      setFields({ [key]: value } as Partial<ProductFormState>)
    },
    [setFields],
  )

  const markSaved = useCallback(
    (snapshot?: ProductFormSnapshot) => {
      setIsDirty(false)
      if (snapshot) setSavedSnapshot(snapshot)
    },
    [],
  )

  const adoptSaved = useCallback((patch: Partial<ProductFormState>) => {
    setForm(current => ({ ...current, ...patch }))
  }, [])

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
    adoptSaved,
    reload,
    loading,
    loadStatus,
    retryLoad,
    isEdit: !!productId,
    productId: productId ?? null,
  }
}
