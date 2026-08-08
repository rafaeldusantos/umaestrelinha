import { supabase } from '@nanapin/supabase'

export type OrderEmailType = 'order_received' | 'order_paid' | 'order_shipped'

/**
 * Pede à edge function `send-email` que dispare o e-mail transacional de um pedido.
 *
 * O corpo leva SÓ `{ type, order_id }`: destinatário e conteúdo são resolvidos no servidor, a partir
 * do banco. O backoffice não escolhe para quem manda nem o que manda.
 *
 * **422 é resposta esperada, não erro.** `status` e `tracking_code` são escritos por caminhos
 * independentes — e em abas diferentes do dialog —, então "marcar como enviado" e "salvar o rastreio"
 * completam o par em duas ações. Quem chega primeiro recebe 422; quem fecha o par produz o e-mail.
 * Por isso esta função devolve apenas um booleano e nunca lança: nada aqui deve virar toast de erro.
 * Quem quer saber o motivo olha o log estruturado da function.
 */
export async function sendOrderEmail(orderId: string, type: OrderEmailType): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke('send-email?action=send', {
      body: { type, order_id: orderId },
    })
    return data?.sent === true
  } catch {
    return false
  }
}
