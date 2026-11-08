import type { AvisoDoMontado, LinkRenovado } from './useAcoesDoMontado'

/**
 * A ponte entre o pedido montado e a montagem — em MÓDULO, memória do app e de mais nada (o molde das
 * travas de `features/order-actions/model`): nada vai à URL, ao `history.state` nem ao armazenamento.
 *
 * - **Editar**: o pedido montado marca qual proposta a montagem reabre, e navega para a montagem. A
 *   montagem lê a marca ao montar e a esquece. F5 na montagem perde a marca, de propósito: a montagem
 *   recomeça vazia, como qualquer montagem (o estado dela é memória da tela).
 * - **O desfecho da gravação**: a montagem deixa o aviso ("Link criado." / "Alterações salvas.") e,
 *   ao criar, o link — que, sem a chave da cifra no servidor, só existe na resposta do `save` — para o
 *   pedido montado que abre em seguida. Preso à conta que gravou: outra conta não o vê.
 */
let emEdicao: string | null = null

export const marcarEdicao = (id: string): void => {
  emEdicao = id
}
export const edicaoMarcada = (): string | null => emEdicao
export const esquecerEdicao = (): void => {
  emEdicao = null
}

export interface DesfechoDaGravacao {
  id: string
  conta: string | null
  aviso: AvisoDoMontado
  link: LinkRenovado | null
}

let desfecho: DesfechoDaGravacao | null = null

export const deixarDesfecho = (d: DesfechoDaGravacao): void => {
  desfecho = d
}

/** O desfecho deixado para ESTE pedido montado e ESTA conta, ou `null`. Lido, ele some. */
export const tomarDesfecho = (id: string, conta: string | null): DesfechoDaGravacao | null => {
  const d = desfecho
  if (!d || d.id !== id) return null
  desfecho = null
  return d.conta === conta ? d : null
}
