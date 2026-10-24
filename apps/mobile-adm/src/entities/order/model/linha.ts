// Feature `74` — o FORMATO do que a lista e o detalhe leem (`MAP-01`, `MAP-21`..`MAP-27`).
//
// Só formato: as colunas pedidas ao PostgREST, nomeadas uma a uma, e os tipos do que volta. Nenhuma
// regra mora aqui — "em que recorte", "o que o segura" e "como se diz" são de `@estrelinha/core`.
//
// **Tipo escrito à mão é afirmação, não verificação** (`AD-012`): cada lista abaixo é conferida pelo
// probe `.specs/features/74-mobile-adm-pedidos/probes/02-lista.ts`, que lê o banco local e exige que a
// resposta tenha EXATAMENTE estas chaves. Nenhuma coluna `nuvemshop_*` (`provenanceNotRead`, painel):
// a proveniência do import não responde "este pedido foi pago?".

import type { AdminPaymentStatus, HistoryEvent } from '@estrelinha/core/orders'

/** As colunas da linha da lista (`MAP-16`..`MAP-19`), na view `order_list` (traz `purchase_ordinal`). */
export const COLUNAS_DA_LISTA =
  'id, order_number, customer_name, customer_email, status, payment_status, payment_method, total, ' +
  'tracking_code, material_tracking_code, material_status, material_received_at, shipping_service_id, ' +
  'created_at, purchase_ordinal'

/** O pedido do detalhe: a linha mais o que o cabeçalho, o cliente, os valores e a entrega leem. */
export const COLUNAS_DO_DETALHE =
  `${COLUNAS_DA_LISTA}, subtotal, shipping_cost, discount, pix_discount, promotion_discount, coupon_code, ` +
  'shipping_method, address_street, address_number, address_complement, address_neighborhood, ' +
  'address_city, address_state, address_zip, customer_phone'

/** As quatro relações do detalhe — colunas conferidas no `information_schema` local (M3 do Design). */
export const COLUNAS_DOS_ITENS = 'id, product_name, variant_label, engraving_text, quantity, unit_price'
export const COLUNAS_DO_STATUS = 'id, from_status, to_status, note, created_at'
export const COLUNAS_DAS_NOTAS = 'id, note, created_by, created_at'
export const COLUNAS_DAS_NOTIFICACOES =
  'id, event, channel, status, attempts, delivery_status, error, created_at, sent_at'

export interface LinhaDaLista {
  id: string
  order_number: string
  customer_name: string | null
  customer_email: string
  status: string
  payment_status: AdminPaymentStatus
  payment_method: string
  total: number
  tracking_code: string | null
  material_tracking_code: string | null
  material_status: string
  material_received_at: string | null
  shipping_service_id: string | null
  /** Como o PostgREST devolve, com microssegundos — é o cursor da página seguinte (R1). */
  created_at: string
  purchase_ordinal: number
}

/** Uma janela da lista, do topo: `fim` quando a última leitura veio curta (`MAP-15`). */
export interface JanelaDaLista {
  linhas: LinhaDaLista[]
  total: number
  lido_em: string
  fim: boolean
}

export interface PedidoDoDetalhe extends LinhaDaLista {
  subtotal: number
  shipping_cost: number | null
  discount: number | null
  pix_discount: number
  promotion_discount: number
  coupon_code: string | null
  shipping_method: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  customer_phone: string | null
}

export interface ItemDoPedido {
  id: string
  product_name: string
  variant_label: string | null
  engraving_text: string | null
  quantity: number
  unit_price: number
}

/** Um bloco do detalhe que pode falhar sozinho (`MAP-30`). Discriminado por STRING (`strictNullChecks: false`). */
export type Bloco<T> = { estado: 'ok'; dado: T } | { estado: 'falhou' }

export interface DetalheDoPedido {
  /** `null` ⇒ "Não encontrei este pedido." (`MAP-29`). */
  pedido: PedidoDoDetalhe | null
  itens: Bloco<ItemDoPedido[]>
  /** `buildHistory` já aplicado; em falha se QUALQUER das três fontes falhou (Q6). */
  historico: Bloco<HistoryEvent[]>
  /**
   * O instante do banco da leitura confirmada. `null` só quando NÃO houve leitura: o endereço não é
   * um id de pedido (Q7), e "Não encontrei este pedido." sai sem ir à rede.
   */
  lido_em: string | null
}
