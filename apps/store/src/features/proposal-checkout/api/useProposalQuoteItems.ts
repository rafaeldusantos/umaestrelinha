// As peças do pedido montado, no formato da cotação do Melhor Envio (feature 89, `CON-04`).
//
// A proposta não guarda medidas, e a cotação depende do peso. As medidas são lidas de `products`
// (leitura pública, a mesma do catálogo), e a REGRA é a de sempre: `toQuoteProducts`
// (`@estrelinha/core/shipping`), com o seguro pelo preço TRAVADO da linha. Peça que não voltar da
// leitura (inativa, apagada) recebe as medidas padrão — ela já bloqueia a conclusão por `CON-09`.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { toQuoteProducts, type QuoteDimensions, type QuoteProductPayload } from '@estrelinha/core/shipping'
import type { PublicProposalLine } from '@estrelinha/core/proposals'

type Medidas = QuoteDimensions & { id: string }

export function useProposalQuoteItems(lines: PublicProposalLine[]): QuoteProductPayload[] {
  const ids = useMemo(() => [...new Set(lines.map((l) => l.product_id))].sort(), [lines])
  const medidas = useQuery<Medidas[]>({
    queryKey: ['proposal-quote-dimensions', ids],
    enabled: ids.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, width_cm, height_cm, length_cm, weight_kg')
        .in('id', ids)
      if (error) throw error
      return (data ?? []) as Medidas[]
    },
  })

  // Enquanto as medidas chegam, lista VAZIA (a cotação espera) — nunca `undefined`, que faria a
  // Entrega cotar a SACOLA. Se a leitura falhar, cota com as medidas padrão.
  const porId = useMemo(() => new Map((medidas.data ?? []).map((m) => [m.id, m])), [medidas.data])
  const pronto = !medidas.isLoading
  return useMemo(
    () =>
      pronto
        ? toQuoteProducts(
            lines.map((l) => ({
              id: l.product_id,
              unitPrice: l.unit_price,
              quantity: l.quantity,
              dimensions: porId.get(l.product_id) ?? null,
            })),
          )
        : [],
    [lines, porId, pronto],
  )
}
