// A montagem do pedido — tirada de dentro do CTA (feature `49`, T10).
//
// Ela vivia no meio de `handleConfirm`, uma função que faz sete coisas: tokeniza cartão, valida
// documento, salva CPF, salva endereço, confere variação, cria pedido e cobra. Esta feature troca
// o CAMINHO de gravação (PostgREST → edge function) exatamente ali no meio, e mexer no meio de uma
// função de sete passos é onde erro de caixa nasce.
//
// Aqui não há mudança de regra nenhuma: é o mesmo código, com os mesmos comentários, num lugar
// onde ele pode ser exercido sem montar a página inteira.
import { applyOrderBump, type OrderBumpConfig, type PricingItem } from '@estrelinha/core/payment/pricing'
import { primaryImage } from '@estrelinha/core/media'
import { materialKindsOf, requiresMaterial } from '@estrelinha/core/material'
import { stripCep } from '@estrelinha/core/validators'
import type { CartItem } from '@/entities/cart'
import type { Product } from '@estrelinha/supabase/types'
import type { CreateOrderInput } from '@/entities/order/api/useOrders'

export interface OrderPayloadInput {
  items: CartItem[]
  pricingItems: PricingItem[]
  bump: OrderBumpConfig
  bumpProduct: Product | null
  contact: { name: string; email: string; whatsapp: string }
  address: {
    cep: string
    street: string
    number: string
    complement: string
    neighborhood: string
    city: string
    state: string
  }
  shipping: {
    serviceId: string
    serviceName: string
    carrier: string
    estimateMin: string
    estimateMax: string
  } | null
  paymentMethod: 'pix' | 'card' | null
  /** O documento do pagador, já resolvido pelo CTA (`AD-013`: quem coleta depende do método). */
  payerDocument: string
  totals: { subtotal: number; couponDiscount: number; shipping: number; total: number }
  coupon: { id?: string; code?: string } | null
  /** As promoções que a tela aplicou — `PRM-12`. */
  applied: { promotion_id: string }[]
  promotionDiscount: number
  materialStatus: string
}

/**
 * Os itens do pedido, com o desconto do bump já embutido.
 *
 * BMP-03: `order_items.unit_price` já sai descontado; o servidor recalcula pelo `product_id`
 * (BMP-04). ⚠️ A lista descontada serve só para persistir — `calculateOrderTotals` recebe preço
 * cheio + `bump` dentro de `useCheckoutTotals` (carry-forward #1).
 */
export function buildOrderItems(
  input: Pick<OrderPayloadInput, 'items' | 'pricingItems' | 'bump' | 'bumpProduct'>,
): CreateOrderInput['items'] {
  const { items, pricingItems, bump, bumpProduct } = input
  const priced = applyOrderBump(pricingItems, bump)

  return [
    ...items.map((item, index) => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_image: primaryImage(item.product.images)?.url ?? null,
      size: item.size || null,
      finish: item.finish || null,
      quantity: item.quantity,
      unit_price: priced[index].unit_price,
      // 07/T16 (PST-03): a variação escolhida vai para o pedido, e o caminho de preço é CONGELADO
      // aqui. O servidor obedece este `price_source` e não reavalia se o produto tem grade — sem
      // isso, criar ou pausar uma variação entre o pedido e o pagamento mudaria o valor de um
      // pedido já fechado (A8).
      variant_id: item.variantId,
      price_source: (item.variantId ? 'variant' : 'base') as 'base' | 'variant',
      // Snapshot: o histórico do pedido tem de ser legível sem join em `product_variants`, que
      // pode ter sido pausada ou reeditada depois da compra.
      variant_label: item.variantLabel || null,
      variant_options: Object.keys(item.optionValues ?? {}).length ? item.optionValues : null,
      // MAT-05: o material exigido e o texto gravado, congelados NO PEDIDO. Saem do snapshot do
      // produto que está no carrinho, não de uma releitura do catálogo — mudar a exigência no
      // cadastro depois não pode alterar pedido já criado.
      requires_material: requiresMaterial(item.product),
      material_kinds: materialKindsOf(item.product),
      engraving_text: item.engravingText ?? null,
    })),
    ...(bumpProduct
      ? [
          {
            product_id: bumpProduct.id,
            product_name: bumpProduct.name,
            product_image: primaryImage(bumpProduct.images)?.url ?? null,
            size: null,
            finish: null,
            quantity: 1,
            unit_price: priced[items.length].unit_price,
            // O bump é sempre o produto inteiro, nunca uma linha da grade — a oferta do lojista
            // aponta para um `product_id`, não para uma variação.
            variant_id: null,
            price_source: 'base' as const,
            variant_label: null,
            variant_options: null,
            // O bump nunca é peça de material: a oferta do lojista aponta para um `product_id`
            // avulso, fora do fluxo de curadoria. Se um dia apontar para uma joia afetiva, esta
            // linha precisa passar a ler o produto — está declarado aqui para não passar batido.
            requires_material: false,
            material_kinds: [],
            engraving_text: null,
          },
        ]
      : []),
  ]
}

/**
 * O corpo inteiro do pedido.
 *
 * `customer_phone` e `customer_document` vão no corpo porque o pedido é **snapshot**: depois da
 * feature `49` é deles que a convidada órfã tira o pagador (`CSC-08`), e é `customer_phone` que o
 * painel lê para cobrar material por WhatsApp (feature `35`).
 */
export function buildOrderPayload(input: OrderPayloadInput): CreateOrderInput {
  const { contact, address, shipping, totals, coupon, applied } = input

  return {
    customer_name: contact.name,
    customer_email: contact.email,
    customer_phone: contact.whatsapp,
    customer_document: input.payerDocument,
    payment_method: input.paymentMethod ?? 'pix',
    address_street: address.street,
    address_number: address.number,
    address_neighborhood: address.neighborhood,
    address_city: address.city,
    address_state: address.state,
    // ADR-05: 8 dígitos sem máscara — é o que o backoffice consome em `MelhorEnvioTab`.
    address_zip: stripCep(address.cep),
    address_complement: address.complement,
    // SHP-07: snapshot do envio escolhido; recotação posterior não o altera.
    shipping_service_id: shipping?.serviceId,
    shipping_carrier: shipping?.carrier,
    shipping_method: shipping?.serviceName,
    delivery_estimate_min: shipping?.estimateMin || undefined,
    delivery_estimate_max: shipping?.estimateMax || undefined,
    subtotal: totals.subtotal,
    discount: totals.couponDiscount,
    shipping_cost: totals.shipping,
    total: totals.total,
    coupon_code: coupon?.code,
    coupon_id: coupon?.id,
    // PRM-12: registra o desconto de faixa que ESTA tela exibiu, para o `create-payment` ter contra
    // o que comparar o recálculo. A regra do `promotion_id` é copiada do servidor (`handlers.ts`):
    // uma promoção ⇒ o id; zero ou mais de uma ⇒ `null`, porque a coluna é FK única e a verdade de
    // "quanto" fica em `promotion_discount`.
    promotion_id: applied.length === 1 ? applied[0].promotion_id : null,
    promotion_discount: input.promotionDiscount,
    material_status: input.materialStatus,
    items: buildOrderItems(input),
  }
}
