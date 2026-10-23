// O vocabulário do ATELIÊ para as duas colunas de estado de um pedido — `orders.status` e
// `orders.payment_status`. Subiu do painel para `core` no conserto do QA da feature `73`
// (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`).
//
// Até ali os dois mapas moravam em `apps/backoffice` (`useAdminOrders.ts` e `orderQuery.ts`), e o
// app do ateliê passou a precisar das mesmas palavras para o selo da Início: "Enviado", "Estornado".
// Escrever as palavras de novo em `core/orders/situation.ts` seria o defeito 01 no tamanho de um
// rótulo — o painel diria "Estornado" e o celular, um dia, "Devolvido". O painel agora REEXPORTA
// daqui (`toBe`, não `toEqual`: `rotulosDoPainel.test.ts`).
//
// **Não é o selo da cliente.** Estes mapas respondem "em que coluna o pedido está?", na voz de quem
// administra. A pergunta "em que pé está este pedido?" é de `orderSituation`, que junta as colunas.
//
// Sem import nenhum: o diretório é alcançável pelo Deno (`purity.test.ts`).

/** Os seis valores de `orders_status_check`. */
export type AdminOrderStatus = 'pending' | 'paid' | 'separating' | 'shipped' | 'delivered' | 'cancelled'

/** Os seis valores de `orders_payment_status_check`. */
export type AdminPaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'expired' | 'cancelled'

export const ORDER_STATUS_LABELS: Record<AdminOrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  separating: 'Em Separação',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const ORDER_PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  refunded: 'Estornado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}
