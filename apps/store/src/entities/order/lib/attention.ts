// "Precisa da sua atenção" — o que depende da cliente, no topo da conta (feature 59, `PEN-01..07`).
//
// Mora em `entities/order` (e não em `core`) porque lê `podePagarComPix`, que é deste slice
// (`AD-033`). As perguntas de cada pendência têm dono — `podePagarComPix` para o PIX em aberto,
// `podeGerarNovoPix`/`pagamentoPerdido` (`@estrelinha/core/orders`) para a janela de 7 dias —, e
// aqui moram só o recorte do material e a ORDEM. O relógio entra como parâmetro.
import { pagamentoPerdido, podeGerarNovoPix, repixDeadline } from '@estrelinha/core/orders'
import type { Order } from '../api/useOrders'
import { podePagarComPix } from './podePagarComPix'

export type AttentionKind = 'pay_pending' | 'repix' | 'payment_lost' | 'material'

export interface AttentionItem {
  kind: AttentionKind
  order: Order
  /** `repix`: até quando a tela oferece o PIX novo (`created_at + 7 dias`). */
  deadline?: Date | null
  /** `material`: o nome da primeira peça do pedido que exige material (`PEN-01`). */
  pieceName?: string | null
}

/** O tipo da pendência na ordem do `PEN-06`: pagamento antes de material. */
const GRUPO: Record<AttentionKind, number> = {
  pay_pending: 0,
  repix: 0,
  payment_lost: 0,
  material: 1,
}

const instante = (o: Order) => {
  const t = new Date(o.created_at).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** A pendência de UM pedido, ou `null`. Um pedido gera no máximo uma. */
function pendenciaDe(order: Order, agora: Date): AttentionItem | null {
  if (!order || order.status === 'cancelled') return null

  if (podePagarComPix(order)) return { kind: 'pay_pending', order }
  if (podeGerarNovoPix(order, agora)) {
    return { kind: 'repix', order, deadline: repixDeadline(order) }
  }
  if (pagamentoPerdido(order, agora)) return { kind: 'payment_lost', order }

  // `PEN-01`: pago, com o envelope ainda não postado, e alguma peça que exige material.
  const peca = (order.order_items ?? []).find((item) => item?.requires_material)
  if (peca && order.payment_status === 'approved' && order.material_status === 'aguardando_material') {
    return { kind: 'material', order, pieceName: peca.product_name ?? null }
  }

  return null
}

/**
 * As pendências da conta, já ordenadas (`PEN-06`): pagamento (pendente, expirado, perdido) antes de
 * material, e dentro de cada tipo a mais antiga primeiro. Sem pendência, lista vazia — e o bloco
 * inteiro não é renderizado (`PEN-07`).
 */
export function accountAttention(orders: readonly Order[] | null | undefined, agora: Date): AttentionItem[] {
  const itens: AttentionItem[] = []
  for (const order of orders ?? []) {
    const p = pendenciaDe(order, agora)
    if (p) itens.push(p)
  }
  return itens.sort(
    (a, b) => GRUPO[a.kind] - GRUPO[b.kind] || instante(a.order) - instante(b.order),
  )
}
