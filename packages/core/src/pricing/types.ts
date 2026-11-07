// Os tipos que `core/pricing` lê das variações e dos eixos do produto.
//
// Declarados aqui, e não importados de `@estrelinha/supabase/types`: este módulo é alcançado pelas
// edge functions por caminho relativo, e no Deno um import de pacote (bare specifier) não resolve —
// nem como `import type`, porque o Deno resolve o grafo de tipos antes da primeira linha rodar.
// Mesmo precedente de `PromotionDiscountKind` em `payment/pricing.ts`. Os do pacote descrevem a
// COLUNA; estes descrevem o ARGUMENTO, e são estruturalmente compatíveis com eles.

/** Os eixos de uma variação: `{ Tamanho: '4,5 cm', Acabamento: 'Fosco' }`. */
export type OptionValues = Record<string, string>

/** De onde veio o preço do item do pedido. Congelado no item. */
export type PriceSource = 'base' | 'variant'

/** A política de estoque do produto. */
export type StockPolicy = 'track' | 'backorder' | 'none'

/** Um eixo de escolha do produto. */
export interface ProductOption {
  name: string
  values: string[]
  position: number
}

/** O que esta regra lê de uma variação (`product_variants`). */
export interface ProductVariant {
  id: string
  product_id: string
  option_values: OptionValues
  /** `null` = variação sem preço: não é vendável. */
  price: number | null
  stock: number
  is_active: boolean
  position: number
}
