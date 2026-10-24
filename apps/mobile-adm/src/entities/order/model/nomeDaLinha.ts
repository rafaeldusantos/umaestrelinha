import { formatOrderNumber } from '@estrelinha/core/orders'

import type { LinhaDaLista } from './linha'

/**
 * O nome de um pedido para quem ouve (`MAP-19`): "Pedido #0244, Marina Duarte". Um dono só: a linha da
 * lista o usa como nome do link, e o botão da ação do cartão (feature `75`, C04) o acrescenta depois do
 * rótulo visível — irmão do link (Q5), o botão não herda contexto nenhum dele.
 */
export const nomeDaLinha = (l: Pick<LinhaDaLista, 'order_number' | 'customer_name' | 'customer_email'>): string =>
  `Pedido ${formatOrderNumber(l.order_number)}, ${l.customer_name || l.customer_email}`
