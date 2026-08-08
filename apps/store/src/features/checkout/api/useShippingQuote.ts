// Cotação do carrinho inteiro no Melhor Envio (SHP-01, SHP-03, SHP-10).
//
// SHP-10 sai de graça do React Query: a chave carrega o CEP e a impressão digital do carrinho,
// então uma resposta que chegue atrasada é gravada na entrada de cache dela — nunca na do CEP
// atual. Não há AbortController manual.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type { ShippingQuote } from '@nanapin/supabase/types'
import { stripCep } from '@nanapin/core/validators'
import { toQuotePayload, useCartStore } from '@/entities/cart'

export const SHIPPING_QUOTE_KEY = 'shipping-quote'

/** Só a opção com preço utilizável entra na lista (mesmo filtro do shipping-calc). */
const isQuotable = (quote: ShippingQuote) =>
  quote?.price != null && Number.parseFloat(quote.price) > 0

export function useShippingQuote(cep: string | null) {
  const items = useCartStore((s) => s.items)
  const cleanCep = stripCep(cep ?? '')
  const products = useMemo(() => toQuotePayload(items), [items])
  // Recota quando o carrinho muda: outro peso/dimensão é outro frete.
  const cartFingerprint = JSON.stringify(products)

  return useQuery<ShippingQuote[]>({
    queryKey: [SHIPPING_QUOTE_KEY, cleanCep, cartFingerprint],
    // SHP-03: CEP incompleto não dispara cotação.
    enabled: cleanCep.length === 8 && products.length > 0,
    // SHP-05 prefere o fallback "Frete padrão" imediato a fazer a cliente esperar o backoff.
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('melhor-envio?action=quote', {
        body: { postal_code_to: cleanCep, products },
      })
      if (error) throw error
      return ((data ?? []) as ShippingQuote[]).filter(isQuotable)
    },
  })
}
