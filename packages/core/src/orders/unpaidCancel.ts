// O cancelamento automático do pedido não pago — o recorte, o prazo e a marca.
//
// Três leitores fazem as mesmas perguntas, e por isso a regra mora aqui: a edge function agendada
// que cancela ("este pedido já venceu?"), o motor de notificação ("este cancelamento foi por falta de
// pagamento?", a pré-condição do e-mail próprio) e a loja ("o que digo à cliente em /pedido/:id e em
// /conta?"). Escrita em cada um, a loja poderia dizer "cancelado por falta de pagamento" de um pedido
// que a dona cancelou à mão, ou o motor mandar o e-mail de um que a cliente pediu para cancelar.
//
// A MARCA é a coluna `orders.unpaid_cancelled_at` — o instante em que o job cancelou —, gravada só
// pelo job e nunca por `cancel_reason`, que é texto livre da dona. Pedido cancelado sem a marca é o
// cancelamento de sempre, pela admin.
//
// O arquivo é FOLHA, sem import: a edge function e o motor de notificação (Deno) o alcançam por
// caminho relativo, e uma folha não arrasta para o grafo deles o resto de `orders`.

/**
 * Os dias corridos sem pagamento até o cancelamento. É o mesmo número da janela da oferta do PIX novo
 * (`REPIX_WINDOW_DAYS`, em `repix.ts`): passados os 7 dias a loja deixa de oferecer o código, e o
 * pedido é cancelado. Cópia deliberada para manter a folha sem import; `unpaidCancel.test.ts` compara
 * as duas.
 */
export const UNPAID_CANCEL_DAYS = 7

const DIA_MS = 24 * 60 * 60 * 1000

/** Os estados do material em que a cliente já mandou (ou a loja já recebeu) o material dela. */
export const MATERIAL_EM_MAOS = ['material_enviado', 'material_recebido'] as const

/** O que o recorte lê do pedido. */
export interface UnpaidCancelOrder {
  status?: string | null
  payment_status?: string | null
  paid_at?: string | null
  material_status?: string | null
  created_at?: string | null
  /** Pedido trazido da Nuvemshop: nunca é cancelado por este prazo. */
  nuvemshop_id?: number | string | null
}

/** Um registro de pagamento à mão do pedido (`order_manual_payments`): só o que o recorte lê. */
export interface UnpaidCancelManualPayment {
  /** `null` ⇒ o registro está vivo (o pedido está pago à mão). */
  undone_at?: string | null
}

const instante = (valor: string | null | undefined): number | null => {
  if (!valor) return null
  const t = new Date(valor).getTime()
  return Number.isNaN(t) ? null : t
}

/**
 * O instante a partir do qual os 7 dias contam: a criação do pedido, ou o DESFAZER mais recente de um
 * pagamento registrado à mão, o que vier depois. `null` quando a criação é ilegível.
 */
export function unpaidCancelStart(
  order: Pick<UnpaidCancelOrder, 'created_at'> | null | undefined,
  registros: readonly UnpaidCancelManualPayment[] = [],
): Date | null {
  const criado = instante(order?.created_at)
  if (criado === null) return null
  const desfeitos = registros.map((r) => instante(r?.undone_at)).filter((t): t is number => t !== null)
  return new Date(Math.max(criado, ...desfeitos))
}

/** O instante do cancelamento: o início do prazo mais 7 dias. `null` quando a criação é ilegível. */
export function unpaidCancelDeadline(
  order: Pick<UnpaidCancelOrder, 'created_at'> | null | undefined,
  registros: readonly UnpaidCancelManualPayment[] = [],
): Date | null {
  const inicio = unpaidCancelStart(order, registros)
  return inicio === null ? null : new Date(inicio.getTime() + UNPAID_CANCEL_DAYS * DIA_MS)
}

export interface UnpaidCancelContext {
  /** O relógio de quem decide. */
  agora: Date
  /** A data de corte: pedido criado ANTES dela nunca é cancelado por este prazo. */
  desde: Date | string
  /** Os registros de pagamento à mão do pedido, vivos e desfeitos. */
  registros?: readonly UnpaidCancelManualPayment[]
}

/**
 * `true` quando o pedido deve ser cancelado agora por falta de pagamento: está em Pendente, sem
 * pagamento confirmado (nem aprovado, nem com `paid_at`, nem registrado à mão vivo), sem material da
 * cliente enviado ou recebido, não veio da Nuvemshop, foi criado na data de corte ou depois, e o prazo
 * (`unpaidCancelDeadline`) já passou.
 */
export function unpaidCancelDue(order: UnpaidCancelOrder | null | undefined, ctx: UnpaidCancelContext): boolean {
  if (!order || order.status !== 'pending') return false
  if (order.payment_status === 'approved' || order.paid_at) return false
  if ((MATERIAL_EM_MAOS as readonly string[]).includes(order.material_status ?? '')) return false
  if (order.nuvemshop_id !== null && order.nuvemshop_id !== undefined && String(order.nuvemshop_id) !== '') return false

  const registros = ctx.registros ?? []
  if (registros.some((r) => !r?.undone_at)) return false

  const criado = instante(order.created_at)
  const desde = instante(ctx.desde instanceof Date ? ctx.desde.toISOString() : ctx.desde)
  if (criado === null || desde === null || criado < desde) return false

  const prazo = unpaidCancelDeadline(order, registros)
  return prazo !== null && ctx.agora.getTime() >= prazo.getTime()
}

/** `true` quando o pedido foi cancelado pelo job, por falta de pagamento — a marca, não o texto. */
export function cancelledForNonPayment(
  order: { status?: string | null; unpaid_cancelled_at?: string | null } | null | undefined,
): boolean {
  return !!order && order.status === 'cancelled' && String(order.unpaid_cancelled_at ?? '').trim() !== ''
}
