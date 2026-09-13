// A leitura do pedido pela edge function, com o token de posse (feature `49`).
//
// Mora num arquivo próprio porque tem **dois** consumidores, e a regra do repositório é a de sempre:
// `useOrder` (a confirmação e a conta) e o `PixPayment` (a espera da aprovação). Escrita duas vezes,
// a segunda cópia divergiria no formato do corpo ou no tratamento da recusa — e o modo de falhar
// seria a cliente esperando para sempre numa tela de QR já pago.
import { supabase } from '@estrelinha/supabase/client'

/**
 * Devolve o pedido, ou `null` em **qualquer** recusa — 403, rede, corpo inesperado.
 *
 * Quem chama trata `null` como "tente o outro caminho", nunca como erro de tela: a diferença entre
 * "expirou" e "não é seu" não muda o que a cliente pode fazer, e distingui-las na resposta
 * transformaria a ação num oráculo de quais ids de pedido existem.
 */
export async function fetchGuestOrder<T>(orderId: string, token: string): Promise<T | null> {
  if (!orderId || !token) return null
  try {
    const { data, error } = await supabase.functions.invoke('checkout?action=get-order', {
      body: { order_id: orderId, access_token: token },
    })
    if (error) return null
    return ((data as { order?: unknown } | null)?.order as T) ?? null
  } catch {
    return null
  }
}
