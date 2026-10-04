// "Qual estado pede ação no topo do detalhe?" — um por vez (feature 59, `DET-02`).
//
// A decisão é PURA e mora aqui, fora do componente, por dois motivos: a página precisa da mesma
// resposta para escolher a única pílula cheia da tela (`CNF-05`) e para não desenhar o bloco do
// material duas vezes; e o relógio entra como parâmetro, então "6 dias e 23 h" e "7 dias e 1 min"
// se provam sem relógio falso.
//
// As perguntas de cada estado já têm dono — `podePagarComPix` (`entities/order`) e
// `podeGerarNovoPix`/`pagamentoPerdido` (`@estrelinha/core/orders`). Aqui mora só a PRIORIDADE.
import { pagamentoPerdido, podeGerarNovoPix, type RepixInput } from '@estrelinha/core/orders'
import { podePagarComPix } from '@/entities/order'

export type OrderActionState = 'cancelled' | 'material' | 'pix_pending' | 'repix' | 'payment_lost'

export interface OrderActionInput extends RepixInput {
  material_status?: string | null
}

/**
 * O estado do topo, ou `null` quando nada pede ação. A primeira regra que casar vence:
 * cancelado → material a enviar → PIX pendente → PIX novo (dentro de 7 dias) → pagamento perdido.
 *
 * "Material a enviar" é pago (`payment_status = 'approved'`, a régua de "pago" da spec) com o
 * envelope ainda não postado (`aguardando_material`). Pedido não pago que espera material cai no
 * estado do pagamento: pagar vem antes de postar.
 */
export function orderActionState(
  order: OrderActionInput | null | undefined,
  agora: Date,
): OrderActionState | null {
  if (!order) return null
  if (order.status === 'cancelled') return 'cancelled'
  if (order.payment_status === 'approved' && order.material_status === 'aguardando_material') {
    return 'material'
  }
  if (podePagarComPix(order)) return 'pix_pending'
  if (podeGerarNovoPix(order, agora)) return 'repix'
  if (pagamentoPerdido(order, agora)) return 'payment_lost'
  return null
}

/**
 * Os estados cuja ação é a da vez — o botão cheio do topo. Com um deles na tela, "Acompanhar
 * pedido" desce para contorno: duas pílulas cheias deixam de dizer qual é a ação (`CNF-05`).
 */
export const ACAO_PRIMARIA: readonly OrderActionState[] = ['material', 'pix_pending', 'repix']
