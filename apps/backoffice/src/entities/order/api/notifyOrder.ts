import { supabase } from '@estrelinha/supabase'
import type { NotificationEvent, NotificationTrigger } from '@estrelinha/core/notifications'
import { triggerOrderNotification, type NotifyOptions } from '@estrelinha/core/order-actions'

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
export async function notifyOrder(
  orderId: string,
  trigger: NotificationTrigger,
  opcoes?: NotifyOptions,
): Promise<boolean> {
  // Feature `75` (`AD-059`): o disparo subiu para `@estrelinha/core/order-actions`, com o client
  // RECEBIDO — o app do ateliê dispara o mesmo fato pela mesma porta. Este invólucro fica para os
  // chamadores do painel (e para o dono receber como `notify`).
  //
  // Feature `88` (`AVS-04`): `opcoes` é a escolha da caixa — `{ cliente: false }` vira `customer: false`
  // no corpo. Sem ela, o corpo de sempre.
  return triggerOrderNotification(supabase, orderId, trigger, opcoes)
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

/**
 * Feature `88` (`AVS-13`, `A-13`): o desfecho do avião do histórico, com o motivo — a mesma porta de
 * `resendNotification`, lida por inteiro. `'desligado'` é o evento desligado em Notificações (o motor
 * responde `skipped: 'disabled'`); `'estado'` é a pré-condição que deixou de valer (422). A linha
 * `skipped` continua `skipped` nos três desfechos que não são `'enviado'`.
 */
export type ResendOutcome = 'enviado' | 'desligado' | 'estado' | 'falhou'

export async function resendNotificationOutcome(
  orderId: string,
  event: NotificationEvent,
  channel: 'email' = 'email',
): Promise<ResendOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification?action=send', {
      body: { order_id: orderId, event, channel },
    })
    if (data?.sent === true) return 'enviado'
    if (data?.skipped === 'disabled') return 'desligado'
    const status = (error as { context?: { status?: number } } | null)?.context?.status
    if (status === 422) return 'estado'
    return 'falhou'
  } catch {
    return 'falhou'
  }
}
