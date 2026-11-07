// O resumo do pedido: o "de/por" de cada peça e as linhas de desconto que SOMAM.
//
// Um dono só para a confirmação, Minha conta (que é a mesma página, `/pedido/:id`), o e-mail do
// pedido, o painel e o app do ateliê. Escrita em cada um, a conta de uma tela fecharia e a de outra
// não, sem nada quebrar.
//
// O resumo parte do preço CHEIO: Subtotal é a soma dos preços cheios das peças, e cada
// desconto que houve tem a sua linha — o do Compre Junto, o progressivo, o da oferta do checkout, o
// cupom e o PIX. Mostrar uma linha de desconto abaixo de um subtotal já líquido contaria o mesmo
// dinheiro duas vezes para quem lê. A conta fecha por construção: o servidor grava o desconto da
// oferta como o resto (cheio − cobrado − progressivo − casado, `resolveOrderLines`), e o total do
// pedido é o subtotal cobrado − cupom − PIX + frete.
//
// Pedido de antes das colunas de preço cheio (alguma linha sem `full_unit_price`) fica como era: o
// subtotal gravado, o cupom e o PIX. Tudo vem do SNAPSHOT do pedido — mudar ou apagar o desconto do
// adicional depois não muda o que esta regra mostra.
//
// Folha alcançável pelo Deno (a function `send-notification` a importa por caminho relativo): todo
// especificador relativo leva `.ts`, e o único import é outra folha sem import.
import { joinOrderRows } from '../payment/orderLines.ts'

/** O que a regra lê de uma linha do pedido. Estrutural: a linha de `order_items` satisfaz. */
export interface OrderSummaryRowInput {
  product_id?: string | null
  variant_id?: string | null
  size?: string | null
  finish?: string | null
  engraving_text?: string | null
  quantity: number
  /** O preço COBRADO da unidade (nos pedidos de antes, o que o checkout gravava). */
  unit_price: number
  /** O preço cheio da unidade. Nulo nos pedidos de antes. */
  full_unit_price?: number | null
  /** Compre Junto: os principais que a peça acompanhava (snapshot validado na gravação). */
  accompanies_product_ids?: readonly string[] | null
}

/** O que a regra lê do pedido. */
export interface OrderSummaryInput {
  order_items: readonly OrderSummaryRowInput[]
  /** O subtotal COBRADO, como o servidor gravou. */
  subtotal: number
  shipping_cost?: number | null
  /** O desconto do cupom. */
  discount?: number | null
  /** Sem código, a linha do cupom diz só "Cupom" (ou "Desconto", no pedido de antes). */
  coupon_code?: string | null
  pix_discount?: number | null
  total: number
  buy_together_discount?: number | null
  promotion_discount?: number | null
  order_bump_discount?: number | null
}

export type OrderDiscountKey = 'buy_together' | 'promotion' | 'order_bump' | 'coupon' | 'pix'

export interface OrderDiscountLine {
  key: OrderDiscountKey
  label: string
  /** Positivo: quem desenha põe o sinal de menos. */
  amount: number
}

/** O preço de uma linha do pedido, na mesma posição de `order_items`. */
export interface OrderRowPrice {
  /** O valor cobrado da linha (unidade × quantidade). */
  charged: number
  /** O valor cheio da linha, quando ela teve desconto ("de"); `null` sem desconto. */
  full: number | null
  /**
   * O percentual do Compre Junto da linha ("N% a menos"), quando o desconto dela é o casado; `null`
   * quando não houve, ou quando o snapshot não permite dizer qual desconto foi.
   */
  buyTogetherPercent: number | null
  /**
   * A frase "Acompanha o …" vale para esta linha. A linha mista é gravada partida em duas, e só a
   * parte com o desconto casado é a peça que acompanha; a outra é a mesma peça levada avulsa.
   */
  showsCompanion: boolean
}

export interface OrderSummary {
  /** `false` no pedido de antes das colunas de preço cheio: o formato de sempre. */
  detailed: boolean
  subtotal: number
  shipping: number
  /** Na ordem em que se leem, só os que houve. */
  discounts: OrderDiscountLine[]
  /** É `orders.total`, sempre. */
  total: number
  rows: OrderRowPrice[]
}

export const ORDER_DISCOUNT_LABELS: Readonly<Record<Exclude<OrderDiscountKey, 'coupon'>, string>> = {
  buy_together: 'Desconto do Compre Junto',
  promotion: 'Desconto progressivo',
  order_bump: 'Desconto da oferta',
  pix: 'Desconto PIX',
}

const cents = (value: number | null | undefined): number => Math.round((Number(value) || 0) * 100)
const money = (c: number): number => c / 100

const hasFullPrice = (row: OrderSummaryRowInput): boolean =>
  row.full_unit_price !== null &&
  row.full_unit_price !== undefined &&
  Number.isFinite(Number(row.full_unit_price))

/** O pedido tem o preço cheio de TODAS as linhas: só então o subtotal cheio é a soma delas. */
export const isDetailedOrder = (order: Pick<OrderSummaryInput, 'order_items'>): boolean =>
  (order.order_items ?? []).length > 0 && (order.order_items ?? []).every(hasFullPrice)

const couponLabel = (code: string | null | undefined, detailed: boolean): string => {
  const c = code?.trim()
  if (c) return `Cupom ${c}`
  return detailed ? 'Cupom' : 'Desconto'
}

/** A linha acompanha um principal que está no MESMO pedido (a frase "Acompanha o …" existe). */
const accompaniesInOrder = (
  row: OrderSummaryRowInput,
  productIds: ReadonlySet<string>,
): boolean =>
  (row.accompanies_product_ids ?? []).some(
    (id) => typeof id === 'string' && id !== row.product_id && productIds.has(id),
  )

/** O resumo do pedido: as linhas de desconto e o preço de cada peça. */
export function orderSummary(order: OrderSummaryInput): OrderSummary {
  const items = order.order_items ?? []
  const detailed = isDetailedOrder(order)

  const fullCents = items.map((row) =>
    detailed ? cents(Number(row.full_unit_price) * row.quantity) : 0,
  )
  const chargedCents = items.map((row) => cents(Number(row.unit_price) * row.quantity))
  const discounted = items.map((row, i) => detailed && fullCents[i] > chargedCents[i])

  // A linha da sacola é gravada partida (as unidades com o casado primeiro). Só a primeira parte de
  // uma peça que acompanha um principal pode carregar o desconto casado.
  const groups = joinOrderRows(
    items.map((row) => ({ ...row, product_id: row.product_id ?? '' })),
  )
  const productIds = new Set(items.map((row) => row.product_id).filter((id): id is string => !!id))
  const showsCompanion = items.map(() => true)
  const candidates: number[] = []
  if (detailed) {
    for (const group of groups) {
      const [first, ...rest] = group.rows
      for (const i of rest) showsCompanion[i] = false
      if (discounted[first] && accompaniesInOrder(items[first], productIds)) candidates.push(first)
    }
  }

  // Atribui o percentual só quando o snapshot confere: os candidatos somam exatamente o desconto
  // casado do pedido. Senão (a promoção venceu numa peça que acompanha, por exemplo), mostra o
  // "de/por" sem dizer de onde veio — dizer o desconto errado é pior que não dizer.
  const btCents = cents(order.buy_together_discount)
  const candidatesCents = candidates.reduce((s, i) => s + fullCents[i] - chargedCents[i], 0)
  const attributed = new Set(btCents > 0 && candidatesCents === btCents ? candidates : [])

  const rows: OrderRowPrice[] = items.map((row, i) => {
    const fullUnit = Number(row.full_unit_price)
    return {
      charged: money(chargedCents[i]),
      full: discounted[i] ? money(fullCents[i]) : null,
      buyTogetherPercent: attributed.has(i)
        ? Math.round(((fullUnit - Number(row.unit_price)) / fullUnit) * 100)
        : null,
      showsCompanion: showsCompanion[i],
    }
  })

  const discounts: OrderDiscountLine[] = []
  const push = (key: OrderDiscountKey, label: string, value: number | null | undefined) => {
    const c = cents(value)
    if (c > 0) discounts.push({ key, label, amount: money(c) })
  }
  if (detailed) {
    push('buy_together', ORDER_DISCOUNT_LABELS.buy_together, order.buy_together_discount)
    push('promotion', ORDER_DISCOUNT_LABELS.promotion, order.promotion_discount)
    push('order_bump', ORDER_DISCOUNT_LABELS.order_bump, order.order_bump_discount)
  }
  push('coupon', couponLabel(order.coupon_code, detailed), order.discount)
  push('pix', ORDER_DISCOUNT_LABELS.pix, order.pix_discount)

  return {
    detailed,
    subtotal: detailed ? money(fullCents.reduce((s, c) => s + c, 0)) : money(cents(order.subtotal)),
    shipping: money(cents(order.shipping_cost)),
    discounts,
    total: money(cents(order.total)),
    rows,
  }
}
