export type CouponType = 'percent' | 'fixed' | 'free_shipping'

export interface Coupon {
  id: string
  code: string
  description: string | null
  type: CouponType
  value: number
  min_order: number
  max_uses: number | null
  used_count: number
  first_order_only: boolean
  active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface AppliedCoupon {
  id: string
  code: string
  type: CouponType
  value: number
  discount: number
  freeShipping: boolean
}

export interface ValidateCouponInput {
  code: string
  subtotal: number
  shippingCost: number
  customerEmail?: string
  /**
   * O subtotal das linhas que entram na base do cupom — sem as peças de campanha. Ausente = todas
   * entram. O pedido mínimo e o desconto mostrado partem dele.
   */
  eligibleSubtotal?: number | null
  /** O nome da campanha em vigência com peça na sacola: vai na recusa do cupom. */
  campaignName?: string | null
}

export interface ValidateCouponResult {
  ok: boolean
  error?: string
  coupon?: AppliedCoupon
}
