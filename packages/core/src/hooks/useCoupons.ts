import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
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

  if (!c.active) return { ok: false, error: 'Cupom desativado.' }
  if (c.valid_from && new Date(c.valid_from) > now)
    return { ok: false, error: 'Cupom ainda não está válido.' }
  if (c.valid_until && new Date(c.valid_until) < now)
    return { ok: false, error: 'Cupom expirado.' }
  if (c.max_uses != null && c.used_count >= c.max_uses)
    return { ok: false, error: 'Cupom esgotado.' }
  if (input.subtotal < (c.min_order || 0))
    return {
      ok: false,
      error: `Pedido mínimo de R$ ${c.min_order.toFixed(2).replace('.', ',')}.`,
    }

  if (c.first_order_only && input.customerEmail) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_email', input.customerEmail)
    if ((count || 0) > 0)
      return { ok: false, error: 'Cupom válido apenas no primeiro pedido.' }
  }

  let discount = 0
  let freeShipping = false
  if (c.type === 'percent') discount = (input.subtotal * c.value) / 100
  else if (c.type === 'fixed') discount = Math.min(c.value, input.subtotal)
  else if (c.type === 'free_shipping') {
    freeShipping = true
    discount = input.shippingCost
  }

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
