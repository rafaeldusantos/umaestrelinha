// O contrato do formulário de cupom (feature 18 / T8).
//
// O `zod` estava solto dentro de `AdminCouponsPage`, junto do dialog, das colunas da tabela e da
// confirmação de exclusão — 400 linhas com quatro assuntos. Sai para cá porque agora duas telas o
// usam (criar e editar são a mesma página em duas rotas) e porque a regra da CÓPIA (`DSC-08`) é
// decisão de domínio, não de layout: ela precisa de um lugar onde possa ser provada sozinha.

import { z } from 'zod'
import type { Coupon, CouponType } from '@estrelinha/supabase/types/coupon'
import { dateOnlyFromIso, isoFromDateOnly } from '@/shared/lib/dateOnly'

export const CODE_TOO_SHORT = 'O código precisa de ao menos 2 caracteres'

export const couponSchema = z.object({
  code: z.string().trim().min(2, CODE_TOO_SHORT).max(40),
  description: z.string().max(200).optional().or(z.literal('')),
  type: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.coerce.number().min(0),
  min_order: z.coerce.number().min(0).default(0),
  max_uses: z.coerce.number().int().min(0).optional().nullable(),
  first_order_only: z.boolean().default(false),
  active: z.boolean().default(true),
  valid_from: z.string().optional().or(z.literal('')),
  valid_until: z.string().optional().or(z.literal('')),
})

export type CouponFormValues = z.input<typeof couponSchema>

export const emptyCouponForm: CouponFormValues = {
  code: '',
  description: '',
  type: 'percent',
  value: 10,
  min_order: 0,
  max_uses: null,
  first_order_only: false,
  active: true,
  valid_from: '',
  valid_until: '',
}

/** O cupom gravado ⇒ os campos do formulário. */
export const couponFormValues = (coupon: Coupon): CouponFormValues => ({
  code: coupon.code,
  description: coupon.description || '',
  type: coupon.type,
  value: coupon.value,
  min_order: coupon.min_order,
  max_uses: coupon.max_uses,
  first_order_only: coupon.first_order_only,
  active: coupon.active,
  valid_from: dateOnlyFromIso(coupon.valid_from),
  valid_until: dateOnlyFromIso(coupon.valid_until),
})

/**
 * A cópia (DSC-08).
 *
 * Duas ausências deliberadas, e nenhuma das duas é esquecimento:
 *
 * - **`code` fica vazio.** `coupons.code` é `UNIQUE`, então uma cópia com o mesmo código nem entra no
 *   banco; e inventar `NANA10-COPIA` publicaria um código que ninguém escolheu — o código é o texto
 *   que a cliente digita, não um identificador interno. Quem batiza é a pessoa, no campo focado.
 * - **`used_count` não existe aqui.** Ele é histórico do cupom antigo. Nem sequer é campo de
 *   formulário: a coluna tem `default 0` e a cópia nasce zerada pelo banco.
 *
 * E `active: false` pelo mesmo motivo da promoção duplicada: uma cópia que nasce valendo é um desconto
 * publicado por acidente.
 */
export const couponCopyValues = (coupon: Coupon): CouponFormValues => ({
  ...couponFormValues(coupon),
  code: '',
  active: false,
})

/** O formulário ⇒ o payload de `insert`/`update` de `coupons`. */
export const toCouponPayload = (values: CouponFormValues): Partial<Coupon> => ({
  code: values.code.trim().toUpperCase(),
  description: values.description || null,
  // `free_shipping` não tem valor: o desconto é o frete, lido do pedido. Gravar o número que ficou no
  // campo faria a listagem anunciar "R$ 10" para um cupom que zera o frete.
  value: values.type === 'free_shipping' ? 0 : Number(values.value),
  type: values.type as CouponType,
  min_order: Number(values.min_order || 0),
  max_uses: values.max_uses ? Number(values.max_uses) : null,
  first_order_only: values.first_order_only ?? false,
  active: values.active ?? true,
  valid_from: isoFromDateOnly(values.valid_from ?? ''),
  valid_until: isoFromDateOnly(values.valid_until ?? ''),
})
