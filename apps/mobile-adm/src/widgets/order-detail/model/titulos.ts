import { formatOrderNumber } from '@estrelinha/core/orders'
import type { ItemDoPedido, PedidoDoDetalhe } from '@/entities/order'

/** O título do detalhe sem o pedido na mão (lendo, em falha, "não encontrei") — E5. */
export const TITULO_SEM_PEDIDO = 'Pedido'

/** O `h1` do detalhe: "Pedido #0244" — o número sai SÓ de `formatOrderNumber` (TE1). */
export const tituloDoPedido = (pedido: Pick<PedidoDoDetalhe, 'order_number'> | null | undefined): string =>
  pedido ? `${TITULO_SEM_PEDIDO} ${formatOrderNumber(pedido.order_number)}` : TITULO_SEM_PEDIDO

/** "1 joia" · "3 joias" — pela SOMA das quantidades, não pelo número de linhas (`MAP-24`). */
export const tituloDosItens = (itens: readonly Pick<ItemDoPedido, 'quantity'>[]): string => {
  const n = itens.reduce((soma, i) => soma + (i.quantity ?? 0), 0)
  return `${n} ${n === 1 ? 'joia' : 'joias'}`
}

/** O título do bloco quando a leitura dos itens falhou: sem número, porque não se sabe quantas. */
export const TITULO_DOS_ITENS_SEM_DADO = 'Joias'
