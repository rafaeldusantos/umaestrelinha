// Mapper carrinho → payload de `melhor-envio?action=quote` (SHP-02).
//
// Extraído de `features/shipping-calc/ui/ShippingCalc.tsx:36-49` para existir **uma única**
// implementação: a página de produto e o checkout cotam com o mesmo corpo.
//
// Os fallbacks 11/2/16/0.1 são os mesmos já usados no shipping-calc; eles só entram quando o
// produto não tem a dimensão cadastrada. Com o produto preenchido, o valor real é enviado.
import type { CartItem } from '../model/cartStore'

/** Dimensões padrão de um botton, aplicadas por item quando o produto não as tem. */
export const QUOTE_FALLBACK = {
  width: 11,
  height: 2,
  length: 16,
  weight: 0.1,
} as const

export interface QuoteProductPayload {
  id: string
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
  quantity: number
}

export function toQuotePayload(items: CartItem[]): QuoteProductPayload[] {
  return (items ?? []).map((item) => ({
    id: item.product.id,
    width: item.product.width_cm || QUOTE_FALLBACK.width,
    height: item.product.height_cm || QUOTE_FALLBACK.height,
    length: item.product.length_cm || QUOTE_FALLBACK.length,
    weight: item.product.weight_kg || QUOTE_FALLBACK.weight,
    insurance_value: item.product.price,
    quantity: item.quantity,
  }))
}
