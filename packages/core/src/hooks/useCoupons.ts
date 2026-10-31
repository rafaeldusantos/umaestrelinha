import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { couponRefusal, couponRuleOf } from '../coupons/rules.ts'
import { resolveCouponDiscount } from '../payment/pricing.ts'
import type { Coupon, ValidateCouponInput, ValidateCouponResult } from '@estrelinha/supabase/types/coupon'

const TABLE = 'coupons'

// ---------- Admin: listar / CRUD ----------
export const useAdminCoupons = () =>
  useQuery({
    queryKey: ['admin', 'coupons'],
    queryFn: async (): Promise<Coupon[]> => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        console.warn('[coupons] fetch failed (talvez tabela não exista ainda):', error.message)
        return []
      }
      return (data || []) as Coupon[]
    },
  })

export const useCreateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Coupon>) => {
      const payload = { ...input, code: input.code?.toUpperCase().trim() }
      const { data, error } = await supabase.from(TABLE).insert(payload).select().single()
      if (error) throw new Error(error.message)
      return data as Coupon
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  })
}

export const useUpdateCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Coupon> & { id: string }) => {
      if (patch.code) patch.code = patch.code.toUpperCase().trim()
      const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select().single()
      if (error) throw new Error(error.message)
      return data as Coupon
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  })
}

export const useDeleteCoupon = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'coupons'] }),
  })
}

// ---------- Validação no checkout ----------
export const validateCoupon = async (
  input: ValidateCouponInput
): Promise<ValidateCouponResult> => {
  const code = input.code.toUpperCase().trim()
  if (!code) return { ok: false, error: 'Informe um código.' }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .ilike('code', code)
    .maybeSingle()

  if (error) return { ok: false, error: 'Erro ao validar cupom.' }
  if (!data) return { ok: false, error: 'Cupom inválido.' }

  const c = data as Coupon
  const now = new Date()

  // A regra mora em `core/coupons/rules.ts` (feature 89): a mesma que o painel e a function
  // `order-proposals` chamam. A primeira passada não sabe se o e-mail já comprou; só pergunta ao
  // banco quando o cupom passou em tudo o mais e é de primeira compra — a ordem de antes.
  let refusal = couponRefusal(c, { subtotal: input.subtotal, now })
  if (refusal) return { ok: false, error: refusal }

  if (c.first_order_only && input.customerEmail) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email', input.customerEmail)
    refusal = couponRefusal(c, { subtotal: input.subtotal, now, hasPriorOrder: (count || 0) > 0 })
    if (refusal) return { ok: false, error: refusal }
  }

  const freeShipping = c.type === 'free_shipping'
  // O desconto tem UM dono (BMP-04): o mesmo `resolveCouponDiscount` que o servidor cobra.
  const discount = freeShipping
    ? input.shippingCost
    : resolveCouponDiscount(input.subtotal, couponRuleOf(c))

  return {
    ok: true,
    coupon: {
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      discount: Math.max(0, Number(discount.toFixed(2))),
      freeShipping,
    },
  }
}

export const incrementCouponUsage = async (couponId: string) => {
  const { error } = await supabase.rpc('increment_coupon_usage', {
    coupon_id_param: couponId,
  })
  if (error) console.warn('[coupons] increment failed:', error.message)
}
