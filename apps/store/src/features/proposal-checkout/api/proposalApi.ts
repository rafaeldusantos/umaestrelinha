// A proposta do lado da loja (feature 89, T24): ler pelo token e concluir.
//
// Fala só com a function `checkout` (`get-proposal`, `create-order` com `proposal_token`) — a loja
// nunca alcança as tabelas da proposta (`SEG-05`). Os códigos de recusa do servidor viram tipos que
// a página distingue, porque cada um pede uma resposta diferente:
//
//   404 `unavailable`       ⇒ `CON-08`: o link não vale mais (inválido, expirado, cancelado).
//   409 `proposal_changed`  ⇒ `CON-10`: a Adri editou; reler e pedir conferência.
//   422 `item_unavailable`  ⇒ `CON-09`: uma peça saiu do ar; marcar e bloquear.
//   422 retirada            ⇒ a mesma recusa de `/checkout` (`RET-12`).
//
// O `Authorization` não é montado à mão: `functions.invoke` anexa a sessão quando há. O link é a
// prova de posse (A-08), então a sessão não muda nada aqui.
import { supabase } from '@estrelinha/supabase/client'
import type { PublicProposal } from '@estrelinha/core/proposals'
import { PICKUP_REFUSAL } from '@estrelinha/core/shipping'
import { PickupUnavailableError, lerCorpoDoErro } from '@/entities/order/api/useOrders'

export { PickupUnavailableError }

/** CON-08, palavra por palavra. A página mostra esta frase, e não a que vier do servidor. */
export const PROPOSAL_UNAVAILABLE_MESSAGE =
  'Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'
/** CON-10. */
export const PROPOSAL_CHANGED_MESSAGE =
  'A Adri atualizou seu pedido. Confira de novo antes de concluir.'
/** CON-09. */
export const ITEM_UNAVAILABLE_MESSAGE = 'Indisponível no momento'
export const PROPOSAL_READ_FAILED_MESSAGE = 'Não consegui abrir o seu pedido agora. Tente de novo.'
export const PROPOSAL_ORDER_FAILED_MESSAGE = 'Não foi possível criar seu pedido. Tente novamente.'

/** O que `get-proposal` devolve, já interpretado. União por literal de STRING (estreita sem `strictNullChecks`). */
export type ProposalRead =
  | { kind: 'open'; proposal: PublicProposal }
  | { kind: 'completed'; orderId: string; accessToken: string | null }
  | { kind: 'unavailable' }

export class ProposalUnavailableError extends Error {
  readonly reason = 'unavailable'
}
export class ProposalChangedError extends Error {
  readonly reason = 'proposal_changed'
}
export class ProposalItemUnavailableError extends Error {
  readonly reason = 'item_unavailable'
  constructor(
    message: string,
    /** As posições (`order_proposal_items.position`) das peças que saíram do ar. */
    readonly positions: number[],
  ) {
    super(message)
  }
}

type Corpo = Record<string, unknown> | null

async function corpoDe(data: unknown, error: unknown): Promise<Corpo> {
  return ((data ?? (await lerCorpoDoErro(error))) as Corpo) ?? null
}

/** `CON-01`, `CON-07`, `CON-08`: lê a proposta pelo token do link. */
export async function fetchProposal(token: string): Promise<ProposalRead> {
  const { data, error } = await supabase.functions.invoke('checkout?action=get-proposal', {
    body: { token },
  })
  const corpo = await corpoDe(data, error)

  if (corpo?.code === 'unavailable') return { kind: 'unavailable' }
  if (corpo?.completed === true && typeof corpo.order_id === 'string') {
    return {
      kind: 'completed',
      orderId: corpo.order_id,
      accessToken: typeof corpo.access_token === 'string' ? corpo.access_token : null,
    }
  }
  if (!error && corpo?.proposal && typeof corpo.proposal === 'object') {
    return { kind: 'open', proposal: corpo.proposal as PublicProposal }
  }
  // 429, 502, rede: não é "o link não vale" — é "não consegui ler agora".
  throw new Error(PROPOSAL_READ_FAILED_MESSAGE)
}

/** O que a página manda ao concluir. Itens, preços, descontos e e-mail vêm do servidor (`PRC-03`, A-07). */
export interface ProposalOrderInput {
  proposal_token: string
  proposal_version: number
  client_request_id: string
  payment_method: 'pix' | 'card'
  customer_name: string
  customer_phone: string
  customer_document: string
  address_zip: string
  address_street: string
  address_number: string
  address_complement: string
  address_neighborhood: string
  address_city: string
  address_state: string
  shipping_service_id: string
  shipping_carrier: string
  shipping_method: string
  /** O frete COTADO da entrega escolhida; quem zera é `proposalPricing`, dos dois lados. */
  shipping_cost: number
  delivery_estimate_min: string
  delivery_estimate_max: string
  ga_client_id?: string
  ga_session_id?: string
  analytics_declined?: boolean
}

export interface ProposalOrderResult {
  id: string
  access_token: string | null
  order_number: string | null
  /** CON-06: a proposta já estava concluída e o servidor devolveu o MESMO pedido. */
  reused: boolean
}

/** `CON-05`, `CON-06`: cria (ou reencontra) o pedido da proposta. */
export async function createProposalOrder(input: ProposalOrderInput): Promise<ProposalOrderResult> {
  const { data, error } = await supabase.functions.invoke('checkout?action=create-order', {
    body: input,
  })
  const corpo = await corpoDe(data, error)
  const mensagem = typeof corpo?.error === 'string' ? corpo.error : ''

  if (corpo?.code === 'unavailable') throw new ProposalUnavailableError(PROPOSAL_UNAVAILABLE_MESSAGE)
  if (corpo?.code === 'proposal_changed') throw new ProposalChangedError(PROPOSAL_CHANGED_MESSAGE)
  if (corpo?.code === 'item_unavailable') {
    const posicoes = Array.isArray(corpo.positions)
      ? corpo.positions.map(Number).filter((n) => Number.isFinite(n))
      : []
    throw new ProposalItemUnavailableError(mensagem, posicoes)
  }
  if (mensagem === PICKUP_REFUSAL) throw new PickupUnavailableError(mensagem)
  if (error || typeof corpo?.order_id !== 'string') {
    throw new Error(mensagem || PROPOSAL_ORDER_FAILED_MESSAGE)
  }
  return {
    id: corpo.order_id,
    access_token: typeof corpo.access_token === 'string' ? corpo.access_token : null,
    order_number: typeof corpo.order_number === 'string' ? corpo.order_number : null,
    reused: corpo.reused === true,
  }
}
