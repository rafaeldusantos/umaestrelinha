import { initialMaterialStatus, type MaterialStatus } from '@estrelinha/core/material'

import type { ItemVenda, PedidoVenda } from '../csv/types.ts'
import {
  type CatalogIndex,
  matchItem,
  orphanProductId,
  suggestBySku,
  variantPart,
} from './catalogMatch.ts'
import {
  type OrderStatus,
  describeTriple,
  mapCancelReason,
  mapOrderStatus,
  mapPaymentStatus,
} from './orderStatus.ts'

/**
 * O pedido importado, como snapshot.
 *
 * **Nada aqui é recalculado pelo catálogo de hoje.** Preço, nome e quantidade são os da época — um
 * item de 2025 custava o que custava, e releitura faria `subtotal` deixar de fechar com a soma dos
 * itens. O catálogo local só é consultado para descobrir **a qual produto** o item se refere, e
 * para saber se aquele produto exige material.
 */

export interface OrderItemRow {
  product_id: string
  variant_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  price_source: 'base' | 'variant'
  variant_label: string | null
  variant_options: Record<string, string> | null
  requires_material: boolean
  material_kinds: string[]
  nuvemshop_order_id: number
}

export interface HistoryRow {
  to_status: OrderStatus
  from_status: OrderStatus | null
  created_at: string
  note: string
}

export interface NoteRow {
  note: string
}

export interface OrderRow {
  order_number: string
  customer_id: null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  status: OrderStatus
  payment_status: string
  material_status: MaterialStatus
  payment_method: string
  shipping_method: string | null
  shipping_carrier: string | null
  tracking_code: string | null
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  coupon_code: string | null
  notes: string | null
  cancel_reason: string | null
  paid_at: string | null
  created_at: string
  nuvemshop_id: number
  nuvemshop_status: string
  nuvemshop_payment_status: string
  nuvemshop_shipping_status: string
}

export interface MappedOrder {
  order: OrderRow
  items: OrderItemRow[]
  history: HistoryRow[]
  notes: NoteRow[]
  /** A tripla crua, para a distribuição observada do relatório. */
  observed: string
  /**
   * Itens que não casaram, com o produto que o SKU **sugeriria**.
   *
   * A sugestão vai para o relatório e **nunca** para o banco: gravá-la seria o vínculo fabricado
   * que `matchItem` recusa. Ela existe para que a perda de vínculo seja revisável à mão em vez de
   * silenciosa.
   */
  orfaos: Array<{ nome: string; sugestao: string | null }>
}

// ---------------------------------------------------------------------------------------------
// Campos derivados
// ---------------------------------------------------------------------------------------------

/**
 * `Meio de pagamento` → o vocabulário que o painel rotula (`PAYMENT_METHOD_LABELS`).
 *
 * `payment_method` é texto livre no banco, e é justamente por isso que a tradução mora aqui: um
 * `'Cartão de crédito'` gravado cru apareceria sem rótulo no chip e no CSV de exportação, sem nada
 * quebrar. `manual` é o destino de tudo que não é um dos três meios — `A combinar` e
 * `Pedido com 100% de desconto`, ambos medidos no arquivo.
 */
const MEIO_PAGAMENTO: Record<string, string> = {
  Pix: 'pix',
  'Cartão de crédito': 'credit_card',
  Boleto: 'boleto',
}

export const mapPaymentMethod = (pedido: PedidoVenda): string =>
  MEIO_PAGAMENTO[pedido.meioPagamento ?? ''] ?? 'manual'

/** O marcador de e-mail ausente. A coluna é `not null`, e vazio juntaria pessoas distintas. */
export const emailDoPedido = (pedido: PedidoVenda): string =>
  pedido.email.trim() !== ''
    ? pedido.email.trim()
    : `sem-email+${pedido.nuvemshopId}@importado.invalid`

/**
 * Os **dois cortes** que decidem se o pedido entra na fila de material.
 *
 * `initialMaterialStatus` sozinho é a regra do checkout: "algum item exige material?". Ela está
 * certa para pedido novo e **errada** para histórico, por dois motivos independentes, e os dois
 * foram medidos:
 *
 *  1. **terminal** — a máquina de estado do material não tem estado final (`nao_aplicavel`,
 *     `aguardando_material`, `material_enviado`, `material_recebido`, `em_producao`). Um pedido
 *     entregue em 2025 cujos itens exigem material ficaria em `aguardando_material` **para
 *     sempre**, e a fila da Adri nasceria com anos de lixo — sem nada quebrar.
 *  2. **pagamento** — PIX que expirou nunca virou dinheiro. Cobrar material de quem não pagou é
 *     fila falsa: a Adri esperaria um envelope de quem não comprou.
 *
 * Sem os dois cortes a fila nasce com **8** pedidos. Com eles, com **4** — que são exatamente os
 * que de fato esperam envelope.
 */
const TERMINAIS: readonly OrderStatus[] = ['shipped', 'delivered', 'cancelled']

export const materialDoPedido = (
  status: OrderStatus,
  paymentStatus: string,
  itens: readonly { requires_material: boolean; material_kinds: string[] }[],
): MaterialStatus =>
  TERMINAIS.includes(status) || paymentStatus !== 'approved'
    ? 'nao_aplicavel'
    : initialMaterialStatus(itens)

// ---------------------------------------------------------------------------------------------
// Itens
// ---------------------------------------------------------------------------------------------

const mapItem = (item: ItemVenda, pedido: PedidoVenda, index: CatalogIndex): OrderItemRow => {
  const match = matchItem(item.nome, index)

  return {
    // Item órfão preserva o snapshot inteiro: o pedido é registro do que FOI vendido, e perder o
    // item para respeitar uma FK apagaria história. `product_id` é `text` e `not null`.
    product_id: match ? match.produto.id : orphanProductId(item.nome),
    variant_id: match?.variacao?.id ?? null,
    product_name: item.nome,
    quantity: item.quantidade,
    unit_price: item.valor,
    price_source: match?.variacao ? 'variant' : 'base',
    variant_label: variantPart(item.nome),
    variant_options: match?.variacao?.option_values ?? null,
    requires_material: match?.produto.requires_material === true,
    material_kinds: Array.isArray(match?.produto.material_kinds)
      ? (match?.produto.material_kinds as string[])
      : [],
    nuvemshop_order_id: pedido.nuvemshopId,
  }
}

// ---------------------------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------------------------

/**
 * Só transições que a origem **data**.
 *
 * O CSV tem `Data`, `Data de pagamento`, `Data de envío` e `Data e hora do cancelamento` — e mais
 * nada. `Entregue` não tem data própria: datar a entrega por `Data de envío` seria datar um evento
 * por uma coluna que não é dele, e a linha passaria a mentir na primeira conferência. O estado
 * atual continua em `orders.status`; o histórico só conta o que pode provar.
 *
 * **A ordem é a LÓGICA, não a do relógio, e o motivo foi medido.** `Data de pagamento` e
 * `Data de envío` vêm **sem hora** — viram meia-noite. O pedido `#138` foi criado às 22:16 e pago no
 * mesmo dia: ordenado por timestamp, o pagamento (00:00) aparece **antes da criação** (22:16), e o
 * painel — que funde os três fios ordenando por tempo — mostraria "pago" acima de "recebido".
 *
 * Por isso a sequência é a única que estes quatro eventos podem ter, e cada linha é **empurrada
 * para a frente** até não preceder a anterior. O empurrão é uma correção declarada, não invenção de
 * precisão: a data do dia continua sendo a da origem, só a hora deixa de contradizer o que veio
 * antes.
 */
const historico = (pedido: PedidoVenda, status: OrderStatus): HistoryRow[] => {
  const marcos: Array<[string | null, OrderStatus]> = [
    [pedido.data, 'pending'],
    [pedido.dataPagamento, 'paid'],
    [pedido.dataEnvio, 'shipped'],
    // `cancelled` só entra se o pedido de fato terminou cancelado: uma linha dizendo "cancelado"
    // num pedido entregue é pior que linha nenhuma.
    [status === 'cancelled' ? pedido.dataCancelamento : null, 'cancelled'],
  ]

  let anterior: OrderStatus | null = null
  let ultimoInstante = ''

  return marcos
    .filter((m): m is [string, OrderStatus] => m[0] !== null)
    .map(([bruto, to_status]) => {
      const created_at = bruto.localeCompare(ultimoInstante) < 0 ? ultimoInstante : bruto
      ultimoInstante = created_at
      const linha: HistoryRow = {
        to_status,
        from_status: anterior,
        created_at,
        note: 'Importado da Nuvemshop',
      }
      anterior = to_status
      return linha
    })
}

// ---------------------------------------------------------------------------------------------

export const mapOrder = (pedido: PedidoVenda, index: CatalogIndex): MappedOrder => {
  const status = mapOrderStatus(pedido)
  const payment_status = mapPaymentStatus(pedido)
  const items = pedido.itens.map(item => mapItem(item, pedido, index))
  const material_status = materialDoPedido(status, payment_status, items)

  const notes: NoteRow[] = []
  if (pedido.anotacoesVendedor !== null) {
    // `orders.notes` é o recado DA CLIENTE (migration 20260829120000). A anotação do vendedor é
    // nota INTERNA, que a cliente nunca vê — são dois campos, e trocá-los mostraria à cliente o
    // que a Adri escreveu para si mesma.
    notes.push({ note: `Anotação da vendedora na Nuvemshop: ${pedido.anotacoesVendedor}` })
  }
  if (material_status === 'aguardando_material') {
    // O import NÃO observa o estado do material — a origem não tem esse dado. Ele é INFERIDO dos
    // itens, e dizer isso na nota é o que separa uma fila honesta de um palpite silencioso.
    notes.push({
      note:
        'Fila de material INFERIDA dos itens no import da Nuvemshop — a origem não registra o ' +
        'estado do material. Confirme com a cliente antes de cobrar.',
    })
  }

  return {
    order: {
      order_number: `NS-${pedido.numero}`,
      customer_id: null,
      customer_name: pedido.nomeComprador,
      customer_email: emailDoPedido(pedido),
      customer_phone: pedido.telefone,
      customer_document: pedido.documento,
      status,
      payment_status,
      material_status,
      payment_method: mapPaymentMethod(pedido),
      shipping_method: pedido.formaEntrega,
      shipping_carrier: null,
      tracking_code: pedido.rastreio,
      subtotal: pedido.subtotal,
      discount: pedido.desconto,
      shipping_cost: pedido.frete,
      total: pedido.total,
      address_street: pedido.endereco,
      address_number: pedido.numeroEndereco,
      address_complement: pedido.complemento,
      address_neighborhood: pedido.bairro,
      address_city: pedido.cidade,
      address_state: pedido.estado,
      address_zip: pedido.cep,
      coupon_code: pedido.cupom,
      notes: pedido.anotacoesComprador,
      cancel_reason: mapCancelReason(pedido),
      paid_at: pedido.dataPagamento,
      created_at: pedido.data,
      nuvemshop_id: pedido.nuvemshopId,
      nuvemshop_status: pedido.statusPedido,
      nuvemshop_payment_status: pedido.statusPagamento,
      nuvemshop_shipping_status: pedido.statusEnvio,
    },
    items,
    history: historico(pedido, status),
    notes,
    observed: describeTriple(pedido),
    orfaos: pedido.itens
      .filter(i => matchItem(i.nome, index) === null)
      .map(i => ({ nome: i.nome, sugestao: suggestBySku(i.sku, index)?.name ?? null })),
  }
}
