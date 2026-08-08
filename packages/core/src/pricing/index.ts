// Preço e disponibilidade POR VARIAÇÃO — domínio puro (roda em Node, Deno e browser).
//
// ---------------------------------------------------------------------------------------------
// Não confundir com `@nanapin/core/payment/pricing`. Os dois existem e fazem coisas diferentes:
//
//   este módulo          →  QUANTO CUSTA ESTA LINHA?      resolve o unit_price de cada item
//   payment/pricing.ts   →  QUANTO DÁ O PEDIDO INTEIRO?   soma, cupom, desconto PIX, order bump
//
// A ordem é: `resolveItemPrice` primeiro, `calculateOrderTotals` depois, com os preços já
// resolvidos. Inverter produz o bug que a feature 07 existe para matar.
// ---------------------------------------------------------------------------------------------
//
// Por que isto é função pura em `core` e não SQL na edge function: a MESMA regra roda no admin
// (faixa de preço na grade), na loja (vitrine e carrinho) e no servidor (recálculo do
// `create-payment`). A edge function importa daqui por caminho relativo, no precedente já
// estabelecido por `payment/status.ts` — então a regra testada aqui **é** a que roda no caixa,
// não uma cópia que pode divergir.

import type {
  OptionValues,
  PriceSource,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@nanapin/supabase/types'

// --- Resolução de preço do item ----------------------------------------------------------------

/** O que o pedido gravou. `price_source` é **congelado no item** e não se reavalia (A8). */
export interface PricedItem {
  product_id: string
  variant_id: string | null
  price_source: PriceSource
}

/** O que o chamador leu do banco para resolver os itens deste pedido. */
export interface PricingContext {
  /** `products.id` → `base_price`. */
  basePriceByProductId: ReadonlyMap<string, number>
  /** `product_variants.id` → a linha, para conferir dono e preço. */
  variantById: ReadonlyMap<string, Pick<ProductVariant, 'product_id' | 'price'>>
}

export type PriceErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'VARIANT_ID_MISSING'
  | 'VARIANT_NOT_FOUND'
  | 'VARIANT_PRODUCT_MISMATCH'
  | 'VARIANT_WITHOUT_PRICE'

export interface PriceError {
  code: PriceErrorCode
  /** Mensagem pronta para o 422, que **precisa nomear o item** (PST-01 AC 9). */
  message: string
}

export type PriceResolution = { price: number } | { error: PriceError }

/** Estreitamento para o chamador, que precisa decidir entre cobrar e devolver 422. */
export const isPriceError = (r: PriceResolution): r is { error: PriceError } => 'error' in r

/**
 * Resolve quanto custa UM item, respeitando o `price_source` **gravado no pedido**.
 *
 * A regra que parece supérflua e não é (PST-01 AC 6): a função **não** olha se o produto tem grade
 * para decidir o caminho. Ela obedece o que o item diz. Sem isso, o admin criar ou pausar uma
 * variação entre o pedido e o pagamento mudaria o valor cobrado de um pedido já fechado.
 *
 * Nunca cai em fallback silencioso: preço não resolvível vira erro nomeado, não o `unit_price`
 * que veio do cliente.
 */
export const resolveItemPrice = (item: PricedItem, ctx: PricingContext): PriceResolution => {
  if (item.price_source === 'variant') {
    if (!item.variant_id) {
      return {
        error: {
          code: 'VARIANT_ID_MISSING',
          message: `Item do produto ${item.product_id} está marcado como preço de variação mas não traz variant_id.`,
        },
      }
    }

    const variant = ctx.variantById.get(item.variant_id)
    if (!variant) {
      return {
        error: {
          code: 'VARIANT_NOT_FOUND',
          message: `Variação ${item.variant_id} não existe.`,
        },
      }
    }

    // Guarda contra item forjado ou dado inconsistente: a variação tem de ser DESTE produto.
    if (variant.product_id !== item.product_id) {
      return {
        error: {
          code: 'VARIANT_PRODUCT_MISMATCH',
          message: `Variação ${item.variant_id} não pertence ao produto ${item.product_id}.`,
        },
      }
    }

    if (variant.price === null || variant.price === undefined || !Number.isFinite(variant.price)) {
      return {
        error: {
          code: 'VARIANT_WITHOUT_PRICE',
          message: `Variação ${item.variant_id} está sem preço e não pode ser cobrada.`,
        },
      }
    }

    return { price: variant.price }
  }

  const basePrice = ctx.basePriceByProductId.get(item.product_id)
  if (basePrice === undefined || !Number.isFinite(basePrice)) {
    return {
      error: {
        code: 'PRODUCT_NOT_FOUND',
        message: `Produto ${item.product_id} não encontrado para precificação.`,
      },
    }
  }

  return { price: basePrice }
}

// --- Disponibilidade ---------------------------------------------------------------------------

/**
 * A variação pode ser vendida agora?
 *
 * `none` e `backorder` **nunca** esgotam — o primeiro é o modo dos personalizados e do sob
 * demanda, o segundo é venda com saldo negativo assumida pela loja. Só `track` olha o saldo.
 *
 * Variação pausada é indisponível em qualquer política: `is_active` é a decisão do admin e ela
 * vence a política de estoque.
 */
export const isVariantAvailable = (
  variant: Pick<ProductVariant, 'stock' | 'is_active'>,
  policy: StockPolicy,
): boolean => {
  if (!variant.is_active) return false
  if (policy === 'none' || policy === 'backorder') return true
  return variant.stock > 0
}

// --- Faixa de preço da vitrine -------------------------------------------------------------------

export interface PriceRange {
  min: number
  max: number
  /** Quantas linhas entraram na conta — vira o rótulo `N preços` da listagem. */
  count: number
}

/**
 * A faixa que a vitrine anuncia como "a partir de R$ X" e a listagem mostra como `R$ X – Y`.
 *
 * Conta **apenas** variação ativa com preço. Incluir pausada faria a loja anunciar um preço que
 * não se pode comprar; incluir sem preço faria a faixa começar em nada.
 *
 * `null` quando não sobra nenhuma — é o estado dos produtos migrados pela T2, e o chamador tem de
 * tratá-lo (tipicamente caindo em `base_price`).
 */
export const priceRange = (
  variants: readonly Pick<ProductVariant, 'price' | 'is_active'>[],
): PriceRange | null => {
  const prices = variants
    .filter(v => v.is_active && v.price !== null && v.price !== undefined && Number.isFinite(v.price))
    .map(v => v.price as number)

  if (prices.length === 0) return null
  return { min: Math.min(...prices), max: Math.max(...prices), count: prices.length }
}

// --- Rótulo da variação --------------------------------------------------------------------------

/** Separador do rótulo. Ponto médio com espaços, como no desenho: `4,5 cm · Fosco`. */
const LABEL_SEPARATOR = ' · '

/**
 * `{Acabamento: 'Fosco', Tamanho: '4,5 cm'}` → `4,5 cm · Fosco`.
 *
 * A ordem vem de `options[].position`, **não** da ordem das chaves do objeto: a ordem de
 * inserção de um JSONB que voltou do banco não é contrato, e o rótulo vai para o snapshot do
 * pedido — `Fosco · 4,5 cm` num recibo e `4,5 cm · Fosco` na tela seria o mesmo produto parecendo
 * dois.
 *
 * Eixos presentes em `values` mas ausentes de `options` entram **no fim**, em ordem alfabética,
 * em vez de sumirem: é o estado de um produto cujos eixos foram reduzidos, e perder o rótulo
 * silenciosamente é pior que exibi-lo fora de ordem.
 */
export const variantLabel = (
  options: readonly ProductOption[],
  values: OptionValues | null | undefined,
): string => {
  if (!values) return ''

  const ordered = [...options].sort((a, b) => a.position - b.position)
  const used = new Set<string>()
  const parts: string[] = []

  for (const option of ordered) {
    const value = values[option.name]
    if (typeof value === 'string' && value.trim() !== '') {
      parts.push(value.trim())
      used.add(option.name)
    }
  }

  const orphans = Object.keys(values)
    .filter(key => !used.has(key))
    .sort()
  for (const key of orphans) {
    const value = values[key]
    if (typeof value === 'string' && value.trim() !== '') parts.push(value.trim())
  }

  return parts.join(LABEL_SEPARATOR)
}

// --- Cruzamento de eixos e diff da grade -------------------------------------------------------
//
// `grid.ts` nasceu na 07/T10 e ficou sem ser reexportado aqui — não tinha consumidor fora do
// próprio teste até a 11/T26 (`OptionsEditor`). O design da 11 lista `cartesian` e `diffGrid` como
// vindos de `@nanapin/core/pricing`, então é aqui que eles pertencem.
//
// A extensão `.ts` é OBRIGATÓRIA e não é estilo: este arquivo está no grafo de import do Deno
// (`mercado-pago/handlers.ts` importa `pricing/index.ts` por caminho relativo). Sem ela o
// `supabase start` morre em `failed to read file: open packages/core/src/pricing/grid` ao montar
// os bind mounts do edge runtime — e o Vite/Vitest não pegam, porque resolvem sem extensão.
export * from './grid.ts'
