// Feature `75` · `MAA-24`, `AD-059` — conta à `send-notification` que algo aconteceu com um pedido.
//
// Subiu do painel (`notifyOrder`, `AD-032`) com o client RECEBIDO: o painel e o app do ateliê
// disparam o mesmo fato pela mesma porta. Quem chama nomeia o FATO (`order_status_changed`), nunca a
// mensagem — quais mensagens saem é decisão de `core/notifications`, relida pelo motor.
//
// **Nunca lança, e devolve só um booleano.** `422` é resposta esperada (a pré-condição barrou o par
// status + rastreio incompleto); falha de aviso não desfaz a gravação.

import type { NotificationTrigger } from '../notifications/triggers.ts'
import type { OrderWriteClient } from './types.ts'

export async function triggerOrderNotification(
  client: Pick<OrderWriteClient, 'functions'>,
  orderId: string,
  trigger: NotificationTrigger,
): Promise<boolean> {
  try {
    const { data } = await client.functions.invoke('send-notification?action=trigger', {
      body: { order_id: orderId, trigger },
    })
    return data?.sent === true
  } catch {
    return false
  }
}
