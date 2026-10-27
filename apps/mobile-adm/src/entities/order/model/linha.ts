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
import type { MaterialRequirement } from '@estrelinha/core/material'

/** As colunas da linha da lista (`MAP-16`..`MAP-19`), na view `order_list` (traz `purchase_ordinal`). */
export const COLUNAS_DA_LISTA =
  'id, order_number, customer_name, customer_email, status, payment_status, payment_method, total, ' +
  'tracking_code, material_tracking_code, material_status, material_received_at, shipping_service_id, ' +
  'created_at, purchase_ordinal'

/** O pedido do detalhe: a linha mais o que o cabeçalho, o cliente, os valores e a entrega leem. */
export const COLUNAS_DO_DETALHE =
  `${COLUNAS_DA_LISTA}, subtotal, shipping_cost, discount, pix_discount, promotion_discount, coupon_code, ` +
  'shipping_method, address_street, address_number, address_complement, address_neighborhood, ' +
  'address_city, address_state, address_zip, customer_phone, ' +
  // Feature `82` (`ENV-16`, `ENV-21`): quem informou o código do envelope, e quando (`order_list`, no fim).
  'material_tracking_set_at, material_tracking_set_by'

/** As quatro relações do detalhe — colunas conferidas no `information_schema` local (M3 do Design). */
export const COLUNAS_DOS_ITENS =
  'id, product_id, product_name, product_image, variant_label, engraving_text, quantity, unit_price, ' +
  // Feature `82` (`ENV-23`): o snapshot do material que o item exige — os chips do bloco Material.
  'requires_material, material_kinds'
export const COLUNAS_DO_STATUS = 'id, from_status, to_status, note, created_at'
export const COLUNAS_DAS_NOTAS = 'id, note, created_by, created_at'
/**
 * `provider_message_id` entrou na feature `79` (`MAN-09`): no canal `push` ele carrega `push:X/Y`, e
 * o histórico diz "Entregue a X de Y aparelhos" quando X < Y.
 */
export const COLUNAS_DAS_NOTIFICACOES =
  'id, event, channel, status, attempts, delivery_status, error, created_at, sent_at, provider_message_id'

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
  /** Feature `82`: nulas antes da migration `20261028120000` e nas linhas gravadas antes dela (A2). */
  material_tracking_set_at: string | null
  material_tracking_set_by: 'customer' | 'admin' | null
}

/**
 * Feature `82` (`ENV-23`): o item traz o snapshot do material que exige (`requires_material` e a lista
 * de materiais, a forma de `MaterialRequirement` de `core`) — o momento da compra, nunca o catálogo de
 * hoje. Lido só por `orderMaterialKinds`, para os chips do bloco Material.
 */
export interface ItemDoPedido extends MaterialRequirement {
  id: string
  /** `text`, e nem sempre um uuid: o import da Nuvemshop grava `nuvemshop:<nome>` (`catalogProductIds`). */
  product_id: string
  product_name: string
  /** A foto do momento da compra (snapshot); vazia nos itens vindos da Nuvemshop. */
  product_image: string | null
  variant_label: string | null
  engraving_text: string | null
  quantity: number
  unit_price: number
}

/**
 * O item como o detalhe o desenha: a linha de `order_items` mais a FOTO já decidida por `itemPhoto`
 * (`@estrelinha/core/orders`) — o snapshot vence, e a capa de hoje do catálogo só entra onde ele falta.
 */
export interface ItemComFoto extends ItemDoPedido {
  foto: string | null
}

/** Um bloco do detalhe que pode falhar sozinho (`MAP-30`). Discriminado por STRING (`strictNullChecks: false`). */
export type Bloco<T> = { estado: 'ok'; dado: T } | { estado: 'falhou' }

export interface DetalheDoPedido {
  /** `null` ⇒ "Não encontrei este pedido." (`MAP-29`). */
  pedido: PedidoDoDetalhe | null
  itens: Bloco<ItemComFoto[]>
  /** `buildHistory` já aplicado; em falha se QUALQUER das três fontes falhou (Q6). */
  historico: Bloco<HistoryEvent[]>
  /**
   * O aviso de postagem deste pedido SAIU (`shippedNoticeSent`, das MESMAS linhas do histórico)?
   * `false` também quando a leitura das notificações falhou: sem saber, a folha não afirma
   * (`BUG-20261024-folha-afirma-aviso-que-falhou`).
   */
  avisoDePostagemSaiu: boolean
  /**
   * O instante do banco da leitura confirmada. `null` só quando NÃO houve leitura: o endereço não é
   * um id de pedido (Q7), e "Não encontrei este pedido." sai sem ir à rede.
   */
  lido_em: string | null
}
