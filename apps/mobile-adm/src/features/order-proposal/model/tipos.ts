import type { ProposalActions, ProposalState } from '@estrelinha/core/proposals'

/**
 * As formas que a function `order-proposals` devolve, no recorte que o app desenha. Só os
 * campos que alguma tela lê estão aqui: o que não está tipado não é desenhado.
 */

/** Uma peça resumida do cartão da lista (a `list` traz até quatro, e `lines_count` diz quantas são). */
export interface PecaResumida {
  product_name: string
  product_image: string | null
  variant_label: string | null
  quantity: number
}

/** Um pedido montado na lista. O estado é o que o SERVIDOR derivou (`proposalState`). */
export interface MontadoNaLista {
  id: string
  number: string
  state: ProposalState
  expires_at: string
  order_id: string | null
  order_number: string | null
  customer_name: string
  customer_email: string
  items_total: number
  created_at: string
  lines: PecaResumida[]
  lines_count: number
}

/** A resposta da `list`, com o relógio do servidor. */
export interface ListaDeMontados {
  proposals: MontadoNaLista[]
  agora: string
}

/** Uma peça do pedido montado, como a revisão a mostra. */
export interface PecaDoMontado {
  position: number
  product_name: string
  product_image: string | null
  variant_label: string | null
  quantity: number
  unit_price: number
  engraving_text: string | null
}

export type CanalDoEnvio = 'whatsapp' | 'copy'

/** Um evento do histórico do pedido montado. */
export interface EventoDoMontado {
  kind: 'created' | 'edited' | 'link_sent' | 'viewed' | 'renewed' | 'cancelled' | 'completed'
  channel: CanalDoEnvio | null
  actor_email: string | null
  created_at: string
}

export interface PedidoMontado {
  id: string
  number: string
  status: 'open' | 'completed' | 'cancelled'
  version: number
  expires_at: string
  order_id: string | null
  order_number: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  subtotal: number
  promotion_discount: number
  coupon_code: string | null
  coupon_discount: number
  manual_discount: number
  items_total: number
  admin_note: string | null
  created_at: string
  items: PecaDoMontado[]
  events: EventoDoMontado[]
}

/** A resposta do `get`: o pedido montado, o estado, as ações e o token (só da aberta com cifra). */
export interface LeituraDoMontado {
  proposal: PedidoMontado
  state: ProposalState
  actions: ProposalActions
  token: string | null
}

/** A resposta do `renew`: o token novo e o prazo novo. */
export interface MontadoRenovado {
  id: string
  token: string
  expires_at: string
}

/** O resumo da montagem, como a prévia (`preview`) o devolve — os números que o `save` travaria. */
export interface ResumoDaMontagem {
  subtotal: number
  promotion_discount: number
  coupon_discount: number
  coupon_applied: boolean
  coupon_free_shipping: boolean
  coupon_discarded: boolean
  manual_discount: number
  items_total: number
}

/** A resposta da prévia: o resumo, o cupom conferido, a recusa do desconto combinado e o PIX dos itens. */
export interface PreviaDaMontagem {
  summary: ResumoDaMontagem
  coupon: { code: string; type: 'percent' | 'fixed' | 'free_shipping'; value: number; first_order_only: boolean } | null
  /** O desconto combinado recusado (ele não entrou na conta), ou `null`. */
  manual_refusal: string | null
  /** O PIX dos itens, ou `null` (PIX desligado ou sem desconto). */
  items_pix: { percent: number; total: number } | null
}
