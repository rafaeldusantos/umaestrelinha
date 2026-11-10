// A leitura do pedido pelo token do link de pagamento por cartão (function `checkout`, ação
// `get-card-link`). O servidor devolve só o que a página desenha para pagar — nunca dado pessoal.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

export const CARD_LINK_READ_FAILED_MESSAGE = 'Não consegui abrir o pagamento agora. Tente de novo.'

export interface CardLinkOrder {
  id: string
  order_number: string | null
  /** O valor que o cartão cobra — o travado na primeira cobrança. */
  amount: number
  items: Array<{ name: string; variant: string | null; quantity: number }>
}

/** União por literal de STRING (estreita sem `strictNullChecks`). */
export type CardLinkRead =
  | { kind: 'open'; order: CardLinkOrder }
  | { kind: 'paid'; orderNumber: string | null }
  | { kind: 'cancelled'; orderNumber: string | null }
  | { kind: 'unavailable' }

type Corpo = Record<string, unknown> | null

async function lerCorpoDoErro(error: unknown): Promise<Corpo> {
  try {
    const context = (error as { context?: Response })?.context
    return ((await context?.json()) as Corpo) ?? null
  } catch {
    return null
  }
}

export async function fetchCardLink(token: string): Promise<CardLinkRead> {
  const { data, error } = await supabase.functions.invoke('checkout?action=get-card-link', {
    body: { token },
  })
  const corpo = ((data ?? (await lerCorpoDoErro(error))) as Corpo) ?? null

  if (corpo?.code === 'unavailable') return { kind: 'unavailable' }
  const numero = typeof corpo?.order_number === 'string' ? corpo.order_number : null
  if (!error && corpo?.situation === 'paid') return { kind: 'paid', orderNumber: numero }
  if (!error && corpo?.situation === 'cancelled') return { kind: 'cancelled', orderNumber: numero }
  if (!error && corpo?.order && typeof corpo.order === 'object') {
    return { kind: 'open', order: corpo.order as CardLinkOrder }
  }
  // 429, 502, rede: não é "o link não vale" — é "não consegui ler agora".
  throw new Error(CARD_LINK_READ_FAILED_MESSAGE)
}

export const CARD_LINK_QUERY_KEY = 'card-link'

export function useCardLink(token: string | null) {
  return useQuery<CardLinkRead>({
    queryKey: [CARD_LINK_QUERY_KEY, token],
    enabled: !!token,
    queryFn: () => fetchCardLink(token as string),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
