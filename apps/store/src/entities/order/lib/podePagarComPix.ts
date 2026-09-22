// "Este pedido ainda pode ser pago com PIX?" — `PIX-P3-01`, `PIX-P3-03`, `PIX-P3-04` (feature `58`).
//
// SPEC_DEVIATION: o `design.md` não lista este módulo — ele descreve o botão de `/pedido/:id` e o
// link de `/conta` como duas mudanças de tela independentes.
// Reason: as duas fazem a MESMA pergunta para decidir se oferecem o caminho de pagar, e escritas
// separadamente elas divergiriam sem nada quebrar — a conta oferecendo PIX num pedido de cartão, ou
// a confirmação escondendo o botão de um pedido que a conta continua anunciando. É o "defeito 01"
// que a própria feature existe para apagar, um nível abaixo do que ela mede. São duas PÁGINAS do
// mesmo app, então a camada estritamente abaixo das duas é `entities/` (`AD-033`).
//
// Duas telas fazem esta pergunta para decidir se OFERECEM o caminho de voltar a pagar: a
// confirmação (`/pedido/:id`) e a lista de `/conta`. São duas páginas, no mesmo app, então a
// resposta mora na camada estritamente abaixo das duas (`AD-033`) — aqui, `entities/order`.
//
// Escrita duas vezes ela divergiria sem nada quebrar, e a divergência tem uma forma previsível: a
// conta oferecendo "Pagar com PIX" num pedido de cartão, ou a confirmação escondendo o botão de um
// pedido que a conta continua anunciando. Nenhum dos dois derruba build, `tsc` ou teste de tela.
//
// **Esta NÃO é a regra da rota `/pedido/:id/pagamento`**, e a assimetria é deliberada. Lá a
// pergunta é outra — "esta rota pode emitir uma cobrança para este pedido?" — e a resposta precisa
// ser mais larga: um pedido cujo `payment_status` ficou `rejected` não é anunciado por tela
// nenhuma, mas quem chegar nele pelo endereço tem de conseguir gerar um código novo. Apertar a rota
// para casar com este predicado trancaria a cliente do lado de fora do próprio pedido.

/** A linha mínima que responde à pergunta. As duas telas leem tipos diferentes do mesmo pedido. */
export interface PixPayableOrder {
  payment_method?: string | null
  payment_status?: string | null
  status?: string | null
  /** Só a confirmação carrega este campo; a lista de `/conta` não o traz, e `undefined` é "não sei". */
  paid_at?: string | null
}

/**
 * `true` quando a tela deve oferecer "Pagar com PIX".
 *
 * `payment_status === 'pending'` é literal da AC, e não `!== 'approved'`: anunciar o caminho de
 * pagamento de um pedido reembolsado ou estornado seria convidar a cliente a pagar duas vezes.
 */
export const podePagarComPix = (order: PixPayableOrder | null | undefined): boolean =>
  !!order &&
  order.payment_method === 'pix' &&
  order.payment_status === 'pending' &&
  order.status !== 'cancelled' &&
  !order.paid_at

/** O endereço da superfície de pagamento de um pedido — montado num lugar só. */
export const orderPaymentPath = (orderId: string): string => `/pedido/${orderId}/pagamento`
