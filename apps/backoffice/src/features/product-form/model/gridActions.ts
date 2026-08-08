// Ações da grade (PFM-08 AC 6, 9, 10, 14) — transformações puras sobre a lista de variações.
//
// Tudo aqui é função pura de propósito: "aplicar +10% só nas linhas vazias do grupo 4,5 cm" é
// aritmética com regra de negócio, e aritmética errada numa grade de 60 linhas é dinheiro. A UI
// só chama e mostra.

import { cartesian, diffGrid, optionValuesKey, skuFromParts } from '@nanapin/core/pricing'
import type { OptionValues, ProductOption, ProductVariant } from '@nanapin/supabase/types'
import { tempVariantId } from './persistProduct'

/** Colunas numéricas que **Preencher coluna** sabe preencher. */
export type NumericField = 'price' | 'compare_price' | 'stock' | 'weight_kg'

/** Os 4 modos de PFM-08 AC 10. */
export type FillMode = 'all' | 'empty' | 'increase' | 'copyGroup'

/** Dinheiro arredonda a 2 casas; estoque é inteiro. Sem isto, `+10%` gera `6,490000000000001`. */
const roundFor = (field: NumericField, value: number): number =>
  field === 'stock' ? Math.round(value) : Math.round(value * 100) / 100

const isEmpty = (value: number | null | undefined): boolean =>
  value === null || value === undefined

/**
 * Ação em massa: aplica o patch **só** às linhas selecionadas (AC 9).
 *
 * Lista de seleção vazia não altera nada — "aplicar a nenhuma" é diferente de "aplicar a todas", e
 * confundir os dois é como se apaga a grade inteira por engano.
 */
export const applyBulk = (
  variants: readonly ProductVariant[],
  selectedIds: readonly string[],
  patch: Partial<ProductVariant>,
): ProductVariant[] => {
  const selected = new Set(selectedIds)
  return variants.map(variant => (selected.has(variant.id) ? { ...variant, ...patch } : variant))
}

/**
 * **Gerar SKU** (AC 14) nas linhas selecionadas, no padrão `PREFIXO-EIXO1-EIXO2` (`SLR-45-BRI`).
 *
 * O SKU gerado **permanece editável**: é sugestão, não decisão. E linhas não selecionadas não são
 * tocadas, mesmo estando sem SKU.
 */
export const generateSkus = (
  variants: readonly ProductVariant[],
  selectedIds: readonly string[],
  slug: string,
  options: readonly ProductOption[],
): ProductVariant[] => {
  const selected = new Set(selectedIds)
  return variants.map(variant =>
    selected.has(variant.id)
      ? { ...variant, sku: skuFromParts(slug, variant.option_values, options) }
      : variant,
  )
}

export interface FillColumnInput {
  variants: readonly ProductVariant[]
  field: NumericField
  mode: FillMode
  /** Valor a aplicar (`all`/`empty`) ou o percentual (`increase`). Ignorado em `copyGroup`. */
  value?: number
  /** Em `copyGroup`: o valor do 1º eixo do grupo de ORIGEM. */
  sourceGroup?: string
  /** Os eixos, para saber qual é o 1º (o que define os grupos). */
  options?: readonly ProductOption[]
  /** Quando presente, a ação vale só para estas linhas. */
  selectedIds?: readonly string[]
}

/**
 * **Preencher coluna** (AC 10): `aplicar a todas`, `só às vazias`, `+N%` e `copiar de outro grupo`.
 */
export const fillColumn = ({
  variants,
  field,
  mode,
  value,
  sourceGroup,
  options = [],
  selectedIds,
}: FillColumnInput): ProductVariant[] => {
  const scope = selectedIds ? new Set(selectedIds) : null
  const inScope = (variant: ProductVariant) => !scope || scope.has(variant.id)

  if (mode === 'copyGroup') {
    const first = [...options].sort((a, b) => a.position - b.position)[0]
    if (!first || sourceGroup === undefined) return [...variants]
    // A origem é indexada pelos OUTROS eixos: copiar do grupo `3,5 cm` para o `4,5 cm` significa
    // "o Fosco do 4,5 recebe o valor do Fosco do 3,5", não "todos recebem o primeiro valor".
    const restKey = (values: OptionValues) => {
      const rest = Object.fromEntries(
        Object.entries(values ?? {}).filter(([axis]) => axis !== first.name),
      ) as OptionValues
      return optionValuesKey(rest)
    }
    const source = new Map<string, number | null>()
    for (const variant of variants) {
      if (variant.option_values?.[first.name] === sourceGroup) {
        source.set(restKey(variant.option_values), variant[field] ?? null)
      }
    }
    return variants.map(variant => {
      if (!inScope(variant)) return variant
      if (variant.option_values?.[first.name] === sourceGroup) return variant
      const copied = source.get(restKey(variant.option_values))
      return copied === undefined ? variant : { ...variant, [field]: copied }
    })
  }

  if (mode === 'increase') {
    const percent = value ?? 0
    return variants.map(variant => {
      if (!inScope(variant)) return variant
      const current = variant[field]
      // `+N%` sobre linha sem valor não tem base: 10% de nada é nada, e escrever 0 aqui seria
      // inventar preço zero numa linha que o admin ainda não preencheu.
      if (isEmpty(current as number | null)) return variant
      return { ...variant, [field]: roundFor(field, (current as number) * (1 + percent / 100)) }
    })
  }

  const next = value ?? null
  return variants.map(variant => {
    if (!inScope(variant)) return variant
    // `só às vazias` é o modo que existe para NÃO atropelar o que o admin já digitou.
    if (mode === 'empty' && !isEmpty(variant[field] as number | null)) return variant
    return { ...variant, [field]: next === null ? null : roundFor(field, next) }
  })
}

// --- Regerar do cruzamento ---------------------------------------------------------------------

export interface RegeneratePlan {
  /** Combinações que ainda não têm linha. */
  toCreate: OptionValues[]
  /** Linhas órfãs: existem hoje e não estão no cruzamento novo. */
  toRemove: ProductVariant[]
  /** Linhas que sobrevivem, com preço/estoque/SKU **intactos**. */
  toKeep: ProductVariant[]
}

/**
 * O plano que a UI mostra **antes** de aplicar (AC 6). Nada é alterado aqui.
 *
 * É `diffGrid` da 07/T10, que já garante o contrato que importa: `toKeep` devolve o **objeto
 * original**, não uma cópia reconstruída — regerar não pode zerar o preço de quem já estava lá.
 */
export const buildRegeneratePlan = (
  variants: readonly ProductVariant[],
  options: readonly ProductOption[],
): RegeneratePlan => {
  const combos = cartesian(options)
  const diff = diffGrid(variants, combos)
  return { toCreate: diff.toCreate, toRemove: diff.toRemove, toKeep: diff.toKeep }
}

export interface ApplyRegenerateOptions {
  /** `false` mantém as órfãs na grade (o admin pode preferir pausá-las). Default: remove. */
  removeOrphans?: boolean
  /** Herdado pelas linhas novas: `products.stock_policy = 'none'` não controla saldo. */
  defaultStock?: number
}

/**
 * Aplica o plano. As linhas novas nascem **sem preço e pausadas** — o mesmo princípio da migração
 * da 07/T2: nenhuma linha entra na loja antes de alguém dizer quanto ela custa.
 */
export const applyRegenerate = (
  variants: readonly ProductVariant[],
  options: readonly ProductOption[],
  productId: string,
  { removeOrphans = true, defaultStock = 0 }: ApplyRegenerateOptions = {},
): ProductVariant[] => {
  const plan = buildRegeneratePlan(variants, options)
  const kept = removeOrphans ? plan.toKeep : [...plan.toKeep, ...plan.toRemove]
  const created: ProductVariant[] = plan.toCreate.map((option_values, index) => ({
    id: tempVariantId(),
    product_id: productId,
    option_values,
    name: null,
    sku: null,
    price: null,
    compare_price: null,
    stock: defaultStock,
    weight_kg: null,
    image_url: null,
    is_active: false,
    position: kept.length + index,
  }))
  return [...kept, ...created]
}
