// Feature `88` · C6 — o pedido que um gesto faz ao portão de aviso.
//
// Quem chama o portão já decidiu, por `customerNoticeFor` (`@estrelinha/core/notifications`), que um
// e-mail à cliente SAIRIA. Sem previsão, ele grava direto e nem chega aqui (`AVS-06`).

import type { ReactNode } from 'react'
import type { NotificationEvent } from '@estrelinha/core/notifications'

export interface NoticeEmail {
  event: NotificationEvent
  /** No lote: quantos pedidos mandariam este e-mail. */
  quantos?: number
}

export interface NoticeRequest {
  /** O título do diálogo ("Marcar como enviado?"). */
  titulo: string
  /** A mudança em uma linha ("O pedido #1042 passa de Em Separação para Enviado"). */
  mudanca: string
  /** O verbo do botão que confirma ("Mudar para Enviado", "Avançar 8 pedidos"). */
  confirmar: string
  /** O mesmo verbo no gerúndio, enquanto a gravação corre ("Mudando para Enviado…"). */
  gerundio: string
  /** O e-mail da cliente (`customer_email`). Ausente no lote. */
  cliente?: string
  /** O pedido da prévia de "Ver o e-mail" (`AVS-22`). Ausente no lote. */
  orderId?: string
  /** Os e-mails que sairiam — os nomes vêm de `NOTIFICATION_EVENT_NAMES`, nunca daqui. */
  eventos: NoticeEmail[]
  /** "1 pedido já recebeu “Pedido postado” antes" — a linha do lote (`AVS-19`). */
  jaRecebeu?: string | null
  /** "O aviso para você sai de qualquer forma" — decidido por quem chama, por público (`A-04`). */
  notaDaDona?: string | null
  /** O lote: quantos pedidos mandariam e-mail. */
  lote?: { comEmail: number }
  /** A lista do que muda, no lote. */
  extra?: ReactNode
  /**
   * A gravação, com o estado da caixa. `null` = deu certo, o diálogo fecha. Uma frase = deu errado: ela
   * aparece DENTRO do diálogo, que fica aberto com a caixa como estava (`AVS-07`, `CRG-07`).
   */
  executar: (avisarCliente: boolean) => Promise<string | null>
  /** "Voltar", `Esc` ou clique fora: nada foi gravado (`AVS-05`) — o "Outro status" volta ao vazio. */
  aoCancelar?: () => void
  /**
   * Conserto do QA (foco): o controle que abriu o diálogo. Ausente ⇒ o elemento focado quando `pedir`
   * foi chamado. Ao fechar, o foco volta a ele — ou, se ele sumiu ou está desabilitado, à primeira de
   * `focoDepois` que existe.
   */
  origem?: Element | null
  focoDepois?: Array<() => Element | null | undefined>
}
