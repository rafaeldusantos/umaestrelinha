import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type { PaymentStatus } from '@nanapin/supabase/types'

export interface OrderItem {
  id: string
  product_name: string
  product_image: string | null
  size: string | null
  finish: string | null
  quantity: number
  unit_price: number
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  customer_id?: string | null
  status: string
  payment_method: string
  payment_status: PaymentStatus
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  /** Snapshot do envio escolhido (SHP-07/SHP-08) — não recotar depois de criado. */
  shipping_service_id?: string | null
  delivery_estimate_min?: string | null
  delivery_estimate_max?: string | null
  created_at: string
  order_items: OrderItem[]
}

export const useOrdersByEmail = (email: string) =>
  useQuery({
    queryKey: ['orders', 'email', email],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_email', email)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data as unknown as Order[]
    },
    enabled: !!email,
  })

export const useOrdersByCustomerId = (customerId: string | undefined) =>
  useQuery({
    queryKey: ['orders', 'customer', customerId],
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', customerId!)
        .order('created_at', { ascending: false })
      if (error || !data) return []
      return data as unknown as Order[]
    },
    enabled: !!customerId,
  })

export interface CreateOrderInput {
  customer_name: string
  customer_email: string
  customer_id?: string | null
  payment_method: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  /** ADR-05: sem isto `orders.address_zip` fica nulo e o backoffice estoura em `MelhorEnvioTab`. */
  address_zip?: string
  address_complement?: string
  /** SHP-07: snapshot da opção de envio escolhida — recotação posterior não o altera. */
  shipping_service_id?: string
  shipping_carrier?: string
  shipping_method?: string
  /** SHP-08: janela de entrega estimada, em `date` (`YYYY-MM-DD`). */
  delivery_estimate_min?: string
  delivery_estimate_max?: string
  subtotal: number
  discount: number
  shipping_cost: number
  total: number
  coupon_code?: string
  coupon_id?: string
  /**
   * PRM-12: a campanha que a loja EXIBIU, quando foi exatamente uma. `null`/ausente quando nenhuma
   * aplicou ou quando duas aplicaram — `orders.promotion_id` é FK única e não sabe dizer "duas".
   * Mesma regra do `create-payment`, de propósito: dois lados discordando sobre qual campanha foi
   * fariam o relatório do admin mentir.
   */
  promotion_id?: string | null
  /**
   * PRM-12: o desconto das faixas que a loja exibiu. É o **teto** da guarda do `create-payment`:
   * sem gravá-lo, `pricing.promotionDiscount < order.promotion_discount` nunca é verdade e a guarda
   * existe morta. Nunca é o valor cobrado — esse é sempre o recálculo do servidor (`PAY-03`).
   */
  promotion_discount?: number
  items: {
    product_id: string
    product_name: string
    product_image: string | null
    /** @deprecated Eixo fixo do modelo antigo. Pedidos novos preenchem `variant_label`. */
    size: string | null
    /** @deprecated Eixo fixo do modelo antigo. Pedidos novos preenchem `variant_label`. */
    finish: string | null
    quantity: number
    unit_price: number
    /** `null` = produto sem grade, precificado por `base_price` (07/T16, PST-03). */
    variant_id?: string | null
    /** Congela o caminho de preço NO PEDIDO — o servidor obedece, não reavalia (A8). */
    price_source?: 'base' | 'variant'
    /** Snapshot legível: `4,5 cm · Fosco`. O histórico não depende de join. */
    variant_label?: string | null
    variant_options?: Record<string, string> | null
  }[]
}

export const useCreateOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const orderNumber = `NP-${Date.now().toString(36).toUpperCase()}`
      const { data: order, error } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: input.customer_name,
          customer_email: input.customer_email,
          customer_id: input.customer_id || null,
          status: 'pending',
          payment_method: input.payment_method,
          address_street: input.address_street,
          address_number: input.address_number,
          address_neighborhood: input.address_neighborhood,
          address_city: input.address_city,
          address_state: input.address_state,
          address_zip: input.address_zip || null,
          address_complement: input.address_complement || null,
          shipping_service_id: input.shipping_service_id || null,
          shipping_carrier: input.shipping_carrier || null,
          shipping_method: input.shipping_method || null,
          delivery_estimate_min: input.delivery_estimate_min || null,
          delivery_estimate_max: input.delivery_estimate_max || null,
          subtotal: input.subtotal,
          discount: input.discount,
          shipping_cost: input.shipping_cost,
          total: input.total,
          coupon_code: input.coupon_code || null,
          coupon_id: input.coupon_id || null,
          promotion_id: input.promotion_id || null,
          promotion_discount: input.promotion_discount ?? 0,
        })
        .select()
        .single()

      if (error || !order) throw new Error(error?.message || 'Erro ao criar pedido')

      const itemsPayload = input.items.map((i) => ({
        order_id: order.id,
        ...i,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload)
      if (itemsError) throw new Error(itemsError.message)

      return order as Order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
