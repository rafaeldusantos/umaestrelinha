import type { RawProduct } from '../nuvemshop/types.ts'
import { loc } from './loc.ts'
import { comparePrice, decimal, effectivePrice } from './price.ts'

/** Uma linha de `public.product_variants`. O `sku` ainda é o BRUTO — a deduplicação é global (T7). */
export interface VariantRow {
  nuvemshop_id: number
  product_nuvemshop_id: number
  /** Rótulo legível da linha, ex.: `"Não · Prata 925 · Não"`. Nulo em produto sem eixo. */
  name: string | null
  /** Normalizado (vazio vira nulo), mas ainda não deduplicado — ver `map/sku.ts`. */
  sku: string | null
  /** `null` = variação sem preço: existe, é registrada, e não é vendável. */
  price: number | null
  /** O "de" riscado, só quando é maior que o preço cobrado. */
  compare_price: number | null
  stock: number
  option_values: Record<string, string>
  weight_kg: number | null
  is_active: boolean
  position: number
  /** `images[].id` da origem; vira URL do Storage na fase de imagens. */
  image_nuvemshop_id: number | null
}

/**
 * Os eixos desta linha, como `{"Cor":"Prata 925"}`.
 *
 * A origem entrega os nomes em `product.attributes` e os valores em `variant.values`, **na mesma
 * ordem** — medido: `values.length === attributes.length` nos 690 produtos. Par sem nome ou sem
 * valor é descartado em vez de virar chave vazia, que o `option_values` do schema não sabe ler.
 */
const optionValues = (raw: RawProduct, values: RawProduct['variants'][number]['values']) => {
  const out: Record<string, string> = {}
  raw.attributes.forEach((attr, index) => {
    const name = loc(attr)
    const value = loc(values[index])
    if (name !== '' && value !== '') out[name] = value
  })
  return out
}

export const mapVariants = (raw: RawProduct): VariantRow[] =>
  raw.variants.map(variant => {
    const price = effectivePrice(variant)
    const values = raw.attributes.map((_, i) => loc(variant.values[i])).filter(v => v !== '')
    const sku = (variant.sku ?? '').trim()

    return {
      nuvemshop_id: variant.id,
      product_nuvemshop_id: raw.id,
      name: values.length > 0 ? values.join(' · ') : null,
      sku: sku === '' ? null : sku,
      price,
      compare_price: comparePrice(variant),
      // `stock: null` significa estoque ilimitado na origem (3.181 das 3.357). Quem representa isso
      // na loja é `products.stock_policy = 'none'`, não um saldo — aqui 0 é só o piso da coluna.
      stock: variant.stock ?? 0,
      option_values: optionValues(raw, variant.values),
      weight_kg: decimal(variant.weight),
      // Variação sem preço nunca é vendável, mesmo que a origem a exiba: a loja não tem o que cobrar.
      is_active: variant.visible === true && price !== null,
      position: variant.position,
      image_nuvemshop_id: variant.image_id ?? null,
    }
  })
