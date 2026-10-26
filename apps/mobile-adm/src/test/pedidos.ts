import { MATERIAL_INSTRUCTIONS_EVENT } from '@estrelinha/core/notifications'
import type {
  HistoryNoteRow,
  HistoryNotificationRow,
  HistoryStatusRow,
} from '@estrelinha/core/orders'

import type { ItemDoPedido, LinhaDaLista, PedidoDoDetalhe } from '@/entities/order/model/linha'

/**
 * Fixturas de pedido para os testes da lista e do detalhe (feature `74`). As chaves são as de
 * `COLUNAS_DA_LISTA`/`COLUNAS_DO_DETALHE`, e o probe `02-lista.ts` confere essas chaves contra a
 * resposta real do PostgREST local (`AD-012`). Cada teste muda só o que mede.
 *
 * `created_at` vem com MICROSSEGUNDOS, como o PostgREST devolve — é a string do cursor (R1).
 *
 * R1 da `73` (pago com `material_status` nulo) NÃO tem fixtura: a coluna é `not null` no banco
 * (medido em 2026-10-23, `information_schema`), então o estado não existe para a lista desenhar.
 */

export const linha = (extra: Partial<LinhaDaLista> = {}): LinhaDaLista => ({
  id: '00000000-0000-4000-8000-000000000244',
  order_number: '0244',
  customer_name: 'Marina Duarte',
  customer_email: 'marina@exemplo.invalid',
  status: 'paid',
  payment_status: 'approved',
  payment_method: 'pix',
  total: 389.9,
  tracking_code: null,
  material_tracking_code: null,
  material_status: 'nao_aplicavel',
  material_received_at: null,
  shipping_service_id: '1',
  created_at: '2026-10-20T13:04:05.123456+00:00',
  purchase_ordinal: 1,
  ...extra,
})

/** Um pedido de cada estado — os ids terminam no número, para a falha nomear quem divergiu. */
export const UM_DE_CADA_ESTADO: LinhaDaLista[] = [
  linha({ id: '00000000-0000-4000-8000-000000000001', order_number: '0001', status: 'pending', payment_status: 'pending' }),
  linha({ id: '00000000-0000-4000-8000-000000000002', order_number: '0002', status: 'paid' }),
  linha({ id: '00000000-0000-4000-8000-000000000003', order_number: '0003', status: 'separating' }),
  linha({ id: '00000000-0000-4000-8000-000000000004', order_number: '0004', status: 'shipped', tracking_code: 'BR123456789BR' }),
  linha({ id: '00000000-0000-4000-8000-000000000005', order_number: '0005', status: 'delivered', tracking_code: 'BR987654321BR' }),
  linha({ id: '00000000-0000-4000-8000-000000000006', order_number: '0006', status: 'cancelled', payment_status: 'cancelled' }),
]

/** Esperando o material da cliente — o único bloco que acumula idade. */
export const AGUARDANDO_MATERIAL = linha({
  id: '00000000-0000-4000-8000-000000000011',
  order_number: '0011',
  material_status: 'aguardando_material',
  created_at: '2026-10-10T09:00:00.000001+00:00',
})

/** Enviado sem código de rastreio — a cliente não foi avisada. */
export const SEM_RASTREIO = linha({ id: '00000000-0000-4000-8000-000000000012', order_number: '0012', status: 'shipped', tracking_code: null })

/** R2 da `73`, preservada: Pix pendente com `status` que não é `pending`. */
export const PIX_PENDENTE_CANCELADO = linha({
  id: '00000000-0000-4000-8000-000000000013',
  order_number: '0013',
  status: 'cancelled',
  payment_status: 'pending',
  payment_method: 'pix',
})

/** Retirada no escritório (`AD-049`): sem rastreio, sem endereço de entrega. */
export const RETIRADA = linha({ id: '00000000-0000-4000-8000-000000000014', order_number: '0014', shipping_service_id: 'retirada' })

export const detalhe = (extra: Partial<PedidoDoDetalhe> = {}): PedidoDoDetalhe => ({
  ...linha(),
  subtotal: 400,
  shipping_cost: 19.9,
  discount: 0,
  pix_discount: 20,
  promotion_discount: 0,
  coupon_code: null,
  shipping_method: 'PAC',
  address_street: 'Rua das Flores',
  address_number: '120',
  address_complement: 'apto 3',
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90010000',
  customer_phone: '51999990000',
  ...extra,
})

/** Cupom E desconto do Pix no mesmo pedido. */
export const COM_CUPOM_E_PIX = detalhe({ coupon_code: 'ESTRELA10', discount: 40, pix_discount: 18, payment_method: 'pix' })

export const DETALHE_DE_RETIRADA = detalhe({
  shipping_service_id: 'retirada',
  shipping_cost: 0,
  shipping_method: null,
  address_street: null,
  address_number: null,
  address_complement: null,
  address_neighborhood: null,
  address_city: null,
  address_state: null,
  address_zip: null,
})

export const item = (extra: Partial<ItemDoPedido> = {}): ItemDoPedido => ({
  id: 'i-1',
  product_name: 'Pingente gota com leite materno',
  variant_label: 'Prata 925',
  engraving_text: null,
  quantity: 1,
  unit_price: 400,
  ...extra,
})

/** Um item com gravação. */
export const ITEM_COM_GRAVACAO = item({ id: 'i-2', engraving_text: 'Helena' })

export const statusRow = (extra: Partial<HistoryStatusRow> = {}): HistoryStatusRow => ({
  id: 's-1',
  from_status: 'pending',
  to_status: 'paid',
  note: null,
  created_at: '2026-10-20T13:10:00.000000+00:00',
  ...extra,
})

/**
 * Um e-mail que FALHOU — o histórico diz que a cliente não soube. O evento vem do nome em `core`, e não
 * como literal: `notificationSingleOwner.test.ts` (loja) varre `apps/**` e recusa nome de evento escrito
 * à mão, inclusive em `src/test/` (que não é `__tests__`).
 */
export const EMAIL_FALHO: HistoryNotificationRow = {
  id: 'n-1',
  event: MATERIAL_INSTRUCTIONS_EVENT,
  channel: 'email',
  status: 'failed',
  attempts: 3,
  delivery_status: null,
  error: 'mailbox unavailable',
  created_at: '2026-10-20T13:11:00.000000+00:00',
  sent_at: null,
}

/** Uma nota interna. */
export const NOTA: HistoryNoteRow = {
  id: 'nt-1',
  note: 'Cliente pediu para conferir o comprimento da corrente.',
  created_at: '2026-10-20T15:00:00.000000+00:00',
  created_by: null,
}
