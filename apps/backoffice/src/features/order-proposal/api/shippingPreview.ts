// A prévia do frete da montagem (feature 89, `MON-10`, `A-10`).
//
// A Adri vê a cotação do CEP como PRÉVIA — quem escolhe a entrega é a cliente, no link. A cotação é a
// mesma `melhor-envio?action=quote` que a loja e a tela do pedido chamam, com o corpo montado por
// `toQuoteProducts` (`core/shipping`, dono único do seguro POR UNIDADE). A chave do React Query leva o
// CEP e a impressão digital das peças: outra peça é outro frete, e uma resposta atrasada cai na
// entrada de cache dela, nunca na do CEP atual.
//
// **Falha não bloqueia a gravação** (`MON-10`): o hook devolve o erro e quem desenha diz "não consegui
// cotar"; "Criar link" não depende disto.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { toQuoteProducts } from '@estrelinha/core/shipping'
import { stripCep } from '@estrelinha/core/validators'
import type { ShippingQuote } from '@estrelinha/supabase/types'
import { lineReady, type DraftLine } from '../model/draft'

export const PROPOSAL_SHIPPING_KEY = ['admin', 'proposal-shipping'] as const

/** Só a opção com preço utilizável — o mesmo recorte da loja. */
const cotavel = (q: ShippingQuote) => q?.price != null && Number.parseFloat(q.price) > 0

/** O corpo da cotação para as linhas prontas do rascunho. */
export const quoteBody = (cep: string, lines: readonly DraftLine[]) => ({
  postal_code_to: stripCep(cep),
  products: toQuoteProducts(
    lines.filter(lineReady).map((l) => ({
      id: l.product_id,
      unitPrice: l.list_price as number,
      quantity: l.quantity,
      dimensions: l.dimensions,
    })),
  ),
})

export const useShippingPreview = (cep: string, lines: readonly DraftLine[]) => {
  const corpo = useMemo(() => quoteBody(cep, lines), [cep, lines])
  const pronto = corpo.postal_code_to.length === 8 && corpo.products.length > 0
  const { data, isFetching, error } = useQuery<ShippingQuote[]>({
    queryKey: [...PROPOSAL_SHIPPING_KEY, corpo.postal_code_to, JSON.stringify(corpo.products)],
    enabled: pronto,
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: resposta, error: erro } = await supabase.functions.invoke('melhor-envio?action=quote', { body: corpo })
      if (erro) throw erro
      return ((resposta ?? []) as ShippingQuote[]).filter(cotavel)
    },
  })
  return { pronto, opcoes: data ?? [], cotando: pronto && isFetching, falhou: pronto && !!error }
}
