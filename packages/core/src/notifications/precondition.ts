// Feature 42 — a pré-condição de cada evento, movida de `send-email/sender.ts` e estendida.
//
// `EML-09`, agora para quinze eventos: o pedido tem de ESTAR no estado que a notificação afirma.
// Sem isto, um bug em qualquer chamador manda "pagamento aprovado" para quem não pagou — pior que
// spam, é a loja mentindo para a cliente. O motor relê o pedido com a service role e chama isto
// ANTES de reivindicar linha nenhuma: falhar aqui deixa a tentativa retentável quando o estado
// completar, que é o que faz o par "marcar enviado" + "salvar rastreio" funcionar em qualquer ordem.
//
// `order_paid` olha `paid_at`, NÃO `status = 'paid'`: a RPC `apply_payment_approval` escreve
// `payment_status`/`paid_at` e nunca toca `orders.status`, então um pedido aprovado segue com
// `status = 'pending'` e a pré-condição óbvia faria o e-mail nunca sair.

import type { NotificationEvent } from './events.ts'

/**
 * O recorte do pedido que a pré-condição lê. Tudo opcional porque a origem é uma linha do banco
 * lida como `Record<string, unknown>` — e porque o snapshot da prévia do painel não tem tudo.
 */
export interface OrderSnapshot {
  status?: string | null
  payment_status?: string | null
  paid_at?: string | null
  mp_order_id?: string | null
  tracking_code?: string | null
  material_status?: string | null
  /** A remessa de ENTRADA (cliente → ateliê). Não é `tracking_code`, que é a de saída. */
  material_tracking_code?: string | null
}

/**
 * O que a pré-condição precisa saber ALÉM do pedido.
 *
 * Só os eventos `owner_*` usam: o destinatário deles sai de `resolveOwnerEmail` (`owner.ts`) — o
 * campo próprio de avisos, com queda para o de contato —, e sem endereço não há para quem avisar
 * (`no_owner_contact`). **Quem chama resolve**: passar `general.email` cru aqui reintroduziria o
 * segundo dono que `owner.ts` existe para impedir. A cliente não entra aqui: e-mail dela
 * ausente é `skipped:no_email` no motor, por canal, porque um canal pode faltar e o outro não.
 */
export interface PreconditionContext {
  ownerEmail?: string | null
}

const blank = (value: unknown): boolean => String(value ?? '').trim() === ''

/**
 * `null` quando o estado do pedido autoriza o evento; senão, o motivo — um slug curto que vai para o
 * log e para o histórico, nunca uma frase.
 */
export function preconditionFailure(
  event: NotificationEvent,
  order: OrderSnapshot,
  ctx: PreconditionContext = {},
): string | null {
  switch (event) {
    case 'order_received':
      if (order.payment_status !== 'pending') return 'order_not_pending'
      if (!order.mp_order_id) return 'no_mp_order'
      return null

    // A bifurcação da aprovação (NTF-10): pago E sem material a esperar. Com material pendente o
    // e-mail certo é `material_instructions` — este diria "entra na fila de produção" para quem
    // ainda precisa postar as cinzas.
    case 'order_paid':
      if (!order.paid_at) return 'order_not_paid'
      if (order.material_status === 'aguardando_material') return 'material_pending'
      return null

    case 'material_instructions':
      if (!order.paid_at) return 'order_not_paid'
      if (order.material_status !== 'aguardando_material') return 'material_not_pending'
      return null

    case 'payment_rejected':
      if (order.payment_status !== 'rejected') return 'payment_not_rejected'
      return null

    case 'pix_expired':
      if (order.payment_status !== 'expired') return 'payment_not_expired'
      return null

    case 'order_cancelled':
      if (order.status !== 'cancelled') return 'order_not_cancelled'
      return null

    case 'payment_refunded':
      if (order.payment_status !== 'refunded') return 'payment_not_refunded'
      return null

    // Escrito só pela RPC `set_material_tracking`, que exige dona do pedido ou admin.
    case 'material_tracking_registered':
      if (order.material_status !== 'material_enviado') return 'material_not_sent'
      if (blank(order.material_tracking_code)) return 'no_material_tracking_code'
      return null

    // MAT-09. Aqui a pré-condição vale ainda mais do que nas outras: um bug de chamador faria a loja
    // dizer "recebemos suas cinzas" para quem ainda não postou nada. `material_status` é escrito
    // SOMENTE pela RPC guardada `set_material_status`, então este é o estado de verdade.
    case 'material_received':
      if (order.material_status !== 'material_recebido') return 'material_not_received'
      return null

    case 'in_production':
      if (order.material_status !== 'em_producao') return 'material_not_in_production'
      return null

    case 'order_shipped':
      if (order.status !== 'shipped') return 'order_not_shipped'
      if (blank(order.tracking_code)) return 'no_tracking_code'
      return null

    case 'order_delivered':
      return order.status === 'delivered' ? null : 'order_not_delivered'

    // A elegibilidade "há ≥ N dias" é da rotina que dispara (P3, sem task nesta rodada): quem chama
    // decide QUANDO; aqui só se confere que o pedido foi de fato entregue.
    case 'post_delivery_care':
      return order.status === 'delivered' ? null : 'order_not_delivered'

    // Feature 57. Espelha `order_received` no estado, e NÃO exige `mp_order_id`: a cliente recebe
    // um e-mail sobre o PIX que foi gerado, e este diz apenas que entrou pedido — exigir o id da
    // Mercado Pago acoplaria o aviso interno a um detalhe que ele não menciona.
    case 'owner_order_received':
      if (order.payment_status !== 'pending') return 'order_not_pending'
      if (blank(ctx.ownerEmail)) return 'no_owner_contact'
      return null

    case 'owner_payment_rejected':
      if (order.payment_status !== 'rejected') return 'payment_not_rejected'
      if (blank(ctx.ownerEmail)) return 'no_owner_contact'
      return null

    case 'owner_order_paid':
      if (!order.paid_at) return 'order_not_paid'
      if (blank(ctx.ownerEmail)) return 'no_owner_contact'
      return null

    case 'owner_material_incoming':
      if (order.material_status !== 'material_enviado') return 'material_not_sent'
      if (blank(ctx.ownerEmail)) return 'no_owner_contact'
      return null
  }
}
