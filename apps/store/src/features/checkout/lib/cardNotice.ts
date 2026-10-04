// O aviso do cartão que não fechou — board `58 M`.
//
// A recusa não ganha tela própria: a espera sai e a pessoa volta ao bloco Pagamento com o cartão
// ainda digitado (o Brick nunca foi desmontado — `PGM-08`). O que este módulo decide é **o que o
// aviso pode afirmar**, e a distinção que importa é uma só:
//
// - **o banco respondeu e recusou** → nada foi cobrado, e a loja pode dizer isso;
// - **o banco não respondeu** (timeout, rede, erro do servidor) → a loja NÃO sabe se cobrou. Dizer
//   "nada foi cobrado" aqui seria afirmar o que ela não mediu. Quem impede a cobrança dupla na
//   retentativa é o servidor: `create-payment` recusa com 409 pedido que já está aprovado.
import { friendlyMessage } from '@estrelinha/core/payment/status'
import { formatOrderNumber } from '@estrelinha/core/orders'

export interface CardNotice {
  title: string
  message: string
  /** A linha de baixo: o pedido continua guardado. Ausente quando não há pedido ainda. */
  footer: string | null
}

export const DECLINED_TITLE = 'O banco não aprovou este cartão'
export const UNANSWERED_TITLE = 'Não conseguimos concluir o pagamento'

/** O banco respondeu `rejected` (ou `action_required`, que `AD-003` trata como recusa). */
export const declinedNotice = (
  statusDetail: string | null | undefined,
  orderNumber?: string | null,
): CardNotice => ({
  title: DECLINED_TITLE,
  message: friendlyMessage(statusDetail),
  footer: orderNumber
    ? `Pedido ${formatOrderNumber(orderNumber)} · guardado, e nada foi cobrado`
    : 'Nada foi cobrado.',
})

/** Sem resposta do banco: a mensagem é a do erro, e a linha de baixo NÃO fala de cobrança. */
export const unansweredNotice = (message: string, orderNumber?: string | null): CardNotice => ({
  title: UNANSWERED_TITLE,
  message,
  footer: orderNumber ? `Pedido ${formatOrderNumber(orderNumber)} · continua guardado` : null,
})
