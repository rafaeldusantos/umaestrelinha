import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppliedCoupon } from '@estrelinha/supabase/types/coupon'

interface CouponState {
  applied: AppliedCoupon | null
  setCoupon: (c: AppliedCoupon | null) => void
  clearCoupon: () => void
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      applied: null,
      setCoupon: (c) => set({ applied: c }),
      clearCoupon: () => set({ applied: null }),
    }),
    { name: 'nanapin-coupon' }
  )
)
