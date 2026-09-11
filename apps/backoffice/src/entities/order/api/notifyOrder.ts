import { supabase } from '@estrelinha/supabase'
import type { NotificationEvent, NotificationTrigger } from '@estrelinha/core/notifications'

/**
 * Conta à `send-notification` que **algo aconteceu** com um pedido (`AD-032`).
 *
 * Substitui `sendOrderEmail`, e a troca não é de nome: aquele nomeava a MENSAGEM (`order_shipped`),
 * este nomeia o FATO (`order_status_changed`). Quais mensagens saem, para quem, e em que canais é
 * decisão de `@estrelinha/core/notifications` — lida pelo motor e pelo painel, num lugar só. Com o
 * nome da mensagem aqui, a bifurcação "pagou, e tem material a esperar?" precisaria existir também
 * no backoffice, e duas escritas da mesma regra é o "defeito 01": não quebram nada e divergem no
 * primeiro ajuste.
 *
 * **Nunca lança, e devolve só um booleano.** `422` é resposta ESPERADA, não erro: `status` e
 * `tracking_code` são escritos por caminhos independentes — e em abas diferentes do dialog —, então
 * "marcar como enviado" e "salvar o rastreio" completam o par em duas ações. Quem chega primeiro
 * recebe 422; quem fecha o par produz o e-mail. Nada aqui deve virar toast de erro; quem quer saber
 * o motivo olha o histórico do pedido, que agora mostra cada tentativa.
 */
export async function notifyOrder(orderId: string, trigger: NotificationTrigger): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke('send-notification?action=trigger', {
      body: { order_id: orderId, trigger },
    })
    return data?.sent === true
  } catch {
    return false
  }
}

/**
 * Repete UMA mensagem — o botão "reenviar" do histórico (`PNL-08`).
 *
 * Aqui o nome da mensagem é o certo, e a assimetria com `notifyOrder` é deliberada: reenviar é dizer
 * **qual** mensagem repetir; disparar é dizer o que aconteceu. São duas portas com semânticas
 * diferentes na function, e é a razão de `send` continuar existindo ao lado de `trigger`.
 */
export async function resendNotification(
  orderId: string,
  event: NotificationEvent,
  channel: 'email' = 'email',
): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke('send-notification?action=send', {
      body: { order_id: orderId, event, channel },
    })
    return data?.sent === true
  } catch {
    return false
  }
}
