// Feature 42 — o gatilho vira eventos (`AD-032`).
//
// Quem dispara notificação nomeia o que ACONTECEU — "o pagamento foi aprovado", "o status mudou" —,
// nunca qual mensagem sai. A bifurcação `order_paid` × `material_instructions` vivia para nascer em
// DOIS chamadores (a `mercado-pago` e o botão de reenvio do painel), e duas escritas da mesma regra
// é o "defeito 01": não quebra nada e diverge no primeiro ajuste. Aqui ela tem um dono, é pura e
// tem teste.
//
// A pré-condição (`preconditionFailure`) continua sendo relida pelo motor DEPOIS desta derivação:
// este arquivo diz "o que faz sentido tentar", aquele diz "o estado permite".

import type { NotificationEvent } from './events.ts'
import type { OrderSnapshot } from './precondition.ts'

/** Os oito gatilhos. Cada um é um FATO sobre o pedido, não uma mensagem. */
export const NOTIFICATION_TRIGGERS = [
  'pix_created',
  'payment_approved',
  'payment_rejected',
  'payment_expired',
  'payment_refunded',
  'order_status_changed',
  'material_status_changed',
  'material_tracking_set',
] as const

export type NotificationTrigger = (typeof NOTIFICATION_TRIGGERS)[number]

export const isNotificationTrigger = (value: unknown): value is NotificationTrigger =>
  typeof value === 'string' && (NOTIFICATION_TRIGGERS as readonly string[]).includes(value)

/**
 * Os gatilhos que a CLIENTE pode disparar pela porta `action=notify` (dona do pedido, não admin).
 *
 * Um só, de propósito: a cliente registra o próprio rastreio de material pela RPC
 * `set_material_tracking`, e é o único fato que ela produz. Tudo o mais nasce no pagamento ou no
 * painel. Ampliar esta lista é ampliar o que uma cliente logada consegue fazer a loja enviar.
 */
export const CUSTOMER_TRIGGERS: readonly NotificationTrigger[] = ['material_tracking_set']

/**
 * Os eventos que um gatilho produz, na ORDEM de envio — cliente antes da dona, sempre. O orçamento
 * de tempo do caixa é compartilhado, e se um dos dois não couber, é o aviso interno que espera.
 */
export function eventsForTrigger(trigger: NotificationTrigger, order: OrderSnapshot): NotificationEvent[] {
  switch (trigger) {
    case 'pix_created':
      return ['order_received']

    // NTF-10 — a bifurcação. Com material a esperar, o próximo passo é da cliente (postar), e o
    // e-mail de "entra na fila de produção" diria a coisa errada. A dona é avisada nos dois ramos.
    case 'payment_approved':
      return [
        order.material_status === 'aguardando_material' ? 'material_instructions' : 'order_paid',
        'owner_order_paid',
      ]

    case 'payment_rejected':
      return ['payment_rejected']

    case 'payment_expired':
      return ['pix_expired']

    case 'payment_refunded':
      return ['payment_refunded']

    // Só os três status que têm aviso. `processing`/`pending` não avisam ninguém.
    case 'order_status_changed':
      switch (order.status) {
        case 'cancelled':
          return ['order_cancelled']
        case 'shipped':
          return ['order_shipped']
        case 'delivered':
          return ['order_delivered']
        default:
          return []
      }

    // `material_enviado` NÃO entra aqui: ele chega pelo rastreio (`material_tracking_set`), que é
    // o fato completo — status + código. Avisar "registramos o rastreio" só pelo status mandaria o
    // e-mail sem o código dentro.
    case 'material_status_changed':
      switch (order.material_status) {
        case 'material_recebido':
          return ['material_received']
        case 'em_producao':
          return ['in_production']
        default:
          return []
      }

    case 'material_tracking_set':
      return ['material_tracking_registered', 'owner_material_incoming']
  }
}
