// Cotação de frete devolvida por `melhor-envio?action=quote`
// (`supabase/functions/melhor-envio/index.ts:68-78`).
// `delivery_range` é opcional: o Melhor Envio nem sempre devolve a faixa (SHP-09).

export interface ShippingQuote {
  id: number
  name: string
  company: string
  price: string
  delivery_time: number
  delivery_range?: { min: number; max: number }
}
