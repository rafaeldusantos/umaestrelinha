import { orderSummary, type OrderSummary } from '@estrelinha/core/orders'
import type { Bloco, ItemDoPedido, PedidoDoDetalhe } from '@/entities/order'

/**
 * O resumo do pedido para o detalhe: só a ENTRADA de `orderSummary` (`core/orders`), o dono único da
 * composição — o "de/por" de cada peça, o subtotal cheio, as linhas de desconto e o Total, que é
 * `orders.total`. Nenhuma conta mora aqui.
 *
 * Com a leitura dos itens em falha, a regra recebe o pedido sem linhas e cai no formato de sempre (o
 * subtotal gravado, o cupom e o PIX): sem as linhas, ela não sabe o preço cheio, e não afirma desconto.
 */
export const resumoDoPedido = (pedido: PedidoDoDetalhe, itens: Bloco<ItemDoPedido[]>): OrderSummary =>
  orderSummary({ ...pedido, order_items: itens.estado === 'ok' ? (itens as { estado: 'ok'; dado: ItemDoPedido[] }).dado ?? [] : [] })
