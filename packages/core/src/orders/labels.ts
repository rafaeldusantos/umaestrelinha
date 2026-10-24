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

/**
 * A família de cor de um selo. As cores em si são tokens da loja; aqui mora só a classificação.
 *
 * Mora AQUI, e não em `situation.ts`, desde a feature `74`: `PAYMENT_STATUS_TONES` (abaixo) também
 * precisa do tipo, e `situation.ts` já importa deste arquivo — declarar lá faria um ciclo só por um
 * tipo. `situation.ts` o reexporta com o mesmo nome.
 */
export type SituationTone = 'neutral' | 'done' | 'progress' | 'wait' | 'alert'

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

/**
 * Os meios de pagamento, em palavra de gente (feature `74`, `MAP-25`). `payment_method` é texto
 * livre no banco, por isso o `Record<string, string>`; quem desenha usa `paymentMethodLabel`, que
 * nunca devolve o valor cru.
 *
 * Subiu de `apps/backoffice/src/entities/order/api/orderQuery.ts` byte a byte — o chip do painel e o
 * detalhe do app do ateliê leem a mesma palavra. O painel reexporta por referência.
 *
 * **`card` entrou no conserto do QA da `74`** (`BUG-20261024-pagamento-por-cartao-aparece-como-card`):
 * é o valor que o checkout da PRÓPRIA loja grava para todo pedido de cartão (`credit_card` é o da
 * Nuvemshop). Só a loja o conhecia, num segundo mapa (`apps/store/.../paymentDelivery.ts`) — o
 * defeito 01 —, e o ateliê mostrava "card". A loja agora parte DESTE mapa e troca só a voz de
 * `manual` (a cliente lê "Combinado com a loja").
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  card: 'Cartão de crédito',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
  manual: 'Manual',
}

/** A palavra de um meio fora da lista: nunca o valor técnico na tela. */
export const PAYMENT_METHOD_FALLBACK = 'Outra forma de pagamento'

/** O rótulo de um meio de pagamento; o desconhecido (ou vazio) vira `PAYMENT_METHOD_FALLBACK`. */
export const paymentMethodLabel = (
  method: string | null | undefined,
  labels: Record<string, string> = PAYMENT_METHOD_LABELS,
): string => labels[(method ?? '').trim()] ?? PAYMENT_METHOD_FALLBACK

/**
 * O tom do selo de pagamento no detalhe do pedido (feature `74`, A15). Nasce aqui porque não havia
 * dono: o painel não pinta tom de pagamento. `Record` exaustivo — um estado novo no CHECK sem tom
 * não compila.
 */
export const PAYMENT_STATUS_TONES: Record<AdminPaymentStatus, SituationTone> = {
  pending: 'wait',
  approved: 'done',
  rejected: 'alert',
  refunded: 'neutral',
  expired: 'neutral',
  cancelled: 'alert',
}
