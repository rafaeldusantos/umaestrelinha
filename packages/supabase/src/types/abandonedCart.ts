export interface AbandonedCartItem {
  product_id: string
  product_name: string
  product_image: string | null
  product_slug: string
  size: string
  finish: string
  quantity: number
  unit_price: number
}

export type AbandonedCartStatus = 'active' | 'abandoned' | 'recovered' | 'lost'

export interface DbAbandonedCart {
  id: string
  customer_email: string
  customer_name: string | null
  customer_id: string | null
  items: AbandonedCartItem[]
  subtotal: number
  coupon_code: string | null
  marketing_consent: boolean
  status: AbandonedCartStatus
  reminder_sent_at: string | null
  reminder_sent_count: number
  recovered_order_id: string | null
  last_activity_at: string
  created_at: string
  updated_at: string
}
