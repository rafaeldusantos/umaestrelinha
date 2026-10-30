// Feature `75` · `MAA-24`, `AD-059` — conta à `send-notification` que algo aconteceu com um pedido.
//
// Subiu do painel (`notifyOrder`, `AD-032`) com o client RECEBIDO: o painel e o app do ateliê
// disparam o mesmo fato pela mesma porta. Quem chama nomeia o FATO (`order_status_changed`), nunca a
// mensagem — quais mensagens saem é decisão de `core/notifications`, relida pelo motor.
//
// **Nunca lança, e devolve só um booleano** — "a cliente recebeu um e-mail?" (`customer_sent`). `422` é resposta esperada (a pré-condição barrou o par
// status + rastreio incompleto); falha de aviso não desfaz a gravação.

import type { NotificationTrigger } from '../notifications/triggers.ts'
import type { NotifyOptions, OrderWriteClient, OrderWriteDeps } from './types.ts'

export async function triggerOrderNotification(
  client: Pick<OrderWriteClient, 'functions'>,
  orderId: string,
  trigger: NotificationTrigger,
  opcoes?: NotifyOptions,
): Promise<boolean> {
  // Feature `88`: `customer: false` só entra no corpo quando a Adri desmarcou a caixa. Sem a opção o
  // corpo é o de sempre — o motor publicado antes da `88` o ignoraria de qualquer forma.
  const body = opcoes?.cliente === false ? { order_id: orderId, trigger, customer: false } : { order_id: orderId, trigger }
  try {
    const { data } = await client.functions.invoke('send-notification?action=trigger', { body })
    // Feature `88` (Verifier r1, `AVS-07`): o booleano responde "um e-mail À CLIENTE saiu". `sent`
    // conta também o aviso à dona; `customer_sent` não. Sem `customer_sent` no corpo (motor publicado
    // antes da `88`, na janela de deploy), recua para `sent`.
    if (data && typeof data === 'object' && 'customer_sent' in data) return data.customer_sent === true
    return data?.sent === true
  } catch {
    return false
  }
}

/**
 * Feature `88` — o aviso de uma escrita, com a escolha da caixa. `avisarCliente === false` leva
 * `{ cliente: false }`; qualquer outro valor chama a notificadora com EXATAMENTE dois argumentos, como
 * antes da `88`. `avisar` (dispare ou não o gatilho) continua sendo decidido por quem chama.
 */
export const notifyWrite = (
  notify: OrderWriteDeps['notify'],
  orderId: string,
  trigger: NotificationTrigger,
  avisarCliente: boolean | undefined,
): Promise<boolean> => (avisarCliente === false ? notify(orderId, trigger, { cliente: false }) : notify(orderId, trigger))
