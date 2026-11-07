// A leitura da folha de separação: N pedidos de uma vez, para a folha de UM pedido (a página do
// pedido) e para o lote (a lista de Pedidos). Uma montagem só — a folha de um pedido não monta o
// objeto à mão a partir do que a tela tem.
//
// Quatro consultas, cada uma por `.in` sobre os ids pedidos, e cada uma com a sua regra de falha:
//   · `orders` e `order_items` LANÇAM — folha sem itens, ou sem o pedido, seria afirmação falsa, e
//     nada se imprime;
//   · `order_admin_notes` degrada para "sem Observação" — imprimir sem a observação é aceitável;
//   · `products` degrada para "sem foto de catálogo" — a foto é conveniência, e o snapshot do pedido
//     (`order_items.product_image`) continua valendo.
//
// A foto segue `itemPhoto` (core): o snapshot vence, a capa de hoje só onde ele falta. Nunca a foto
// da variação. A URL vai na rendição de 112 (2× a moldura de 56 da folha).

import { supabase } from '@estrelinha/supabase/client'
import { primaryImage, renditionUrl } from '@estrelinha/core/media'
import { catalogProductIds, itemPhoto } from '@estrelinha/core/orders'
import type { AdminOrderRow } from './orderQuery'

export const PICK_SLIP_READ_FAILED = 'Não consegui ler os pedidos para a folha de separação. Nada foi impresso.'

/** A largura pedida da foto: 2× a moldura de 56px da folha. */
const FOTO_LARGURA = 112

export interface PickSlipItem {
  product_name: string
  quantity: number
  variant_label?: string | null
  engraving_text?: string | null
  material_kinds?: string[]
  /** A foto da peça (já na rendição da moldura), ou `null`: a folha desenha a moldura vazia. */
  image?: string | null
}

export type PickSlipOrder = Pick<AdminOrderRow, 'id' | 'order_number' | 'customer_name' | 'created_at'> & {
  notes?: string | null
  items?: PickSlipItem[]
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  /** O frete escolhido (`orders.shipping_method`); o nome sai por `shippingMethodLabel`. */
  shipping_method?: string | null
  /** `'retirada'` na retirada no escritório. */
  shipping_service_id?: string | null
  /**
   * A observação do pedido (`order_admin_notes`), só de quem administra. Sai na folha de um pedido
   * e no lote, cada uma na folha do seu pedido.
   */
  admin_note?: string | null
}

/** O pedido como o carregador devolve: os itens sempre presentes. */
export type LoadedPickSlipOrder = PickSlipOrder & { items: PickSlipItem[] }

const COLUNAS_DO_PEDIDO = [
  'id', 'order_number', 'customer_name', 'created_at', 'notes', 'shipping_method', 'shipping_service_id',
  'address_street', 'address_number', 'address_complement', 'address_neighborhood', 'address_city',
  'address_state', 'address_zip',
].join(', ')

const COLUNAS_DO_ITEM =
  'order_id, product_id, product_name, product_image, quantity, variant_label, engraving_text, material_kinds'

type LinhaDoPedido = Omit<PickSlipOrder, 'items' | 'admin_note'>
type LinhaDoItem = {
  order_id: string
  product_id: string
  product_name: string
  product_image: string | null
  quantity: number
  variant_label: string | null
  engraving_text: string | null
  material_kinds: string[] | null
}

/** A capa de hoje de cada produto do catálogo; leitura que falha devolve mapa vazio. */
const lerCapas = async (itens: readonly LinhaDoItem[]): Promise<Record<string, string | null>> => {
  const ids = catalogProductIds(itens)
  if (ids.length === 0) return {}
  const { data, error } = await supabase.from('products').select('id, images').in('id', ids)
  if (error || !data) return {}
  const mapa: Record<string, string | null> = {}
  for (const p of data as { id: string; images: unknown }[]) mapa[p.id] = primaryImage(p.images)?.url ?? null
  return mapa
}

/** As observações por pedido; leitura que falha devolve mapa vazio (folha sem Observação). */
const lerObservacoes = async (ids: readonly string[]): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from('order_admin_notes').select('order_id, note').in('order_id', [...ids])
  if (error || !data) return {}
  const mapa: Record<string, string> = {}
  for (const n of data as { order_id: string; note: string | null }[]) if (n.note) mapa[n.order_id] = n.note
  return mapa
}

/**
 * Os pedidos da folha, na ordem dos `ids`. Id que não voltou de `orders` fica de fora.
 *
 * Lança (`PICK_SLIP_READ_FAILED`) quando `orders` ou `order_items` falham — quem chama fecha a
 * janela e avisa. `ids` vazio não vai à rede.
 */
export async function fetchPickSlipOrders(ids: readonly string[]): Promise<LoadedPickSlipOrder[]> {
  if (ids.length === 0) return []
  const lista = [...ids]

  const [pedidosRes, itensRes, observacoes] = await Promise.all([
    supabase.from('orders').select(COLUNAS_DO_PEDIDO).in('id', lista),
    supabase.from('order_items').select(COLUNAS_DO_ITEM).in('order_id', lista),
    lerObservacoes(lista),
  ])
  if (pedidosRes.error || itensRes.error) throw new Error(PICK_SLIP_READ_FAILED)

  const pedidos = (pedidosRes.data ?? []) as unknown as LinhaDoPedido[]
  const itens = (itensRes.data ?? []) as unknown as LinhaDoItem[]
  const capas = await lerCapas(itens)

  const porId = new Map(pedidos.map(p => [p.id, p]))
  return lista.flatMap(id => {
    const pedido = porId.get(id)
    if (!pedido) return []
    const seus = itens
      .filter(i => i.order_id === id)
      .map((i): PickSlipItem => {
        const foto = itemPhoto(i.product_image, capas[i.product_id])
        return {
          product_name: i.product_name,
          quantity: i.quantity,
          variant_label: i.variant_label,
          engraving_text: i.engraving_text,
          material_kinds: i.material_kinds ?? [],
          image: foto ? renditionUrl(foto, FOTO_LARGURA) : null,
        }
      })
    return [{ ...pedido, items: seus, admin_note: observacoes[id] ?? null }]
  })
}
