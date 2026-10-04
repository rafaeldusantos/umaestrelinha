// A mensagem pronta da ajuda do pedido (feature 59, `DET-12`). O número passa pelo formatador — o
// prefixo tem um dono só (`AD-043`).
import { formatOrderNumber } from '@estrelinha/core/orders'

/** A mensagem pronta. Exportada para o teste conferir a frase inteira, não um pedaço dela. */
export const orderHelpMessage = (orderNumber: string): string =>
  `Olá! Tenho uma dúvida sobre o pedido ${formatOrderNumber(orderNumber)}.`
