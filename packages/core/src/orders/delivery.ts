// Feature `74` (`MAP-26`, `MAP-27`) — a linha do rastreio de SAÍDA no bloco "Entrega" do detalhe.
//
// Nasce aqui (não havia dono): a frase depende do vocabulário de status, e `MAP-49` proíbe declarar
// esse mapa no app. Retirada no escritório não tem linha de rastreio nenhuma (`isPickupOrder`, `63`).
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { isPickupOrder, PICKUP_METHOD_NAME } from '../shipping/pickup.ts'

/** As colunas que a linha do rastreio lê. */
export interface ShippingLineInput {
  status: string
  tracking_code: string | null
  shipping_service_id?: string | null
}

/** Os estados em que o pedido ainda não saiu do ateliê. */
const ANTES_DA_POSTAGEM: readonly string[] = ['pending', 'paid', 'separating']

/**
 * "Rastreio <código>" · "Enviado sem código de rastreio" · "Ainda não postado" · "Sem rastreio";
 * `null` na retirada (MAP-27: sem transportadora, sem prazo e sem linha de rastreio).
 */
export const shippingLine = (o: ShippingLineInput): string | null => {
  if (isPickupOrder(o)) return null
  const codigo = o.tracking_code?.trim()
  if (codigo) return `Rastreio ${codigo}`
  if (o.status === 'shipped') return 'Enviado sem código de rastreio'
  if (ANTES_DA_POSTAGEM.includes(o.status)) return 'Ainda não postado'
  return 'Sem rastreio'
}

/** As colunas que o nome do frete lê. */
export interface ShippingMethodInput {
  shipping_method?: string | null
  shipping_service_id?: string | null
}

/**
 * O nome do frete escolhido, como a tela o escreve: a retirada (`isPickupOrder`) é sempre
 * "Retirada no escritório", qualquer que seja o texto gravado; os outros são o `shipping_method`
 * aparado ("PAC", "SEDEX"). `null` quando não há frete gravado — a linha não aparece.
 */
export const shippingMethodLabel = (o: ShippingMethodInput): string | null => {
  if (isPickupOrder(o)) return PICKUP_METHOD_NAME
  return o.shipping_method?.trim() || null
}
