// Feature 88 — a previsão: "este gesto manda e-mail à cliente?" (`AVS-14`..`AVS-18`, `A-01`).
//
// O painel pergunta à Adri se avisa a cliente SÓ quando um e-mail sairia de fato. Responder isso na
// tela, à parte, seria um segundo dono da regra do motor — a pergunta apareceria quando nada sai, ou
// faltaria quando sai. Por isso a previsão é a MESMA composição que o motor aplica, sobre o pedido
// DEPOIS da escrita: `eventsForTrigger` → público `customer` → evento ligado no e-mail
// (`resolveEventSettings`) → `orderStateFailure` → e-mail da cliente presente → ainda não enviado.
//
// "Ainda não enviado" é o recorte do claim do banco (só `sent` é terminal): o motor nunca reenvia pelo
// gatilho um evento `sent`, e é exatamente o caso do "ajuste de status já avisado" que motivou a
// feature. O motor relê tudo no servidor; se a previsão divergir, quem fala é o desfecho real (`A-09`).
//
// Folha alcançável pelo Deno: todo especificador relativo leva a extensão explícita, `import type`
// incluso (`purity.test.ts` varre este diretório inteiro).

import type { NotificationEvent } from './events.ts'
import { EVENT_AUDIENCE, isNotificationEvent } from './events.ts'
import type { OrderSnapshot } from './precondition.ts'
import { orderStateFailure } from './precondition.ts'
import type { NotificationSettings } from './settings.ts'
import { resolveEventSettings } from './settings.ts'
import type { NotificationTrigger } from './triggers.ts'
import { eventsForTrigger } from './triggers.ts'

/** O que um gesto mandaria à cliente: `send` sai; `alreadySent` sairia, mas já saiu antes. */
export interface CustomerNotice {
  send: NotificationEvent[]
  alreadySent: NotificationEvent[]
}

/**
 * Os e-mails à cliente que o `trigger` produziria sobre `orderAfter` (o pedido como fica DEPOIS da
 * escrita), na ordem de `eventsForTrigger`.
 *
 * `settings` ausente (a leitura ainda não chegou) cai nos padrões — os mesmos que o motor usa sem linha
 * gravada —, nunca em "nenhum e-mail". Sem `customer_email`, nada sai (o motor pularia com `no_email`).
 */
export function customerNoticeFor(
  trigger: NotificationTrigger,
  orderAfter: OrderSnapshot & { customer_email?: string | null },
  settings: Partial<NotificationSettings> | null | undefined,
  sentEvents: ReadonlySet<NotificationEvent>,
): CustomerNotice {
  const send: NotificationEvent[] = []
  const alreadySent: NotificationEvent[] = []
  if (String(orderAfter.customer_email ?? '').trim() === '') return { send, alreadySent }

  for (const event of eventsForTrigger(trigger, orderAfter)) {
    if (EVENT_AUDIENCE[event] !== 'customer') continue
    if (!resolveEventSettings(settings, event, 'email').enabled) continue
    if (orderStateFailure(event, orderAfter) !== null) continue
    if (sentEvents.has(event)) alreadySent.push(event)
    else send.push(event)
  }
  return { send, alreadySent }
}

/**
 * As linhas de `order_notifications` que contam como "a cliente já recebeu": canal e-mail, status
 * `sent`, evento de público `customer`. `skipped`, `failed` e `pending` não contam — e o aviso no
 * celular (`push`) é da dona.
 */
export function sentCustomerEvents(
  rows: readonly { event: string; channel?: string | null; status: string }[],
): Set<NotificationEvent> {
  const saida = new Set<NotificationEvent>()
  for (const r of rows) {
    if (r.channel !== 'email' || r.status !== 'sent') continue
    if (!isNotificationEvent(r.event) || EVENT_AUDIENCE[r.event] !== 'customer') continue
    saida.add(r.event)
  }
  return saida
}
